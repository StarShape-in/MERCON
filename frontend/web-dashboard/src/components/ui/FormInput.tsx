import React from 'react';

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
    <div className={`${span ? "md:col-span-2" : "col-span-1"} flex flex-col gap-1.5`}>
      <label className="text-xs font-bold text-[#111]">{label}</label>
      
      {isSelect ? (
        <select
          className={`form-input bg-[#F5F5F7] border border-transparent focus:border-[#E8450F]/30 focus:bg-white pr-10 cursor-pointer ${
            error ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : ''
          } ${className}`}
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
          className={`form-input bg-[#F5F5F7] border border-transparent focus:border-[#E8450F]/30 focus:bg-white resize-none ${
            error ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : ''
          } ${className}`}
          {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          type={type}
          className={`form-input bg-[#F5F5F7] border border-transparent focus:border-[#E8450F]/30 focus:bg-white ${
            error ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : ''
          } ${className}`}
          {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      )}

      {error && <span className="text-[10px] font-bold text-red-500 animate-slide-in">{error}</span>}
    </div>
  );
}
