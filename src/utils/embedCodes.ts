import { EmbedCodeType } from '../types';

export interface EmbedResult {
  label: string;
  code: string;
  description: string;
}

export function normalizeUrlToCurrentOrigin(url: string): string {
  if (!url) return '';
  if (typeof window === 'undefined') return url;
  const currentOrigin = window.location.origin;

  try {
    const parsed = new URL(url);
    // If it's localhost, 127.0.0.1, 0.0.0.0 or internal dev port, rewrite to current real origin
    if (
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '0.0.0.0'
    ) {
      return `${currentOrigin}${parsed.pathname}${parsed.search}`;
    }
    return url;
  } catch {
    if (url.startsWith('/')) {
      return `${currentOrigin}${url}`;
    }
    return url;
  }
}

export function generateEmbedCode(
  type: EmbedCodeType,
  image: {
    id: string;
    title?: string;
    originalName?: string;
    url: string;
    directUrl: string;
  }
): string {
  const name = image.title || image.originalName || 'image';
  const viewerUrl = normalizeUrlToCurrentOrigin(image.url);
  const directUrl = normalizeUrlToCurrentOrigin(image.directUrl);

  switch (type) {
    case 'viewer':
      return viewerUrl;
    case 'direct':
      return directUrl;
    case 'html-image':
      return `<img src="${directUrl}" alt="${escapeHtml(name)}" border="0" />`;
    case 'html-linked':
      return `<a href="${viewerUrl}" target="_blank" rel="noopener noreferrer"><img src="${directUrl}" alt="${escapeHtml(name)}" border="0" /></a>`;
    case 'bbcode-full':
      return `[url=${viewerUrl}][img]${directUrl}[/img][/url]`;
    case 'bbcode-direct':
      return `[img]${directUrl}[/img]`;
    case 'markdown-image':
      return `![${escapeMarkdown(name)}](${directUrl})`;
    case 'markdown-linked':
      return `[![${escapeMarkdown(name)}](${directUrl})](${viewerUrl})`;
    default:
      return directUrl;
  }
}

export const EMBED_FORMAT_OPTIONS: { id: EmbedCodeType; label: string; group: string }[] = [
  { id: 'viewer', label: 'Viewer Link', group: 'Links' },
  { id: 'direct', label: 'Direct Image Link (Hotlink)', group: 'Links' },
  { id: 'html-image', label: 'HTML Image', group: 'HTML Embeds' },
  { id: 'html-linked', label: 'HTML Linked Image', group: 'HTML Embeds' },
  { id: 'bbcode-full', label: 'BBCode Full Linked', group: 'Forums & BBCode' },
  { id: 'bbcode-direct', label: 'BBCode Direct Image', group: 'Forums & BBCode' },
  { id: 'markdown-image', label: 'Markdown Image', group: 'Markdown' },
  { id: 'markdown-linked', label: 'Markdown Linked Image', group: 'Markdown' },
];

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeMarkdown(str: string): string {
  return str.replace(/([\[\]\(\)\*\_\`\#])/g, '\\$1');
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatTimeRemaining(expiresAt: number | null): string {
  if (!expiresAt) return 'Never expires';
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'Expired';

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h remaining`;
  if (hours > 0) return `${hours}h ${minutes % 60}m remaining`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s remaining`;
  return `${seconds}s remaining`;
}

export function formatRelativeDate(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
