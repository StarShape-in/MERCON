import { Check, Languages } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddressLanguagePickerProps {
  /** The place written in English, when Nominatim knew it. */
  addressEn: string | null;
  /** The same place written in Arabic, when Nominatim knew it. */
  addressAr: string | null;
  /** The address currently held by the form. */
  value: string;
  onChange: (address: string) => void;
  className?: string;
}

/**
 * Shows a resolved pin's address in English and Arabic side by side and lets
 * the operator choose which one is stored.
 *
 * A stop keeps a single `location_address`, so this is a choice rather than a
 * display toggle — whichever row is picked is the text the driver's app will
 * show. Both are rendered in full instead of behind a switch, because the two
 * renderings of a Saudi industrial area can differ by more than transliteration
 * and the operator needs to read them to judge which one a driver will
 * recognise.
 *
 * Renders nothing when there is no genuine choice to make (only one language
 * came back, or the two are identical).
 */
export default function AddressLanguagePicker({
  addressEn,
  addressAr,
  value,
  onChange,
  className,
}: AddressLanguagePickerProps) {
  const options = [
    { lang: 'English', dir: 'ltr' as const, text: addressEn },
    { lang: 'العربية', dir: 'rtl' as const, text: addressAr },
  ].filter((o): o is { lang: string; dir: 'ltr' | 'rtl'; text: string } => !!o.text?.trim());

  if (options.length < 2 || options[0].text === options[1].text) return null;

  return (
    <div className={cn('rounded-lg border border-border/70 bg-muted/25 p-1.5 space-y-1', className)}>
      <div className="flex items-center gap-1 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <Languages className="w-3 h-3" />
        Address language
      </div>
      {options.map((o) => {
        const isActive = value.trim() === o.text.trim();
        return (
          <button
            key={o.lang}
            type="button"
            onClick={() => onChange(o.text)}
            dir={o.dir}
            className={cn(
              'w-full flex items-start gap-1.5 rounded-md px-2 py-1.5 text-left text-[11px] transition-colors cursor-pointer',
              isActive
                ? 'bg-brand/10 text-brand font-semibold'
                : 'hover:bg-muted text-muted-foreground'
            )}
          >
            <Check className={cn('w-3 h-3 shrink-0 mt-0.5', !isActive && 'opacity-0')} />
            <span className="min-w-0 flex-1 break-words">{o.text}</span>
          </button>
        );
      })}
    </div>
  );
}
