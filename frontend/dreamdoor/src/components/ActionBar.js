import React from 'react';
import { View, Text } from 'react-native';

export default function ActionBar({
  allowSave,
  allowUndo,
  canUndo = true,
  isSaved,
  onSave,
  onUndo,
  styles,
}) {
  if (!allowSave && !allowUndo) return null;

  return (
    <View style={styles.cardActions}>
      {allowSave && (
        <Text
          style={[
            styles.saveButton,
            isSaved && styles.saved,
          ]}
          onPress={onSave}
        >
          {isSaved ? 'Saved ✓' : 'Save'}
        </Text>
      )}
      {allowUndo && (
        <Text
          style={[
            styles.undoButton,
            !canUndo && styles.undoDisabled,
          ]}
          onPress={onUndo}
        >
          Undo
        </Text>
      )}
    </View>
  );
}
