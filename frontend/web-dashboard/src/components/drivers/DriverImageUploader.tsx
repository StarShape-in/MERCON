import React, { useState, useRef } from 'react';
import { Camera, Upload, Trash2, Loader2, User, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface DriverImageUploaderProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

export const DriverImageUploader: React.FC<DriverImageUploaderProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset errors
    setError(null);

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid image file (JPG, PNG, WebP, or HEIC).');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB.');
      return;
    }

    setIsUploading(true);

    try {
      // Process image in canvas (crop/resize to maximum 500x500 square for optimal driver avatar size)
      const croppedBlob = await cropImageToSquareBlob(file, 500);

      // Create FormData with image file
      const formData = new FormData();
      formData.append('file', croppedBlob, `driver-avatar-${Date.now()}.webp`);

      // Upload file using existing POST /api/upload mechanism
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success && res.data?.data?.file_url) {
        onChange(res.data.data.file_url);
      } else {
        throw new Error('Upload succeeded but server returned invalid URL format');
      }
    } catch (err: any) {
      console.error('Driver avatar upload error:', err);
      setError(err.response?.data?.error?.message || err.message || 'Failed to upload profile image.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    onChange(null);
    setError(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        {/* Avatar Display */}
        <div className="relative group shrink-0">
          <div className="w-20 h-20 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shadow-xs transition-all duration-200">
            {value ? (
              <img
                src={value}
                alt="Driver Avatar"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback if image fails to load
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <User className="w-9 h-9 text-slate-400 dark:text-slate-500" />
            )}

            {isUploading && (
              <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-xs">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-[#E8450F] hover:bg-[#d03d0c] text-white flex items-center justify-center shadow-md transition-all duration-150 disabled:opacity-50"
            title="Upload Photo"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action buttons & Details */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="h-8 text-xs font-semibold gap-1.5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              {value ? 'Change Photo' : 'Upload Photo'}
            </Button>

            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || isUploading}
                onClick={handleRemove}
                className="h-8 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </Button>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Square JPG, PNG or WebP. Max size 5MB. Image will be saved as a file URL.
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

/**
 * Utility function to crop and resize selected image into a square Blob (WebP format) using Canvas.
 */
function cropImageToSquareBlob(file: File, size = 500): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file format'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context unavailable'));

        // Calculate square crop boundaries (center crop)
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

        // Export canvas as image/webp Blob (or fallback to image/png)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image canvas to Blob'));
            }
          },
          'image/webp',
          0.85
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default DriverImageUploader;
