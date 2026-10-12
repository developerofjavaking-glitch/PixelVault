import React from 'react';
import { QueueItem, AutoDeleteOption } from '../types';
import { formatBytes } from '../utils/embedCodes';
import { Trash2, Upload, Plus, AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react';

interface UploadQueueProps {
  queue: QueueItem[];
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<QueueItem>) => void;
  onClearQueue: () => void;
  onAddMoreFiles: () => void;
  onStartUpload: () => void;
  isUploading: boolean;
  autoDelete: AutoDeleteOption;
}

export const UploadQueue: React.FC<UploadQueueProps> = ({
  queue,
  onRemoveItem,
  onUpdateItem,
  onClearQueue,
  onAddMoreFiles,
  onStartUpload,
  isUploading,
  autoDelete,
}) => {
  const totalBytes = queue.reduce((acc, item) => acc + item.size, 0);
  const pendingCount = queue.filter((item) => item.status === 'pending').length;

  const autoDeleteLabels: Record<AutoDeleteOption, string> = {
    never: 'Permanent (No auto-delete)',
    '5m': 'Auto-deletes in 5 min',
    '15m': 'Auto-deletes in 15 min',
    '1h': 'Auto-deletes in 1 hour',
    '6h': 'Auto-deletes in 6 hours',
    '1d': 'Auto-deletes in 1 day',
    '3d': 'Auto-deletes in 3 days',
    '1w': 'Auto-deletes in 1 week',
    '1m': 'Auto-deletes in 1 month',
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Upload Queue</h2>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span>{queue.length} {queue.length === 1 ? 'image' : 'images'}</span>
            <span aria-hidden="true">·</span>
            <span>{formatBytes(totalBytes)}</span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1 text-indigo-400">
              <Clock className="w-3 h-3" />
              {autoDeleteLabels[autoDelete]}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAddMoreFiles}
            disabled={isUploading}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Add More
          </button>
          <button
            type="button"
            onClick={onClearQueue}
            disabled={isUploading}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Items list */}
      <div className="space-y-3 mb-6">
        {queue.map((item) => (
          <div
            key={item.id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-colors"
          >
            {/* Thumbnail */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-slate-950 overflow-hidden shrink-0 border border-slate-800 flex items-center justify-center">
              <img
                src={item.previewUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />
              {item.status === 'uploading' && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                </div>
              )}
              {item.status === 'completed' && (
                <div className="absolute inset-0 bg-emerald-950/70 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              )}
            </div>

            {/* Inputs & Details */}
            <div className="flex-1 w-full min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <input
                  type="text"
                  value={item.title}
                  disabled={isUploading}
                  placeholder="Image title..."
                  onChange={(e) => onUpdateItem(item.id, { title: e.target.value })}
                  className="bg-slate-950/60 border border-slate-800/80 rounded px-2.5 py-1 text-xs font-medium text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 w-full max-w-md"
                />
                <span className="text-[11px] text-slate-500 shrink-0 hidden sm:inline">
                  {formatBytes(item.size)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                <span className="truncate max-w-[200px]">{item.name}</span>
                {item.width > 0 && (
                  <>
                    <span aria-hidden="true" className="text-slate-700">·</span>
                    <span>{item.width} × {item.height} px</span>
                  </>
                )}
                <span aria-hidden="true" className="text-slate-700">·</span>
                <span className="uppercase">{item.mimeType.replace('image/', '')}</span>
              </div>

              {/* Progress bar if uploading */}
              {item.status === 'uploading' && (
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full transition-all duration-300"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}

              {/* Error message */}
              {item.status === 'error' && (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 mt-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{item.error || 'Upload failed'}</span>
                </div>
              )}
            </div>

            {/* Remove button */}
            {!isUploading && item.status !== 'completed' && (
              <button
                type="button"
                onClick={() => onRemoveItem(item.id)}
                className="text-slate-500 hover:text-rose-400 transition-colors p-1.5 self-end sm:self-center"
                aria-label="Remove item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Bottom Upload Button */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-slate-400 text-center sm:text-left">
          Ready to upload <span className="text-white font-semibold">{pendingCount} image(s)</span> anonymously to PixelVault.
        </div>

        <button
          type="button"
          onClick={onStartUpload}
          disabled={isUploading || pendingCount === 0}
          className="w-full sm:w-auto py-2.5 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Uploading to Vault...</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span>Upload Now</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
