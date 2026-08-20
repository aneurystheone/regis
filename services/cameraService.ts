import { Capacitor } from '@capacitor/core';

export interface CameraCaptureResult {
  file: File;
  previewUrl: string;
}

/**
 * Converts a Base64 data URL to a File object.
 */
export function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

/**
 * Capture a photo using native Capacitor Camera plugin if available on mobile,
 * or return null to trigger HTML file input fallback on web.
 */
export async function captureImageWithNativeFallback(
  source: 'camera' | 'gallery'
): Promise<CameraCaptureResult | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
    
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
    });

    if (photo.dataUrl) {
      const fileName = `photo_${Date.now()}.${photo.format || 'jpg'}`;
      const file = dataURLtoFile(photo.dataUrl, fileName);
      return {
        file,
        previewUrl: photo.dataUrl,
      };
    }
  } catch (error: any) {
    // If user cancelled or plugin not registered, return null for HTML fallback
    console.warn('Native camera capture fallback to file input:', error?.message || error);
  }

  return null;
}
