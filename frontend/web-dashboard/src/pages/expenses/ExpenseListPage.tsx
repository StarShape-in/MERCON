import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wallet, Download, Plus, RotateCw, Edit2, Trash2, AlertTriangle, Users, Truck, Eye, ArrowDown, ArrowUp, Calendar, CheckSquare, Layers } from 'lucide-react';
import { EXPENSE_CATEGORIES } from '@mercon/shared-types';
import { toast } from 'sonner';

import ExpenseModal from '@/components/expenses/ExpenseModal';
import ExpenseCategoryBadge from '@/components/expenses/ExpenseCategoryBadge';
import { getCategoryTheme } from '@/utils/expenseCategoryColors';
import DashboardLayout from '@/components/layout/DashboardLayout';
import KpiCard from '@/components/ui/KpiCard';
import { MoneyBills, CheckBadge, ClockIcon, DriverBadge } from '@/components/ui/kpi-icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DatePicker } from '@/components/ui/date-picker';

import { expenseService, Expense } from '@/services/expenseService';
import { exportExcelTable, downloadCSVTable } from '@/utils/exportUtils';
import ExportModal, { ExportColumn, ExportFilter } from '@/components/ui/ExportModal';

const EXPENSE_EXPORT_COLUMNS: ExportColumn<Expense>[] = [
  { id: 'ref_id', label: 'Expense ID', accessor: (e) => e.ref_id || `EXP-${e.id.slice(0, 5).toUpperCase()}` },
  { id: 'category', label: 'Category', accessor: (e) => e.category },
  { id: 'status', label: 'Payment Status', accessor: (e) => e.status },
  { id: 'expense_date', label: 'Expense Date', accessor: (e) => (e.expense_date ? new Date(e.expense_date).toLocaleDateString() : '—') },
  { id: 'amount', label: 'Amount', accessor: (e) => (e.amount ? `${e.currency || 'SAR'} ${e.amount.toLocaleString()}` : '0') },
  { id: 'payee', label: 'Payee / Merchant', accessor: (e) => e.payee || '—' },
  { id: 'driver', label: 'Assigned Driver', accessor: (e) => (e.driver ? `${e.driver.first_name} ${e.driver.last_name}` : '—') },
  { id: 'vehicle', label: 'Assigned Vehicle', accessor: (e) => e.vehicle?.plate_number || '—' },
  { id: 'payment_method', label: 'Payment Method', accessor: (e) => e.payment_method || '—' },
  { id: 'description', label: 'Description', accessor: (e) => e.description || '—' },
];

const EXPENSE_EXPORT_FILTERS: ExportFilter<Expense>[] = [
  {
    id: 'status',
    label: 'Payment Status',
    options: [
      { label: 'All Statuses', value: 'All' },
      { label: 'Paid Only', value: 'Paid' },
      { label: 'Pending Only', value: 'Pending' },
    ],
    filterFn: (e, val) => e.status === val,
  },
  {
    id: 'category',
    label: 'Category',
    options: [
      { label: 'All Categories', value: 'All' },
      ...EXPENSE_CATEGORIES.map((cat) => ({ label: cat, value: cat })),
    ],
    filterFn: (e, val) => e.category === val,
  },
];
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import DataTable from '@/components/ui/DataTable';
import DeletedBadge from '@/components/ui/DeletedBadge';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';
import { cn } from '@/lib/utils';

