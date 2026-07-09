import React from 'react';

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md';
  isLoading?: boolean;
}

export default function Btn({
  label,
  icon,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  ...props
}: BtnProps) {
  const base = "flex items-center justify-center gap-1.5 font-semibold rounded-xl transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";
  const sz   = size === 'sm' ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  const col  = variant === 'primary' 
    ? "bg-[#E8450F] text-white hover:bg-[#C7380A] shadow-sm shadow-[#E8450F]/10"
    : variant === 'secondary' 
      ? "bg-[#F0F0F2] text-[#444] hover:bg-[#E5E5E8]"
      : variant === 'outline'
        ? "border border-[#E8450F] text-[#E8450F] hover:bg-[#E8450F]/5"
        : "text-[#E8450F] hover:bg-[#FFF0EB]";

  return (
    <button className={`${base} ${sz} ${col} ${className}`} disabled={isLoading || props.disabled} {...props}>
      {isLoading ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : icon}
      <span>{isLoading ? 'Loading...' : label}</span>
    </button>
  );
}
