import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ArrowLeft,
  ShieldCheck,
  FileSpreadsheet,
  Layers,
  MapPin,
  AlertTriangle,
  RotateCw,
  X,
  Check,
  ChevronDown,
  Info,
  SlidersHorizontal,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { quotationService } from '@/services/quotationService';
import { customerService } from '@/services/customerService';
import { documentService } from '@/services/documentService';
import { locationService, Location } from '@/services/locationService';

export interface StopItem {
  id: string;
  name: string; // Extracted raw text e.g. "DMM" or "Al Hasa"
  locationId?: string; // Canonical Location record ID if mapped
  role?: 'Pickup' | 'Dropoff' | 'Stop'; // Only if explicitly defined in source
  sourceLabel?: string;
}

export interface SurchargeRuleRow {
  id: string;
  chargeType: string;
  unit: string;
  vehicleType: string;
  rate: string;
}

export interface CandidateRouteRow {
  id: string;
  stops: StopItem[];
  originName: string;
  destinationName: string;
  vehicleClass: string;
  sourceVehicleLabel: string;
  lineType: string;
  billingType: string;
  rate: string;
  driverPayout: string; // Empty string = NULL in DB
  validFrom?: string;
  validTo?: string;
  sourceLabel?: string;
  isAmbiguousStructure?: boolean;
  structureChoice?: 'MULTI_STOP' | 'SEPARATE_ROUTES';
  surcharges?: SurchargeRuleRow[];
}

export interface LocationCandidateItem {
  rawText: string;
  name: string;
  city: string;
  status: 'MATCHED' | 'NEW_CANDIDATE' | 'AMBIGUOUS';
  existingId?: string;
}

