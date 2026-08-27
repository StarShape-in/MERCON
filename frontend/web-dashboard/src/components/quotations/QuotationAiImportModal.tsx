import React, { useState } from 'react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  UploadCloud,
  FileText,
  Building2,
  Calendar,
  CheckCircle2,
  Plus,
  Trash2,
  Loader2,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  Layers,
  Info,
  MapPin,
  AlertTriangle,
  HelpCircle,
  Percent,
  CornerDownRight,
  GitCommit,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { quotationService } from '@/services/quotationService';
import { customerService } from '@/services/customerService';
import { documentService } from '@/services/documentService';
import { locationService } from '@/services/locationService';

interface QuotationAiImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export interface CandidateRouteRow {
  id: string;
  originName: string;
  waypoints: string[];
  destinationName: string;
  vehicleClass: string;
  sourceVehicleLabel: string;
  lineType: string;
  billingType: string; // 'MONTHLY' | 'EXTRA' | ''
  rate: string;
  driverPayout: string; // Empty string if null/not provided
  sourceLabel?: string;
  isAmbiguousStructure?: boolean;
  structureChoice?: 'MULTI_STOP' | 'SEPARATE_ROUTES';
}

export interface LocationCandidateItem {
  rawText: string;
  name: string;
  city: string;
  status: 'MATCHED' | 'NEW_CANDIDATE' | 'AMBIGUOUS';
  existingId?: string;
}

export interface SurchargeRuleRow {
  id: string;
  chargeType: string;
  unit: string;
  vehicleType: string;
  rate: string;
}

