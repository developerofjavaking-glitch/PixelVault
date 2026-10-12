import React, { useRef, useState, useEffect } from 'react';
import {
  UploadCloud,
  FileImage,
  Globe,
  Clock,
  ShieldCheck,
  Maximize2,
  Lock,
  Zap,
  ArrowRight,
  Info,
  Check,
} from 'lucide-react';
import { AutoDeleteOption } from '../types';

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  autoDelete: AutoDeleteOption;
  setAutoDelete: (val: AutoDeleteOption) => void;
  resizeOption: 'original' | '1920' | '1280' | '800';
  setResizeOption: (val: 'original' | '1920' | '1280' | '800') => void;
  stripExif: boolean;
  setStripExif: (val: boolean) => void;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  onFilesSelected,
  autoDelete,
  setAutoDelete,
  resizeOption,
  setResizeOption,
  stripExif,
  setStripExif,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [pasteToast, setPasteToast] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Global paste handler (Ctrl+V / Cmd+V anywhere on window)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Don't intercept if user is typing into an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        const imageFiles = Array.from(e.clipboardData.files).filter((file) =>
          file.type.startsWith('image/')
        );

        if (imageFiles.length > 0) {
          e.preventDefault();
          onFilesSelected(imageFiles);
          showPasteFeedback();
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onFilesSelected]);

  const showPasteFeedback = () => {
    setPasteToast(true);
    setTimeout(() => setPasteToast(false), 2500);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validImages = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|svg|avif|bmp|ico)$/i.test(file.name)
      );
      if (validImages.length > 0) {
        onFilesSelected(validImages);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onFilesSelected(files);
      e.target.value = '';
    }
  };

  const handleFetchFromUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) return;

    setUrlError('');
    setIsFetchingUrl(true);

    try {
      // Fetch via browser
      const res = await fetch(imageUrl.trim());
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const blob = await res.blob();

      if (!blob.type.startsWith('image/')) {
        throw new Error('URL does not point to a valid image format');
      }

      const urlParts = imageUrl.trim().split('/');
      const filename = urlParts[urlParts.length - 1].split('?')[0] || 'imported-image.jpg';
      const file = new File([blob], filename, { type: blob.type });

      onFilesSelected([file]);
      setIsUrlModalOpen(false);
      setImageUrl('');
    } catch (err: any) {
      setUrlError('Could not fetch image directly. It may be protected by CORS. Try right-clicking, copying the image, and pressing Ctrl+V here instead!');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Toast indicator for paste */}
      {pasteToast && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-indigo-600 text-white text-xs font-medium px-4 py-2.5 rounded-lg shadow-xl animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4" />
          Pasted image from clipboard into queue!
        </div>
      )}

      {/* Hero Intro */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Upload & Share Images <span className="text-indigo-400">Instantly</span>
        </h1>
        <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Drag and drop your images anywhere, or press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono">Ctrl+V</kbd> to paste from clipboard. Direct hotlinks, HTML, BBCode, and Markdown embeds generated in seconds.
        </p>
      </div>

      {/* Main Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-indigo-400 bg-indigo-950/30 scale-[1.01]'
            : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/80'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-white mb-2">
            Drag & drop images here
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6">
            or <span className="text-indigo-400 underline underline-offset-4 font-medium">browse from your computer</span>. Paste screenshots with <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 text-[11px] font-mono">Ctrl+V</kbd>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="py-2 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <FileImage className="w-4 h-4" />
              Browse Files
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsUrlModalOpen(true);
              }}
              className="py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Globe className="w-4 h-4" />
              Upload from URL
            </button>
          </div>
        </div>

        {/* Format & Size Specs */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-slate-500">
          <span>Max file size: 50 MB</span>
          <span aria-hidden="true">·</span>
          <span>JPG, PNG, WEBP, GIF, SVG, AVIF</span>
          <span aria-hidden="true">·</span>
          <span>Unlimited hotlinks</span>
        </div>
      </div>

      {/* Options Toolbar (Auto-delete, Resizing, Privacy) */}
      <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 text-slate-300">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-indigo-400" />
          <span>Upload Preferences</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Auto-Delete Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Auto-delete Image
            </label>
            <select
              value={autoDelete}
              onChange={(e) => setAutoDelete(e.target.value as AutoDeleteOption)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
            >
              <option value="never">Don't autodelete (Permanent)</option>
              <option value="5m">After 5 minutes (Self-destruct)</option>
              <option value="15m">After 15 minutes</option>
              <option value="1h">After 1 hour</option>
              <option value="6h">After 6 hours</option>
              <option value="1d">After 1 day</option>
              <option value="3d">After 3 days</option>
              <option value="1w">After 1 week</option>
              <option value="1m">After 1 month</option>
            </select>
          </div>

          {/* Resize Option */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
              Image Resizing
            </label>
            <select
              value={resizeOption}
              onChange={(e) => setResizeOption(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
            >
              <option value="original">Keep Original Size</option>
              <option value="1920">Resize to 1920px (Full HD)</option>
              <option value="1280">Resize to 1280px (HD)</option>
              <option value="800">Resize to 800px (Web)</option>
            </select>
          </div>

          {/* Privacy: EXIF stripping */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Privacy & Metadata
            </label>
            <button
              type="button"
              onClick={() => setStripExif(!stripExif)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                stripExif
                  ? 'bg-slate-950 border-emerald-800/80 text-emerald-400'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <span>Strip EXIF & GPS</span>
              <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${stripExif ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                {stripExif ? 'Enabled' : 'Disabled'}
              </span>
            </button>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center gap-2 text-[11px] text-slate-500">
          <Info className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span>Anonymous uploads are not tied to any user account or identity. You will receive a private deletion key with each upload.</span>
        </div>
      </div>

      {/* URL Import Modal */}
      {isUrlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-400" />
              Upload Image from URL
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter any direct image link to import and re-host it securely on PixelVault.
            </p>

            <form onSubmit={handleFetchFromUrl}>
              <input
                type="url"
                required
                placeholder="https://example.com/photo.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 mb-3"
              />

              {urlError && (
                <p className="text-xs text-rose-400 mb-3 bg-rose-950/40 p-2.5 rounded border border-rose-900/50">
                  {urlError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUrlModalOpen(false)}
                  className="py-1.5 px-3 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isFetchingUrl || !imageUrl.trim()}
                  className="py-1.5 px-4 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white flex items-center gap-1.5 shadow-sm"
                >
                  {isFetchingUrl ? 'Fetching...' : 'Fetch & Add'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
