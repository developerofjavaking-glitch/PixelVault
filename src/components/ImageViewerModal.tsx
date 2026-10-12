import React, { useState, useEffect } from 'react';
import { UploadedImage, EmbedCodeType } from '../types';
import {
  generateEmbedCode,
  formatBytes,
  formatTimeRemaining,
  formatRelativeDate,
} from '../utils/embedCodes';
import {
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Copy,
  Check,
  Download,
  QrCode,
  Trash2,
  Clock,
  Eye,
  Calendar,
  Layers,
  FileCode,
  Edit2,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { QRCodeModal } from './QRCodeModal';

interface ImageViewerModalProps {
  image: UploadedImage;
  onClose: () => void;
  onDeleteImage?: (id: string, token: string) => Promise<boolean>;
  onUpdateMetadata?: (id: string, token: string, title: string, desc: string) => Promise<boolean>;
  localDeleteToken?: string;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  image,
  onClose,
  onDeleteImage,
  onUpdateMetadata,
  localDeleteToken,
}) => {
  const [zoom, setZoom] = useState(1);
  const [selectedFormat, setSelectedFormat] = useState<EmbedCodeType>('direct');
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [titleInput, setTitleInput] = useState(image.title);
  const [descInput, setDescInput] = useState(image.description);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const deleteToken = image.deleteToken || localDeleteToken;
  const canManage = Boolean(deleteToken);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 4));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.25));
  const handleResetZoom = () => setZoom(1);

  const currentEmbedCode = generateEmbedCode(selectedFormat, {
    id: image.id,
    title: titleInput || image.title,
    originalName: image.originalName,
    url: image.url,
    directUrl: image.directUrl,
  });

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(currentEmbedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy embed code:', err);
    }
  };

  const handleDelete = async () => {
    if (!deleteToken || !onDeleteImage) return;
    setIsDeleting(true);
    const success = await onDeleteImage(image.id, deleteToken);
    setIsDeleting(false);
    if (success) {
      onClose();
    }
  };

  const handleSaveMetadata = async () => {
    if (!deleteToken || !onUpdateMetadata) return;
    setIsSavingEdit(true);
    const ok = await onUpdateMetadata(image.id, deleteToken, titleInput, descInput);
    setIsSavingEdit(false);
    if (ok) {
      setIsEditing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 overflow-hidden animate-in fade-in duration-200">
      <div className="relative w-full h-full max-w-7xl max-h-[96vh] rounded-2xl bg-slate-950 border border-slate-800 flex flex-col lg:flex-row overflow-hidden shadow-2xl">
        {/* Top bar controls on mobile */}
        <div className="lg:hidden flex items-center justify-between p-3 border-b border-slate-800 bg-slate-900/80">
          <span className="text-xs font-semibold text-white truncate max-w-[200px]">
            {titleInput || image.title}
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Left / Center: Image viewport */}
        <div className="relative flex-1 bg-slate-950 flex items-center justify-center overflow-auto p-4 select-none min-h-[300px]">
          {/* Zoom controls floating bar */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-1 bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-lg p-1 text-slate-300 shadow-lg">
            <button
              onClick={handleZoomOut}
              className="p-1.5 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono px-1.5 text-slate-400">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 hover:text-white hover:bg-slate-800 rounded transition-colors text-[10px] font-medium"
              title="Reset Zoom"
            >
              Fit
            </button>
          </div>

          {/* Actual image canvas */}
          <div className="flex items-center justify-center w-full h-full">
            <img
              src={image.directUrl}
              alt={image.title}
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
              className="max-w-full max-h-full object-contain transition-transform duration-100 shadow-2xl rounded"
            />
          </div>
        </div>

        {/* Right side: Image Inspector Panel */}
        <div className="w-full lg:w-96 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col justify-between overflow-y-auto max-h-[50vh] lg:max-h-full p-5 text-slate-200">
          <div>
            {/* Header close button for desktop */}
            <div className="hidden lg:flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Image Details
              </span>
              <button
                onClick={onClose}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title & Description */}
            <div className="mb-5">
              {isEditing ? (
                <div className="space-y-2 mb-3">
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder="Image title..."
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                  <textarea
                    rows={2}
                    value={descInput}
                    onChange={(e) => setDescInput(e.target.value)}
                    placeholder="Add description..."
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSavingEdit}
                      onClick={handleSaveMetadata}
                      className="py-1 px-3 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-medium text-white"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="py-1 px-2.5 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-white break-words">
                      {titleInput || image.title}
                    </h3>
                    {canManage && onUpdateMetadata && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-slate-400 hover:text-indigo-400 p-1"
                        title="Edit title"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {image.description && (
                    <p className="text-xs text-slate-400 mt-1 break-words">
                      {image.description}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Technical Metadata */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5 text-xs mb-5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  Dimensions
                </span>
                <span className="text-slate-200 font-mono">
                  {image.width && image.height ? `${image.width} × ${image.height} px` : 'Original'}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span>File Size</span>
                <span className="text-slate-200 font-mono">{formatBytes(image.size)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span>Format</span>
                <span className="text-slate-200 font-mono uppercase">{image.mimeType.replace('image/', '')}</span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Uploaded
                </span>
                <span className="text-slate-200">{formatRelativeDate(image.createdAt)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  Views
                </span>
                <span className="text-slate-200 font-mono">{image.views}</span>
              </div>

              <div className="flex items-center justify-between text-slate-400 border-t border-slate-800/80 pt-2">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  Retention
                </span>
                <span className="text-indigo-400 font-medium">
                  {formatTimeRemaining(image.expiresAt)}
                </span>
              </div>
            </div>

            {/* Embed Codes Generator in Viewer */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                  Embed / Link
                </span>
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value as EmbedCodeType)}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-hidden"
                >
                  <option value="direct">Direct Link (Hotlink)</option>
                  <option value="viewer">Viewer Link</option>
                  <option value="html-image">HTML &lt;img&gt;</option>
                  <option value="html-linked">HTML Linked</option>
                  <option value="bbcode-full">BBCode Full</option>
                  <option value="bbcode-direct">BBCode Direct</option>
                  <option value="markdown-image">Markdown</option>
                  <option value="markdown-linked">Markdown Linked</option>
                </select>
              </div>

              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={currentEmbedCode}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-20 py-2 text-xs font-mono text-indigo-300 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="absolute top-1.5 right-1.5 flex items-center gap-1 py-1 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Quick Actions (Raw Link, QR, Download) */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <a
                href={image.directUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 text-xs font-medium border border-emerald-800/60 transition-colors"
                title="Open raw image hotlink in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Raw Link
              </a>

              <button
                type="button"
                onClick={() => setShowQr(true)}
                className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
              >
                <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                QR Code
              </button>

              <a
                href={image.downloadUrl || `/api/image/${image.id}/download`}
                download={image.originalName}
                className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                Download
              </a>
            </div>
          </div>

          {/* Delete Action if owner */}
          {canManage && onDeleteImage && (
            <div className="pt-4 border-t border-slate-800">
              {confirmDelete ? (
                <div className="bg-rose-950/40 border border-rose-900/50 rounded-lg p-3">
                  <p className="text-xs text-rose-300 mb-2">
                    Delete permanently? Direct links will stop working immediately.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={handleDelete}
                      className="py-1 px-3 bg-rose-600 hover:bg-rose-500 rounded text-xs font-semibold text-white transition-colors"
                    >
                      {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="py-1 px-2.5 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/40 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete this image anonymously
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showQr && (
        <QRCodeModal
          url={image.directUrl}
          title={image.title}
          onClose={() => setShowQr(false)}
        />
      )}
    </div>
  );
};
