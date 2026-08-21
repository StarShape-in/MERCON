import React from 'react';
import { parsePhoneNumber } from './PhoneInput';
import { Phone } from 'lucide-react';
import { WhatsAppIcon } from './whatsapp-icon';
import CountryFlag from './CountryFlag';

export interface PhoneDisplayProps {
  phone?: string | null;
  showActions?: boolean;
  className?: string;
  variant?: 'badge' | 'inline' | 'compact';
  fallbackText?: string;
}

export const PhoneDisplay: React.FC<PhoneDisplayProps> = ({
  phone,
  showActions = false,
  className = '',
  variant = 'inline',
  fallbackText = 'N/A',
}) => {
  if (!phone || !phone.trim()) {
    return <span className="text-slate-400 text-xs italic">{fallbackText}</span>;
  }

  const { country, nationalNumber } = parsePhoneNumber(phone);
  const fullFormatted = `${country.dialCode} ${nationalNumber}`.trim();
  const cleanDigits = phone.replace(/[^0-9+]/g, '');

  const whatsappUrl = `https://wa.me/${cleanDigits.replace(/^\+/, '')}`;
  const telUrl = `tel:${cleanDigits}`;

  return (
    <span className={`inline-flex items-center gap-2 font-mono text-xs text-slate-800 dark:text-slate-200 ${className}`}>
      <CountryFlag code={country.code} alt={country.name} />
      <span className="font-bold tracking-tight text-slate-900 dark:text-slate-100">{fullFormatted}</span>

      {showActions && (
        <span className="inline-flex items-center gap-1 ml-1 text-slate-400">
          <a
            href={telUrl}
            title={`Call ${fullFormatted}`}
            className="p-1 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
          </a>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`WhatsApp ${fullFormatted}`}
            className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
          >
            <WhatsAppIcon className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
          </a>
        </span>
      )}
    </span>
  );
};

export default PhoneDisplay;
