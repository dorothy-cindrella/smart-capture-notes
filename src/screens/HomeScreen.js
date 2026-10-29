import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CategoryChips from '../components/CategoryChips';
import Dashboard from '../components/Dashboard';
import Header from '../components/Header';
import RecordCard from '../components/RecordCard';
import { ALL, CATEGORIES, COLORS } from '../constants';
import { getCategoryCounts, listRecords } from '../db/database';

export default function HomeScreen({ query, setQuery, category, setCategory, onAdd, onOpen, refreshToken }) {
  const insets = useSafeAreaInsets();
  const [records, setRecords] = useState([]);
  const [counts, setCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [rows, cat] = await Promise.all([
        listRecords({ query, category }),
        getCategoryCounts(),
      ]);
      setRecords(rows);
      setCounts(cat);
    } catch (e) {
      setError('Could not load your records. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [query, category]);

  // Reload when filters change (debounced) or when we return from another screen.
  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load, refreshToken]);

  const isFiltering = query.trim().length > 0 || category !== ALL;

  return (
    <View style={styles.container}>
      <Header title="Smart Capture" />

      <View style={styles.searchBox}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search titles and notes…"
          placeholderTextColor={COLORS.muted}
          style={styles.search}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={10}>
            <Text style={styles.clear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <CategoryChips options={[ALL, ...CATEGORIES]} selected={category} onSelect={setCategory} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.muted}>Loading records…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retry}
            onPress={() => {
              setLoading(true);
              load();
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={records}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <RecordCard record={item} onPress={() => onOpen(item.id)} />}
          ListHeaderComponent={!isFiltering ? <Dashboard counts={counts} /> : null}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>{isFiltering ? '🔍' : '📷'}</Text>
              <Text style={styles.emptyTitle}>
                {isFiltering ? 'No matching records' : 'No records yet'}
              </Text>
              <Text style={styles.muted}>
                {isFiltering
                  ? 'Try a different search or category.'
                  : 'Tap the + button to capture your first photo.'}
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingTop: 10, paddingBottom: 100 + insets.bottom }}
          keyboardShouldPersistTaps="handled"
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { bottom: 24 + insets.bottom }]}
        onPress={onAdd}
        accessibilityLabel="Add new record"
      >
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  search: { flex: 1, paddingVertical: 11, fontSize: 15, color: COLORS.text },
  clear: { fontSize: 16, color: COLORS.muted, paddingLeft: 8 },
  list: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  muted: { color: COLORS.muted, fontSize: 14, textAlign: 'center', marginTop: 6 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 8 },
  errorText: { color: COLORS.danger, fontSize: 15, textAlign: 'center' },
  retry: { marginTop: 12, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '600' },
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabText: { color: '#fff', fontSize: 30, marginTop: -2 },
});