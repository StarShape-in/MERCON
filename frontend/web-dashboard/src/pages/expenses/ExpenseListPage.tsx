import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wallet, Download, Plus, RotateCw, Edit2, Trash2, AlertTriangle, Users, Truck, Eye, ArrowDown, ArrowUp } from 'lucide-react';
import { EXPENSE_CATEGORIES } from '@mercon/shared-types';

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

import { expenseService, Expense } from '@/services/expenseService';
import { exportToCSV } from '@/utils/exportUtils';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import DataTable from '@/components/ui/DataTable';
import DeletedBadge from '@/components/ui/DeletedBadge';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';

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

  const { data: expensesRes, isFetching, refetch } = useQuery({
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

  const handleExport = () => {
    const exportData = records.map((r) => ({
      Ref: r.ref_id || '',
      Category: r.category,
      Status: r.status,
      Date: r.expense_date ? formatInDeploymentTz(r.expense_date, tz, 'MM/dd/yyyy') : '',
      Amount: r.amount,
      Currency: r.currency,
      Payee: r.payee || '',
      Driver: r.driver ? `${r.driver.first_name} ${r.driver.last_name}` : '',
      Vehicle: r.vehicle?.plate_number || '',
      Payment_Method: r.payment_method || '',
      Description: r.description || '',
    }));
    exportToCSV(exportData, `expenses_export_${new Date().toISOString().split('T')[0]}`);
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

  const bulkActions = [
    {
      label: 'Export CSV',
      icon: <Download size={13} />,
      variant: 'secondary' as const,
      onClick: (selectedRows: Expense[]) => {
        const exportData = selectedRows.map((r) => ({
          Ref: r.ref_id || '',
          Category: r.category,
          Status: r.status,
          Date: r.expense_date ? formatInDeploymentTz(r.expense_date, tz, 'MM/dd/yyyy') : '',
          Amount: r.amount,
          Currency: r.currency,
          Payee: r.payee || '',
        }));
        exportToCSV(exportData, `expenses_export_${new Date().toISOString().split('T')[0]}.csv`);
      },
    },
    {
      label: 'Delete Selected',
      icon: <Trash2 size={13} />,
      variant: 'danger' as const,
      onClick: async (selectedRows: Expense[]) => {
        await Promise.all(selectedRows.map((r) => expenseService.delete(r.id)));
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
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
              onClick={handleExport}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300"
            >
              <Download className="h-3.5 w-3.5 text-slate-600" />
              Export CSV
            </Button>

            <Button
              size="sm"
              onClick={handleOpenCreateModal}
              className="h-9 gap-1.5 text-xs font-bold bg-brand hover:bg-brand-hover text-white shadow-xs rounded-md px-4"
            >
              <Plus className="h-4 w-4" />
              Add Expense
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="h-9 w-9 p-0 text-slate-600 border-slate-200 bg-white hover:bg-slate-50 shadow-2xs dark:bg-slate-900 dark:border-slate-800"
              title="Refresh Data"
            >
              <RotateCw className="h-3.5 w-3.5" />
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
            enableSelection={true}
            bulkActions={bulkActions}
            compact={true}
            searchPlaceholder="Search category, payee, driver, or vehicle..."
            searchValue={search}
            onSearchChange={setSearch}
            isLoading={isFetching}
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
