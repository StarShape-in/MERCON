import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, FileText, Building2, Calendar, DollarSign,
  Truck, Hash, StickyNote, CheckCircle2, Clock, MapPin, AlertTriangle
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { invoiceService } from '@/services/invoiceService';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import DeletedBadge from '@/components/ui/DeletedBadge';

function statusBadge(status: string) {
  const map: Record<string, string> = {
    Paid:      'bg-emerald-50 text-emerald-700 border-emerald-200',
    Draft:     'bg-blue-50 text-blue-700 border-blue-200',
    Pending:   'bg-amber-50 text-amber-700 border-amber-300',
    Overdue:   'bg-rose-50 text-rose-700 border-rose-200',
    Cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
  };
  return map[status] ?? 'bg-slate-100 text-slate-500 border-slate-200';
}

export default function InvoiceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tz = useDeploymentTimezone();

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoiceService.getById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <DashboardLayout active="Invoices" title="Invoice Record">
        <div className="px-4 sm:px-6 pb-6 space-y-4 animate-pulse">
          <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/4" />
          <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !invoice) {
    return (
      <DashboardLayout active="Invoices" title="Invoice Record">
        <div className="px-4 sm:px-6 pb-6 flex flex-col items-center justify-center h-[60vh] gap-3 text-center">
          <AlertTriangle className="w-8 h-8 text-rose-500 shrink-0" />
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Invoice Not Found</h2>
          <p className="text-xs text-slate-500">This invoice record does not exist or has been archived.</p>
          <Button onClick={() => navigate('/invoices')} size="sm" className="mt-2 text-xs font-bold bg-brand text-white">
            Back to Billing Ledger
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const inv = invoice as any;
  const trip = inv.trip;
  const customer = inv.customer;

  const pickupStop = trip?.stops?.find((s: any) => s.stop_type === 'Pickup');
  const dropStops  = trip?.stops?.filter((s: any) => s.stop_type === 'Dropoff') ?? [];
  const lastDrop   = dropStops[dropStops.length - 1];

  const origin      = pickupStop?.location?.name ?? pickupStop?.location_name ?? '—';
  const destination = lastDrop?.location?.name ?? lastDrop?.location_name ?? '—';

  const baseBilling = inv.subtotal ?? 0;
  const total       = inv.total_amount ?? 0;
  const extras      = total - baseBilling;

  return (
    <DashboardLayout active="Invoices" title="Invoice Record">
      <div className="px-4 sm:px-6 pb-6 max-w-3xl mx-auto w-full space-y-5 animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigate('/invoices')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Billing Ledger
          </button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={() => trip && navigate(`/trips/${trip.id}`)}
            disabled={!trip}
          >
            <Truck className="w-3.5 h-3.5" /> View Trip
          </Button>
        </div>

        {/* Invoice Header Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">MERCON Invoice Record</p>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">{inv.ref_id || 'INV-DRAFT'}</h1>
            </div>
            <Badge variant="outline" className={`text-xs font-bold px-3 py-1 uppercase tracking-wider ${statusBadge(inv.status)}`}>
              {inv.status}
            </Badge>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Customer</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{customer?.name || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Invoice Date</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {inv.createdAt ? formatInDeploymentTz(inv.createdAt, tz, 'd MMM yyyy') : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Currency</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{inv.currency || 'SAR'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Total Amount</p>
              <p className="text-lg font-black text-slate-900 dark:text-slate-100 font-mono">
                {inv.currency || 'SAR'} {total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* ZATCA / External Reference */}
        {inv.zatca_ref && (
          <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 flex items-start gap-3">
            <Hash className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-0.5">External / ZATCA Reference</p>
              <p className="text-sm font-mono font-bold text-indigo-700 dark:text-indigo-300">{inv.zatca_ref}</p>
              <p className="text-[10px] text-indigo-400 mt-0.5">Stored for tracking only. Generated externally.</p>
            </div>
          </div>
        )}

        {/* Invoicing Notes */}
        {inv.invoicing_note && (
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-start gap-3">
            <StickyNote className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Invoicing Note</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{inv.invoicing_note}</p>
            </div>
          </div>
        )}

        {/* Linked Trip */}
        {trip && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Truck className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Linked Trip</h3>
              <span className="font-mono text-xs font-bold text-brand ml-auto">{trip.ref_id}</span>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Origin</p>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <p className="text-xs text-slate-700 dark:text-slate-300 truncate">{origin}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Destination</p>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-brand shrink-0" />
                  <p className="text-xs text-slate-700 dark:text-slate-300 truncate">{destination}</p>
                </div>
              </div>
              {trip.driver && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Driver</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    {trip.driver.first_name} {trip.driver.last_name}
                    {trip.driver.deletedAt && <DeletedBadge />}
                  </p>
                </div>
              )}
              {trip.vehicle && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Vehicle</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    {trip.vehicle.plate_number}
                    {trip.vehicle.deletedAt && <DeletedBadge />}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Billing Breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Billing Breakdown</h3>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Base Billing Amount</span>
              <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                {inv.currency || 'SAR'} {baseBilling.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {extras > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Additional Charges</span>
                <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {inv.currency || 'SAR'} {extras.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Total</span>
              <span className="font-mono text-base font-black text-slate-900 dark:text-slate-100">
                {inv.currency || 'SAR'} {total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
