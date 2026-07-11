import React, { useState } from 'react';
import { Search, SlidersHorizontal, Download, ChevronLeft, ChevronRight, CheckSquare } from 'lucide-react';
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
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  enableSelection = true,
  onSelectionChange,
  onRowClick,
  bulkActions = [],
}: DataTableProps<T>) {
  const showToolbar = onSearchChange !== undefined || filterElement !== undefined || onExport !== undefined || enableSelection;

  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const handleSelectAll = () => {
    if (selectedIndices.size === data.length && data.length > 0) {
      setSelectedIndices(new Set());
      onSelectionChange?.([]);
    } else {
      const newSet = new Set(data.map((_, i) => i));
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

  return (
    <div className="bg-white rounded-none border border-black/[0.06] shadow-sm overflow-hidden flex flex-col h-full animate-fade-in">
      {/* Table Toolbar */}
      {showToolbar && (
        <div className="shrink-0 p-4 border-b border-black/[0.06] flex flex-wrap items-center justify-between gap-3 bg-[#FAFAFA]">
          {selectedIndices.size > 0 && bulkActions.length > 0 ? (
            <div className="flex items-center gap-3 w-full bg-blue-50/50 p-1 rounded-none">
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
                      const selectedRows = Array.from(selectedIndices).map(idx => data[idx]);
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
                    label={selectedIndices.size === data.length && data.length > 0 ? "Deselect All" : "Select All"}
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
                      className="w-full pl-9 bg-white border-black/[0.07] focus-visible:ring-[#E8450F]/20 rounded-none"
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
                    checked={selectedIndices.size === data.length && data.length > 0}
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
              Array.from({ length: 5 }).map((_, rowIndex) => (
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
            ) : data.length === 0 ? (
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
              data.map((row, rowIndex) => (
                <TableRow
                  key={rowIndex}
                  className={`animate-fade-in transition-colors ${onRowClick ? 'cursor-pointer hover:bg-[#F0F0F0]' : 'hover:bg-[#FAFAFA]'}`}
                  style={{ animationDelay: `${rowIndex * 0.03}s` }}
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
      {onPageChange && totalPages > 1 && (
        <div className="shrink-0 p-4 border-t border-black/[0.06] flex items-center justify-between bg-[#FAFAFA]">
          <span className="text-xs font-semibold text-[#6E6E80]">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
              className="p-1.5 rounded-none border border-black/[0.07] bg-white text-[#444] hover:bg-gray-50 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading}
              className="p-1.5 rounded-none border border-black/[0.07] bg-white text-[#444] hover:bg-gray-50 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
