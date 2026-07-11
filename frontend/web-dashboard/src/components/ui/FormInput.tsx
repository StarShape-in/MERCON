import React from 'react';
import { Input } from './input';
import { Label } from './label';
import { cn } from '@/lib/utils';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> {
  label: string;
  error?: string;
  span?: boolean;
  type?: string;
  options?: { value: string; label: string }[];
  icon?: React.ReactNode;
}

export default function FormInput({
  label,
  error,
  span = false,
  type = 'text',
  options,
  className = '',
  ...props
}: FormInputProps) {
  const isSelect = type === 'select';
  const isTextArea = type === 'textarea';

  return (
    <div className={cn("flex flex-col gap-1.5", span ? "md:col-span-2" : "col-span-1")}>
      <Label className="text-xs font-bold text-[#111]">{label}</Label>
      
      {isSelect ? (
        <select
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm bg-[#F5F5F7] border-transparent focus:border-[#E8450F]/30 focus:bg-white pr-10 cursor-pointer",
            error && 'border-red-500 focus:border-red-500 focus-visible:ring-red-100',
            className
          )}
          {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
        >
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : isTextArea ? (
        <textarea
          rows={3}
          className={cn(
            "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm bg-[#F5F5F7] border-transparent focus:border-[#E8450F]/30 focus:bg-white resize-none",
            error && 'border-red-500 focus:border-red-500 focus-visible:ring-red-100',
            className
          )}
          {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <Input
          type={type}
          className={cn(
            "bg-[#F5F5F7] border-transparent focus-visible:border-[#E8450F]/30 focus-visible:bg-white focus-visible:ring-0",
            error && 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-100',
            className
          )}
          {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      )}

      {error && <span className="text-[10px] font-bold text-red-500 animate-slide-in">{error}</span>}
    </div>
  );
}