export default function QuotationAiImportPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Document & Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCustomerDocId, setSelectedCustomerDocId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisDone, setAnalysisDone] = useState(false);

  // Commercial Metadata
  const [customerId, setCustomerId] = useState<string>('');
  const [agreementRef, setAgreementRef] = useState<string>('');
  const [validFrom, setValidFrom] = useState<string>(new Date().toISOString().substring(0, 10));
  const [validTo, setValidTo] = useState<string>('');

  // Extracted Data State
  const [candidateRoutes, setCandidateRoutes] = useState<CandidateRouteRow[]>([]);
  const [surchargeRules, setSurchargeRules] = useState<SurchargeRuleRow[]>([]);
  const [locationCandidates, setLocationCandidates] = useState<LocationCandidateItem[]>([]);

  // UI Filter State: 'all' | 'review' | 'ready'
  const [filterMode, setFilterMode] = useState<'all' | 'review' | 'ready'>('all');

  // Modal State for Quick Location Creation
  const [isCreateLocOpen, setIsCreateLocOpen] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocCity, setNewLocCity] = useState('');
  const [targetStopMapping, setTargetStopMapping] = useState<{ routeId: string; stopId: string } | null>(null);

  // Surcharge Editor Modal State
  const [isSurchargeModalOpen, setIsSurchargeModalOpen] = useState(false);

  // Fetch Customers list
  const { data: customersRes } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 200, mode: 'lookup' }),
  });
  const customers = customersRes?.data || [];

  // Fetch Master Locations for selected customer
  const { data: customerLocationsRes, refetch: refetchLocations } = useQuery({
    queryKey: ['customer-locations', customerId],
    queryFn: () => locationService.getAll({ customerId }),
    enabled: !!customerId,
  });
  const masterLocations: Location[] = customerLocationsRes?.data || [];

  // Auto-match stop to master location by name/code
  const findMatchingLocation = (rawText: string): Location | undefined => {
    if (!rawText || !masterLocations.length) return undefined;
    const clean = rawText.trim().toLowerCase();
    return masterLocations.find(
      (m) =>
        m.name.toLowerCase() === clean ||
        m.code.toLowerCase() === clean ||
        m.name.toLowerCase().includes(clean) ||
        clean.includes(m.name.toLowerCase())
    );
  };

  const handleRunAiAnalysis = async (fileInput?: File | string, targetCustomer?: string) => {
    const target = fileInput || selectedFile || selectedCustomerDocId;
    if (!target) {
      toast.error('Please upload or select a document file first.');
      return;
    }

    const custId = targetCustomer || customerId;

    try {
      setIsAnalyzing(true);
      toast.loading('✨ Analyzing document & extracting multi-stop routes...', { id: 'ai-analysis' });

      const result = await quotationService.analyzeDocumentAi(target as any, custId);

      toast.success('✨ Document analysis complete!', { id: 'ai-analysis' });
      setAnalysisDone(true);

      if (result.agreement_ref) setAgreementRef(result.agreement_ref);
      if (result.valid_from) setValidFrom(result.valid_from);
      if (result.valid_to) setValidTo(result.valid_to);

      // Auto-match customer name if present and customer not selected
      if (!customerId && result.customer_name && customers.length > 0) {
        const matchedCust = customers.find(
          (c) =>
            c.name.toLowerCase().includes(result.customer_name!.toLowerCase()) ||
            result.customer_name!.toLowerCase().includes(c.name.toLowerCase())
        );
        if (matchedCust) setCustomerId(matchedCust.id);
      }

      // Process Candidate Routes and convert waypoints into ordered StopItems
      if (Array.isArray(result.routes) && result.routes.length > 0) {
        const parsedRoutes: CandidateRouteRow[] = result.routes.map((r: any, idx: number) => {
          const rawOrigin = r.origin_name || 'Riyadh';
          const rawDest = r.destination_name || 'Dammam';
          const waypoints: string[] = Array.isArray(r.waypoints) ? r.waypoints : [];

          // Construct ordered stops list
          const rawStopNames = [rawOrigin, ...waypoints, rawDest];
          const stops: StopItem[] = rawStopNames.map((sName, sIdx) => {
            const matchedLoc = findMatchingLocation(sName);
            let role: 'Pickup' | 'Dropoff' | 'Stop' | undefined = undefined;
            if (r.has_explicit_roles) {
              role = sIdx === 0 ? 'Pickup' : sIdx === rawStopNames.length - 1 ? 'Dropoff' : 'Stop';
            }
            return {
              id: `stop_${idx}_${sIdx}_${Date.now()}`,
              name: sName,
              locationId: matchedLoc?.id,
              role,
              sourceLabel: sName,
            };
          });

          return {
            id: String(Date.now() + idx),
            stops,
            originName: rawOrigin,
            destinationName: rawDest,
            vehicleClass: r.vehicle_class || '10 TON',
            sourceVehicleLabel: r.source_vehicle_label || r.vehicle_class || '10 TON Truck',
            lineType: r.line_type || 'SINGLE_TRIP',
            billingType: r.billing_type || 'EXTRA',
            rate: String(r.rate || 1000),
            driverPayout: r.driver_payout != null ? String(r.driver_payout) : '',
            validFrom: r.valid_from || result.valid_from || validFrom,
            validTo: r.valid_to || result.valid_to || validTo,
            sourceLabel: r.source_label || undefined,
            isAmbiguousStructure: !!r.is_ambiguous_structure,
            structureChoice: 'MULTI_STOP',
          };
        });

        setCandidateRoutes(parsedRoutes);
      }

      // Process Surcharge Rules
      if (Array.isArray(result.surcharge_rules) && result.surcharge_rules.length > 0) {
        setSurchargeRules(
          result.surcharge_rules.map((s: any, idx: number) => ({
            id: String(Date.now() + idx),
            chargeType: s.charge_type,
            unit: s.unit || 'per trip',
            vehicleType: s.vehicle_type || '',
            rate: String(s.rate),
          }))
        );
      }
    } catch (err: any) {
      toast.error(err?.message || 'Document analysis failed.', { id: 'ai-analysis' });
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

  const handleResetForm = () => {
    setSelectedFile(null);
    setSelectedCustomerDocId(null);
    setCustomerId('');
    setAgreementRef('');
    setValidFrom(new Date().toISOString().substring(0, 10));
    setValidTo('');
    setCandidateRoutes([]);
    setSurchargeRules([]);
    setLocationCandidates([]);
    setAnalysisDone(false);
    toast.info('Workspace reset');
  };

  // Route Item Handlers
  const handleAddCandidateRoute = () => {
    const newId = String(Date.now());
    setCandidateRoutes((prev) => [
      ...prev,
      {
        id: newId,
        stops: [
          { id: `stop_${newId}_0`, name: 'Origin' },
          { id: `stop_${newId}_1`, name: 'Destination' },
        ],
        originName: 'Origin',
        destinationName: 'Destination',
        vehicleClass: '10 TON',
        sourceVehicleLabel: '10 TON',
        lineType: 'SINGLE_TRIP',
        billingType: 'EXTRA',
        rate: '1000',
        driverPayout: '',
        validFrom: validFrom,
        validTo: validTo,
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

  // Stop Handlers inside Route
  const handleMapStopLocation = (routeId: string, stopId: string, locationId: string) => {
    setCandidateRoutes((prev) =>
      prev.map((r) => {
        if (r.id !== routeId) return r;
        const newStops = r.stops.map((s) => {
          if (s.id !== stopId) return s;
          const locObj = masterLocations.find((m) => m.id === locationId);
          return {
            ...s,
            locationId,
            name: locObj ? locObj.name : s.name,
          };
        });
        return { ...r, stops: newStops };
      })
    );
  };

  const handleAddStopToRoute = (routeId: string) => {
    setCandidateRoutes((prev) =>
      prev.map((r) => {
        if (r.id !== routeId) return r;
        const newStop: StopItem = {
          id: `stop_${routeId}_${Date.now()}`,
          name: `Stop ${r.stops.length + 1}`,
        };
        return { ...r, stops: [...r.stops, newStop] };
      })
    );
  };

  const handleRemoveStopFromRoute = (routeId: string, stopId: string) => {
    setCandidateRoutes((prev) =>
      prev.map((r) => {
        if (r.id !== routeId || r.stops.length <= 2) return r;
        return { ...r, stops: r.stops.filter((s) => s.id !== stopId) };
      })
    );
  };

  // Create Location Handler
  const handleOpenCreateLocation = (routeId: string, stopId: string, rawText: string) => {
    setTargetStopMapping({ routeId, stopId });
    setNewLocName(rawText);
    setNewLocCity(rawText);
    setIsCreateLocOpen(true);
  };

  const handleSaveNewLocation = async () => {
    if (!newLocName.trim()) {
      toast.error('Location name is required.');
      return;
    }
    if (!customerId) {
      toast.error('Please select a Customer Account first.');
      return;
    }

    try {
      const created = await locationService.create({
        customerId,
        name: newLocName.trim(),
        city: newLocCity.trim() || undefined,
      });

      toast.success(`Created location "${created.name}"`);
      await refetchLocations();

      if (targetStopMapping) {
        handleMapStopLocation(targetStopMapping.routeId, targetStopMapping.stopId, created.id);
      }

      setIsCreateLocOpen(false);
      setTargetStopMapping(null);
      setNewLocName('');
      setNewLocCity('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create location');
    }
  };

  // Surcharge Rule Handlers
  const handleAddSurchargeRule = () => {
    setSurchargeRules((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        chargeType: 'Extra Stop Fee',
        unit: 'per stop',
        vehicleType: 'All',
        rate: '150',
      },
    ]);
  };

  const handleRemoveSurchargeRule = (id: string) => {
    setSurchargeRules((prev) => prev.filter((s) => s.id !== id));
  };

  // Computed Analysis Summary & Exception Metrics
  const analysisSummary = useMemo(() => {
    let totalStops = 0;
    let mappedStops = 0;
    let unmappedStops = 0;
    let driverChargesCount = 0;

    candidateRoutes.forEach((r) => {
      if (r.driverPayout && Number(r.driverPayout) > 0) {
        driverChargesCount++;
      }
      r.stops.forEach((s) => {
        totalStops++;
        if (s.locationId || findMatchingLocation(s.name)) {
          mappedStops++;
        } else {
          unmappedStops++;
        }
      });
    });

    const routesNeedingReview = candidateRoutes.filter((r) => {
      const hasUnmapped = r.stops.some((s) => !s.locationId && !findMatchingLocation(s.name));
      const hasInvalidRate = !r.rate || Number(r.rate) <= 0;
      return hasUnmapped || hasInvalidRate || r.isAmbiguousStructure;
    });

    return {
      totalRoutes: candidateRoutes.length,
      totalStops,
      mappedStops,
      unmappedStops,
      driverChargesCount,
      routesNeedingReviewCount: routesNeedingReview.length,
      readyRoutesCount: candidateRoutes.length - routesNeedingReview.length,
    };
  }, [candidateRoutes, masterLocations]);

  // Filtered Routes for Table Display
  const filteredRoutes = useMemo(() => {
    if (filterMode === 'review') {
      return candidateRoutes.filter((r) =>
        r.stops.some((s) => !s.locationId && !findMatchingLocation(s.name)) || !r.rate || Number(r.rate) <= 0
      );
    }
    if (filterMode === 'ready') {
      return candidateRoutes.filter(
        (r) =>
          r.stops.every((s) => s.locationId || findMatchingLocation(s.name)) &&
          Number(r.rate) > 0
      );
    }
    return candidateRoutes;
  }, [candidateRoutes, filterMode, masterLocations]);

  // Confirm & Execute Atomic Import
  const handleConfirmImport = async () => {
    if (!customerId) {
      toast.error('Please select a customer account.');
      return;
    }
    if (candidateRoutes.length === 0) {
      toast.error('No routes available to import.');
      return;
    }

    try {
      setIsSubmitting(true);
      let uploadedDocId: string | null = selectedCustomerDocId;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('entity_type', 'Customer');
        formData.append('entity_id', customerId);
        formData.append('doc_type', 'Contract');
        const doc = await documentService.upload(formData);
        uploadedDocId = doc.id;
      }

      const routesToSubmit: any[] = [];
      candidateRoutes.forEach((r) => {
        const stopNames = r.stops.map((s) => s.name);
        const originName = stopNames[0] || r.originName || 'Origin';
        const destName = stopNames[stopNames.length - 1] || r.destinationName || 'Destination';
        const waypoints = stopNames.slice(1, -1);

        routesToSubmit.push({
          origin_name: originName,
          waypoints: waypoints,
          destination_name: destName,
          vehicle_class: r.vehicleClass,
          source_vehicle_label: r.sourceVehicleLabel || r.vehicleClass,
          line_type: r.lineType,
          billing_type: r.billingType || null,
          rate: Number(r.rate),
          driver_payout: r.driverPayout.trim() ? Number(r.driverPayout) : null,
          currency: 'SAR',
        });
      });

      const payloadToSubmit = {
        customerId,
        agreement_ref: agreementRef.trim() || undefined,
        valid_from: validFrom || undefined,
        valid_to: validTo || undefined,
        document_id: uploadedDocId || undefined,
        source_type: 'AI_IMPORTED',
        new_locations: [],
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

      await quotationService.atomicImport(payloadToSubmit);

      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['surcharge-rules'] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });

      toast.success(
        `Successfully imported ${routesToSubmit.length} commercial quotation(s) & ${surchargeRules.length} surcharge rule(s)!`
      );
      navigate('/quotations');
    } catch (err: any) {
      const serverError = err?.response?.data?.error;
      const msg = serverError?.message || err?.message || 'Failed to complete atomic quotation import transaction.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      active="quotations"
      title="Import Commercial Quotations"
      breadcrumb="Quotations / Import"
      pageTitle={
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-white shrink-0" />
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              Import Commercial Quotations
              <Badge className="bg-orange-500 text-white border-none font-bold text-[10px]">
                Commercial Workspace
              </Badge>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Upload a quotation, review extracted routes, and import.
            </p>
          </div>
        </div>
      }
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/quotations')}
            className="h-9 font-bold text-xs gap-1.5 rounded-xl border-slate-200"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Quotations
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetForm}
            className="h-9 px-3 text-slate-500 hover:text-slate-700 text-xs font-semibold rounded-xl gap-1.5"
            title="Reset Workspace"
          >
            <RotateCw className="w-3.5 h-3.5" /> Reset
          </Button>
        </div>
      }
    >
      <div className="space-y-6 pb-24">
        {/* SECTION 1: Top Workspace Grid (Upload + Scope/Summary) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Upload Dropzone (6 cols) */}
          <Card className="lg:col-span-6 border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-orange-500" /> Document Upload
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {/* Drag & Drop Box */}
              <div className="p-4 bg-orange-50/30 dark:bg-slate-800/40 rounded-2xl border-2 border-dashed border-orange-200 dark:border-orange-950 flex flex-col items-center justify-center text-center space-y-2.5">
                {isAnalyzing ? (
                  <Loader2 className="w-6 h-6 text-orange-600 animate-spin shrink-0" />
                ) : (
                  <Sparkles className="w-6 h-6 text-orange-600 shrink-0" />
                )}

                {selectedFile ? (
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-orange-200 shadow-2xs text-xs">
                    <FileText className="w-4 h-4 text-orange-500 shrink-0" />
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                      {selectedFile.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ({(selectedFile.size / 1024).toFixed(0)} KB)
                    </span>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="text-rose-500 hover:text-rose-700 ml-1 text-sm font-bold"
                      title="Remove file"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Drag &amp; drop quotation document
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Supported: PDF, Excel (.xlsx), CSV, Image
                    </p>
                  </div>
                )}

                <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-extrabold shadow-2xs transition-all hover:scale-105 active:scale-95">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{selectedFile ? 'Replace File' : 'Choose File'}</span>
                  <input
                    type="file"
                    accept=".pdf,.xlsx,.xls,.csv,.docx,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              {/* Form Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Customer Account *
                  </Label>
                  <Select
                    value={customerId}
                    onValueChange={(val) => {
                      setCustomerId(val);
                      if (selectedFile) handleRunAiAnalysis(selectedFile, val);
                    }}
                  >
                    <SelectTrigger className="h-8.5 text-xs bg-white dark:bg-slate-900 border-slate-200 font-semibold rounded-xl">
                      <SelectValue placeholder="Select Customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          🏢 {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Agreement / Quote Ref
                  </Label>
                  <Input
                    value={agreementRef}
                    onChange={(e) => setAgreementRef(e.target.value)}
                    placeholder="e.g. QT-2026-01"
                    className="h-8.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Valid From</Label>
                  <Input
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    className="h-8 text-xs font-semibold bg-white dark:bg-slate-900 border-slate-200 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Valid Until</Label>
                  <Input
                    type="date"
                    value={validTo}
                    onChange={(e) => setValidTo(e.target.value)}
                    className="h-8 text-xs font-semibold bg-white dark:bg-slate-900 border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Primary Analyze Button */}
              <Button
                onClick={() => handleRunAiAnalysis()}
                disabled={isAnalyzing || (!selectedFile && !selectedCustomerDocId)}
                className="w-full h-9 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-extrabold text-xs rounded-xl shadow-2xs"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Analyze Document
              </Button>
            </CardContent>
          </Card>

          {/* Right Column: AI Scope (BEFORE) vs Analysis Summary (AFTER) (6 cols) */}
          <Card className="lg:col-span-6 border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 flex flex-col justify-between">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>{analysisDone ? 'Analysis Summary' : 'AI Scope'}</span>
                {analysisDone && (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Analysis Complete
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-4 flex-1 flex flex-col justify-center space-y-4">
              {!analysisDone ? (
                /* BEFORE ANALYSIS: Compact AI Scope Block */
                <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="text-xs font-extrabold text-slate-600 dark:text-slate-400 block uppercase tracking-wider">
                    AI extracts
                  </span>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span>Routes &amp; Stops · Rates · Vehicles · Validity · Surcharges</span>
                  </div>
                  <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
                    Upload a file and click "Analyze Document" to extract commercial rate cards.
                  </p>
                </div>
              ) : (
                /* AFTER ANALYSIS: Compact Analysis Summary & Exceptions List */
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 bg-emerald-50/60 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900">
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-extrabold">
                      {analysisSummary.totalRoutes} Routes
                    </span>
                    <span>·</span>
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-extrabold">
                      {analysisSummary.mappedStops} Locations Matched
                    </span>
                    {analysisSummary.unmappedStops > 0 && (
                      <>
                        <span>·</span>
                        <span className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold">
                          {analysisSummary.unmappedStops} Need Mapping
                        </span>
                      </>
                    )}
                  </div>

                  {/* Bulleted Status Indicators */}
                  <div className="space-y-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Routes &amp; Rates extracted</span>
                    </div>

                    {analysisSummary.unmappedStops === 0 ? (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>All location stops mapped to canonical records</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{analysisSummary.unmappedStops} location stop(s) need mapping</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-slate-500">
                      {analysisSummary.driverChargesCount > 0 ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{analysisSummary.driverChargesCount} Driver Charges extracted</span>
                        </>
                      ) : (
                        <>
                          <span className="text-slate-400 font-black ml-1">—</span>
                          <span>Driver Charges not provided in source (stored as NULL)</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-slate-500">
                      {surchargeRules.length > 0 ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{surchargeRules.length} Accessorial Surcharge Rule(s) extracted</span>
                        </>
                      ) : (
                        <>
                          <span className="text-slate-400 font-black ml-1">—</span>
                          <span>No Accessorial Surcharges extracted</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SECTION 2: Extracted Quotations Dominant Ledger */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <CardTitle className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-orange-500" /> Extracted Quotations
              </CardTitle>
              <Badge className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 font-bold text-xs">
                {candidateRoutes.length} routes extracted
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              {/* Segmented Filter Mode Toggle */}
              {candidateRoutes.length > 0 && (
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setFilterMode('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      filterMode === 'all'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    All ({candidateRoutes.length})
                  </button>
                  <button
                    onClick={() => setFilterMode('review')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      filterMode === 'review'
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'text-slate-500 hover:text-amber-600'
                    }`}
                  >
                    Needs Review ({analysisSummary.routesNeedingReviewCount})
                  </button>
                  <button
                    onClick={() => setFilterMode('ready')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      filterMode === 'ready'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-500 hover:text-emerald-600'
                    }`}
                  >
                    Ready ({analysisSummary.readyRoutesCount})
                  </button>
                </div>
              )}

              {/* Surcharges Panel Trigger Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsSurchargeModalOpen(true)}
                className="h-8 text-xs font-bold gap-1 rounded-xl border-slate-200 text-slate-700"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-orange-500" />
                Surcharges ({surchargeRules.length})
              </Button>

              {/* Add Manually Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCandidateRoute}
                className="h-8 text-xs font-bold gap-1 rounded-xl border-orange-200 text-orange-700 dark:border-orange-900 dark:text-orange-400 hover:bg-orange-50"
              >
                <Plus className="w-3.5 h-3.5" /> Add Manually
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-extrabold text-[11px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3 w-[36%]">Route / Stops &amp; Canonical Mapping</th>
                  <th className="p-3">Vehicle Class</th>
                  <th className="p-3">Line Type</th>
                  <th className="p-3">Billing Type</th>
                  <th className="p-3">Billing Rate (SAR)</th>
                  <th className="p-3">Driver Charge</th>
                  <th className="p-3">Valid From</th>
                  <th className="p-3">Valid Until</th>
                  <th className="p-3">Surcharges</th>
                  <th className="p-3 text-right">Status / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {filteredRoutes.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-xs text-slate-400">
                      {candidateRoutes.length === 0
                        ? 'No routes extracted yet. Upload a document file above or click "+ Add Manually".'
                        : 'No routes match the selected filter mode.'}
                    </td>
                  </tr>
                ) : (
                  filteredRoutes.map((route, rIdx) => {
                    const hasUnmappedStops = route.stops.some(
                      (s) => !s.locationId && !findMatchingLocation(s.name)
                    );
                    const isReady = !hasUnmappedStops && Number(route.rate) > 0;

                    return (
                      <tr key={route.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 align-top">
                        {/* Index */}
                        <td className="p-3 text-center font-bold text-slate-400 text-[11px]">
                          {rIdx + 1}
                        </td>

                        {/* Route / Stop Display & Mapping Cell */}
                        <td className="p-3 space-y-2">
                          {/* Route Stop Sequence Flow */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {route.stops.map((stop, sIdx) => {
                              const mappedLocation = stop.locationId
                                ? masterLocations.find((m) => m.id === stop.locationId)
                                : findMatchingLocation(stop.name);
                              const isMapped = !!mappedLocation;

                              return (
                                <React.Fragment key={stop.id}>
                                  {sIdx > 0 && (
                                    <span className="text-orange-500 font-black text-xs">➔</span>
                                  )}

                                  {/* Stop Pill with Mapping Indicator */}
                                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px]">
                                    <span className="text-[10px] font-extrabold text-slate-400">
                                      {stop.role ? stop.role : `Stop ${sIdx + 1}`}:
                                    </span>

                                    {isMapped ? (
                                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
                                        <Check className="w-3 h-3 text-emerald-600" />
                                        {mappedLocation?.name || stop.name}
                                      </span>
                                    ) : (
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <button
                                            type="button"
                                            className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-bold bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200 text-[10px] cursor-pointer"
                                          >
                                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                                            {stop.name} — Map
                                          </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-64 p-3 z-[9999]" align="start">
                                          <div className="space-y-2 text-xs">
                                            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                                              <span>Map Canonical Location</span>
                                            </div>
                                            <p className="text-[11px] text-slate-400">
                                              Original text: <span className="font-bold text-slate-700">{stop.name}</span>
                                            </p>
                                            <Select
                                              value={stop.locationId || ''}
                                              onValueChange={(val) =>
                                                handleMapStopLocation(route.id, stop.id, val)
                                              }
                                            >
                                              <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-200">
                                                <SelectValue placeholder="Select existing location" />
                                              </SelectTrigger>
                                              <SelectContent className="z-[9999]">
                                                {masterLocations.map((m) => (
                                                  <SelectItem key={m.id} value={m.id}>
                                                    📍 {m.name} ({m.code})
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>

                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              onClick={() =>
                                                handleOpenCreateLocation(route.id, stop.id, stop.name)
                                              }
                                              className="w-full h-7 text-xs font-bold text-orange-600 border-orange-200 hover:bg-orange-50 gap-1 rounded-lg"
                                            >
                                              <Plus className="w-3 h-3" /> Create Location
                                            </Button>
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                    )}

                                    {route.stops.length > 2 && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveStopFromRoute(route.id, stop.id)}
                                        className="text-rose-500 hover:text-rose-700 text-xs font-bold ml-1 cursor-pointer"
                                        title="Remove stop"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                </React.Fragment>
                              );
                            })}

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddStopToRoute(route.id)}
                              className="h-6 text-[10px] font-bold px-2 text-orange-700 dark:text-orange-300 border-orange-200 hover:bg-orange-50 rounded-lg gap-0.5"
                            >
                              <Plus className="w-3 h-3" /> Stop
                            </Button>
                          </div>

                          {/* Raw source label & structure choice */}
                          {route.sourceLabel && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              Source text: <span className="text-slate-600 dark:text-slate-300">{route.sourceLabel}</span>
                            </div>
                          )}
                        </td>

                        {/* Vehicle Class */}
                        <td className="p-3">
                          <Select
                            value={route.vehicleClass}
                            onValueChange={(val) =>
                              handleUpdateCandidateRoute(route.id, { vehicleClass: val })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-200 font-semibold rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
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
                        </td>

                        {/* Line Type */}
                        <td className="p-3">
                          <Select
                            value={route.lineType}
                            onValueChange={(val) =>
                              handleUpdateCandidateRoute(route.id, { lineType: val })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-200 font-semibold rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SINGLE_TRIP">Single Trip</SelectItem>
                              <SelectItem value="ROUND_TRIP">Round Trip</SelectItem>
                              <SelectItem value="10_HRS">10 Hrs Duty</SelectItem>
                              <SelectItem value="12_HRS">12 Hrs Duty</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Billing Type */}
                        <td className="p-3">
                          <Select
                            value={route.billingType}
                            onValueChange={(val) =>
                              handleUpdateCandidateRoute(route.id, { billingType: val })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-200 font-semibold rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EXTRA">Extra</SelectItem>
                              <SelectItem value="MONTHLY">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Billing Rate */}
                        <td className="p-3">
                          <Input
                            type="number"
                            value={route.rate}
                            onChange={(e) =>
                              handleUpdateCandidateRoute(route.id, { rate: e.target.value })
                            }
                            placeholder="1000"
                            className="h-8 text-xs font-extrabold text-orange-600 bg-white dark:bg-slate-900 border-slate-200 rounded-xl"
                          />
                        </td>

                        {/* Driver Charge (Displays '—' placeholder if omitted, stores NULL) */}
                        <td className="p-3">
                          <Input
                            type="number"
                            value={route.driverPayout}
                            onChange={(e) =>
                              handleUpdateCandidateRoute(route.id, { driverPayout: e.target.value })
                            }
                            placeholder="—"
                            className="h-8 text-xs font-bold text-slate-500 bg-white dark:bg-slate-900 border-slate-200 rounded-xl placeholder:text-slate-400"
                          />
                        </td>

                        {/* Valid From */}
                        <td className="p-3">
                          <Input
                            type="date"
                            value={route.validFrom || validFrom}
                            onChange={(e) =>
                              handleUpdateCandidateRoute(route.id, { validFrom: e.target.value })
                            }
                            className="h-8 text-[11px] font-semibold bg-white dark:bg-slate-900 border-slate-200 rounded-xl"
                          />
                        </td>

                        {/* Valid Until */}
                        <td className="p-3">
                          <Input
                            type="date"
                            value={route.validTo || validTo}
                            onChange={(e) =>
                              handleUpdateCandidateRoute(route.id, { validTo: e.target.value })
                            }
                            className="h-8 text-[11px] font-semibold bg-white dark:bg-slate-900 border-slate-200 rounded-xl"
                          />
                        </td>

                        {/* Surcharges */}
                        <td className="p-3">
                          <Badge
                            onClick={() => setIsSurchargeModalOpen(true)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 text-[10px] font-bold cursor-pointer"
                          >
                            {surchargeRules.length} rules · Edit
                          </Badge>
                        </td>

                        {/* Status / Action */}
                        <td className="p-3 text-right space-y-1">
                          {isReady ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-bold">
                              ✓ Ready
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] font-bold">
                              ⚠ Needs Review
                            </Badge>
                          )}
                          <div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveCandidateRoute(route.id)}
                              className="h-7 w-7 text-rose-500 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Subtle Footer Note */}
        <p className="text-[11px] text-slate-400 text-center font-medium">
          Driver Charge remains empty (NULL) when not provided in the source document.
        </p>

        {/* SECTION 3: Sticky Bottom Action Bar (when extracted results exist) */}
        {candidateRoutes.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 p-3 px-6 shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800 dark:text-slate-200">
              <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                {candidateRoutes.length} routes
              </span>
              {analysisSummary.routesNeedingReviewCount > 0 && (
                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-lg flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  {analysisSummary.routesNeedingReviewCount} need review
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/quotations')}
                className="h-9 px-4 font-bold text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmImport}
                disabled={isSubmitting || candidateRoutes.length === 0 || !customerId}
                className="h-9 px-6 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
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
        )}
      </div>

      {/* Quick Location Creation Dialog */}
      <Dialog open={isCreateLocOpen} onOpenChange={setIsCreateLocOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-sm font-black flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <MapPin className="w-4 h-4 text-orange-500" /> + Create Canonical Location
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Location Name *</Label>
              <Input
                value={newLocName}
                onChange={(e) => setNewLocName(e.target.value)}
                placeholder="e.g. Dammam Industrial Zone"
                className="h-8.5 text-xs bg-white dark:bg-slate-900 border-slate-200 rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">City</Label>
              <Input
                value={newLocCity}
                onChange={(e) => setNewLocCity(e.target.value)}
                placeholder="e.g. Dammam"
                className="h-8.5 text-xs bg-white dark:bg-slate-900 border-slate-200 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateLocOpen(false)}
              className="h-8 text-xs font-semibold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveNewLocation}
              className="h-8 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl"
            >
              Create &amp; Map Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Surcharge Rules Editor Dialog */}
      <Dialog open={isSurchargeModalOpen} onOpenChange={setIsSurchargeModalOpen}>
        <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 rounded-2xl p-5">
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
            <DialogTitle className="text-sm font-black flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <FileSpreadsheet className="w-4 h-4 text-orange-500" /> Accessorial Surcharge Rules ({surchargeRules.length})
            </DialogTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddSurchargeRule}
              className="h-7 text-xs font-bold gap-1 rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              <Plus className="w-3.5 h-3.5" /> Add Surcharge Rule
            </Button>
          </DialogHeader>

          <div className="py-3 max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 font-extrabold text-[11px] uppercase">
                <tr>
                  <th className="p-2">Charge Type</th>
                  <th className="p-2">Unit / Basis</th>
                  <th className="p-2">Vehicle Restriction</th>
                  <th className="p-2">Rate (SAR)</th>
                  <th className="p-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {surchargeRules.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-xs text-slate-400">
                      No accessorial surcharge rules added. Click "+ Add Surcharge Rule" to set fee schedules.
                    </td>
                  </tr>
                ) : (
                  surchargeRules.map((rule) => (
                    <tr key={rule.id}>
                      <td className="p-1.5">
                        <Input
                          value={rule.chargeType}
                          onChange={(e) =>
                            setSurchargeRules((prev) =>
                              prev.map((s) => (s.id === rule.id ? { ...s, chargeType: e.target.value } : s))
                            )
                          }
                          placeholder="e.g. Extra Stop Fee"
                          className="h-7.5 text-xs bg-white dark:bg-slate-900 border-slate-200 font-semibold"
                        />
                      </td>
                      <td className="p-1.5">
                        <Input
                          value={rule.unit}
                          onChange={(e) =>
                            setSurchargeRules((prev) =>
                              prev.map((s) => (s.id === rule.id ? { ...s, unit: e.target.value } : s))
                            )
                          }
                          placeholder="per stop / per day"
                          className="h-7.5 text-xs bg-white dark:bg-slate-900 border-slate-200"
                        />
                      </td>
                      <td className="p-1.5">
                        <Input
                          value={rule.vehicleType}
                          onChange={(e) =>
                            setSurchargeRules((prev) =>
                              prev.map((s) => (s.id === rule.id ? { ...s, vehicleType: e.target.value } : s))
                            )
                          }
                          placeholder="All or 10 TON"
                          className="h-7.5 text-xs bg-white dark:bg-slate-900 border-slate-200"
                        />
                      </td>
                      <td className="p-1.5">
                        <Input
                          type="number"
                          value={rule.rate}
                          onChange={(e) =>
                            setSurchargeRules((prev) =>
                              prev.map((s) => (s.id === rule.id ? { ...s, rate: e.target.value } : s))
                            )
                          }
                          placeholder="150"
                          className="h-7.5 text-xs font-bold text-orange-600 bg-white dark:bg-slate-900 border-slate-200"
                        />
                      </td>
                      <td className="p-1.5 text-right">
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

          <DialogFooter className="pt-2 border-t border-slate-100">
            <Button
              size="sm"
              onClick={() => setIsSurchargeModalOpen(false)}
              className="h-8 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl"
            >
              Done &amp; Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
