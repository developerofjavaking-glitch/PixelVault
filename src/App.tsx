/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { UploadDropzone } from './components/UploadDropzone';
import { UploadQueue } from './components/UploadQueue';
import { UploadSuccessModal } from './components/UploadSuccessModal';
import { ImageViewerModal } from './components/ImageViewerModal';
import { MyVault } from './components/MyVault';
import { CommunityGallery } from './components/CommunityGallery';
import {
  UploadedImage,
  LocalVaultItem,
  QueueItem,
  AutoDeleteOption,
} from './types';
import {
  getImageDimensions,
  processImageForUpload,
  parseExpirationToMinutes,
} from './utils/imageProcessing';
import { normalizeUrlToCurrentOrigin } from './utils/embedCodes';
import {
  getVaultImages,
  saveImageToVault,
  removeImageFromVault,
  updateImageInVault,
  clearLocalVault,
} from './utils/storage';

export default function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'vault' | 'explore'>('upload');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadedImage[] | null>(null);
  const [viewerImage, setViewerImage] = useState<UploadedImage | null>(null);
  const [vaultItems, setVaultItems] = useState<LocalVaultItem[]>([]);
  const [autoDelete, setAutoDelete] = useState<AutoDeleteOption>('never');
  const [resizeOption, setResizeOption] = useState<'original' | '1920' | '1280' | '800'>('original');
  const [stripExif, setStripExif] = useState(true);
  const [serverStats, setServerStats] = useState<{ totalImages: number; totalStorageBytes: number; appUrl?: string } | null>(null);

  const hiddenFileInputRef = useRef<HTMLInputElement | null>(null);

  // Load local vault and server stats on mount
  useEffect(() => {
    // Normalize vault items in storage to current origin
    const items = getVaultImages().map((item) => ({
      ...item,
      url: normalizeUrlToCurrentOrigin(item.url),
      directUrl: normalizeUrlToCurrentOrigin(item.directUrl),
      thumbnailUrl: normalizeUrlToCurrentOrigin(item.thumbnailUrl),
    }));
    setVaultItems(items);

    fetch('/api/stats')
      .then((res) => res.json())
      .then((data) => {
        if (data.totalImages !== undefined) {
          setServerStats({
            totalImages: data.totalImages,
            totalStorageBytes: data.totalStorageBytes || 0,
            appUrl: data.appUrl,
          });
        }
      })
      .catch((err) => console.log('Stats check:', err));
  }, []);

  // Check URL path for deep link like /view/:id and handle back/forward navigation
  useEffect(() => {
    const handleUrlRoute = () => {
      const path = window.location.pathname;
      const match = path.match(/^\/view\/([a-zA-Z0-9]+)$/);
      if (match) {
        const id = match[1];
        fetch(`/api/image/${id}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.image) {
              const normalized = {
                ...data.image,
                url: normalizeUrlToCurrentOrigin(data.image.url),
                directUrl: normalizeUrlToCurrentOrigin(data.image.directUrl),
                downloadUrl: normalizeUrlToCurrentOrigin(data.image.downloadUrl),
              };
              setViewerImage(normalized);
            }
          })
          .catch((err) => console.error('Deep link load error:', err));
      } else {
        setViewerImage(null);
      }
    };

    handleUrlRoute();
    window.addEventListener('popstate', handleUrlRoute);
    return () => window.removeEventListener('popstate', handleUrlRoute);
  }, []);

  // Handle file selections
  const handleFilesSelected = async (files: File[]) => {
    // If we're on upload success screen, clear it to start new upload
    if (uploadResults) {
      setUploadResults(null);
    }

    const newItems: QueueItem[] = [];

    for (const file of files) {
      try {
        const { width, height, url } = await getImageDimensions(file);
        const id = Math.random().toString(36).substring(2, 9);
        newItems.push({
          id,
          file,
          previewUrl: url,
          name: file.name,
          title: file.name.replace(/\.[^/.]+$/, ''),
          description: '',
          size: file.size,
          width,
          height,
          mimeType: file.type || 'image/png',
          resizeOption,
          stripExif,
          status: 'pending',
          progress: 0,
        });
      } catch (err) {
        console.error('Failed to process image preview:', err);
      }
    }

    if (newItems.length > 0) {
      setQueue((prev) => [...prev, ...newItems]);
      setActiveTab('upload');
    }
  };

  const handleRemoveQueueItem = (id: string) => {
    setQueue((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item && item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleUpdateQueueItem = (id: string, updates: Partial<QueueItem>) => {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const handleClearQueue = () => {
    queue.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setQueue([]);
  };

  // Perform upload
  const handleStartUpload = async () => {
    if (queue.length === 0 || isUploading) return;
    setIsUploading(true);

    const resizeMax =
      resizeOption === 'original'
        ? undefined
        : parseInt(resizeOption, 10);

    const expirationMinutes = parseExpirationToMinutes(autoDelete);
    const completedList: UploadedImage[] = [];

    for (const item of queue) {
      if (item.status === 'completed' && item.result) {
        completedList.push(item.result);
        continue;
      }

      handleUpdateQueueItem(item.id, { status: 'uploading', progress: 25 });

      try {
        // 1. Process image client-side (EXIF strip & optional resize)
        const processed = await processImageForUpload(item.file, {
          resizeMax,
          stripExif,
          quality: 0.92,
        });

        handleUpdateQueueItem(item.id, { progress: 60 });

        // 2. Upload to server with auto-detected client origin
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataUrl: processed.dataUrl,
            name: item.name,
            title: item.title,
            description: item.description,
            expirationMinutes,
            width: processed.width,
            height: processed.height,
            origin: window.location.origin,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Upload failed with status ${response.status}`);
        }

        const data = await response.json();
        const uploadedImage: UploadedImage = {
          ...data.image,
          url: normalizeUrlToCurrentOrigin(data.image.url),
          directUrl: normalizeUrlToCurrentOrigin(data.image.directUrl),
          downloadUrl: normalizeUrlToCurrentOrigin(data.image.downloadUrl),
        };

        // 3. Save to local browser vault
        saveImageToVault(uploadedImage);

        handleUpdateQueueItem(item.id, {
          status: 'completed',
          progress: 100,
          result: uploadedImage,
        });

        completedList.push(uploadedImage);
      } catch (err: any) {
        console.error(`Upload error for ${item.name}:`, err);
        handleUpdateQueueItem(item.id, {
          status: 'error',
          error: err.message || 'Network error',
          progress: 0,
        });
      }
    }

    setIsUploading(false);
    setVaultItems(getVaultImages());

    if (completedList.length > 0) {
      setUploadResults(completedList);
      setQueue([]);
    }
  };

  // Delete image from server & local vault
  const handleDeleteImage = async (id: string, token: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/image/${id}?token=${encodeURIComponent(token)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        removeImageFromVault(id);
        setVaultItems(getVaultImages());
        if (viewerImage && viewerImage.id === id) {
          setViewerImage(null);
          if (window.location.pathname.startsWith('/view/')) {
            window.history.pushState(null, '', '/');
          }
        }
        if (uploadResults) {
          setUploadResults((prev) => (prev ? prev.filter((i) => i.id !== id) : null));
        }
        return true;
      }
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Failed to delete image');
      return false;
    } catch (err: any) {
      alert('Network error while deleting image');
      return false;
    }
  };

  // Update title / description
  const handleUpdateMetadata = async (
    id: string,
    token: string,
    title: string,
    description: string
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/api/image/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteToken: token, title, description }),
      });
      if (res.ok) {
        updateImageInVault(id, { title, description });
        setVaultItems(getVaultImages());
        if (viewerImage && viewerImage.id === id) {
          setViewerImage((prev) => (prev ? { ...prev, title, description } : null));
        }
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  const handleClearAllVault = () => {
    clearLocalVault();
    setVaultItems([]);
  };

  const openViewerForVaultItem = (item: UploadedImage) => {
    // Look up deleteToken from vault if available
    const local = vaultItems.find((v) => v.id === item.id);
    const token = item.deleteToken || local?.deleteToken;
    const normalizedItem: UploadedImage = {
      ...item,
      url: normalizeUrlToCurrentOrigin(item.url),
      directUrl: normalizeUrlToCurrentOrigin(item.directUrl),
      downloadUrl: normalizeUrlToCurrentOrigin(item.downloadUrl || ''),
      deleteToken: token,
    };
    setViewerImage(normalizedItem);
    window.history.pushState({ imageId: item.id }, '', '/view/' + item.id);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600/30 selection:text-white">
      {/* Hidden file input for header or global browse */}
      <input
        ref={hiddenFileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFilesSelected(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
        className="hidden"
      />

      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'upload') {
            setUploadResults(null);
          }
        }}
        vaultCount={vaultItems.length}
        serverStats={serverStats}
        detectedUrl={serverStats?.appUrl || (typeof window !== 'undefined' ? window.location.origin : '')}
      />

      {/* Main Content Areas */}
      <main className="flex-1">
        {activeTab === 'upload' && (
          <>
            {uploadResults && uploadResults.length > 0 ? (
              <UploadSuccessModal
                images={uploadResults}
                onUploadMore={() => {
                  setUploadResults(null);
                  setQueue([]);
                }}
                onOpenViewer={(img) => openViewerForVaultItem(img)}
              />
            ) : queue.length > 0 ? (
              <UploadQueue
                queue={queue}
                onRemoveItem={handleRemoveQueueItem}
                onUpdateItem={handleUpdateQueueItem}
                onClearQueue={handleClearQueue}
                onAddMoreFiles={() => hiddenFileInputRef.current?.click()}
                onStartUpload={handleStartUpload}
                isUploading={isUploading}
                autoDelete={autoDelete}
              />
            ) : (
              <UploadDropzone
                onFilesSelected={handleFilesSelected}
                autoDelete={autoDelete}
                setAutoDelete={setAutoDelete}
                resizeOption={resizeOption}
                setResizeOption={setResizeOption}
                stripExif={stripExif}
                setStripExif={setStripExif}
              />
            )}
          </>
        )}

        {activeTab === 'vault' && (
          <MyVault
            vaultItems={vaultItems}
            onOpenViewer={(item) => openViewerForVaultItem(item)}
            onDeleteItem={handleDeleteImage}
            onNavigateUpload={() => setActiveTab('upload')}
            onClearAllVault={handleClearAllVault}
          />
        )}

        {activeTab === 'explore' && (
          <CommunityGallery
            onOpenViewer={(item) => openViewerForVaultItem(item)}
            onNavigateUpload={() => setActiveTab('upload')}
          />
        )}
      </main>

      {/* High-Resolution Image Viewer Modal */}
      {viewerImage && (
        <ImageViewerModal
          image={viewerImage}
          onClose={() => {
            setViewerImage(null);
            if (window.location.pathname.startsWith('/view/')) {
              window.history.pushState(null, '', '/');
            }
          }}
          onDeleteImage={handleDeleteImage}
          onUpdateMetadata={handleUpdateMetadata}
          localDeleteToken={viewerImage.deleteToken}
        />
      )}

      {/* Minimal Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">PixelVault</span>
            <span aria-hidden="true">·</span>
            <span>Anonymous & Encrypted Cloud Image Hosting</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => setActiveTab('upload')}
              className="hover:text-slate-200 transition-colors"
            >
              Upload
            </button>
            <button
              onClick={() => setActiveTab('vault')}
              className="hover:text-slate-200 transition-colors"
            >
              My Vault
            </button>
            <button
              onClick={() => setActiveTab('explore')}
              className="hover:text-slate-200 transition-colors"
            >
              Explore
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
