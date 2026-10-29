import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CategoryChips from '../components/CategoryChips';
import Header from '../components/Header';
import SafeImage from '../components/SafeImage';
import { CATEGORIES, COLORS, LIMITS } from '../constants';
import { createRecord, getRecord, updateRecord } from '../db/database';
import {
  deleteImage,
  PermissionError,
  persistImage,
  pickFromGallery,
  takePhoto,
} from '../services/imageService';

let keyCounter = 0;
const nextKey = () => `k${++keyCounter}`;

/**
 * Add / edit form.
 * `images` items are either:
 *   { key, fileName }  -> already stored image
 *   { key, asset }     -> newly picked image, saved (compressed) only when the user taps Save
 */
export default function RecordFormScreen({ recordId, onDone, onCancel }) {
  const insets = useSafeAreaInsets();
  const isEdit = recordId != null;

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [images, setImages] = useState([]);
  const [removedFiles, setRemovedFiles] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const rec = await getRecord(recordId);
        if (!rec) {
          Alert.alert('Not found', 'This record no longer exists.');
          onCancel();
          return;
        }
        setTitle(rec.title);
        setNotes(rec.notes);
        setCategory(rec.category);
        setImages(rec.images.map((i) => ({ key: nextKey(), fileName: i.file_name })));
      } catch {
        Alert.alert('Error', 'Could not load this record.');
        onCancel();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  const remainingSlots = LIMITS.maxImages - images.length;

  const addAssets = (assets) => {
    if (!assets.length) return;
    const valid = assets.filter((a) => a?.uri);
    if (valid.length < assets.length) {
      Alert.alert('Invalid image', 'Some selected files could not be used.');
    }
    setImages((prev) => [...prev, ...valid.map((asset) => ({ key: nextKey(), asset }))]);
    setErrors((e) => ({ ...e, images: undefined }));
  };

  const handlePickerError = (e) => {
    if (e instanceof PermissionError) {
      Alert.alert('Permission needed', e.message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
    } else {
      Alert.alert('Something went wrong', 'Could not get the image. Please try again.');
    }
  };

  const onCamera = async () => {
    if (remainingSlots <= 0) return limitAlert();
    try {
      addAssets(await takePhoto());
    } catch (e) {
      handlePickerError(e);
    }
  };

  const onGallery = async () => {
    if (remainingSlots <= 0) return limitAlert();
    try {
      addAssets(await pickFromGallery(remainingSlots));
    } catch (e) {
      handlePickerError(e);
    }
  };

  const limitAlert = () =>
    Alert.alert('Limit reached', `You can attach up to ${LIMITS.maxImages} images per record.`);

  const removeImage = (item) => {
    setImages((prev) => prev.filter((i) => i.key !== item.key));
    if (item.fileName) setRemovedFiles((prev) => [...prev, item.fileName]);
  };

  const validate = () => {
    const e = {};
    if (!title.trim()) e.title = 'Please enter a title.';
    else if (title.trim().length > LIMITS.title) e.title = `Title must be under ${LIMITS.title} characters.`;
    if (notes.length > LIMITS.notes) e.notes = `Notes must be under ${LIMITS.notes} characters.`;
    if (images.length === 0) e.images = 'Add at least one photo.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSave = async () => {
    if (saving || !validate()) return;
    setSaving(true);
    const newlySaved = [];
    try {
      // 1. Compress + store new images
      const fileNames = [];
      for (const item of images) {
        if (item.fileName) {
          fileNames.push(item.fileName);
        } else {
          const name = await persistImage(item.asset);
          newlySaved.push(name);
          fileNames.push(name);
        }
      }

      // 2. Write DB
      const payload = { title: title.trim(), notes: notes.trim(), category, fileNames };
      let id = recordId;
      if (isEdit) await updateRecord(recordId, payload);
      else id = await createRecord(payload);

      // 3. Clean up files removed during editing
      removedFiles.forEach(deleteImage);
      onDone(id);
    } catch (e) {
      // Roll back any files we just wrote so we don't leave orphans.
      newlySaved.forEach(deleteImage);
      Alert.alert('Could not save', 'Something went wrong while saving. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmCancel = () => {
    const dirty = title || notes || images.some((i) => i.asset) || removedFiles.length;
    if (!dirty || isEdit) return onCancel();
    Alert.alert('Discard this record?', 'Your changes have not been saved.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: onCancel },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Edit Record" onBack={onCancel} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header title={isEdit ? 'Edit Record' : 'New Record'} onBack={confirmCancel} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Photos ({images.length}/{LIMITS.maxImages})</Text>

        {images.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewRow}>
            {images.map((item) => (
              <View key={item.key} style={styles.previewWrap}>
                <SafeImage
                  fileName={item.fileName}
                  uri={item.asset?.uri}
                  style={styles.preview}
                />
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeImage(item)}
                  accessibilityLabel="Remove image"
                  hitSlop={8}
                >
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={[styles.emptyPreview, errors.images && styles.inputError]}>
            <Text style={styles.emptyIcon}>📷</Text>
            <Text style={styles.muted}>No photo yet</Text>
          </View>
        )}
        {!!errors.images && <Text style={styles.errorText}>{errors.images}</Text>}

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.pickBtn} onPress={onCamera} disabled={saving}>
            <Text style={styles.pickText}>📸  Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pickBtn} onPress={onGallery} disabled={saving}>
            <Text style={styles.pickText}>🖼️  Gallery</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Title *</Text>
        <TextInput
          value={title}
          onChangeText={(t) => {
            setTitle(t);
            if (errors.title) setErrors((e) => ({ ...e, title: undefined }));
          }}
          placeholder="e.g. Whiteboard from lecture"
          placeholderTextColor={COLORS.muted}
          style={[styles.input, errors.title && styles.inputError]}
          maxLength={LIMITS.title + 20}
        />
        {!!errors.title && <Text style={styles.errorText}>{errors.title}</Text>}

        <Text style={styles.label}>Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Add details…"
          placeholderTextColor={COLORS.muted}
          style={[styles.input, styles.notesInput, errors.notes && styles.inputError]}
          multiline
          textAlignVertical="top"
        />
        {!!errors.notes && <Text style={styles.errorText}>{errors.notes}</Text>}

        <Text style={styles.label}>Category</Text>
        <CategoryChips options={CATEGORIES} selected={category} onSelect={setCategory} wrap />

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={onSave}
          disabled={saving}
        >
          {saving ? (
            <View style={styles.savingRow}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.saveText}>  Saving…</Text>
            </View>
          ) : (
            <Text style={styles.saveText}>{isEdit ? 'Save Changes' : 'Save Record'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginTop: 18, marginBottom: 8 },
  muted: { color: COLORS.muted, fontSize: 14 },
  previewRow: { flexGrow: 0 },
  previewWrap: { marginRight: 10 },
  preview: { width: 150, height: 150, borderRadius: 12, overflow: 'hidden' },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(15,23,42,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  emptyPreview: {
    height: 150,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
  },
  emptyIcon: { fontSize: 36 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  pickBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
  },
  pickText: { color: COLORS.primaryDark, fontWeight: '600', fontSize: 15 },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  notesInput: { minHeight: 110 },
  inputError: { borderColor: COLORS.danger },
  errorText: { color: COLORS.danger, fontSize: 13, marginTop: 6 },
  saveBtn: {
    marginTop: 28,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  savingRow: { flexDirection: 'row', alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
