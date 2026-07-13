import * as ImagePicker from 'expo-image-picker';

export interface CapturedPhoto {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
}

/**
 * Open the camera and return the captured photo, or null if the user cancels.
 * Throws if camera permission is denied.
 */
export async function capturePhoto(): Promise<CapturedPhoto | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Camera permission is required to take trip photos.');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: 'images',
    quality: 0.5, // compress — drivers are often on mobile data
  });

  if (result.canceled || !result.assets?.length) return null;
  const a = result.assets[0];
  return { uri: a.uri, mimeType: a.mimeType, fileName: a.fileName };
}
