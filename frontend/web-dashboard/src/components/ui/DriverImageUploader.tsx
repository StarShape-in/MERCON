import React, { useRef, useState } from 'react';
import { UploadCloud, X, Camera, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DriverAvatar from './DriverAvatar';
import { cn } from '@/lib/utils';

interface DriverImageUploaderProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  firstName?: string;
  lastName?: string;
  className?: string;
}

export default function DriverImageUploader({
  value,
  onChange,
  firstName = '',
  lastName = '',
  className,
}: DriverImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WEBP).');
      return;
    }

    // Limit size to 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={cn('flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50', className)}>
      <div className="relative group shrink-0">
        <DriverAvatar src={value} firstName={firstName} lastName={lastName} size="xl" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          title="Change photo"
        >
          <Camera className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 text-center sm:text-left space-y-1">
        <div className="flex items-center justify-center sm:justify-start gap-2">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Driver Profile Photo</span>
          {value && (
            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
              Photo Set
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500">
          Upload a clear headshot or ID photo. PNG, JPG or WEBP (Max 5MB).
        </p>

        <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="h-8 text-xs gap-1.5 font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          >
            <UploadCloud className="w-3.5 h-3.5" /> Upload Image
          </Button>

          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
              className="h-8 text-xs gap-1 font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              <X className="w-3.5 h-3.5" /> Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
