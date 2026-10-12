import React, { useState, useEffect } from 'react';
import { UploadedImage } from '../types';
import { formatBytes, formatRelativeDate } from '../utils/embedCodes';
import { Compass, RefreshCw, Eye, ExternalLink, HardDrive, Shield } from 'lucide-react';

interface CommunityGalleryProps {
  onOpenViewer: (image: UploadedImage) => void;
  onNavigateUpload: () => void;
}

export const CommunityGallery: React.FC<CommunityGalleryProps> = ({
  onOpenViewer,
  onNavigateUpload,
}) => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/images');
      if (res.ok) {
        const data = await res.json();
        setImages(data.images || []);
        setTotal(data.total || (data.images ? data.images.length : 0));
      }
    } catch (err) {
      console.error('Failed to load community stream:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Compass className="w-6 h-6 text-indigo-400" />
            Community Stream
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Recent anonymous public uploads across PixelVault.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchImages}
            disabled={loading}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/80 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square bg-slate-900 border border-slate-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl p-8">
          <HardDrive className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-1">No uploads yet</h3>
          <p className="text-xs text-slate-400 mb-4">
            Be the first to upload an anonymous image to PixelVault!
          </p>
          <button
            type="button"
            onClick={onNavigateUpload}
            className="py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Upload Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((img) => (
            <div
              key={img.id}
              onClick={() => onOpenViewer(img)}
              className="group relative bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl overflow-hidden cursor-pointer flex flex-col transition-all hover:shadow-lg"
            >
              <div className="relative aspect-square w-full bg-slate-950 overflow-hidden">
                <img
                  src={img.directUrl}
                  alt={img.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1">
                  <Eye className="w-4 h-4" />
                  <span>Inspect</span>
                </div>
              </div>

              <div className="p-2.5">
                <h4 className="text-xs font-semibold text-white truncate mb-1">
                  {img.title || img.originalName}
                </h4>
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>{formatBytes(img.size)}</span>
                  <span>{formatRelativeDate(img.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
