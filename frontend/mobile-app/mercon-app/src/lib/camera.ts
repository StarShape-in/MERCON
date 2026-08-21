import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert } from 'react-native';

export interface CapturedPhoto {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
}

/**
 * Resize + compress a photo so it's safe to upload.
 * Gallery photos from modern phones can be 5–10 MB. We cap them at 1280px wide
 * and 0.7 JPEG quality → typical output is 150–400 KB, well under nginx's limit.
 */
async function compressPhoto(uri: string): Promise<CapturedPhoto> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1280 } }], // height auto-calculated to preserve aspect ratio
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
  );
  return { uri: result.uri, mimeType: 'image/jpeg', fileName: 'photo.jpg' };
}

async function toPhoto(result: ImagePicker.ImagePickerResult): Promise<CapturedPhoto | null> {
  if (result.canceled || !result.assets?.length) return null;
  const a = result.assets[0];
  return compressPhoto(a.uri);
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
    quality: 1, // pick at full quality — we compress ourselves in compressPhoto()
    exif: false,
  });

  return toPhoto(result);
}

/**
 * Pick an existing photo from the device gallery, or null if the user cancels.
 * Uses the system photo picker (PHPicker on iOS, Photo Picker on Android),
 * which needs no runtime permission.
 */
export async function pickFromGallery(): Promise<CapturedPhoto | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    quality: 1, // pick at full quality — we compress ourselves in compressPhoto()
    exif: false,
  });

  return toPhoto(result);
}

export interface CapturedMedia {
  uri: string;
  type: 'image' | 'video';
  mimeType?: string | null;
  fileName?: string | null;
}

/** Record a video using the camera (up to 30s) */
export async function captureVideo(): Promise<CapturedMedia | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Camera permission is required to record videos.');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: 'videos',
    videoMaxDuration: 30,
  });

  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    type: 'video',
    mimeType: asset.mimeType ?? 'video/mp4',
    fileName: asset.fileName ?? 'delay-video.mp4',
  };
}

/**
 * Ask the driver whether to take a photo or pick one from their gallery.
 */
export async function choosePhoto(): Promise<CapturedPhoto | null> {
  return new Promise((resolve, reject) => {
    Alert.alert(
      'Attach Photo',
      'Take a photo now or choose an existing photo from your gallery.',
      [
        {
          text: 'Take Photo 📷',
          onPress: () => {
            capturePhoto().then(resolve).catch(reject);
          },
        },
        {
          text: 'Choose from Gallery 🖼️',
          onPress: () => {
            pickFromGallery().then(resolve).catch(reject);
          },
        },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

/**
 * Ask the driver whether to take a photo, record a video, or pick from gallery.
 */
export async function chooseMedia(): Promise<CapturedMedia | null> {
  return new Promise((resolve, reject) => {
    Alert.alert(
      'Add Evidence',
      'Take a photo, record a video, or choose from gallery.',
      [
        {
          text: 'Take Photo 📷',
          onPress: () => {
            capturePhoto()
              .then((p) => resolve(p ? { uri: p.uri, type: 'image', mimeType: p.mimeType, fileName: p.fileName } : null))
              .catch(reject);
          },
        },
        {
          text: 'Record Video 🎥',
          onPress: () => {
            captureVideo().then(resolve).catch(reject);
          },
        },
        {
          text: 'Choose from Gallery 🖼️',
          onPress: () => {
            ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.All,
              quality: 0.8,
            })
              .then((res) => {
                if (res.canceled || !res.assets?.length) return resolve(null);
                const a = res.assets[0];
                if (a.type === 'video') {
                  resolve({ uri: a.uri, type: 'video', mimeType: a.mimeType ?? 'video/mp4', fileName: 'delay-video.mp4' });
                } else {
                  compressPhoto(a.uri).then((p) => resolve({ uri: p.uri, type: 'image', mimeType: p.mimeType, fileName: p.fileName }));
                }
              })
              .catch(reject);
          },
        },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}
