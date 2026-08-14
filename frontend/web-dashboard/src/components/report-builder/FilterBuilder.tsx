import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ReportFilter, ReportField } from '@/services/reportBuilderService';

interface FilterBuilderProps {
  filters: ReportFilter[];
  onChange: (filters: ReportFilter[]) => void;
  availableFields: ReportField[];
}

const OPERATOR_LABELS: Record<string, string> = {
  eq: 'equals (=)',
  neq: 'does not equal (≠)',
  gt: 'greater than (>)',
  gte: 'greater or equal (≥)',
  lt: 'less than (<)',
  lte: 'less or equal (≤)',
  contains: 'contains',
  in: 'is in (comma-separated)',
};

export const FilterBuilder: React.FC<FilterBuilderProps> = ({ filters, onChange, availableFields }) => {
  const handleAdd = () => {
    const defaultField = availableFields[0]?.key || 'trips.status';
    onChange([...filters, { field: defaultField, op: 'eq', value: '' }]);
  };

  const handleRemove = (index: number) => {
    const updated = filters.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleChange = (index: number, key: keyof ReportFilter, val: any) => {
    const updated = [...filters];
    updated[index] = { ...updated[index], [key]: val };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {filters.length === 0 ? (
        <div className="text-xs text-slate-400 italic py-2 text-center border border-dashed border-slate-200 rounded-xl">
          No filters added. Click below to add a filter.
        </div>
      ) : (
        filters.map((filter, index) => {
          const fieldObj = availableFields.find((f) => f.key === filter.field);
          return (
            <div key={index} className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <select
                className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#E8450F] flex-1 min-w-[140px]"
                value={filter.field}
                onChange={(e) => handleChange(index, 'field', e.target.value)}
              >
                {availableFields.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label} ({f.key})
                  </option>
                ))}
              </select>

              <select
                className="text-xs bg-white border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#E8450F] w-[140px]"
                value={filter.op}
                onChange={(e) => handleChange(index, 'op', e.target.value)}
              >
                {Object.entries(OPERATOR_LABELS).map(([op, label]) => (
                  <option key={op} value={op}>
                    {label}
                  </option>
                ))}
              </select>

              {fieldObj?.type === 'enum' && fieldObj.enumValues ? (
                <select
                  className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#E8450F] flex-1 min-w-[120px]"
                  value={String(filter.value || '')}
                  onChange={(e) => handleChange(index, 'value', e.target.value)}
                >
                  <option value="">-- Select --</option>
                  {fieldObj.enumValues.map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={fieldObj?.type === 'number' || fieldObj?.type === 'money' ? 'number' : fieldObj?.type === 'date' ? 'date' : 'text'}
                  className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#E8450F] flex-1 min-w-[120px]"
                  placeholder="Value..."
                  value={filter.value !== undefined && filter.value !== null ? String(filter.value) : ''}
                  onChange={(e) => handleChange(index, 'value', e.target.value)}
                />
              )}

              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-200 transition-colors"
                title="Remove filter"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })
      )}

      <button
        type="button"
        onClick={handleAdd}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E8450F] hover:text-[#c43809] bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg border border-orange-200 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Add Filter
      </button>
    </div>
  );
};
