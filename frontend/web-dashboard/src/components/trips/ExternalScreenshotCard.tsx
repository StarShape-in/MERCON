import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles, UploadCloud, CheckCircle2, AlertTriangle, XCircle,
  Clock, MapPin, FileText, Check, X, RefreshCcw, Eye, Info, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  uploadExternalScreenshot,
  type ExternalScreenshotUploadResponse,
  type Trip
} from '@/services/tripService';
import { extractApiErrorMessage } from '@/lib/api';

interface ExternalScreenshotCardProps {
  trip: Trip;
  onSuccess?: () => void;
}

export default function ExternalScreenshotCard({ trip, onSuccess }: ExternalScreenshotCardProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [autoApply, setAutoApply] = useState<boolean>(true);
  const [result, setResult] = useState<ExternalScreenshotUploadResponse | null>(null);

  const isExternalWorkflow = (trip as any)?.driver_workflow === 'EXTERNAL_APP';

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const res = await uploadExternalScreenshot(trip.id, file, autoApply);
      return res.data;
    },
    onSuccess: (data) => {
      setResult(data);
      // Invalidate queries so trip details and documents update across dashboard
      queryClient.invalidateQueries({ queryKey: ['trip', trip.id] });
      queryClient.invalidateQueries({ queryKey: ['documents', 'Trip', trip.id] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      if (onSuccess) onSuccess();
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPEG, PNG, WebP, HEIC).');
      return;
    }

    setSelectedFile(file);
    setResult(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadSubmit = () => {
    if (!selectedFile || uploadMutation.isPending) return;
    uploadMutation.mutate(selectedFile);
  };

  const formatEventType = (evt?: string | null) => {
    if (!evt) return 'Unrecognized Event';
    return evt.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden transition-all">
      {/* Header Bar */}
      <div className="px-4 py-3 border-b border-[#E5E7EB] bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Sparkles size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-[#1F2937] tracking-tight">External App Screenshot AI</h3>
              {isExternalWorkflow ? (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0 font-medium">
                  External App Active
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] px-1.5 py-0 font-medium">
                  Native Workflow
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-[#6B7280]">
              Upload driver app screenshots to automatically extract operational milestones & PODs.
            </p>
          </div>
        </div>

        {selectedFile && !uploadMutation.isPending && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearFile}
            className="text-xs text-slate-500 hover:text-slate-700 h-7 px-2"
          >
            Clear
          </Button>
        )}
      </div>

      <div className="p-4 space-y-3.5">
        {/* Step 1: File Input & Selection Zone */}
        {!selectedFile && !result && (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/jpg,image/webp,image/heic"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-indigo-300 bg-slate-50/50 hover:bg-indigo-50/30 rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
            >
              <div className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-500 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-colors">
                <UploadCloud size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#1F2937]">
                  Click to select screenshot or drop image here
                </p>
                <p className="text-[11px] text-[#6B7280] mt-0.5">
                  Supports third-party driver app screenshots (PNG, JPG, WebP)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Selected Image Preview & Settings */}
        {selectedFile && !result && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-[#E5E7EB]">
              {previewUrl && (
                <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 bg-black shrink-0 relative">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#1F2937] truncate">{selectedFile.name}</p>
                <p className="text-[11px] text-[#6B7280]">
                  {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Image'}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="outline" className="text-[10px] bg-white text-slate-700 border-slate-200">
                    Ready for AI Analysis
                  </Badge>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearFile}
                disabled={uploadMutation.isPending}
                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700"
              >
                <X size={14} />
              </Button>
            </div>

            {/* Auto-Apply Checkbox */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-50/50 border border-indigo-100">
              <Checkbox
                id="autoApplyToggle"
                checked={autoApply}
                onCheckedChange={(c) => setAutoApply(Boolean(c))}
                disabled={uploadMutation.isPending}
                className="mt-0.5"
              />
              <div className="text-xs">
                <label htmlFor="autoApplyToggle" className="font-semibold text-[#1F2937] cursor-pointer">
                  Automatically apply trip status transition if validation passes
                </label>
                <p className="text-[11px] text-[#6B7280] mt-0.5">
                  When enabled, verified milestones will automatically update trip status. If disabled, screenshot evidence is staged for manual review.
                </p>
              </div>
            </div>

            {/* Upload / Submit Button */}
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearFile}
                disabled={uploadMutation.isPending}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleUploadSubmit}
                disabled={uploadMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs gap-1.5 min-w-[140px]"
              >
                {uploadMutation.isPending ? (
                  <>
                    <RefreshCcw size={13} className="animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    Process Screenshot
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Loading Spinner / Progress Banner */}
        {uploadMutation.isPending && (
          <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 text-center space-y-2 animate-pulse">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-indigo-600 text-white shadow-xs">
              <Sparkles size={18} className="animate-spin" />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-900">Analyzing screenshot with Gemini Vision AI...</p>
              <p className="text-[11px] text-indigo-700">Reading status badges, order numbers, timestamps, and locations.</p>
            </div>
          </div>
        )}

        {/* Step 3: Result Display */}
        {result && !uploadMutation.isPending && (
          <div className="space-y-3 animate-fade-in">
            {/* Case A: Applied Successfully */}
            {result.applied && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    <h4 className="text-xs font-bold text-emerald-900">Milestone Processed & Applied</h4>
                  </div>
                  <Badge className="bg-emerald-600 text-white text-[10px]">
                    {Math.round((result.confidence || 0) * 100)}% AI Confidence
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                  <div>
                    <span className="text-[#6B7280] text-[11px]">Detected Event:</span>
                    <p className="font-bold text-emerald-900">{formatEventType(result.event_type)}</p>
                  </div>
                  <div>
                    <span className="text-[#6B7280] text-[11px]">Target Status:</span>
                    <p className="font-bold text-emerald-900">{result.target_status || 'Updated'}</p>
                  </div>
                  {result.event_timestamp && (
                    <div>
                      <span className="text-[#6B7280] text-[11px]">Event Timestamp:</span>
                      <p className="font-medium text-slate-800">{result.event_timestamp}</p>
                    </div>
                  )}
                  {result.external_reference && (
                    <div>
                      <span className="text-[#6B7280] text-[11px]">External Reference:</span>
                      <p className="font-medium text-slate-800">{result.external_reference}</p>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-emerald-800 font-medium">
                  ✓ Trip status and stop timestamps updated in backend. Document stored with status Verified.
                </p>
              </div>
            )}

            {/* Case B: Pending Review Required */}
            {!result.applied && result.extraction_status === 'NEEDS_REVIEW' && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                    <h4 className="text-xs font-bold text-amber-900">Review Required</h4>
                  </div>
                  <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                    Staged as PendingReview
                  </Badge>
                </div>

                <p className="text-xs text-amber-900 bg-white/80 p-2.5 rounded-lg border border-amber-200">
                  <span className="font-bold">Validation Reason: </span>
                  {result.validation_reason || 'AI extraction complete, but automatic transition requires operator verification.'}
                </p>

                {result.event_type && (
                  <div className="flex items-center gap-4 text-xs text-amber-900">
                    <div>
                      <span className="text-[#6B7280]">Event: </span>
                      <span className="font-semibold">{formatEventType(result.event_type)}</span>
                    </div>
                    <div>
                      <span className="text-[#6B7280]">Confidence: </span>
                      <span className="font-semibold">{Math.round((result.confidence || 0) * 100)}%</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Case C: Failed / Wrong Trip */}
            {!result.applied && result.extraction_status === 'FAILED' && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-2.5">
                <div className="flex items-center gap-2">
                  <XCircle size={18} className="text-rose-600 shrink-0" />
                  <h4 className="text-xs font-bold text-rose-900">
                    {result.is_wrong_trip ? 'Wrong Trip Screenshot' : 'Extraction / Validation Error'}
                  </h4>
                </div>

                <p className="text-xs text-rose-900 bg-white/80 p-2.5 rounded-lg border border-rose-200 font-medium">
                  {result.validation_reason || result.extraction_error || 'Unable to process screenshot event for this trip.'}
                </p>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearFile}
                className="text-xs gap-1.5"
              >
                <RefreshCcw size={12} />
                Upload Another Screenshot
              </Button>
            </div>
          </div>
        )}

        {/* Global Mutation Error Banner */}
        {uploadMutation.isError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
            <XCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Upload Failed</p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                {extractApiErrorMessage(uploadMutation.error)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
