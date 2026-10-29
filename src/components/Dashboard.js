import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CATEGORY_COLORS, COLORS } from '../constants';

/** Bonus: record counts by category, shown as a compact bar summary. */
export default function Dashboard({ counts }) {
  const total = counts.reduce((sum, c) => sum + c.count, 0);
  if (total === 0) return null;
  const max = Math.max(...counts.map((c) => c.count));

  return (
    <View style={styles.box}>
      <Text style={styles.heading}>
        Dashboard · {total} record{total === 1 ? '' : 's'}
      </Text>
      {counts.map((c) => (
        <View key={c.category} style={styles.row}>
          <Text style={styles.label} numberOfLines={1}>
            {c.category}
          </Text>
          <View style={styles.track}>
            <View
              style={[
                styles.bar,
                {
                  width: `${(c.count / max) * 100}%`,
                  backgroundColor: CATEGORY_COLORS[c.category] || COLORS.primary,
                },
              ]}
            />
          </View>
          <Text style={styles.count}>{c.count}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heading: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 3 },
  label: { width: 76, fontSize: 12, color: COLORS.muted },
  track: { flex: 1, height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
  bar: { height: 8, borderRadius: 4 },
  count: { width: 28, textAlign: 'right', fontSize: 12, fontWeight: '600', color: COLORS.text },
});
