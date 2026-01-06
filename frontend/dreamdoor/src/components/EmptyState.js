import React from 'react';
import { Pressable, Text, View } from 'react-native';

export default function EmptyState({
  message,
  actionLabel,
  onAction,
  containerStyle,
  styles,
}) {
  return (
    <View style={[styles.center, containerStyle]}>
      <Text style={styles.endText}>{message}</Text>
      {actionLabel && onAction && (
        <Pressable style={[styles.secondaryButton, styles.homeButton]} onPress={onAction}>
          <Text style={styles.secondaryButtonText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