export default function ExpenseListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tz = useDeploymentTimezone();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryFilter, statusFilter, pageSize]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // ── Export Modal State (Matching Drivers Page) ──────────────────────
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedExpensesForExport, setSelectedExpensesForExport] = useState<Expense[]>([]);
  const [exportRange, setExportRange] = useState<'filtered' | 'all' | 'selected'>('filtered');
  const [exportCategory, setExportCategory] = useState<string>('All');
  const [exportStatus, setExportStatus] = useState<string>('All');
  const [exportDatePreset, setExportDatePreset] = useState<'all' | 'this_month' | 'last_30_days' | 'custom'>('all');
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [exportColumns, setExportColumns] = useState<Record<string, boolean>>({
    ref_id: true,
    category: true,
    status: true,
    expense_date: true,
    amount: true,
    currency: true,
    payee: true,
    driver: true,
    vehicle: true,
    payment_method: true,
    description: true,
    created_at: true,
  });

  const EXPORT_COLUMNS_META = [
    { id: 'ref_id', label: 'Expense Ref #' },
    { id: 'category', label: 'Category' },
    { id: 'status', label: 'Payment Status' },
    { id: 'expense_date', label: 'Expense Date' },
    { id: 'amount', label: 'Amount' },
    { id: 'currency', label: 'Currency' },
    { id: 'payee', label: 'Payee / Merchant' },
    { id: 'driver', label: 'Assigned Driver' },
    { id: 'vehicle', label: 'Assigned Truck' },
    { id: 'payment_method', label: 'Payment Method' },
    { id: 'description', label: 'Description' },
    { id: 'created_at', label: 'Logged Date' },
  ];

  const { data: expensesRes, isFetching, isError, refetch } = useQuery({
    queryKey: ['expenses', debouncedSearch, categoryFilter, statusFilter, page, pageSize],
    queryFn: () =>
      expenseService.getAll({
        search: debouncedSearch || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page,
        per_page: pageSize,
      }),
    placeholderData: (prev) => prev,
  });

  // Query all expenses for full database export when export modal is open
  const { data: allExpensesRes } = useQuery({
    queryKey: ['all-expenses-export'],
    queryFn: () => expenseService.getAll({ per_page: 5000 }),
    enabled: isExportOpen,
  });

  const records = [...(expensesRes?.data || [])].sort((a, b) => {
    const dateA = new Date(a.expense_date || a.createdAt || 0).getTime();
    const dateB = new Date(b.expense_date || b.createdAt || 0).getTime();
    return sortOrder === 'latest' ? dateB - dateA : dateA - dateB;
  });

  const kpis = expensesRes?.kpis || {
    total_amount: 0,
    paid_amount: 0,
    pending_amount: 0,
    salary_amount: 0,
    total_count: 0,
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expenseService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setExpenseToDelete(null);
      toast.success('Expense deleted successfully.');
    },
  });

  const handleOpenCreateModal = () => {
    setEditingExpense(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (record: Expense) => {
    setEditingExpense(record);
    setIsModalOpen(true);
  };

  const handleExportSubmit = async () => {
    // 1. Base dataset based on chosen scope
    let baseExpenses: Expense[] = [];

    if (exportRange === 'selected') {
      baseExpenses = selectedExpensesForExport;
    } else if (exportRange === 'all') {
      baseExpenses = allExpensesRes?.data || records;
    } else {
      // 'filtered' view
      baseExpenses = records;
    }

    // 2. Apply additional filters chosen inside the export dialog
    const exportFiltered = baseExpenses.filter((r) => {
      // Category filter
      if (exportCategory !== 'All' && r.category !== exportCategory) return false;

      // Status filter
      if (exportStatus !== 'All' && r.status !== exportStatus) return false;

      // Date Range filter
      if (exportDatePreset === 'this_month') {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const rowMonth = (r.expense_date || r.createdAt || '').slice(0, 7);
        if (rowMonth !== currentMonth) return false;
      } else if (exportDatePreset === 'last_30_days') {
        const past30 = new Date();
        past30.setDate(past30.getDate() - 30);
        const rowDate = new Date(r.expense_date || r.createdAt || 0);
        if (rowDate < past30) return false;
      } else if (exportDatePreset === 'custom') {
        if (exportDateFrom) {
          const fromDate = new Date(exportDateFrom);
          const rowDate = new Date(r.expense_date || r.createdAt || 0);
          if (rowDate < fromDate) return false;
        }
        if (exportDateTo) {
          const toDate = new Date(exportDateTo);
          toDate.setHours(23, 59, 59, 999);
          const rowDate = new Date(r.expense_date || r.createdAt || 0);
          if (rowDate > toDate) return false;
        }
      }

      return true;
    });

    if (exportFiltered.length === 0) {
      toast.error('No expenses match the selected export filters.');
      return;
    }

    // 3. Map selected columns to table headers and cell data
    const headers: string[] = [];
    if (exportColumns.ref_id) headers.push('Ref #');
    if (exportColumns.category) headers.push('Category');
    if (exportColumns.status) headers.push('Status');
    if (exportColumns.expense_date) headers.push('Expense Date');
    if (exportColumns.amount) headers.push('Amount (SAR)');
    if (exportColumns.currency) headers.push('Currency');
    if (exportColumns.payee) headers.push('Payee / Merchant');
    if (exportColumns.driver) headers.push('Assigned Driver');
    if (exportColumns.vehicle) headers.push('Assigned Truck');
    if (exportColumns.payment_method) headers.push('Payment Method');
    if (exportColumns.description) headers.push('Description');
    if (exportColumns.created_at) headers.push('Logged Date');

    if (headers.length === 0) {
      toast.error('Please select at least one column to export.');
      return;
    }

    const dataRows = exportFiltered.map((row) => {
      const cells: any[] = [];
      if (exportColumns.ref_id) cells.push(row.ref_id || `EXP-${row.id.slice(0, 5).toUpperCase()}`);
      if (exportColumns.category) cells.push(row.category);
      if (exportColumns.status) cells.push(row.status);
      if (exportColumns.expense_date) cells.push(row.expense_date ? formatInDeploymentTz(row.expense_date, tz, 'dd/MM/yyyy') : 'N/A');
      if (exportColumns.amount) cells.push(Number(row.amount) || 0);
      if (exportColumns.currency) cells.push(row.currency || 'SAR');
      if (exportColumns.payee) cells.push(row.payee || 'N/A');
      if (exportColumns.driver) cells.push(row.driver ? `${row.driver.first_name} ${row.driver.last_name}` : 'None');
      if (exportColumns.vehicle) cells.push(row.vehicle?.plate_number || 'None');
      if (exportColumns.payment_method) cells.push(row.payment_method || 'N/A');
      if (exportColumns.description) cells.push(row.description || '');
      if (exportColumns.created_at) cells.push(row.createdAt ? formatInDeploymentTz(row.createdAt, tz, 'dd/MM/yyyy HH:mm') : '');
      return cells;
    });

    const fileDate = new Date().toISOString().slice(0, 10);
    if (exportFormat === 'xlsx') {
      await exportExcelTable(
        'MERCON Expenses Ledger',
        headers,
        dataRows,
        `expenses_export_${fileDate}.xlsx`
      );
    } else {
      downloadCSVTable(
        headers,
        dataRows,
        `expenses_export_${fileDate}.csv`
      );
    }

    setIsExportOpen(false);
    toast.success(`Successfully exported ${exportFiltered.length} expense records.`);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Pending') {
      return (
        <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-none rounded-full px-2.5 py-0.5 font-medium text-[11px] flex items-center gap-1.5 shadow-none shrink-0 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
          Pending
        </Badge>
      );
    }
    return (
      <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-none rounded-full px-2.5 py-0.5 font-medium text-[11px] flex items-center gap-1.5 shadow-none shrink-0 w-fit">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
        Paid
      </Badge>
    );
  };

  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  useEffect(() => {
    const selected = selectedIndices.map((idx) => records[idx]).filter(Boolean);
    setSelectedExpensesForExport(selected);
  }, [selectedIndices, records]);

  const bulkActions = [
    {
      label: 'Export Selected',
      icon: <Download size={13} />,
      variant: 'secondary' as const,
      onClick: (selectedRows: Expense[]) => {
        setSelectedExpensesForExport(selectedRows);
        setExportRange('selected');
        setIsExportOpen(true);
      },
    },
    {
      label: 'Delete Selected',
      icon: <Trash2 size={13} />,
      variant: 'danger' as const,
      onClick: async (selectedRows: Expense[]) => {
        await Promise.all(selectedRows.map((r) => expenseService.delete(r.id)));
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        setSelectedIndices([]);
        toast.success(`Deleted ${selectedRows.length} expenses.`);
      },
    },
  ];

  return (
    <DashboardLayout active="Expenses" title="Expenses">
      <div className="px-4 sm:px-6 pb-6 w-full flex flex-col animate-fade-in gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-1">
          <div className="flex items-center gap-3">
            <Wallet className="w-6 h-6 text-orange-500 dark:text-orange-400 shrink-0" />
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Expenses</h1>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setExportRange(selectedExpensesForExport.length > 0 ? 'selected' : 'filtered');
                setIsExportOpen(true);
              }}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300"
            >
              <Download className="h-3.5 w-3.5 text-slate-600" />
              {selectedExpensesForExport.length > 0 ? `Export Selected (${selectedExpensesForExport.length})` : 'Export'}
            </Button>

            <Button
              size="sm"
              onClick={handleOpenCreateModal}
              className="h-9 gap-1.5 text-xs font-bold bg-brand hover:bg-brand-hover text-white shadow-xs rounded-md px-4"
            >
              <Plus className="h-4 w-4" />
              Add Expense
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 shrink-0">
          <KpiCard
            title="TOTAL EXPENSES"
            value={
              <span>
                <span className="text-[16px] font-semibold mr-1.5 opacity-85">SAR</span>
                {kpis.total_amount.toLocaleString()}
              </span>
            }
            variant="brand"
            description={`${kpis.total_count} total records`}
            icon={MoneyBills}
            isActive={statusFilter === 'all'}
            onClick={() => {
              setStatusFilter('all');
              setPage(1);
            }}
          />

          <KpiCard
            title="PAID"
            value={
              <span>
                <span className="text-[16px] font-semibold mr-1.5 opacity-85">SAR</span>
                {kpis.paid_amount.toLocaleString()}
              </span>
            }
            variant="emerald"
            description="Settled expenses"
            icon={CheckBadge}
            isActive={statusFilter === 'Paid'}
            onClick={() => {
              setStatusFilter(statusFilter === 'Paid' ? 'all' : 'Paid');
              setPage(1);
            }}
          />

          <KpiCard
            title="PENDING"
            value={
              <span>
                <span className="text-[16px] font-semibold mr-1.5 opacity-85">SAR</span>
                {kpis.pending_amount.toLocaleString()}
              </span>
            }
            variant="amber"
            description="Awaiting payment"
            icon={ClockIcon}
            isActive={statusFilter === 'Pending'}
            onClick={() => {
              setStatusFilter(statusFilter === 'Pending' ? 'all' : 'Pending');
              setPage(1);
            }}
          />

          <KpiCard
            title="SALARIES"
            value={
              <span>
                <span className="text-[16px] font-semibold mr-1.5 opacity-85">SAR</span>
                {kpis.salary_amount.toLocaleString()}
              </span>
            }
            variant="purple"
            description="Salary + advances"
            icon={DriverBadge}
            isActive={categoryFilter === 'Salary'}
            onClick={() => {
              setCategoryFilter(categoryFilter === 'Salary' ? 'all' : 'Salary');
              setPage(1);
            }}
          />
        </div>

        <div className="w-full flex flex-col">
          <DataTable
            title={
              <span className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-amber-500" />
                <span>Expense Ledger</span>
              </span>
            }
            columns={[
              {
                header: 'Ref #',
                accessor: (r: Expense) => (
                  <Link
                    to={`/expenses/${r.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-mono font-extrabold text-slate-900 dark:text-slate-100 hover:text-brand transition-colors"
                  >
                    {r.ref_id || '—'}
                  </Link>
                ),
              },
              {
                header: 'Category',
                accessor: (r: Expense) => (
                  <ExpenseCategoryBadge category={r.category} />
                ),
              },
              {
                header: 'Date',
                accessor: (r: Expense) => (
                  <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                    {r.expense_date ? formatInDeploymentTz(r.expense_date, tz, 'MM/dd/yyyy') : 'N/A'}
                  </span>
                ),
              },
              {
                header: 'Amount',
                accessor: (r: Expense) => (
                  <span className="font-mono font-extrabold text-rose-600 dark:text-rose-400 text-xs">
                    {r.currency} {(r.amount || 0).toLocaleString()}
                  </span>
                ),
              },
              {
                header: 'Payee / Linked To',
                accessor: (r: Expense) => (
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{r.payee || '—'}</div>
                    {(r.driver || r.vehicle) && (
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                        {r.driver && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {r.driver.first_name} {r.driver.last_name}
                            {r.driver.deletedAt && <DeletedBadge />}
                          </span>
                        )}
                        {r.vehicle && (
                          <span className="flex items-center gap-1">
                            <Truck className="w-3 h-3" />
                            {r.vehicle.plate_number}
                            {r.vehicle.deletedAt && <DeletedBadge />}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                header: 'Payment Method',
                accessor: (r: Expense) => (
                  <span className="text-slate-700 dark:text-slate-300">{r.payment_method || '—'}</span>
                ),
              },
              {
                header: 'Status',
                accessor: (r: Expense) => getStatusBadge(r.status),
              },
              {
                header: 'Actions',
                headerClassName: 'text-right',
                className: 'text-right',
                accessor: (r: Expense) => (
                  <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <Link
                      to={`/expenses/${r.id}`}
                      title="View Expense Details"
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      onClick={() => handleOpenEditModal(r)}
                      title="Edit Expense"
                      className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setExpenseToDelete(r)}
                      title="Delete Expense"
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ),
              },
            ]}
            onRowClick={(r: Expense) => navigate(`/expenses/${r.id}`)}
            data={records}
            compact={true}
            searchPlaceholder="Search category, payee, driver, or vehicle..."
            searchValue={search}
            onSearchChange={setSearch}
            isLoading={isFetching}
            isError={isError}
            emptyTitle="No Expenses Found"
            emptyMessage="There are no expense records matching your search or filter criteria."
            actionsElement={
              !isFetching && records.length === 0 && (categoryFilter !== 'all' || statusFilter !== 'all' || search) ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setCategoryFilter('all');
                    setStatusFilter('all');
                    setSearch('');
                  }}
                  className="text-xs font-semibold h-9"
                >
                  Clear Filters
                </Button>
              ) : !isFetching && records.length === 0 ? (
                <Button size="sm" onClick={handleOpenCreateModal} className="text-xs font-bold bg-brand text-white h-9">
                  + Add First Expense
                </Button>
              ) : undefined
            }
            filterElement={
              <div className="flex items-center gap-3">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9 text-xs w-[160px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {EXPENSE_CATEGORIES.map((c) => {
                      const theme = getCategoryTheme(c);
                      return (
                        <SelectItem key={c} value={c} className="text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${theme.dot}`} />
                            <span>{c}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 text-xs w-[140px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(prev => prev === 'latest' ? 'oldest' : 'latest')}
                  className="h-9 gap-1.5 text-xs font-medium bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs"
                >
                  {sortOrder === 'latest' ? (
                    <><ArrowDown className="w-3.5 h-3.5 text-blue-600" /> Latest First</>
                  ) : (
                    <><ArrowUp className="w-3.5 h-3.5 text-amber-600" /> Oldest First</>
                  )}
                </Button>
              </div>
            }
            enableSelection={true}
            selectedIndices={selectedIndices}
            onSelectionChange={setSelectedIndices}
            bulkActions={bulkActions}
            onExport={() => {
              setExportRange(selectedExpensesForExport.length > 0 ? 'selected' : 'filtered');
              setIsExportOpen(true);
            }}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            currentPage={page}
            totalPages={expensesRes?.meta?.total_pages || 1}
            totalRecords={expensesRes?.meta?.total || records.length}
            onPageChange={setPage}
          />
        </div>
      </div>

      <ExpenseModal open={isModalOpen} onOpenChange={setIsModalOpen} editingExpense={editingExpense} onSuccess={() => refetch()} />

      {/* ── Universal Export Modal ────────────────────────────────────── */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Export Expenses Ledger"
        description="Choose your export preferences, filters, and columns."
        fileNamePrefix="expenses_ledger"
        sheetName="Expenses"
        subtitle="MERCON Logistics Fleet Expenses Ledger"
        filteredData={records}
        allData={allExpensesRes?.data || records}
        selectedData={selectedExpensesForExport}
        totalCount={kpis.total_count || records.length}
        columns={EXPENSE_EXPORT_COLUMNS}
        filters={EXPENSE_EXPORT_FILTERS}
        formats={['xlsx', 'csv', 'pdf']}
        rowDateAccessor={(e) => e.expense_date || e.createdAt}
      />

      <Dialog open={!!expenseToDelete} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden border-slate-200 dark:border-slate-800">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-950/20">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <DialogTitle className="text-base font-extrabold">Delete Expense</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Are you sure you want to delete this{' '}
              <strong className="text-slate-900 dark:text-slate-100">{expenseToDelete?.category}</strong> expense of{' '}
              <strong className="text-slate-900 dark:text-slate-100">
                {expenseToDelete?.currency} {expenseToDelete?.amount.toLocaleString()}
              </strong>
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setExpenseToDelete(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => expenseToDelete && deleteMutation.mutate(expenseToDelete.id)}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-4"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
