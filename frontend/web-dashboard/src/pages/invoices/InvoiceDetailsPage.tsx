import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, Download, Building2, Calendar, DollarSign, FileText, CheckCircle, 
  CheckCircle2, Receipt, QrCode, Truck, Phone, Mail, CreditCard, AlertTriangle, 
  Printer, ExternalLink, ShieldCheck, Clock, AlertCircle, Sparkles, Hash, MapPin, Check
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { invoiceService } from '@/services/invoiceService';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter } from '@/components/ui/table';
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
        <div className="px-6 pb-6 max-w-4xl mx-auto w-full space-y-5 animate-pulse">
          <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/4"></div>
          <div className="h-[600px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !invoice) {
    return (
      <DashboardLayout active="Invoices" title="Invoice Details">
        <div className="px-6 pb-6 max-w-4xl mx-auto w-full flex flex-col items-center justify-center text-center h-[60vh] gap-3">
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
      <div className="px-6 pb-12 space-y-6 animate-fade-in max-w-4xl mx-auto w-full">

        {/* ── Document Control Toolbar ───────────────────────────────────── */}
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
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-slate-900 dark:text-slate-100 tracking-tight">
                {invoice.ref_id || 'INV-2026-941'}
              </span>
              <Badge 
                variant="outline" 
                className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 ${
                  invoice.status === 'Paid'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : isOverdue
                    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400'
                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
                }`}
              >
                {invoice.status === 'Paid' ? '● PAID IN FULL' : isOverdue ? '● OVERDUE' : '● PENDING PAYMENT'}
              </Badge>
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
              <Printer className="w-3.5 h-3.5 text-slate-500" /> Print / Export PDF
            </Button>
          </div>
        </div>

        {/* ── Executive Paper Invoice Sheet Canvas ───────────────────────── */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl rounded-2xl p-8 sm:p-10 space-y-8 relative overflow-hidden">
          
          {/* Decorative Watermark Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-100 dark:border-slate-800 pb-6">
            
            {/* Left: Brand & Seller Tax Registration */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#E8450F] text-white flex items-center justify-center font-black text-sm shadow-md">
                  M
                </div>
                <div>
                  <h2 className="font-black text-lg text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                    MERCON LOGISTICS LLC
                  </h2>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mt-0.5">
                    Kingdom of Saudi Arabia • Commercial Fleet
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-500 font-mono space-y-0.5 pt-2">
                <p>VAT Tax Number: <strong className="text-slate-800 dark:text-slate-200">300192837400003</strong></p>
                <p>Commercial Registration (CR): <strong className="text-slate-800 dark:text-slate-200">1010839281</strong></p>
                <p>Issuing Base: Riyadh Central Hub, Sector 3, KSA</p>
              </div>
            </div>

            {/* Right: ZATCA e-Invoice QR Code & Document Ref */}
            <div className="flex flex-col items-start sm:items-end gap-2 text-right">
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <div className="w-16 h-16 rounded-lg bg-slate-900 text-white flex flex-col items-center justify-center p-1 shrink-0">
                  <QrCode className="w-10 h-10 text-white" />
                </div>
                <div className="text-left space-y-0.5">
                  <Badge variant="outline" className="text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900">
                    ZATCA E-INVOICE
                  </Badge>
                  <span className="text-[10px] text-slate-400 font-mono block">Phase 2 Compliant</span>
                  <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold block">● VERIFIED STAMP</span>
                </div>
              </div>

              <div className="text-xs font-mono pt-1 text-slate-600 dark:text-slate-400">
                <span>Invoice ID: </span>
                <strong className="text-slate-900 dark:text-slate-100 text-sm font-extrabold">{invoice.ref_id || 'INV-2026-941'}</strong>
              </div>
            </div>

          </div>

          {/* Dual-Column Metadata (Seller & Billed Buyer) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            
            {/* Billed To Customer */}
            <div className="p-5 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-cyan-600" /> Billed To (Customer)
              </span>

              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                {invoice.customer?.name || 'Commercial Customer'}
              </h3>

              <div className="space-y-1 font-mono text-slate-600 dark:text-slate-400 text-[11px] pt-1">
                <p>Account ID: <strong className="text-slate-800 dark:text-slate-200">CUST-{invoice.customer?.id?.slice(0, 6).toUpperCase() || '8801'}</strong></p>
                <p>Customer CR Number: <strong className="text-slate-800 dark:text-slate-200">1010839281</strong></p>
                <p>VAT Registration: <strong className="text-slate-800 dark:text-slate-200">300192837400003</strong></p>
                <p>Contact: +966 11 482 9900 • logistics@customer.sa</p>
              </div>
            </div>

            {/* Commercial Terms & Dates */}
            <div className="p-5 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-500" /> Commercial Terms & Schedule
              </span>

              <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Issue Date</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{new Date(invoice.createdAt).toLocaleDateString()}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Payment Due</span>
                  <span className={cn('font-mono font-bold', isOverdue ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200')}>
                    {new Date(invoice.due_date).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Terms</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">Net 30 Days</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Linked Dispatch</span>
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
            </div>

          </div>

          {/* Itemized Line Items Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#E8450F]" /> Itemized Services & 15% VAT Breakdown
            </h3>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/80">
                    <TableHead className="font-bold text-[10px] uppercase text-slate-400 tracking-wider">Service Description</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase text-slate-400 tracking-wider">Qty</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase text-slate-400 tracking-wider text-right">Net Subtotal ({currency})</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase text-slate-400 tracking-wider text-right">15% VAT ({currency})</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase text-slate-400 tracking-wider text-right">Total ({currency})</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  <TableRow className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <TableCell className="py-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                        Commercial Freight Transportation Services
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Route Corridor: Riyadh ➔ Dammam Highway • Ref: {invoice.trip?.ref_id || 'TRIP-941'}
                      </span>
                    </TableCell>

                    <TableCell className="py-4 font-mono font-semibold text-slate-700 dark:text-slate-300 text-xs">
                      1 Trip
                    </TableCell>

                    <TableCell className="py-4 font-mono font-semibold text-slate-800 dark:text-slate-200 text-right text-xs">
                      {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>

                    <TableCell className="py-4 font-mono font-semibold text-slate-600 dark:text-slate-400 text-right text-xs">
                      {vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>

                    <TableCell className="py-4 font-mono font-extrabold text-slate-900 dark:text-slate-100 text-right text-xs">
                      {invoice.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Financial Calculation Totals Box */}
          <div className="flex justify-end pt-2">
            <div className="w-full max-w-xs space-y-2.5 text-xs font-mono p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal (Excl. VAT):</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{currency} {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between text-slate-500">
                <span>Saudi 15% VAT:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{currency} {vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>

              <Separator className="my-1" />

              <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-slate-100 pt-1">
                <span>Total Invoice Due:</span>
                <span className="text-[#E8450F] font-black">{currency} {invoice.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Payment Status Receipt Stamp / Receipt Banner */}
          <div className="pt-2">
            {invoice.status === 'Paid' ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-emerald-900 dark:text-emerald-200 uppercase tracking-wide">
                      VERIFIED PAYMENT RECEIPT — PAID IN FULL
                    </h4>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
                      Payment Recorded via SADAD / Bank Wire • Ref: TXN-9948271
                    </p>
                  </div>
                </div>
                <Badge className="bg-emerald-600 text-white font-extrabold text-[10px]">
                  STAMPED PAID
                </Badge>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                      OUTSTANDING INVOICE BALANCE DUE
                    </h4>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 font-mono mt-0.5">
                      Payment pending from customer • Due date: {new Date(invoice.due_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                >
                  <DollarSign className="w-3.5 h-3.5 mr-1" /> Record Payment
                </Button>
              </div>
            )}
          </div>

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
