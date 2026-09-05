import React from 'react';
import { Building2, User, Phone, Mail, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CustomerInfoCardProps {
  customer?: any;
}

export default function CustomerInfoCard({ customer }: CustomerInfoCardProps) {
  const navigate = useNavigate();

  const companyName = customer?.company_name || customer?.name || 'ABC Logistics Co.';
  const contactPerson = customer?.primary_contact_person || 'Mohammed Al-Qahtani';
  const contactPhone = customer?.contact_phone || '+966 11 234 5678';
  const contactEmail = customer?.email || 'm.alqahtani@abclogistics.sa';
  const customerType = customer?.customer_type || 'Corporate Customer';

  return (
    <div className="w-full h-full bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)] px-4 py-2.5 flex flex-col justify-between overflow-hidden">
      {/* Top Company Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[#4B5563] shrink-0">
            <Building2 size={16} />
          </div>
          <div className="min-w-0">
            <h3
              onClick={() => customer?.id && navigate(`/customers/${customer.id}`)}
              className="font-bold text-[13px] text-[#1F2937] truncate cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-1"
            >
              <span>{companyName}</span>
              <ExternalLink size={11} className="text-[#9CA3AF] shrink-0" />
            </h3>
            <p className="text-[10px] text-[#6B7280] font-medium">{customerType}</p>
          </div>
        </div>
      </div>

      {/* Contact Details in 3 Clean Rows */}
      <div className="grid grid-cols-1 gap-1 text-[10.5px] pt-1 border-t border-[#F3F4F6]">
        <div className="flex items-center gap-1.5 text-[#374151] truncate">
          <User size={11} className="text-[#9CA3AF] shrink-0" />
          <span className="truncate">{contactPerson}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#374151] truncate">
          <Phone size={11} className="text-[#9CA3AF] shrink-0" />
          <span className="font-mono truncate">{contactPhone}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#6B7280] truncate">
          <Mail size={11} className="text-[#9CA3AF] shrink-0" />
          <span className="truncate">{contactEmail}</span>
        </div>
      </div>
    </div>
  );
}
