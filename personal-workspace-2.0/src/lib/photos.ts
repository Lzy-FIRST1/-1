import { getSupabase } from './supabase';

export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function compressImage(dataUrl: string, maxW = 1440, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('canvas 不可用'));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export interface UploadedPhoto {
  path: string;
  thumb?: string;
}

/** 云模式上传到 Supabase Storage；本地模式直接存 dataURL。 */
export async function uploadPhoto(dataUrl: string): Promise<UploadedPhoto> {
  const supabase = getSupabase();
  const thumb = await compressImage(dataUrl, 320, 0.7);
  if (!supabase) return { path: dataUrl, thumb };
  const { data } = await supabase.auth.getUser();
  const full = await compressImage(dataUrl, 1440, 0.82);
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  const path = `${data.user?.id || 'anon'}/${new Date().toISOString().slice(0, 10)}/${filename}`;
  const blob = await (await fetch(full)).blob();
  const { error } = await supabase.storage.from('photos').upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: true
  });
  if (error) return { path: dataUrl, thumb };
  return { path, thumb };
}

/** 把存储路径解析为可展示的 URL */
export function resolvePhotoURL(path: string): string {
  if (path.startsWith('data:') || path.startsWith('blob:') || path.startsWith('http')) return path;
  const supabase = getSupabase();
  if (!supabase) return path;
  return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
}
