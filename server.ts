import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Increase payload limits for image uploads
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ limit: '60mb', extended: true }));

// Storage folders
const DATA_DIR = path.resolve(__dirname, 'data');
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
const METADATA_FILE = path.resolve(DATA_DIR, 'images.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export interface StoredImage {
  id: string;
  filename: string;
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
  views: number;
}

// In-memory cache synced with disk
let imagesMap = new Map<string, StoredImage>();

function loadMetadata() {
  try {
    if (fs.existsSync(METADATA_FILE)) {
      const raw = fs.readFileSync(METADATA_FILE, 'utf-8');
      const list: StoredImage[] = JSON.parse(raw);
      imagesMap.clear();
      for (const item of list) {
        imagesMap.set(item.id, item);
      }
    }
  } catch (err) {
    console.error('Failed to load metadata:', err);
  }
}

function saveMetadata() {
  try {
    const list = Array.from(imagesMap.values());
    fs.writeFileSync(METADATA_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save metadata:', err);
  }
}

loadMetadata();

// Clean up expired images periodically
function cleanExpiredImages() {
  const now = Date.now();
  let modified = false;
  for (const [id, img] of imagesMap.entries()) {
    if (img.expiresAt && img.expiresAt <= now) {
      const filePath = path.resolve(UPLOADS_DIR, img.filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error(`Failed to delete expired file ${img.filename}:`, e);
        }
      }
      imagesMap.delete(id);
      modified = true;
    }
  }
  if (modified) {
    saveMetadata();
  }
}

setInterval(cleanExpiredImages, 30 * 1000);
cleanExpiredImages();

function generateShortId(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

function getExtension(mimeType: string, filename: string): string {
  const mimeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp',
    'image/x-icon': 'ico',
    'image/vnd.microsoft.icon': 'ico',
    'image/avif': 'avif',
  };
  if (mimeMap[mimeType]) return mimeMap[mimeType];
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex !== -1) return filename.substring(dotIndex + 1).toLowerCase();
  return 'png';
}

// Get base URL with automatic detection (APP_URL env, client origin, forwarded headers, or host)
function getBaseUrl(req: Request, clientOrigin?: string): string {
  if (clientOrigin && typeof clientOrigin === 'string' && clientOrigin.startsWith('http')) {
    return clientOrigin.replace(/\/$/, '');
  }

  if (process.env.APP_URL && process.env.APP_URL.trim() !== '' && process.env.APP_URL !== 'MY_APP_URL') {
    return process.env.APP_URL.trim().replace(/\/$/, '');
  }

  const forwardedHost = req.get('x-forwarded-host');
  const forwardedProto = req.get('x-forwarded-proto') || 'https';
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, '');
  }

  const host = req.get('host') || 'localhost:3000';
  const proto = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  return `${proto}://${host}`.replace(/\/$/, '');
}

// ================= API ENDPOINTS =================

