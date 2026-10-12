import React, { useState, useMemo } from 'react';
import { LocalVaultItem, UploadedImage, EmbedCodeType } from '../types';
import {
  formatBytes,
  formatRelativeDate,
  formatTimeRemaining,
  generateEmbedCode,
} from '../utils/embedCodes';
import {
  FolderLock,
  Search,
  Filter,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Download,
  UploadCloud,
  CheckSquare,
  Square,
  Clock,
  KeyRound,
} from 'lucide-react';
import { QRCodeModal } from './QRCodeModal';

interface MyVaultProps {
  vaultItems: LocalVaultItem[];
  onOpenViewer: (item: UploadedImage) => void;
  onDeleteItem: (id: string, token: string) => Promise<boolean>;
  onNavigateUpload: () => void;
  onClearAllVault: () => void;
}

export const MyVault: React.FC<MyVaultProps> = ({
  vaultItems,
  onOpenViewer,
  onDeleteItem,
  onNavigateUpload,
  onClearAllVault,
}) => {
  const [search, setSearch] = useState('');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'size-desc' | 'size-asc'>('newest');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [batchCopied, setBatchCopied] = useState(false);
  const [qrModalItem, setQrModalItem] = useState<LocalVaultItem | null>(null);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);

  // Filter & sort
  const filteredItems = useMemo(() => {
    return vaultItems
      .filter((item) => {
        const matchesSearch =
          item.title.toLowerCase().includes(search.toLowerCase()) ||
          item.originalName.toLowerCase().includes(search.toLowerCase());
        const matchesFormat =
          formatFilter === 'all' || item.mimeType.toLowerCase().includes(formatFilter.toLowerCase());
        return matchesSearch && matchesFormat;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return b.createdAt - a.createdAt;
        if (sortBy === 'oldest') return a.createdAt - b.createdAt;
        if (sortBy === 'size-desc') return b.size - a.size;
        if (sortBy === 'size-asc') return a.size - b.size;
        return 0;
      });
  }, [vaultItems, search, formatFilter, sortBy]);

  const totalBytes = useMemo(() => {
    return vaultItems.reduce((acc, i) => acc + i.size, 0);
  }, [vaultItems]);

  const handleCopyLink = async (item: LocalVaultItem) => {
    try {
      await navigator.clipboard.writeText(item.directUrl);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy direct URL:', err);
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  const handleCopySelectedLinks = async (type: EmbedCodeType = 'direct') => {
    const selected = vaultItems.filter((i) => selectedIds.has(i.id));
    const codes = selected.map((i) => generateEmbedCode(type, i)).join('\n');
    try {
      await navigator.clipboard.writeText(codes);
      setBatchCopied(true);
      setTimeout(() => setBatchCopied(false), 2000);
    } catch (err) {
      console.error('Failed to batch copy:', err);
    }
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} image(s) from server and vault?`)) return;
    setIsDeletingBatch(true);
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      const item = vaultItems.find((i) => i.id === id);
      if (item && item.deleteToken) {
        await onDeleteItem(id, item.deleteToken);
      }
    }
    setSelectedIds(new Set());
    setIsDeletingBatch(false);
  };

  if (vaultItems.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-4">
          <FolderLock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Your Anonymous Vault is Empty</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
          Images you upload anonymously will be privately remembered in your browser vault along with their secret deletion keys.
        </p>
        <button
          type="button"
          onClick={onNavigateUpload}
          className="inline-flex items-center gap-2 py-2 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
        >
          <UploadCloud className="w-4 h-4" />
          Upload Your First Image
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4 sm:px-6">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FolderLock className="w-6 h-6 text-indigo-400" />
            My Anonymous Vault
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span>{vaultItems.length} {vaultItems.length === 1 ? 'image' : 'images'}</span>
            <span aria-hidden="true">·</span>
            <span>{formatBytes(totalBytes)} stored</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <KeyRound className="w-3 h-3" />
              Private keys retained
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNavigateUpload}
            className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Upload New
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Clear local history? (Images on server won’t be deleted unless you use individual delete keys)')) {
                onClearAllVault();
              }
            }}
            className="py-1.5 px-3 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 transition-colors"
          >
            Clear History
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or filename..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Format pills */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            {['all', 'png', 'jpeg', 'webp', 'gif'].map((fmt) => (
              <button
                key={fmt}
                onClick={() => setFormatFilter(fmt)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium uppercase transition-colors ${
                  formatFilter === fmt
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {fmt === 'jpeg' ? 'JPG' : fmt}
              </button>
            ))}
          </div>

          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-hidden"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="size-desc">Largest Size</option>
            <option value="size-asc">Smallest Size</option>
          </select>
        </div>
      </div>

      {/* Batch Actions Bar (when items selected) */}
      {selectedIds.size > 0 && (
        <div className="bg-indigo-950/60 border border-indigo-800/80 rounded-xl p-3 mb-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-200">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">
              {selectedIds.size} of {filteredItems.length} selected
            </span>
            <button
              onClick={handleSelectAll}
              className="text-indigo-400 hover:underline font-medium ml-2"
            >
              {selectedIds.size === filteredItems.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopySelectedLinks('direct')}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
            >
              {batchCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{batchCopied ? 'Copied Links!' : 'Copy Direct Links'}</span>
            </button>

            <button
              onClick={() => handleCopySelectedLinks('markdown-image')}
              className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
            >
              Copy Markdown
            </button>

            <button
              disabled={isDeletingBatch}
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeletingBatch ? 'Deleting...' : 'Delete Selected'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Grid of Vault Images */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-xs">
          No images matched your search or filter.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredItems.map((item) => {
            const isSelected = selectedIds.has(item.id);
            const isCopied = copiedId === item.id;

            return (
              <div
                key={item.id}
                className={`group relative bg-slate-900 border rounded-xl overflow-hidden transition-all flex flex-col ${
                  isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Select checkbox overlay */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleSelect(item.id);
                  }}
                  className="absolute top-2 left-2 z-10 p-1 rounded bg-black/60 backdrop-blur-xs text-white opacity-80 hover:opacity-100 transition-opacity"
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-indigo-400" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {/* Expiration badge */}
                {item.expiresAt && (
                  <div className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[10px] text-indigo-300 font-mono flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {formatTimeRemaining(item.expiresAt).split(' ')[0]}
                  </div>
                )}

                {/* Image preview area */}
                <div
                  onClick={() =>
                    onOpenViewer({
                      id: item.id,
                      originalName: item.originalName,
                      title: item.title,
                      description: item.description,
                      mimeType: item.mimeType,
                      size: item.size,
                      width: item.width,
                      height: item.height,
                      createdAt: item.createdAt,
                      expiresAt: item.expiresAt,
                      views: 0,
                      deleteToken: item.deleteToken,
                      url: item.url,
                      directUrl: item.directUrl,
                    })
                  }
                  className="relative aspect-square w-full bg-slate-950 overflow-hidden cursor-pointer"
                >
                  <img
                    src={item.directUrl}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                    Inspect
                  </div>
                </div>

                {/* Details Footer */}
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h4
                      title={item.title || item.originalName}
                      className="text-xs font-semibold text-white truncate mb-1"
                    >
                      {item.title || item.originalName}
                    </h4>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{formatBytes(item.size)}</span>
                      <span>{formatRelativeDate(item.createdAt)}</span>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(item)}
                      className="text-slate-400 hover:text-white transition-colors p-1"
                      title="Copy Direct Link"
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setQrModalItem(item)}
                      className="text-slate-400 hover:text-white transition-colors p-1"
                      title="QR Code"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                    </button>

                    <a
                      href={`/api/image/${item.id}/download`}
                      download={item.originalName}
                      className="text-slate-400 hover:text-white transition-colors p-1"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Delete this image permanently from PixelVault?')) {
                          onDeleteItem(item.id, item.deleteToken);
                        }
                      }}
                      className="text-slate-400 hover:text-rose-400 transition-colors p-1"
                      title="Delete Image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QR Modal */}
      {qrModalItem && (
        <QRCodeModal
          url={qrModalItem.directUrl}
          title={qrModalItem.title}
          onClose={() => setQrModalItem(null)}
        />
      )}
    </div>
  );
};
