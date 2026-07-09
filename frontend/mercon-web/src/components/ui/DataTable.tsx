import React from 'react';
import { Search, SlidersHorizontal, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import Btn from './Btn';

interface Column<T> {
  header: string;
  accessor: (row: T) => React.ReactNode;
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
}: DataTableProps<T>) {
  const showToolbar = onSearchChange !== undefined || filterElement !== undefined || onExport !== undefined;

  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden flex flex-col h-full animate-fade-in">
      {/* Table Toolbar */}
      {showToolbar && (
        <div className="shrink-0 p-4 border-b border-black/[0.06] flex flex-wrap items-center justify-between gap-3 bg-[#FAFAFA]">
          <div className="flex items-center gap-3 flex-1 min-w-[200px]">
            {onSearchChange !== undefined && (
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9898A4]" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-black/[0.07] focus:border-[#E8450F]/30 focus:ring-4 focus:ring-[#E8450F]/5 rounded-xl text-xs outline-none transition-all"
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
        </div>
      )}

      {/* Main Table Content */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th key={i}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Loading state skeleton rows
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((_, colIndex) => (
                    <td key={colIndex}>
                      <div className="h-4 skeleton w-full max-w-[120px]"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={columns.length} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center gap-2 max-w-xs mx-auto">
                    <SlidersHorizontal size={36} className="text-gray-300 stroke-[1.5]" />
                    <p className="text-sm font-bold text-[#111] mt-2">No Records Found</p>
                    <p className="text-xs text-[#6E6E80] text-center">There are no entries matching your current filters or search query.</p>
                  </div>
                </td>
              </tr>
            ) : (
              // Data Rows
              data.map((row, rowIndex) => (
                <tr key={rowIndex} className="animate-fade-in" style={{ animationDelay: `${rowIndex * 0.03}s` }}>
                  {columns.map((col, colIndex) => (
                    <td key={colIndex}>{col.accessor(row)}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
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
              className="p-1.5 rounded-lg border border-black/[0.07] bg-white text-[#444] hover:bg-gray-50 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading}
              className="p-1.5 rounded-lg border border-black/[0.07] bg-white text-[#444] hover:bg-gray-50 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
