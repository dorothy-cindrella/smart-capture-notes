import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Directory, File, Paths } from 'expo-file-system';

const IMAGE_DIR_NAME = 'images';
const MAX_WIDTH = 1280; // offline-friendly compression target
const JPEG_QUALITY = 0.7;

export class PermissionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PermissionError';
  }
}

function imagesDir() {
  const dir = new Directory(Paths.document, IMAGE_DIR_NAME);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

/** Resolve a stored file name to a full URI that is valid in the current app container. */
export function resolveImageUri(fileName) {
  if (!fileName) return null;
  return new File(Paths.document, IMAGE_DIR_NAME, fileName).uri;
}

export function imageExists(fileName) {
  try {
    if (!fileName) return false;
    return new File(Paths.document, IMAGE_DIR_NAME, fileName).exists;
  } catch {
    return false;
  }
}

/** Opens the camera. Returns an array with 0 or 1 picked assets. Throws PermissionError if denied. */
export async function takePhoto() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new PermissionError(
      'Camera permission was denied. Enable it in your device settings to take photos.'
    );
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 1,
  });
  if (result.canceled) return [];
  return result.assets;
}

/** Opens the gallery (multi-select). Returns an array of picked assets. */
export async function pickFromGallery(maxCount = 1) {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: maxCount > 1,
    selectionLimit: maxCount,
    quality: 1,
  });
  if (result.canceled) return [];
  return result.assets;
}

/**
 * Compresses the picked image and copies it into the app's permanent
 * document directory. Returns the stored file name (not the full path,
 * because absolute paths can change between app launches/updates on iOS).
 */
export async function persistImage(asset) {
  if (!asset?.uri) throw new Error('Invalid image selected.');

  const actions = [];
  if (asset.width && asset.width > MAX_WIDTH) {
    actions.push({ resize: { width: MAX_WIDTH } });
  }

  const compressed = await ImageManipulator.manipulateAsync(asset.uri, actions, {
    compress: JPEG_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  const fileName = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  const dest = new File(imagesDir(), fileName);
  await new File(compressed.uri).copy(dest);

  // The manipulator output lives in the cache; remove it (best effort).
  try {
    new File(compressed.uri).delete();
  } catch {}

  return fileName;
}

/** Deletes a stored image. Never throws — a missing file is not an error here. */
export function deleteImage(fileName) {
  try {
    const file = new File(Paths.document, IMAGE_DIR_NAME, fileName);
    if (file.exists) file.delete();
  } catch {}
}
