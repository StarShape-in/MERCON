import React, { useState, useEffect, useRef } from 'react';
import { COUNTRY_CODES, DEFAULT_COUNTRY, type CountryCode } from '@mercon/shared-types';
import { ChevronDown, Search } from 'lucide-react';
import { Input } from './input';
import CountryFlag from './CountryFlag';

export interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
  required?: boolean;
  autoFocus?: boolean;
}

/** Helper to parse a raw string into matched CountryCode and raw national digits */
export function parsePhoneNumber(raw: string = ''): { country: CountryCode; nationalNumber: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { country: DEFAULT_COUNTRY, nationalNumber: '' };
  }

  // Check if string matches any known dial code prefix
  const matched = COUNTRY_CODES.find((c) => trimmed.startsWith(c.dialCode));
  if (matched) {
    const nationalNumber = trimmed.slice(matched.dialCode.length).trim();
    return { country: matched, nationalNumber };
  }

  // If starts with +, but didn't match known array, default to SA and strip any non-digit except space
  return { country: DEFAULT_COUNTRY, nationalNumber: trimmed.replace(/^\+966/, '').trim() };
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value = '',
  onChange,
  placeholder = '50 000 0000',
  disabled = false,
  id,
  name,
  className = '',
  required = false,
  autoFocus = false,
}) => {
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [nationalNumber, setNationalNumber] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync internal state whenever external `value` changes
  useEffect(() => {
    const parsed = parsePhoneNumber(value);
    setSelectedCountry(parsed.country);
    setNationalNumber(parsed.nationalNumber);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCountrySelect = (country: CountryCode) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearchQuery('');
    
    // Emit updated phone string to parent
    const fullNumber = nationalNumber.trim() ? `${country.dialCode} ${nationalNumber.trim()}` : '';
    if (onChange) {
      onChange(fullNumber);
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    setNationalNumber(inputVal);

    const fullNumber = inputVal.trim() ? `${selectedCountry.dialCode} ${inputVal.trim()}` : '';
    if (onChange) {
      onChange(fullNumber);
    }
  };

  const filteredCountries = COUNTRY_CODES.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.dialCode.includes(searchQuery) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`relative flex items-center rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs focus-within:border-brand focus-within:ring-1 focus-within:ring-brand/20 transition-all ${className}`} ref={dropdownRef}>
      
      {/* Country Prefix Pill Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 rounded-l-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed select-none"
        title={`${selectedCountry.name} (${selectedCountry.dialCode})`}
      >
        <CountryFlag code={selectedCountry.code} alt={selectedCountry.name} />
        <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
          {selectedCountry.dialCode}
        </span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Country Selector Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-64 max-h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
          
          {/* Search Header */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search country or code..."
              className="w-full text-xs bg-transparent border-none focus:outline-none text-slate-800 dark:text-slate-200 placeholder-slate-400"
              autoFocus
            />
          </div>

          {/* Country Options List */}
          <div className="overflow-y-auto p-1 max-h-48 space-y-0.5 no-scrollbar">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((c) => {
                const isSelected = c.code === selectedCountry.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleCountrySelect(c)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      isSelected
                        ? 'bg-orange-50 text-brand font-bold dark:bg-orange-950/40 dark:text-orange-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CountryFlag code={c.code} alt={c.name} />
                      <span className="truncate">{c.name}</span>
                    </div>
                    <span className="font-mono text-[11px] font-semibold text-slate-400 shrink-0 ml-2">
                      {c.dialCode}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-center text-xs text-slate-400">No country found</div>
            )}
          </div>
        </div>
      )}

      {/* Main National Phone Number Input Field */}
      <div className="relative flex-1">
        <Input
          id={id}
          name={name}
          type="tel"
          value={nationalNumber}
          onChange={handleNumberChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoFocus={autoFocus}
          className="border-none shadow-none focus-visible:ring-0 h-9 text-xs font-mono font-medium rounded-r-md pl-2 pr-3 text-slate-900 dark:text-slate-100 placeholder-slate-400"
        />
      </div>
    </div>
  );
};

export default PhoneInput;
