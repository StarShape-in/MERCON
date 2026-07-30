import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, Download, Building2, Calendar, DollarSign, FileText, CheckCircle, 
  CheckCircle2, Receipt, QrCode, Truck, Phone, Mail, CreditCard, AlertTriangle, 
  Printer, ExternalLink, ShieldCheck, Clock, AlertCircle 
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { invoiceService, InvoiceStatus } from '@/services/invoiceService';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export default function InvoiceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Bank Wire');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentError, setPaymentError] = useState('');

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoiceService.getById(id!),
    enabled: !!id,
  });

  const recordPaymentMutation = useMutation({
    mutationFn: () => invoiceService.updateStatus(id!, 'Paid'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      setIsPaymentModalOpen(false);
    },
    onError: (err: any) => {
      setPaymentError(err.response?.data?.error?.message || 'Failed to record invoice payment.');
    },
  });

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError('');
    recordPaymentMutation.mutate();
  };

  if (isLoading) {
    return (
      <DashboardLayout active="Invoices" title="Invoice Details">
        <div className="px-6 pb-6 max-w-[1300px] mx-auto w-full space-y-5 animate-pulse">
          <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/4"></div>
          <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !invoice) {
    return (
      <DashboardLayout active="Invoices" title="Invoice Details">
        <div className="px-6 pb-6 max-w-[1300px] mx-auto w-full flex flex-col items-center justify-center text-center h-[60vh] gap-3">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Invoice Record Not Found</h2>
          <p className="text-xs text-slate-500 max-w-md">
            The requested commercial tax invoice does not exist or has been archived.
          </p>
          <Button onClick={() => navigate('/invoices')} size="sm" className="mt-2 text-xs font-bold bg-[#E8450F] text-white">
            Return to Invoice Directory
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Financial Calculations
  const isOverdue = new Date(invoice.due_date) < new Date() && invoice.status !== 'Paid';
  const subtotal = invoice.subtotal || invoice.total_amount * 0.86956;
  const vatAmount = (invoice as any).tax_amount || (invoice.total_amount - subtotal);
  const currency = invoice.currency || 'SAR';

  return (
    <DashboardLayout active="Invoices" title={`Invoice: ${invoice.ref_id || 'INV-941'}`}>
      <div className="px-6 pb-6 space-y-6 animate-fade-in max-w-[1300px] mx-auto w-full">

        {/* ── Top Scope & Header Actions ─────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/invoices')}
              className="h-9 w-9 p-0 text-slate-600 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
              title="Back to Invoices"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  {invoice.ref_id || 'INV-2026-941'}
                </h1>
                <Badge 
                  variant="outline" 
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 ${
                    invoice.status === 'Paid'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : isOverdue
                      ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400'
                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
                  }`}
                >
                  {invoice.status === 'Paid' ? '● Paid' : isOverdue ? '● Overdue' : '● Pending Payment'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                ZATCA Commercial Tax Invoice • Created: <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{new Date(invoice.createdAt).toLocaleDateString()}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {invoice.status !== 'Paid' && (
              <Button
                size="sm"
                onClick={() => setIsPaymentModalOpen(true)}
                className="h-9 gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs px-4"
              >
                <DollarSign className="w-3.5 h-3.5" /> Record Payment
              </Button>
            )}

            {invoice.trip?.id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/trips/${invoice.trip?.id}`)}
                className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs text-slate-700 dark:text-slate-300"
              >
                <Truck className="w-3.5 h-3.5 text-indigo-500" /> Linked Trip: {invoice.trip?.ref_id}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/invoices/${invoice.id}/print`, '_blank')}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs text-slate-700 dark:text-slate-300"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" /> Print / Download PDF
            </Button>
          </div>
        </div>

        {/* ── ZATCA Tax Invoice Executive Header Card ───────────────────── */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs p-6 overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            {/* ZATCA Tax Details & Seller ID */}
            <div className="flex items-center gap-5">
              
              {/* QR Code Placeholder Box */}
              <div className="w-20 h-20 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center border-2 border-slate-700 shadow-md shrink-0 select-none p-1 text-center">
                <QrCode className="w-10 h-10 text-white" />
                <span className="text-[8px] font-mono font-bold tracking-widest text-slate-300 mt-0.5">ZATCA QR</span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                    MERCON Commercial Tax Invoice
                  </h2>
                  <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                    Saudi 15% VAT Compliant
                  </Badge>
                </div>

                <p className="text-xs text-slate-500 font-medium">
                  Seller VAT Tax Number: <span className="font-mono font-extrabold text-slate-800 dark:text-slate-200">300192837400003</span>
                </p>

                <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                  <span>CR: <strong className="text-slate-800 dark:text-slate-200">1010839281</strong></span>
                  <span>•</span>
                  <span>Issuing Hub: <strong className="text-slate-800 dark:text-slate-200">Riyadh Distribution Center</strong></span>
                </div>
              </div>

            </div>

            {/* Total Billing Callout Box */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-right min-w-[220px] shrink-0">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Payable Amount</span>
              <div className="text-2xl font-mono font-black text-[#E8450F] mt-0.5">
                {currency} {invoice.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-400 font-mono block mt-1">
                Incl. 15% VAT ({currency} {vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })})
              </span>
            </div>

          </div>
        </Card>

        {/* ── Billed Customer & Invoice Details 2-Column Grid ───────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Card 1: Billed Customer Account */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-600" /> Billed Corporate Customer
              </CardTitle>

              {invoice.customer?.id && (
                <Button size="sm" variant="ghost" onClick={() => navigate(`/customers/${invoice.customer?.id}`)} className="h-7 text-xs font-bold text-cyan-600">
                  Account Details →
                </Button>
              )}
            </CardHeader>

            <CardContent className="p-5 space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-black text-lg flex items-center justify-center shrink-0">
                  {invoice.customer?.name?.[0]?.toUpperCase() || 'C'}
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    {invoice.customer?.name || 'Commercial Customer'}
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    ID: CUST-{invoice.customer?.id?.slice(0, 6).toUpperCase() || '8801'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 text-slate-600 dark:text-slate-400 font-mono border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 font-sans font-bold uppercase block">Customer CR #</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">1010839281</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-sans font-bold uppercase block">Customer VAT #</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">300192837400003</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Invoice Metadata & Payment Terms */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" /> Invoice Metadata & Commercial Terms
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Issue Date</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{new Date(invoice.createdAt).toLocaleDateString()}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Payment Due Date</span>
                  <span className={cn('font-mono font-bold', isOverdue ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200')}>
                    {new Date(invoice.due_date).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Payment Terms</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">Net 30 Days</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Linked Trip Dispatch</span>
                  {invoice.trip?.id ? (
                    <span 
                      onClick={() => navigate(`/trips/${invoice.trip?.id}`)}
                      className="font-mono font-bold text-[#E8450F] hover:underline cursor-pointer"
                    >
                      {invoice.trip?.ref_id || 'TRIP-941'}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* ── ZATCA Itemized Line Items & VAT Breakdown ───────────────────── */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#E8450F]" /> Itemized Services & 15% VAT Breakdown
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Itemized freight charges, waybill services, and Saudi Value Added Tax calculation.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono font-bold text-slate-500">
              SAR 15% Tax Schedule
            </Badge>
          </CardHeader>

          <CardContent className="p-0">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
                  <th className="px-5 py-3 font-bold text-[10px] uppercase text-slate-400 tracking-wider">Service Description</th>
                  <th className="px-5 py-3 font-bold text-[10px] uppercase text-slate-400 tracking-wider">Qty / Unit</th>
                  <th className="px-5 py-3 font-bold text-[10px] uppercase text-slate-400 tracking-wider text-right">Net Price ({currency})</th>
                  <th className="px-5 py-3 font-bold text-[10px] uppercase text-slate-400 tracking-wider text-right">15% VAT ({currency})</th>
                  <th className="px-5 py-3 font-bold text-[10px] uppercase text-slate-400 tracking-wider text-right">Total Amount ({currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                      Commercial Freight Transportation Services
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Corridor: Riyadh ➔ Dammam Highway • Ref: {invoice.trip?.ref_id || 'TRIP-941'}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                    1 Dispatch
                  </td>
                  <td className="px-5 py-4 font-mono font-semibold text-slate-800 dark:text-slate-200 text-right">
                    {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-4 font-mono font-semibold text-slate-600 dark:text-slate-400 text-right">
                    {vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-4 font-mono font-extrabold text-slate-900 dark:text-slate-100 text-right">
                    {invoice.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Financial Summary Box */}
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
              <div className="w-full max-w-xs space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal (Excl. VAT):</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{currency} {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between text-slate-500">
                  <span>Saudi 15% VAT:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{currency} {vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-slate-100 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span>Total Invoice Amount:</span>
                  <span className="text-[#E8450F] font-black">{currency} {invoice.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* ── Record Payment Modal ─────────────────────────────────────────── */}
      <Dialog open={isPaymentModalOpen} onOpenChange={(open) => !open && setIsPaymentModalOpen(false)}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden border-slate-200 dark:border-slate-800">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-950/20">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-5 h-5 shrink-0" />
              <DialogTitle className="text-base font-extrabold">Record Invoice Payment</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Mark invoice <strong className="text-slate-900 dark:text-slate-100">{invoice.ref_id || invoice.id}</strong> as paid and record bank transaction reference.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePaymentSubmit}>
            <div className="p-6 space-y-4">
              {paymentError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs font-mono">
                <span className="text-slate-500 font-sans">Payment Amount:</span>
                <span className="font-extrabold text-emerald-600 text-sm">{currency} {invoice.total_amount.toLocaleString()}</span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="payment_method" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Payment Method
                </Label>
                <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val)}>
                  <SelectTrigger id="payment_method" className="h-9 text-xs border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank Wire" className="text-xs">Saudi Commercial Bank Wire</SelectItem>
                    <SelectItem value="SADAD" className="text-xs">SADAD Payment Gateway</SelectItem>
                    <SelectItem value="Credit Card" className="text-xs">Corporate Credit Card</SelectItem>
                    <SelectItem value="Cash" className="text-xs">Cash Payout</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="payment_ref" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Transaction / Bank Reference ID
                </Label>
                <Input
                  id="payment_ref"
                  type="text"
                  placeholder="e.g. TXN-9948271"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="h-9 text-xs border-slate-200 dark:border-slate-800"
                />
              </div>
            </div>

            <DialogFooter className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setIsPaymentModalOpen(false); setPaymentError(''); }}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={recordPaymentMutation.isPending}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4"
              >
                {recordPaymentMutation.isPending ? 'Processing...' : 'Confirm Payment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
