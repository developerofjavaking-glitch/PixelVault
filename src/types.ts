export interface UploadedImage {
  id: string;
  originalName: string;
  title: string;
  description: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  createdAt: number;
  expiresAt: number | null;
  views: number;
  deleteToken?: string;
  url: string;
  directUrl: string;
  downloadUrl?: string;
  deleteUrl?: string;
}

export interface LocalVaultItem {
  id: string;
  originalName: string;
  title: string;
  description: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  createdAt: number;
  expiresAt: number | null;
  deleteToken: string;
  url: string;
  directUrl: string;
  thumbnailUrl: string;
}

export interface QueueItem {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  title: string;
  description: string;
  size: number;
  width: number;
  height: number;
  mimeType: string;
  resizeOption: 'original' | '1920' | '1280' | '800';
  stripExif: boolean;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
  result?: UploadedImage;
}

export type AutoDeleteOption =
  | 'never'
  | '5m'
  | '15m'
  | '1h'
  | '6h'
  | '1d'
  | '3d'
  | '1w'
  | '1m';

export type EmbedCodeType =
  | 'viewer'
  | 'direct'
  | 'html-image'
  | 'html-linked'
  | 'bbcode-full'
  | 'bbcode-direct'
  | 'markdown-image'
  | 'markdown-linked';