export default function QuotationAiImportModal({
  isOpen,
  onClose,
  onSuccess,
}: QuotationAiImportModalProps) {
  const queryClient = useQueryClient();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCustomerDocId, setSelectedCustomerDocId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Extracted Metadata
  const [customerId, setCustomerId] = useState<string>('');
  const [agreementRef, setAgreementRef] = useState<string>('');
  const [validFrom, setValidFrom] = useState<string>(new Date().toISOString().substring(0, 10));
  const [validTo, setValidTo] = useState<string>('');
  const [paymentTerms, setPaymentTerms] = useState<string>('Net 30 Days');
  const [aiNotes, setAiNotes] = useState<string>('');
  const [overallConfidence, setOverallConfidence] = useState<number>(0.95);
  const [confidenceBreakdown, setConfidenceBreakdown] = useState<{ customer: number; locations: number; rates: number; vehicle: number }>({
    customer: 0.9,
    locations: 0.92,
    rates: 0.98,
    vehicle: 0.94,
  });

  const [candidateRoutes, setCandidateRoutes] = useState<CandidateRouteRow[]>([]);
  const [locationCandidates, setLocationCandidates] = useState<LocationCandidateItem[]>([]);
  const [surchargeRules, setSurchargeRules] = useState<SurchargeRuleRow[]>([]);

  // Fetch Customers list
  const { data: customersRes } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 200, mode: 'lookup' }),
    enabled: isOpen,
  });
  const customers = customersRes?.data || [];

  // Fetch Master Locations for selected customer
  const { data: customerLocationsRes } = useQuery({
    queryKey: ['customer-locations', customerId],
    queryFn: () => locationService.getAll({ customerId }),
    enabled: isOpen && !!customerId,
  });
  const masterLocations = customerLocationsRes?.data || [];

  const handleRunAiAnalysis = async (fileInput?: File | string, targetCustomer?: string) => {
    const target = fileInput || selectedFile || selectedCustomerDocId;
    if (!target) {
      toast.error('Please upload or select a document file first.');
      return;
    }

    const custId = targetCustomer || customerId;

    try {
      setIsAnalyzing(true);
      toast.loading('✨ Gemini 3.5 Flash analyzing commercial document & multi-stop routes...', { id: 'gemini-ai' });

      const result = await quotationService.analyzeDocumentAi(target as any, custId);

      toast.success('✨ Gemini 3.5 Flash successfully extracted commercial terms & route geometry!', { id: 'gemini-ai' });

      if (result.agreement_ref) setAgreementRef(result.agreement_ref);
      if (result.valid_from) setValidFrom(result.valid_from);
      if (result.valid_to) setValidTo(result.valid_to);
      if (result.payment_terms) setPaymentTerms(result.payment_terms);
      if (result.notes) setAiNotes(result.notes);
      if (result.confidence) setOverallConfidence(result.confidence);
      if (result.confidence_breakdown) setConfidenceBreakdown(result.confidence_breakdown);

      // Auto-match customer name if present and not selected
      if (!customerId && result.customer_name && customers.length > 0) {
        const matched = customers.find((c) =>
          c.name.toLowerCase().includes(result.customer_name!.toLowerCase()) ||
          result.customer_name!.toLowerCase().includes(c.name.toLowerCase())
        );
        if (matched) setCustomerId(matched.id);
      }

      // Process Extracted Location Resolutions
      if (result.location_resolutions) {
        const locItems: LocationCandidateItem[] = [];
        Object.entries(result.location_resolutions).forEach(([rawText, matchRes]: [string, any]) => {
          locItems.push({
            rawText,
            name: matchRes.candidateName || rawText,
            city: matchRes.candidateCity || rawText,
            status: matchRes.status || 'NEW_CANDIDATE',
            existingId: matchRes.matchedLocation?.id,
          });
        });
        setLocationCandidates(locItems);
      }

      // Process Candidate Routes
      if (Array.isArray(result.routes) && result.routes.length > 0) {
        setCandidateRoutes(
          result.routes.map((r: any, idx) => ({
            id: String(Date.now() + idx),
            originName: r.origin_name || 'Riyadh',
            waypoints: Array.isArray(r.waypoints) ? r.waypoints : [],
            destinationName: r.destination_name || 'Dammam',
            vehicleClass: r.vehicle_class || '10 TON',
            sourceVehicleLabel: r.source_vehicle_label || r.vehicle_class || '10 TON Truck',
            lineType: r.line_type || 'SINGLE_TRIP',
            billingType: r.billing_type || '',
            rate: String(r.rate || 1000),
            driverPayout: r.driver_payout != null ? String(r.driver_payout) : '',
            sourceLabel: r.source_label || undefined,
            isAmbiguousStructure: !!r.is_ambiguous_structure,
            structureChoice: 'MULTI_STOP',
          }))
        );
      }

      // Process Surcharge Rules
      if (Array.isArray(result.surcharge_rules) && result.surcharge_rules.length > 0) {
        setSurchargeRules(
          result.surcharge_rules.map((s, idx) => ({
            id: String(Date.now() + idx),
            chargeType: s.charge_type,
            unit: s.unit || '',
            vehicleType: s.vehicle_type || '',
            rate: String(s.rate),
          }))
        );
      }
    } catch (err: any) {
      toast.error(err?.message || 'AI document analysis failed.', { id: 'gemini-ai' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setSelectedCustomerDocId(null);
      await handleRunAiAnalysis(file);
    }
  };

  const handleAddCandidateRoute = () => {
    setCandidateRoutes((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        originName: '',
        waypoints: [],
        destinationName: '',
        vehicleClass: '10 TON',
        sourceVehicleLabel: '10 TON',
        lineType: 'SINGLE_TRIP',
        billingType: '',
        rate: '',
        driverPayout: '',
        structureChoice: 'MULTI_STOP',
      },
    ]);
  };

  const handleRemoveCandidateRoute = (id: string) => {
    setCandidateRoutes((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateCandidateRoute = (id: string, updates: Partial<CandidateRouteRow>) => {
    setCandidateRoutes((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const handleAddWaypoint = (routeId: string) => {
    setCandidateRoutes((prev) =>
      prev.map((r) => (r.id === routeId ? { ...r, waypoints: [...r.waypoints, 'New Stop'] } : r))
    );
  };

  const handleRemoveWaypoint = (routeId: string, index: number) => {
    setCandidateRoutes((prev) =>
      prev.map((r) =>
        r.id === routeId ? { ...r, waypoints: r.waypoints.filter((_, idx) => idx !== index) } : r
      )
    );
  };

  const handleAddSurchargeRule = () => {
    setSurchargeRules((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        chargeType: '',
        unit: 'per trip',
        vehicleType: '',
        rate: '',
      },
    ]);
  };

  const handleRemoveSurchargeRule = (id: string) => {
    setSurchargeRules((prev) => prev.filter((s) => s.id !== id));
  };

  const handleConfirmImport = async () => {
    if (!customerId) {
      toast.error('Please select a customer account.');
      return;
    }
    const validRoutes = candidateRoutes.filter(
      (r) => r.originName.trim() && r.destinationName.trim() && Number(r.rate) > 0
    );
    if (validRoutes.length === 0) {
      toast.error('Please provide at least 1 valid route line item with Origin, Destination, and Rate.');
      return;
    }

    try {
      setIsSubmitting(true);
      let uploadedDocId: string | null = selectedCustomerDocId;

      // Upload source contract file to Customer Vault if uploaded locally
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('entity_type', 'Customer');
        formData.append('entity_id', customerId);
        formData.append('doc_type', 'Contract');
        const doc = await documentService.upload(formData);
        uploadedDocId = doc.id;
      }

      // Expand candidate routes: if user selected SEPARATE_ROUTES for an ambiguous route, expand it into separate rate cards!
      const routesToSubmit: any[] = [];
      validRoutes.forEach((r) => {
        if (r.structureChoice === 'SEPARATE_ROUTES' && (r.waypoints.length > 0 || (r.destinationName && r.destinationName.includes('+')))) {
          const allDests = [...r.waypoints, r.destinationName];
          allDests.forEach((dest) => {
            routesToSubmit.push({
              origin_name: r.originName,
              waypoints: [],
              destination_name: dest,
              vehicle_class: r.vehicleClass,
              source_vehicle_label: r.sourceVehicleLabel || r.vehicleClass,
              line_type: r.lineType,
              billing_type: r.billingType || null,
              rate: Number(r.rate),
              driver_payout: r.driverPayout.trim() ? Number(r.driverPayout) : null,
              currency: 'SAR',
            });
          });
        } else {
          // Default: ONE MULTI-STOP ROUTE with ordered waypoints!
          routesToSubmit.push({
            origin_name: r.originName,
            waypoints: r.waypoints,
            destination_name: r.destinationName,
            vehicle_class: r.vehicleClass,
            source_vehicle_label: r.sourceVehicleLabel || r.vehicleClass,
            line_type: r.lineType,
            billing_type: r.billingType || null,
            rate: Number(r.rate),
            driver_payout: r.driverPayout.trim() ? Number(r.driverPayout) : null,
            currency: 'SAR',
          });
        }
      });

        const payloadToSubmit = {
          customerId,
          agreement_ref: agreementRef.trim() || undefined,
          valid_from: validFrom || undefined,
          valid_to: validTo || undefined,
          document_id: uploadedDocId || undefined,
          source_type: 'AI_IMPORTED',
          new_locations: locationCandidates.map((loc) => ({
            raw_text: loc.rawText,
            name: loc.name,
            city: loc.city,
            existing_id: loc.existingId,
          })),
          routes: routesToSubmit,
          surcharge_rules: surchargeRules
            .filter((s) => s.chargeType.trim() && Number(s.rate) >= 0)
            .map((s) => ({
              charge_type: s.chargeType.trim(),
              unit: s.unit.trim() || null,
              vehicle_type: s.vehicleType.trim() || null,
              rate: Number(s.rate),
              currency: 'SAR',
            })),
        };

        console.log('[AtomicImport UI] Executing POST /api/quotations/atomic-import with payload:', payloadToSubmit);

        // Execute Atomic Transaction on Backend ($transaction)
        await quotationService.atomicImport(payloadToSubmit);

        console.log('[AtomicImport UI] Import transaction completed successfully');

        queryClient.invalidateQueries({ queryKey: ['quotations'] });
        queryClient.invalidateQueries({ queryKey: ['surcharge-rules'] });
        queryClient.invalidateQueries({ queryKey: ['locations'] });

        toast.success(
          `Successfully imported ${routesToSubmit.length} commercial quotation(s) & ${surchargeRules.length} accessorial rule(s) in a single atomic transaction!`
        );
        onSuccess?.();
        onClose();
      } catch (err: any) {
        console.error('[AtomicImport UI] POST /api/quotations/atomic-import failed:', err);
        const serverError = err?.response?.data?.error;
        const msg = serverError?.message || err?.message || 'Failed to complete atomic quotation import transaction.';
        const details = serverError?.meta || '';
        const fullCopyText = `${msg}${details ? `\nDetails: ${details}` : ''}`;

        toast.error(
          () => (
            <div
              className="cursor-pointer select-text font-sans text-xs flex flex-col gap-1.5 p-1 w-full"
              onClick={() => {
                navigator.clipboard.writeText(fullCopyText);
                toast.success('Error details copied to clipboard!', { duration: 2500 });
              }}
              title="Click anywhere to copy full error message"
            >
              <div className="font-bold text-red-700 dark:text-red-300 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-sm">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                  Import Error (Click to Copy)
                </span>
                <span className="text-[11px] bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-200 px-2 py-0.5 rounded font-mono font-semibold border border-red-300 dark:border-red-800 shrink-0 hover:bg-red-200 shadow-xs">
                  📋 Click to Copy
                </span>
              </div>
              <div className="text-red-950 dark:text-red-100 font-mono text-[11px] bg-red-50/90 dark:bg-slate-950 p-2 rounded-lg border border-red-200 dark:border-red-900 break-words whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed select-all">
                {msg}
                {details && <div className="mt-1 opacity-70 text-[10px]">{details}</div>}
              </div>
            </div>
          ),
          { duration: 25000 }
        );
      } finally {
        setIsSubmitting(false);
      }
    };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl rounded-3xl p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col justify-between overflow-hidden shadow-2xl">
        <div className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
          {/* Header */}
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-black shadow-md">
                  <Sparkles className="w-4 h-4" />
                </div>
                <DialogTitle className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  AI Commercial Quotation Import
                  <Badge className="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 font-extrabold text-[10px]">
                    Gemini 3.5 Flash
                  </Badge>
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Hardened commercial rate card importer. Interprets multi-stop routes (e.g. Riyadh → Al Hasa → Dammam → Jubail = 1 Rate Card), resolves master locations, extracts accessorial surcharges, and enforces NULL driver charges.
              </DialogDescription>
            </div>

            {/* Confidence Breakdown Badges */}
            <div className="hidden sm:flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold gap-1">
                <Percent className="w-3 h-3 text-emerald-600" />
                Overall Confidence: {Math.round(overallConfidence * 100)}%
              </Badge>
            </div>
          </DialogHeader>

          {/* Upload Dropzone */}
          <div className="p-4 bg-gradient-to-br from-slate-50 via-amber-50/20 to-slate-50 dark:from-slate-800/40 dark:to-slate-900 rounded-2xl border-2 border-dashed border-amber-300 dark:border-amber-900/60 space-y-2">
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                {isAnalyzing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <UploadCloud className="w-5 h-5" />
                )}
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">
                  {selectedFile ? selectedFile.name : 'Upload Quotation Document (PDF, Excel, Image)'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Supports AKS, Horizon, iMile, Company Quotation Excel, Chinese contracts, or any multilingual agreement.
                </p>
              </div>

              <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all hover:scale-105 active:scale-95">
                <FileText className="w-3.5 h-3.5" />
                <span>{selectedFile ? 'Change Document File' : 'Browse File...'}</span>
                <input
                  type="file"
                  accept=".pdf,.xlsx,.xls,.docx,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>

          {/* SECTION A: Commercial Agreement Metadata */}
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-600" /> A. Commercial Agreement Metadata
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50/70 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <div className="space-y-1">
                <Label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Customer Account *</Label>
                <Select value={customerId} onValueChange={(val) => { setCustomerId(val); if (selectedFile) handleRunAiAnalysis(selectedFile, val); }}>
                  <SelectTrigger className="h-8.5 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl font-semibold">
                    <SelectValue placeholder="Select Customer Account" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        🏢 {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Agreement Ref / Quote ID</Label>
                <Input
                  value={agreementRef}
                  onChange={(e) => setAgreementRef(e.target.value)}
                  placeholder="e.g. QT-2026-01"
                  className="h-8.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Validity Start Date</Label>
                <Input
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="h-8.5 text-xs font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Validity End Date</Label>
                <Input
                  type="date"
                  value={validTo}
                  onChange={(e) => setValidTo(e.target.value)}
                  className="h-8.5 text-xs font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* SECTION B: Location Master Resolution */}
          {locationCandidates.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" /> B. Location Master Candidate Resolution ({locationCandidates.length})
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 max-h-36 overflow-y-auto">
                {locationCandidates.map((loc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="font-bold text-slate-800 dark:text-slate-200">{loc.rawText}</span>
                      {loc.status === 'MATCHED' ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px]">Matched Master</Badge>
                      ) : (
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[9px]">✨ New Master Candidate</Badge>
                      )}
                    </div>

                    <Select
                      value={loc.existingId || 'create_new'}
                      onValueChange={(val) => {
                        setLocationCandidates((prev) =>
                          prev.map((l) => (l.rawText === loc.rawText ? { ...l, existingId: val === 'create_new' ? undefined : val } : l))
                        );
                      }}
                    >
                      <SelectTrigger className="h-7 text-[11px] w-40 bg-slate-50 dark:bg-slate-800 border-slate-200 rounded-lg font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]">
                        <SelectItem value="create_new">+ Create New Location</SelectItem>
                        {masterLocations.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            📍 {m.name} ({m.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION C: Extracted Route Line Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-600" /> C. Extracted Route Line Items ({candidateRoutes.length})
              </h4>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCandidateRoute}
                className="h-7 text-xs font-bold gap-1 rounded-lg border-amber-200 text-amber-700 dark:border-amber-900 dark:text-amber-400"
              >
                <Plus className="w-3.5 h-3.5" /> Add Route Line
              </Button>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-extrabold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="p-2.5 w-[38%]">Commercial Route &amp; Multi-Stop Flow</th>
                    <th className="p-2.5">Vehicle Class &amp; Label</th>
                    <th className="p-2.5">Line &amp; Billing Type</th>
                    <th className="p-2.5">Billing Rate (SAR)</th>
                    <th className="p-2.5">Driver Charge (SAR)</th>
                    <th className="p-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {candidateRoutes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-xs text-slate-400">
                        No route lines extracted yet. Upload a document file to analyze with Gemini 3.5 Flash or click "Add Route Line".
                      </td>
                    </tr>
                  ) : (
                    candidateRoutes.map((route) => (
                      <tr key={route.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 align-top">
                        {/* Visual Multi-Stop Route Flow Column */}
                        <td className="p-2.5 space-y-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 font-extrabold text-[11px] border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                              📍 Pickup: {route.originName}
                            </span>

                            {route.waypoints.map((wp, wIdx) => (
                              <React.Fragment key={wIdx}>
                                <span className="text-amber-600 dark:text-amber-400 font-black text-xs">➔</span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-950/90 dark:to-orange-950/90 text-amber-950 dark:text-amber-100 font-extrabold text-[11px] border-2 border-amber-300 dark:border-amber-700 shadow-xs">
                                  <Badge className="bg-amber-600 text-white text-[9px] px-1 py-0 font-black shadow-2xs">
                                    Stop {wIdx + 1}
                                  </Badge>
                                  <input
                                    value={wp}
                                    onChange={(e) => {
                                      const newWp = [...route.waypoints];
                                      newWp[wIdx] = e.target.value;
                                      handleUpdateCandidateRoute(route.id, { waypoints: newWp });
                                    }}
                                    className="bg-white dark:bg-slate-900 text-amber-950 dark:text-amber-100 px-1.5 py-0.5 rounded-md border border-amber-300 dark:border-amber-700 w-28 text-[11px] font-black focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveWaypoint(route.id, wIdx)}
                                    className="text-rose-500 hover:text-rose-700 font-black text-sm ml-0.5 cursor-pointer transition-transform hover:scale-125"
                                    title="Remove waypoint stop"
                                  >
                                    ×
                                  </button>
                                </span>
                              </React.Fragment>
                            ))}

                            <span className="text-rose-500 dark:text-rose-400 font-black text-xs">➔</span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 font-extrabold text-[11px] border border-rose-300 dark:border-rose-800 shadow-2xs">
                              🏁 Dropoff: {route.destinationName}
                            </span>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddWaypoint(route.id)}
                              className="h-6 text-[10px] font-extrabold px-2 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg gap-0.5"
                            >
                              <Plus className="w-3 h-3" /> Stop
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5 pt-1">
                            <Input
                              value={route.originName}
                              onChange={(e) => handleUpdateCandidateRoute(route.id, { originName: e.target.value })}
                              placeholder="Origin City"
                              className="h-7 text-[11px] bg-white dark:bg-slate-900 border-slate-200 font-semibold"
                            />
                            <Input
                              value={route.destinationName}
                              onChange={(e) => handleUpdateCandidateRoute(route.id, { destinationName: e.target.value })}
                              placeholder="Final Destination"
                              className="h-7 text-[11px] bg-white dark:bg-slate-900 border-slate-200 font-semibold"
                            />
                          </div>

                          {route.sourceLabel && (
                            <p className="text-[10px] text-slate-500 font-mono">
                              Raw Extraction Label: <span className="font-bold text-slate-700 dark:text-slate-300">{route.sourceLabel}</span>
                            </p>
                          )}

                          {route.isAmbiguousStructure && (
                            <div className="p-2 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl space-y-1">
                              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                <span>⚠ Route structure needs confirmation</span>
                              </div>
                              <div className="flex items-center gap-3 text-[11px]">
                                <label className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`struct_${route.id}`}
                                    checked={route.structureChoice !== 'SEPARATE_ROUTES'}
                                    onChange={() => handleUpdateCandidateRoute(route.id, { structureChoice: 'MULTI_STOP' })}
                                  />
                                  <span>Multi-stop (1 Route = {route.rate} SAR)</span>
                                </label>
                                <label className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`struct_${route.id}`}
                                    checked={route.structureChoice === 'SEPARATE_ROUTES'}
                                    onChange={() => handleUpdateCandidateRoute(route.id, { structureChoice: 'SEPARATE_ROUTES' })}
                                  />
                                  <span>Separate Routes ({route.waypoints.length + 1} Rate Cards)</span>
                                </label>
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="p-2.5 space-y-1">
                          <Select
                            value={route.vehicleClass}
                            onValueChange={(val) => handleUpdateCandidateRoute(route.id, { vehicleClass: val })}
                          >
                            <SelectTrigger className="h-7.5 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-semibold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[9999]">
                              <SelectItem value="3 TON">3 TON</SelectItem>
                              <SelectItem value="5 TON">5 TON</SelectItem>
                              <SelectItem value="10 TON">10 TON</SelectItem>
                              <SelectItem value="20 TON">20 TON</SelectItem>
                              <SelectItem value="24 TON">24 TON</SelectItem>
                              <SelectItem value="40 FEET">40 FEET</SelectItem>
                              <SelectItem value="FLATBED">FLATBED</SelectItem>
                              <SelectItem value="REEFER">REEFER</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            value={route.sourceVehicleLabel}
                            onChange={(e) => handleUpdateCandidateRoute(route.id, { sourceVehicleLabel: e.target.value })}
                            placeholder="Raw label e.g. Dyna 3 Ton"
                            className="h-6 text-[10px] text-slate-500 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-800"
                          />
                        </td>

                        <td className="p-2.5 space-y-1">
                          <Select
                            value={route.lineType}
                            onValueChange={(val) => handleUpdateCandidateRoute(route.id, { lineType: val })}
                          >
                            <SelectTrigger className="h-7.5 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-semibold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[9999]">
                              <SelectItem value="SINGLE_TRIP">Single Trip</SelectItem>
                              <SelectItem value="ROUND_TRIP">Round Trip</SelectItem>
                              <SelectItem value="10_HRS">10 Hrs Duty</SelectItem>
                              <SelectItem value="12_HRS">12 Hrs Duty</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>

                        <td className="p-2.5">
                          <Input
                            type="number"
                            value={route.rate}
                            onChange={(e) => handleUpdateCandidateRoute(route.id, { rate: e.target.value })}
                            placeholder="1200"
                            className="h-7.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                          />
                        </td>

                        <td className="p-2.5">
                          <Input
                            type="number"
                            value={route.driverPayout}
                            onChange={(e) => handleUpdateCandidateRoute(route.id, { driverPayout: e.target.value })}
                            placeholder="— Not provided"
                            className="h-7.5 text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 placeholder:text-slate-400"
                          />
                          {!route.driverPayout && (
                            <span className="text-[10px] text-amber-600 font-medium block mt-0.5">
                              — Not provided
                            </span>
                          )}
                        </td>

                        <td className="p-2.5 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveCandidateRoute(route.id)}
                            className="h-7.5 w-7.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION D: Accessorial Surcharge Rules Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-violet-600" /> D. Extracted Accessorial Surcharge Rules ({surchargeRules.length})
              </h4>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSurchargeRule}
                className="h-7 text-xs font-bold gap-1 rounded-lg border-violet-200 text-violet-700 dark:border-violet-900 dark:text-violet-400"
              >
                <Plus className="w-3.5 h-3.5" /> Add Surcharge Rule
              </Button>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-extrabold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="p-2.5">Charge Type</th>
                    <th className="p-2.5">Unit / Basis</th>
                    <th className="p-2.5">Vehicle Tier</th>
                    <th className="p-2.5">Rate (SAR)</th>
                    <th className="p-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {surchargeRules.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-xs text-slate-400">
                        No accessorial surcharge rules extracted. Click "Add Surcharge Rule" to add custom fee schedules (e.g., Labour, Extra Stops, Offloading).
                      </td>
                    </tr>
                  ) : (
                    surchargeRules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="p-2">
                          <Input
                            value={rule.chargeType}
                            onChange={(e) => setSurchargeRules((prev) => prev.map((s) => (s.id === rule.id ? { ...s, chargeType: e.target.value } : s)))}
                            placeholder="e.g. Labour Charge"
                            className="h-7.5 text-xs bg-white dark:bg-slate-900 border-slate-200 font-semibold"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={rule.unit}
                            onChange={(e) => setSurchargeRules((prev) => prev.map((s) => (s.id === rule.id ? { ...s, unit: e.target.value } : s)))}
                            placeholder="per person / per stop"
                            className="h-7.5 text-xs bg-white dark:bg-slate-900 border-slate-200"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={rule.vehicleType}
                            onChange={(e) => setSurchargeRules((prev) => prev.map((s) => (s.id === rule.id ? { ...s, vehicleType: e.target.value } : s)))}
                            placeholder="All vehicles or 3 TON"
                            className="h-7.5 text-xs bg-white dark:bg-slate-900 border-slate-200"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={rule.rate}
                            onChange={(e) => setSurchargeRules((prev) => prev.map((s) => (s.id === rule.id ? { ...s, rate: e.target.value } : s)))}
                            placeholder="125"
                            className="h-7.5 text-xs font-bold text-violet-700 bg-white dark:bg-slate-900 border-slate-200"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveSurchargeRule(rule.id)}
                            className="h-7.5 w-7.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Atomic transactional import ensures 0 partial database records.
          </span>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmImport}
              disabled={isSubmitting || candidateRoutes.length === 0}
              className="h-9 px-5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
              )}
              Confirm &amp; Import ({candidateRoutes.length}) Quotation(s)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
