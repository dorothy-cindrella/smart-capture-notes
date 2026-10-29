import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants';
import { imageExists, resolveImageUri } from '../services/imageService';

/**
 * Renders a stored image by file name (or a direct uri for not-yet-saved images).
 * Falls back to a placeholder if the file is missing or fails to load.
 */
export default function SafeImage({ fileName, uri, style, resizeMode = 'cover', compact = false }) {
  const [failed, setFailed] = useState(false);

  const source = uri || resolveImageUri(fileName);
  const missing = failed || !source || (!uri && !imageExists(fileName));

  if (missing) {
    return (
      <View style={[styles.placeholder, style]}>
        <Text style={compact ? styles.iconSmall : styles.icon}>🖼️</Text>
        {!compact && <Text style={styles.text}>Image missing</Text>}
      </View>
    );
  }

  return (
    <Image
      source={{ uri: source }}
      style={style}
      resizeMode={resizeMode}
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 32 },
  iconSmall: { fontSize: 20 },
  text: { marginTop: 6, color: COLORS.muted, fontSize: 13 },
});
