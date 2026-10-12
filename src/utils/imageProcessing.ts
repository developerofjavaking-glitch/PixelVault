export interface ImageMeta {
  width: number;
  height: number;
  dataUrl: string;
}

export function getImageDimensions(file: File | Blob): Promise<{ width: number; height: number; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight, url });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for dimension check'));
    };
    img.src = url;
  });
}

export async function processImageForUpload(
  file: File,
  options: {
    resizeMax?: number; // e.g. 1920, 1280, 800
    stripExif?: boolean;
    quality?: number; // 0.1 to 1.0
  } = {}
): Promise<{ dataUrl: string; width: number; height: number; mimeType: string }> {
  const { resizeMax, stripExif = true, quality = 0.92 } = options;

  // SVGs don't need canvas rasterization
  if (file.type === 'image/svg+xml') {
    const text = await file.text();
    const dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(text)))}`;
    return { dataUrl, width: 800, height: 600, mimeType: file.type };
  }

  // Load into canvas to strip EXIF and optionally resize
  const dimensions = await getImageDimensions(file);
  let targetWidth = dimensions.width;
  let targetHeight = dimensions.height;

  if (resizeMax && (targetWidth > resizeMax || targetHeight > resizeMax)) {
    if (targetWidth > targetHeight) {
      targetHeight = Math.round((targetHeight * resizeMax) / targetWidth);
      targetWidth = resizeMax;
    } else {
      targetWidth = Math.round((targetWidth * resizeMax) / targetHeight);
      targetHeight = resizeMax;
    }
  }

  // If no resize is requested and stripExif is false, we can use FileReader
  if (!stripExif && !resizeMax) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          dataUrl: reader.result as string,
          width: dimensions.width,
          height: dimensions.height,
          mimeType: file.type || 'image/png',
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Draw on canvas - this strips all camera tags, GPS coordinates, and unnecessary metadata
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Smooth scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // For PNGs/transparent WebP, preserve alpha
      const isTransparent = file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif';
      if (!isTransparent) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
      }

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      let outputMime = file.type || 'image/jpeg';
      // If original is gif, canvas export gives png or webp
      if (file.type === 'image/gif') {
        outputMime = 'image/png';
      }

      try {
        const dataUrl = canvas.toDataURL(outputMime, quality);
        resolve({
          dataUrl,
          width: targetWidth,
          height: targetHeight,
          mimeType: outputMime,
        });
      } catch (err) {
        // Fallback to jpeg
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve({
          dataUrl,
          width: targetWidth,
          height: targetHeight,
          mimeType: 'image/jpeg',
        });
      }
    };
    img.onerror = () => reject(new Error('Failed to render image to canvas'));
    img.src = dimensions.url;
  });
}

export function parseExpirationToMinutes(option: string): number | null {
  switch (option) {
    case '5m':
      return 5;
    case '15m':
      return 15;
    case '1h':
      return 60;
    case '6h':
      return 360;
    case '1d':
      return 1440;
    case '3d':
      return 4320;
    case '1w':
      return 10080;
    case '1m':
      return 43200;
    case 'never':
    default:
      return null;
  }
}
