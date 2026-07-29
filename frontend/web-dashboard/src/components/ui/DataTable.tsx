import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CheckSquare } from 'lucide-react';
import Btn from './Btn';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';
import { Input } from './input';

interface Column<T> {
  header: string;
  accessor: (row: T) => React.ReactNode;
}

export interface BulkAction<T> {
  label: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  onClick: (selectedRows: T[]) => void | Promise<void>;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  // Filters
  filterElement?: React.ReactNode;
  // Export Action
  onExport?: () => void;
  // Pagination
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  totalRecords?: number;
  // Selection
  enableSelection?: boolean;
  onSelectionChange?: (selectedIndices: number[]) => void;
  // Row Click
  onRowClick?: (row: T) => void;
  // Bulk Actions
  bulkActions?: BulkAction<T>[];
}

export default function DataTable<T>({
  columns,
  data,
  isLoading = false,
  searchPlaceholder = 'Search records...',
  searchValue,
  onSearchChange,
  filterElement,
  onExport,
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  totalRecords,
  enableSelection = true,
  onSelectionChange,
  onRowClick,
  bulkActions = [],
}: DataTableProps<T>) {
  const showToolbar = onSearchChange !== undefined || filterElement !== undefined || onExport !== undefined || enableSelection;

  // Internal state for client-side pagination when onPageChange is not passed
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(pageSize || 10);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // Reset internal page if data length changes drastically
  useEffect(() => {
    if (onPageChange === undefined) {
      setInternalPage(1);
    }
  }, [data.length, searchValue]);

  const isServerPaginated = onPageChange !== undefined;
  const activePage = isServerPaginated ? (currentPage || 1) : internalPage;
  const activePageSize = pageSize !== undefined ? pageSize : internalPageSize;

  const totalCount = totalRecords !== undefined ? totalRecords : data.length;
  const computedTotalPages = totalPages !== undefined 
    ? totalPages 
    : Math.max(1, Math.ceil(totalCount / activePageSize));

  // If server paginated, data is already sliced by backend. If client paginated, slice here.
  const displayData = isServerPaginated 
    ? data 
    : data.slice((activePage - 1) * activePageSize, activePage * activePageSize);

  const handlePageChange = (newPage: number) => {
    const validPage = Math.max(1, Math.min(newPage, computedTotalPages));
    if (isServerPaginated) {
      onPageChange?.(validPage);
    } else {
      setInternalPage(validPage);
    }
    setSelectedIndices(new Set());
    onSelectionChange?.([]);
  };

  const handlePageSizeChange = (newSize: number) => {
    if (onPageSizeChange) {
      onPageSizeChange(newSize);
    } else {
      setInternalPageSize(newSize);
      setInternalPage(1);
    }
    if (isServerPaginated && onPageChange) {
      onPageChange(1);
    }
    setSelectedIndices(new Set());
    onSelectionChange?.([]);
  };

  const handleSelectAll = () => {
    if (selectedIndices.size === displayData.length && displayData.length > 0) {
      setSelectedIndices(new Set());
      onSelectionChange?.([]);
    } else {
      const newSet = new Set(displayData.map((_, i) => i));
      setSelectedIndices(newSet);
      onSelectionChange?.(Array.from(newSet));
    }
  };

  const handleSelectRow = (index: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedIndices(newSet);
    onSelectionChange?.(Array.from(newSet));
  };

  const fromIndex = totalCount === 0 ? 0 : (activePage - 1) * activePageSize + 1;
  const toIndex = totalCount === 0 ? 0 : Math.min(
    activePage * activePageSize,
    isServerPaginated ? (fromIndex + displayData.length - 1) : totalCount
  );

  return (
    <div className="bg-white rounded-lg border border-black/[0.06] shadow-sm overflow-hidden flex flex-col h-full animate-fade-in">
      {/* Table Toolbar */}
      {showToolbar && (
        <div className="shrink-0 p-4 border-b border-black/[0.06] flex flex-wrap items-center justify-between gap-3 bg-[#FAFAFA]">
          {selectedIndices.size > 0 && bulkActions.length > 0 ? (
            <div className="flex items-center gap-3 w-full bg-blue-50/50 p-1 rounded-lg">
              <span className="text-sm font-semibold text-blue-700 px-2">
                {selectedIndices.size} selected
              </span>
              <div className="h-4 w-[1px] bg-blue-200" />
              <div className="flex items-center gap-2 flex-1 flex-wrap">
                {bulkActions.map((action, i) => (
                  <Btn
                    key={i}
                    label={action.label}
                    icon={action.icon}
                    variant={action.variant || 'secondary'}
                    size="sm"
                    onClick={() => {
                      const selectedRows = Array.from(selectedIndices).map(idx => displayData[idx]);
                      action.onClick(selectedRows);
                    }}
                  />
                ))}
              </div>
              <Btn
                label="Clear"
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
              />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                {enableSelection && (
                  <Btn
                    label={selectedIndices.size === displayData.length && displayData.length > 0 ? "Deselect All" : "Select All"}
                    variant="secondary"
                    size="sm"
                    icon={<CheckSquare size={13} />}
                    onClick={handleSelectAll}
                    className="whitespace-nowrap"
                  />
                )}
                {onSearchChange !== undefined && (
                  <div className="relative flex-1 max-w-sm">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9898A4]" />
                    <Input
                      type="text"
                      placeholder={searchPlaceholder}
                      value={searchValue}
                      onChange={(e) => onSearchChange(e.target.value)}
                      className="w-full pl-9 bg-white border-black/[0.07] focus-visible:ring-[#E8450F]/20 rounded-lg"
                    />
                  </div>
                )}
                {filterElement}
              </div>
              {onExport && (
                <Btn
                  label="Export"
                  variant="secondary"
                  size="sm"
                  icon={<Download size={13} />}
                  onClick={onExport}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Main Table Content */}
      <div className="flex-1 overflow-auto min-h-0">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow className="bg-[#FAFAFA] hover:bg-[#FAFAFA]">
              {enableSelection && (
                <TableHead className="w-[40px] px-5">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-[#E8450F] focus:ring-[#E8450F] cursor-pointer"
                    checked={selectedIndices.size === displayData.length && displayData.length > 0}
                    onChange={handleSelectAll}
                  />
                </TableHead>
              )}
              {columns.map((c, i) => (
                <TableHead key={i} className="text-[10px] font-bold uppercase tracking-wider text-[#9898A4] h-10 px-5">
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading state skeleton rows
              Array.from({ length: activePageSize > 10 ? 10 : activePageSize }).map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {enableSelection && (
                    <TableCell className="px-5 py-3 w-[40px]">
                      <div className="h-4 skeleton w-4 rounded"></div>
                    </TableCell>
                  )}
                  {columns.map((_, colIndex) => (
                    <TableCell key={colIndex} className="px-5 py-3">
                      <div className="h-4 skeleton w-full max-w-[120px]"></div>
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : displayData.length === 0 ? (
              // Empty State
              <TableRow>
                <TableCell colSpan={enableSelection ? columns.length + 1 : columns.length} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center gap-2 max-w-xs mx-auto">
                    <SlidersHorizontal size={36} className="text-gray-300 stroke-[1.5]" />
                    <p className="text-sm font-bold text-[#111] mt-2">No Records Found</p>
                    <p className="text-xs text-[#6E6E80] text-center">There are no entries matching your current filters or search query.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              // Data Rows
              displayData.map((row, rowIndex) => (
                <TableRow
                  key={rowIndex}
                  className={`animate-fade-in transition-colors ${onRowClick ? 'cursor-pointer hover:bg-[#F0F0F0]' : 'hover:bg-[#FAFAFA]'}`}
                  style={{ animationDelay: `${rowIndex * 0.02}s` }}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (
                      target.tagName.toLowerCase() === 'input' ||
                      target.tagName.toLowerCase() === 'button' ||
                      target.closest('button') ||
                      target.closest('a')
                    ) {
                      return;
                    }
                    onRowClick?.(row);
                  }}
                >
                  {enableSelection && (
                    <TableCell className="px-5 py-3 border-b border-[#F5F5F7] w-[40px]">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-[#E8450F] focus:ring-[#E8450F] cursor-pointer"
                        checked={selectedIndices.has(rowIndex)}
                        onChange={() => handleSelectRow(rowIndex)}
                      />
                    </TableCell>
                  )}
                  {columns.map((col, colIndex) => (
                    <TableCell key={colIndex} className="px-5 py-3 text-[13px] border-b border-[#F5F5F7]">
                      {col.accessor(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="shrink-0 p-3 px-4 border-t border-black/[0.06] flex flex-wrap items-center justify-between gap-3 bg-[#FAFAFA] text-xs font-semibold text-[#6E6E80]">
        {/* Left Side: Rows Per Page & Summary Count */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Rows per page:</span>
            <select
              value={activePageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="h-8 px-2.5 py-1 bg-white border border-black/[0.1] rounded-md text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#E8450F] cursor-pointer shadow-2xs"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <span className="text-slate-500 font-medium border-l border-black/[0.08] pl-4 hidden sm:inline">
            Showing <span className="font-bold text-slate-900">{fromIndex}</span> to <span className="font-bold text-slate-900">{toIndex}</span> of <span className="font-bold text-slate-900">{totalCount}</span> entries
          </span>
        </div>

        {/* Right Side: Page Navigation Buttons */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={() => handlePageChange(1)}
            disabled={activePage === 1 || isLoading}
            title="First Page"
            className="p-1.5 rounded-lg border border-black/[0.07] bg-white text-[#444] hover:bg-gray-50 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronsLeft size={14} />
          </button>

          <button
            onClick={() => handlePageChange(activePage - 1)}
            disabled={activePage === 1 || isLoading}
            title="Previous Page"
            className="p-1.5 rounded-lg border border-black/[0.07] bg-white text-[#444] hover:bg-gray-50 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={14} />
          </button>

          <div className="flex items-center gap-1 px-1.5">
            <span className="px-2 py-0.5 text-xs font-bold text-slate-900 bg-white rounded border border-black/[0.08] shadow-2xs">
              {activePage}
            </span>
            <span className="text-slate-400 text-xs font-medium">/</span>
            <span className="text-slate-600 text-xs font-semibold">{computedTotalPages}</span>
          </div>

          <button
            onClick={() => handlePageChange(activePage + 1)}
            disabled={activePage >= computedTotalPages || isLoading}
            title="Next Page"
            className="p-1.5 rounded-lg border border-black/[0.07] bg-white text-[#444] hover:bg-gray-50 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight size={14} />
          </button>

          <button
            onClick={() => handlePageChange(computedTotalPages)}
            disabled={activePage >= computedTotalPages || isLoading}
            title="Last Page"
            className="p-1.5 rounded-lg border border-black/[0.07] bg-white text-[#444] hover:bg-gray-50 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronsRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

