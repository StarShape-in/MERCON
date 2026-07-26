import React from 'react';

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export default function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <div className="bg-white rounded-lg border border-black/[0.06] shadow-sm p-6 mb-6">
      <div className="mb-5 border-b border-black/[0.04] pb-4">
        <h3 className="text-sm font-bold text-[#111] leading-none">{title}</h3>
        {description && <p className="text-xs text-[#6E6E80] mt-1.5 font-medium">{description}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {children}
      </div>
    </div>
  );
}
