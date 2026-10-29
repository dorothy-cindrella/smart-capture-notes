import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ALL, COLORS } from './src/constants';
import { getDb } from './src/db/database';
import HomeScreen from './src/screens/HomeScreen';
import RecordDetailScreen from './src/screens/RecordDetailScreen';
import RecordFormScreen from './src/screens/RecordFormScreen';

/**
 * Tiny state-based navigator (no extra navigation dependency needed for 3 screens).
 *   { name: 'home' } | { name: 'detail', id } | { name: 'form', id? }
 */
export default function App() {
  const [ready, setReady] = useState(false);
  const [dbError, setDbError] = useState(null);
  const [screen, setScreen] = useState({ name: 'home' });
  const [refreshToken, setRefreshToken] = useState(0);

  // Filters live here so they survive navigating away and back.
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(ALL);

  const initDb = useCallback(async () => {
    try {
      setDbError(null);
      await getDb();
      setReady(true);
    } catch (e) {
      setDbError('The local database could not be opened.');
    }
  }, []);

  useEffect(() => {
    initDb();
  }, [initDb]);

  const goHome = useCallback(() => {
    setRefreshToken((t) => t + 1);
    setScreen({ name: 'home' });
  }, []);

  // Android hardware back button
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen.name === 'home') return false;
      if (screen.name === 'form' && screen.id != null) setScreen({ name: 'detail', id: screen.id });
      else goHome();
      return true;
    });
    return () => sub.remove();
  }, [screen, goHome]);

  let content;
  if (dbError) {
    content = (
      <View style={styles.center}>
        <Text style={styles.error}>{dbError}</Text>
        <TouchableOpacity style={styles.retry} onPress={initDb}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  } else if (!ready) {
    content = (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loading}>Starting…</Text>
      </View>
    );
  } else if (screen.name === 'form') {
    content = (
      <RecordFormScreen
        recordId={screen.id}
        onCancel={() => (screen.id != null ? setScreen({ name: 'detail', id: screen.id }) : goHome())}
        onDone={(id) => {
          setRefreshToken((t) => t + 1);
          setScreen({ name: 'detail', id });
        }}
      />
    );
  } else if (screen.name === 'detail') {
    content = (
      <RecordDetailScreen
        key={`${screen.id}-${refreshToken}`}
        recordId={screen.id}
        onBack={goHome}
        onEdit={() => setScreen({ name: 'form', id: screen.id })}
        onDeleted={goHome}
      />
    );
  } else {
    content = (
      <HomeScreen
        query={query}
        setQuery={setQuery}
        category={category}
        setCategory={setCategory}
        refreshToken={refreshToken}
        onAdd={() => setScreen({ name: 'form' })}
        onOpen={(id) => setScreen({ name: 'detail', id })}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {content}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg, padding: 24 },
  loading: { marginTop: 10, color: COLORS.muted },
  error: { color: COLORS.danger, fontSize: 16, textAlign: 'center' },
  retry: { marginTop: 14, backgroundColor: COLORS.primary, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '600' },
});
