import React, { useState } from 'react';
import { UploadedImage, EmbedCodeType } from '../types';
import {
  generateEmbedCode,
  EMBED_FORMAT_OPTIONS,
  formatBytes,
  formatTimeRemaining,
} from '../utils/embedCodes';
import {
  Check,
  Copy,
  ExternalLink,
  QrCode,
  Download,
  Trash2,
  KeyRound,
  RotateCcw,
  Sparkles,
  Link,
  FileCode,
} from 'lucide-react';
import { QRCodeModal } from './QRCodeModal';

interface UploadSuccessModalProps {
  images: UploadedImage[];
  onUploadMore: () => void;
  onOpenViewer: (image: UploadedImage) => void;
}

export const UploadSuccessModal: React.FC<UploadSuccessModalProps> = ({
  images,
  onUploadMore,
  onOpenViewer,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<EmbedCodeType>('direct');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [qrModalImage, setQrModalImage] = useState<UploadedImage | null>(null);

  // Generate combined embed codes for all images
  const allCodes = images
    .map((img) => generateEmbedCode(selectedFormat, img))
    .join('\n');

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(allCodes);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (err) {
      console.error('Failed to copy all:', err);
    }
  };

  const handleCopySingle = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy single:', err);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Success banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 mb-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Upload Complete!
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {images.length} {images.length === 1 ? 'image' : 'images'} successfully hosted on PixelVault.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onUploadMore}
            className="flex items-center gap-1.5 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Upload More Images
          </button>
        </div>

        {/* ImgBB-Style Embed Code Selection Toolbar */}
        <div className="mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-indigo-400" />
              <label htmlFor="embed-format" className="text-xs font-semibold text-slate-200">
                Embed Codes Format:
              </label>
            </div>

            <select
              id="embed-format"
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value as EmbedCodeType)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500 cursor-pointer font-medium"
            >
              <optgroup label="Links">
                <option value="direct">Direct Image Link (Hotlink / CDN)</option>
                <option value="viewer">Viewer Link</option>
              </optgroup>
              <optgroup label="HTML">
                <option value="html-image">HTML Image (&lt;img&gt;)</option>
                <option value="html-linked">HTML Linked Image (&lt;a&gt;&lt;img&gt;)</option>
              </optgroup>
              <optgroup label="BBCode / Forums">
                <option value="bbcode-full">BBCode Full Linked ([url][img])</option>
                <option value="bbcode-direct">BBCode Direct Image ([img])</option>
              </optgroup>
              <optgroup label="Markdown">
                <option value="markdown-image">Markdown Image (![alt](url))</option>
                <option value="markdown-linked">Markdown Linked Image ([![alt](url)](view))</option>
              </optgroup>
            </select>
          </div>

          {/* Code display textarea */}
          <div className="relative">
            <textarea
              readOnly
              rows={images.length > 2 ? 4 : 2}
              value={allCodes}
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-indigo-300 focus:outline-hidden focus:border-indigo-500 resize-none selection:bg-indigo-600/30"
            />
            <button
              type="button"
              onClick={handleCopyAll}
              className="absolute top-2.5 right-2.5 flex items-center gap-1.5 py-1 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors shadow-sm"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAll ? 'Copied All!' : 'Copy Code'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Uploaded Images List Cards */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          Hosted Files & Individual Embeds
        </h3>

        {images.map((img, index) => {
          const singleCode = generateEmbedCode(selectedFormat, img);
          const isCopied = copiedIndex === index;

          return (
            <div
              key={img.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all"
            >
              {/* Thumbnail */}
              <div
                onClick={() => onOpenViewer(img)}
                className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-slate-950 overflow-hidden shrink-0 border border-slate-800 cursor-pointer group"
              >
                <img
                  src={img.directUrl}
                  alt={img.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                  Inspect
                </div>
              </div>

              {/* Details & Inputs */}
              <div className="flex-1 w-full min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4
                    onClick={() => onOpenViewer(img)}
                    className="text-sm font-semibold text-white hover:text-indigo-400 transition-colors cursor-pointer truncate"
                  >
                    {img.title || img.originalName}
                  </h4>
                  <span className="text-[11px] text-slate-500 shrink-0">
                    {formatBytes(img.size)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 mb-3">
                  {img.width && img.height && (
                    <>
                      <span>{img.width} × {img.height} px</span>
                      <span aria-hidden="true" className="text-slate-700">·</span>
                    </>
                  )}
                  <span>{img.mimeType.replace('image/', '').toUpperCase()}</span>
                  <span aria-hidden="true" className="text-slate-700">·</span>
                  <span className="text-indigo-400">
                    {formatTimeRemaining(img.expiresAt)}
                  </span>
                </div>

                {/* Individual code bar */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={singleCode}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="flex-1 bg-slate-950 border border-slate-800/80 rounded px-2.5 py-1.5 text-xs font-mono text-slate-300 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopySingle(singleCode, index)}
                    className="py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors shrink-0 flex items-center gap-1.5"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* Quick actions strip */}
                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-400">
                  <a
                    href={img.directUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                    title="Open hotlink directly in new tab"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open Direct Link</span>
                  </a>
                  <span aria-hidden="true" className="text-slate-700">·</span>
                  <button
                    type="button"
                    onClick={() => onOpenViewer(img)}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-3 h-3 text-indigo-400" />
                    <span>Open Viewer</span>
                  </button>
                  <span aria-hidden="true" className="text-slate-700">·</span>
                  <button
                    type="button"
                    onClick={() => setQrModalImage(img)}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    <QrCode className="w-3 h-3 text-indigo-400" />
                    <span>Mobile QR</span>
                  </button>
                  <span aria-hidden="true" className="text-slate-700">·</span>
                  <a
                    href={img.downloadUrl || `/api/image/${img.id}/download`}
                    download={img.originalName}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    <Download className="w-3 h-3 text-indigo-400" />
                    <span>Download</span>
                  </a>

                  {img.deleteToken && (
                    <>
                      <span aria-hidden="true" className="text-slate-700">·</span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-500">
                        <KeyRound className="w-3 h-3 text-amber-500/80" />
                        <span>Delete Key Saved</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* QR Modal */}
      {qrModalImage && (
        <QRCodeModal
          url={qrModalImage.directUrl}
          title={qrModalImage.title}
          onClose={() => setQrModalImage(null)}
        />
      )}
    </div>
  );
};
