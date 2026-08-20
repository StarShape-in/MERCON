import React from 'react';
import { parsePhoneNumber } from './PhoneInput';
import { Phone, MessageCircle } from 'lucide-react';

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

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 ${className}`}>
        <span className="text-sm leading-none" role="img" aria-label={country.name}>
          {country.flag}
        </span>
        <span>{fullFormatted}</span>

        {showActions && (
          <div className="flex items-center gap-1 ml-1 pl-1.5 border-l border-slate-200 dark:border-slate-700">
            <a
              href={telUrl}
              title={`Call ${fullFormatted}`}
              className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors p-0.5 rounded"
            >
              <Phone className="w-3 h-3" />
            </a>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={`WhatsApp ${fullFormatted}`}
              className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors p-0.5 rounded"
            >
              <MessageCircle className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-xs text-slate-800 dark:text-slate-200 ${className}`}>
      <span className="text-sm leading-none" role="img" aria-label={country.name}>
        {country.flag}
      </span>
      <span className="font-semibold">{fullFormatted}</span>

      {showActions && (
        <span className="inline-flex items-center gap-1 ml-1">
          <a
            href={telUrl}
            title={`Call ${fullFormatted}`}
            className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
          >
            <Phone className="w-3 h-3" />
          </a>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`WhatsApp ${fullFormatted}`}
            className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
          >
            <MessageCircle className="w-3 h-3" />
          </a>
        </span>
      )}
    </span>
  );
};

export default PhoneDisplay;
