import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CATEGORY_COLORS, COLORS } from '../constants';
import { formatDate } from '../utils/format';
import SafeImage from './SafeImage';

export default function RecordCard({ record, onPress }) {
  const color = CATEGORY_COLORS[record.category] || COLORS.muted;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View>
        <SafeImage fileName={record.thumb} style={styles.thumb} compact />
        {record.image_count > 1 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{record.image_count}</Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {record.title}
        </Text>
        {!!record.notes && (
          <Text style={styles.notes} numberOfLines={2}>
            {record.notes}
          </Text>
        )}
        <View style={styles.footer}>
          <View style={[styles.badge, { backgroundColor: color + '22' }]}>
            <Text style={[styles.badgeText, { color }]}>{record.category}</Text>
          </View>
          <Text style={styles.date}>{formatDate(record.created_at)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  thumb: { width: 76, height: 76, borderRadius: 10, overflow: 'hidden' },
  countBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    backgroundColor: 'rgba(15,23,42,0.75)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  countText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  body: { flex: 1, marginLeft: 12, justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  notes: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  date: { fontSize: 12, color: COLORS.muted },
});