// 1. Upload an image (anonymous, base64 payload)
app.post('/api/upload', (req: Request, res: Response): void => {
  try {
    const { dataUrl, name, title, description, expirationMinutes, width, height, origin } = req.body;

    if (!dataUrl || typeof dataUrl !== 'string') {
      res.status(400).json({ error: 'Missing or invalid dataUrl parameter' });
      return;
    }

    // Match data:[<mediatype>];base64,<data>
    const match = dataUrl.match(/^data:([a-zA-Z0-9\/+.-]+);base64,(.+)$/);
    if (!match) {
      res.status(400).json({ error: 'Invalid data URL format. Expected base64 encoded image.' });
      return;
    }

    const mimeType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > 50 * 1024 * 1024) {
      res.status(400).json({ error: 'File size exceeds maximum 50MB limit' });
      return;
    }

    let id = generateShortId();
    while (imagesMap.has(id)) {
      id = generateShortId();
    }

    const originalName = (name && typeof name === 'string' ? name.trim() : `image-${id}`) || `image-${id}`;
    const ext = getExtension(mimeType, originalName);
    const diskFilename = `${id}.${ext}`;
    const filePath = path.resolve(UPLOADS_DIR, diskFilename);

    fs.writeFileSync(filePath, buffer);

    const now = Date.now();
    let expiresAt: number | null = null;
    if (expirationMinutes && typeof expirationMinutes === 'number' && expirationMinutes > 0) {
      expiresAt = now + expirationMinutes * 60 * 1000;
    }

    const deleteToken = crypto.randomBytes(16).toString('hex');

    const imageRecord: StoredImage = {
      id,
      filename: diskFilename,
      originalName,
      title: title?.trim() || originalName.replace(/\.[^/.]+$/, ''),
      description: description?.trim() || '',
      mimeType,
      size: buffer.length,
      width: Number(width) || undefined,
      height: Number(height) || undefined,
      createdAt: now,
      expiresAt,
      deleteToken,
      views: 0,
    };

    imagesMap.set(id, imageRecord);
    saveMetadata();

    const clientOrigin = origin || req.get('origin') || (req.get('referer') ? new URL(req.get('referer')!).origin : undefined);
    const baseUrl = getBaseUrl(req, clientOrigin);

    res.status(201).json({
      success: true,
      image: {
        id: imageRecord.id,
        originalName: imageRecord.originalName,
        title: imageRecord.title,
        description: imageRecord.description,
        mimeType: imageRecord.mimeType,
        size: imageRecord.size,
        width: imageRecord.width,
        height: imageRecord.height,
        createdAt: imageRecord.createdAt,
        expiresAt: imageRecord.expiresAt,
        views: imageRecord.views,
        deleteToken: imageRecord.deleteToken, // Given to the anonymous uploader to store in local session
        url: `${baseUrl}/view/${id}`,
        directUrl: `${baseUrl}/i/${id}.${ext}`,
        downloadUrl: `${baseUrl}/api/image/${id}/download`,
        deleteUrl: `${baseUrl}/api/image/${id}?token=${deleteToken}`,
      },
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to process image upload: ' + (err.message || 'Server error') });
  }
});

// 2. Fetch public / community gallery
app.get('/api/images', (req: Request, res: Response): void => {
  try {
    cleanExpiredImages();
    const baseUrl = getBaseUrl(req);

    const list = Array.from(imagesMap.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50)
      .map((img) => ({
        id: img.id,
        originalName: img.originalName,
        title: img.title,
        description: img.description,
        mimeType: img.mimeType,
        size: img.size,
        width: img.width,
        height: img.height,
        createdAt: img.createdAt,
        expiresAt: img.expiresAt,
        views: img.views,
        url: `${baseUrl}/view/${img.id}`,
        directUrl: `${baseUrl}/i/${img.filename}`,
      }));

    res.json({ images: list, total: imagesMap.size });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// 3. Get image metadata
app.get('/api/image/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  const cleanId = id.replace(/\.[a-zA-Z0-9]+$/, '');
  const img = imagesMap.get(cleanId);

  if (!img) {
    res.status(404).json({ error: 'Image not found or has expired' });
    return;
  }

  if (img.expiresAt && img.expiresAt <= Date.now()) {
    cleanExpiredImages();
    res.status(404).json({ error: 'Image has expired' });
    return;
  }

  // Increment view
  img.views += 1;
  saveMetadata();

  const baseUrl = getBaseUrl(req);

  res.json({
    image: {
      id: img.id,
      originalName: img.originalName,
      title: img.title,
      description: img.description,
      mimeType: img.mimeType,
      size: img.size,
      width: img.width,
      height: img.height,
      createdAt: img.createdAt,
      expiresAt: img.expiresAt,
      views: img.views,
      url: `${baseUrl}/view/${img.id}`,
      directUrl: `${baseUrl}/i/${img.filename}`,
      downloadUrl: `${baseUrl}/api/image/${img.id}/download`,
    },
  });
});

// 4. Direct Raw Image Serve for hotlinking (HTML <img>, Markdown, BBCode, Discord, Reddit)
function serveRawImage(req: Request, res: Response): void {
  const { id } = req.params;
  const cleanId = id.replace(/\.[a-zA-Z0-9]+$/, ''); // handles both /i/abc and /i/abc.png
  const img = imagesMap.get(cleanId);

  if (!img) {
    res.status(404).send('Image not found or has expired');
    return;
  }

  if (img.expiresAt && img.expiresAt <= Date.now()) {
    cleanExpiredImages();
    res.status(404).send('Image has expired');
    return;
  }

  const filePath = path.resolve(UPLOADS_DIR, img.filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).send('File missing from storage');
    return;
  }

  img.views += 1;

  res.setHeader('Content-Type', img.mimeType);
  res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.sendFile(filePath);
}

app.get('/i/:id', serveRawImage);
app.get('/api/image/:id/raw', serveRawImage);

// 5. Force Download Original File
app.get('/api/image/:id/download', (req: Request, res: Response): void => {
  const { id } = req.params;
  const img = imagesMap.get(id);

  if (!img) {
    res.status(404).send('Image not found or has expired');
    return;
  }

  const filePath = path.resolve(UPLOADS_DIR, img.filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).send('File missing');
    return;
  }

  res.setHeader('Content-Type', img.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(img.originalName)}"`);
  res.sendFile(filePath);
});

// 6. Delete image using anonymous delete token
app.delete('/api/image/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  const token = (req.query.token as string) || req.body?.deleteToken;

  const img = imagesMap.get(id);
  if (!img) {
    res.status(404).json({ error: 'Image not found' });
    return;
  }

  if (!token || token !== img.deleteToken) {
    res.status(403).json({ error: 'Invalid or missing delete token' });
    return;
  }

  const filePath = path.resolve(UPLOADS_DIR, img.filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error('Failed to remove file:', e);
    }
  }

  imagesMap.delete(id);
  saveMetadata();

  res.json({ success: true, message: 'Image deleted successfully' });
});

// 7. Update image metadata (title / description) with delete token
app.patch('/api/image/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  const { deleteToken, title, description } = req.body;

  const img = imagesMap.get(id);
  if (!img) {
    res.status(404).json({ error: 'Image not found' });
    return;
  }

  if (!deleteToken || deleteToken !== img.deleteToken) {
    res.status(403).json({ error: 'Invalid or missing delete token' });
    return;
  }

  if (typeof title === 'string') img.title = title.trim();
  if (typeof description === 'string') img.description = description.trim();

  saveMetadata();
  res.json({ success: true, image: img });
});

// 8. Server status & stats
app.get('/api/stats', (req: Request, res: Response): void => {
  let totalBytes = 0;
  for (const img of imagesMap.values()) {
    totalBytes += img.size;
  }
  res.json({
    totalImages: imagesMap.size,
    totalStorageBytes: totalBytes,
    maxUploadSizeMB: 50,
    supportedFormats: ['PNG', 'JPG', 'WEBP', 'GIF', 'SVG', 'AVIF', 'BMP', 'ICO'],
    appUrl: getBaseUrl(req),
  });
});

// ================= FRONTEND VITE INTEGRATION =================

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PixelVault server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
