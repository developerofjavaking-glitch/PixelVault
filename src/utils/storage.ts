import { LocalVaultItem, UploadedImage } from '../types';

const VAULT_STORAGE_KEY = 'pixelvault_user_uploads_v1';

export function getVaultImages(): LocalVaultItem[] {
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) return [];
    const items: LocalVaultItem[] = JSON.parse(raw);
    // Filter out locally known expired images
    const now = Date.now();
    return items.filter((item) => !item.expiresAt || item.expiresAt > now);
  } catch (err) {
    console.error('Failed to parse local vault:', err);
    return [];
  }
}

export function saveImageToVault(image: UploadedImage): void {
  try {
    const items = getVaultImages();
    const existingIndex = items.findIndex((i) => i.id === image.id);

    const vaultItem: LocalVaultItem = {
      id: image.id,
      originalName: image.originalName,
      title: image.title,
      description: image.description,
      mimeType: image.mimeType,
      size: image.size,
      width: image.width,
      height: image.height,
      createdAt: image.createdAt,
      expiresAt: image.expiresAt,
      deleteToken: image.deleteToken || '',
      url: image.url,
      directUrl: image.directUrl,
      thumbnailUrl: image.directUrl,
    };

    if (existingIndex >= 0) {
      items[existingIndex] = vaultItem;
    } else {
      items.unshift(vaultItem);
    }

    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(items.slice(0, 500)));
  } catch (err) {
    console.error('Failed to save to local vault:', err);
  }
}

export function removeImageFromVault(id: string): void {
  try {
    const items = getVaultImages().filter((i) => i.id !== id);
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to remove from local vault:', err);
  }
}

export function updateImageInVault(id: string, updates: Partial<LocalVaultItem>): void {
  try {
    const items = getVaultImages().map((i) => (i.id === id ? { ...i, ...updates } : i));
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to update in local vault:', err);
  }
}

export function clearLocalVault(): void {
  try {
    localStorage.removeItem(VAULT_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear vault:', err);
  }
}
