import React from 'react';
import { UploadCloud, FolderLock, Compass, HardDrive, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  activeTab: 'upload' | 'vault' | 'explore';
  setActiveTab: (tab: 'upload' | 'vault' | 'explore') => void;
  vaultCount: number;
  serverStats?: { totalImages: number; totalStorageBytes: number } | null;
  detectedUrl?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  vaultCount,
  serverStats,
  detectedUrl,
}) => {
  const currentHost = typeof window !== 'undefined' ? window.location.host : '';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('upload')}
            className="flex items-center gap-2.5 text-left group focus:outline-hidden"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 group-hover:bg-indigo-500 transition-colors">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg text-white tracking-tight">PixelVault</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-800/60">
                  Host
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-normal leading-none hidden sm:block">
                Secure Anonymous Cloud
              </p>
            </div>
          </button>

          {/* Navigation links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'upload'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              Upload
            </button>

            <button
              onClick={() => setActiveTab('vault')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'vault'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FolderLock className="w-4 h-4" />
              My Vault
              {vaultCount > 0 && (
                <span className="text-[10px] bg-slate-700 text-slate-200 px-1.5 py-0.2 rounded font-mono">
                  {vaultCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('explore')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'explore'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Compass className="w-4 h-4" />
              Community Stream
            </button>
          </nav>
        </div>

        {/* Right side stats & status */}
        <div className="flex items-center gap-3">
          {/* Auto-detected Web Host */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Connected"></span>
            <span className="text-slate-400 text-[10px] uppercase font-semibold">Web URL:</span>
            <span className="font-mono text-indigo-300 max-w-[210px] truncate" title={`Auto-detected URL: ${detectedUrl || currentHost}`}>
              {currentHost || detectedUrl}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 border-l border-slate-800 pl-3">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zero-logs</span>
            </span>
          </div>

          <button
            onClick={() => setActiveTab('upload')}
            className="flex items-center gap-1.5 py-1.5 px-3.5 text-xs font-semibold rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload Images</span>
          </button>
        </div>
      </div>

      {/* Mobile navigation tab strip */}
      <div className="flex md:hidden border-t border-slate-800/80 px-2 py-1 bg-slate-950/70 overflow-x-auto">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 min-w-[70px] py-1.5 px-2 text-center text-xs font-medium rounded ${
            activeTab === 'upload' ? 'bg-slate-800 text-white' : 'text-slate-400'
          }`}
        >
          Upload
        </button>
        <button
          onClick={() => setActiveTab('vault')}
          className={`flex-1 min-w-[80px] py-1.5 px-2 text-center text-xs font-medium rounded ${
            activeTab === 'vault' ? 'bg-slate-800 text-white' : 'text-slate-400'
          }`}
        >
          My Vault {vaultCount > 0 ? `(${vaultCount})` : ''}
        </button>
        <button
          onClick={() => setActiveTab('explore')}
          className={`flex-1 min-w-[70px] py-1.5 px-2 text-center text-xs font-medium rounded ${
            activeTab === 'explore' ? 'bg-slate-800 text-white' : 'text-slate-400'
          }`}
        >
          Explore
        </button>
      </div>
    </header>
  );
};
