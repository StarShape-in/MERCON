import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export interface CapturedPhoto {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
}

function toPhoto(result: ImagePicker.ImagePickerResult): CapturedPhoto | null {
  if (result.canceled || !result.assets?.length) return null;
  const a = result.assets[0];
  return { uri: a.uri, mimeType: a.mimeType, fileName: a.fileName };
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
    quality: 0.5,
  });

  return toPhoto(result);
}

/**
 * Ask the driver whether to take a new photo or pick one from the gallery,
 * then return the chosen photo (or null if they cancel).
 */
export async function choosePhoto(): Promise<CapturedPhoto | null> {
  return new Promise((resolve, reject) => {
    Alert.alert(
      'Add Photo',
      'Take a new photo or choose one from your gallery.',
      [
        { text: 'Take Photo', onPress: () => { capturePhoto().then(resolve).catch(reject); } },
        { text: 'Choose from Gallery', onPress: () => { pickFromGallery().then(resolve).catch(reject); } },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}
