import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '../components/Header';
import SafeImage from '../components/SafeImage';
import { CATEGORY_COLORS, COLORS } from '../constants';
import { deleteRecord, getRecord } from '../db/database';
import { deleteImage, imageExists, resolveImageUri } from '../services/imageService';
import { formatDateTime, safeFileName } from '../utils/format';

export default function RecordDetailScreen({ recordId, onBack, onEdit, onDeleted }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const rec = await getRecord(recordId);
        if (!rec) {
          Alert.alert('Not found', 'This record no longer exists.');
          onBack();
          return;
        }
        setRecord(rec);
      } catch {
        Alert.alert('Error', 'Could not load this record.');
        onBack();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  const confirmDelete = () => {
    Alert.alert('Delete record?', `"${record.title}" and its photos will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            const files = await deleteRecord(record.id);
            files.forEach(deleteImage);
            onDeleted();
          } catch {
            setBusy(false);
            Alert.alert('Error', 'Could not delete this record. Please try again.');
          }
        },
      },
    ]);
  };

  const ensureSharing = async () => {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert('Not supported', 'Sharing is not available on this device.');
      return false;
    }
    return true;
  };

  // Bonus: export notes as a text file
  const exportNotes = async () => {
    try {
      if (!(await ensureSharing())) return;
      setBusy(true);
      const text =
        `${record.title}\n` +
        `Category: ${record.category}\n` +
        `Created: ${formatDateTime(record.created_at)}\n` +
        `Updated: ${formatDateTime(record.updated_at)}\n` +
        `Photos: ${record.images.length}\n\n` +
        `${record.notes || '(no notes)'}\n`;
      const file = new File(Paths.cache, `${safeFileName(record.title)}.txt`);
      file.create({ overwrite: true });
      file.write(text);
      await Sharing.shareAsync(file.uri, { mimeType: 'text/plain', dialogTitle: 'Export notes' });
    } catch {
      Alert.alert('Export failed', 'Could not export the notes.');
    } finally {
      setBusy(false);
    }
  };

  // Bonus: share the currently visible image
  const shareImage = async () => {
    try {
      const current = record.images[page];
      if (!current || !imageExists(current.file_name)) {
        Alert.alert('Image missing', 'This image file could not be found on the device.');
        return;
      }
      if (!(await ensureSharing())) return;
      setBusy(true);
      await Sharing.shareAsync(resolveImageUri(current.file_name), {
        mimeType: 'image/jpeg',
        dialogTitle: 'Share image',
      });
    } catch {
      Alert.alert('Share failed', 'Could not share the image.');
    } finally {
      setBusy(false);
    }
  };

  if (loading || !record) {
    return (
      <View style={styles.container}>
        <Header title="Record" onBack={onBack} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  const color = CATEGORY_COLORS[record.category] || COLORS.muted;
  const imgHeight = Math.min(width * 0.85, 420);

  return (
    <View style={styles.container}>
      <Header title="Record" onBack={onBack} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        >
          {record.images.length === 0 ? (
            <SafeImage fileName={null} style={{ width, height: imgHeight }} />
          ) : (
            record.images.map((img) => (
              <SafeImage
                key={img.id}
                fileName={img.file_name}
                style={{ width, height: imgHeight, backgroundColor: '#000' }}
                resizeMode="contain"
              />
            ))
          )}
        </ScrollView>
        {record.images.length > 1 && (
          <Text style={styles.pager}>
            {page + 1} / {record.images.length}
          </Text>
        )}

        <View style={styles.body}>
          <Text style={styles.title}>{record.title}</Text>
          <View style={styles.metaRow}>
            <View style={[styles.badge, { backgroundColor: color + '22' }]}>
              <Text style={[styles.badgeText, { color }]}>{record.category}</Text>
            </View>
            <Text style={styles.date}>{formatDateTime(record.created_at)}</Text>
          </View>
          {record.updated_at !== record.created_at && (
            <Text style={styles.date}>Edited {formatDateTime(record.updated_at)}</Text>
          )}

          <Text style={styles.sectionLabel}>Notes</Text>
          <Text style={styles.notes}>{record.notes || 'No notes added.'}</Text>

          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={onEdit} disabled={busy}>
              <Text style={styles.btnPrimaryText}>✏️  Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={confirmDelete} disabled={busy}>
              <Text style={styles.btnDangerText}>🗑️  Delete</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.btn, styles.btnSoft]} onPress={exportNotes} disabled={busy}>
              <Text style={styles.btnSoftText}>📄  Export notes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnSoft]} onPress={shareImage} disabled={busy}>
              <Text style={styles.btnSoftText}>📤  Share image</Text>
            </TouchableOpacity>
          </View>
          {busy && <ActivityIndicator style={{ marginTop: 16 }} color={COLORS.primary} />}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pager: { textAlign: 'center', color: COLORS.muted, fontSize: 12, marginTop: 6 },
  body: { padding: 18 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 13, fontWeight: '700' },
  date: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.muted, marginTop: 20, textTransform: 'uppercase' },
  notes: { fontSize: 16, color: COLORS.text, lineHeight: 24, marginTop: 6 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  btnPrimary: { backgroundColor: COLORS.primary },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnDanger: { backgroundColor: COLORS.dangerSoft },
  btnDangerText: { color: COLORS.danger, fontWeight: '700', fontSize: 15 },
  btnSoft: { backgroundColor: COLORS.primarySoft },
  btnSoftText: { color: COLORS.primaryDark, fontWeight: '600', fontSize: 14 },
});
