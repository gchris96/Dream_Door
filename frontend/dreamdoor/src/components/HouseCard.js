import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import ActionBar from './ActionBar';

export default function HouseCard({
  house,
  meta,
  primaryPhotoUrl,
  onImagePress,
  allowImagePress,
  allowSave,
  showUndo,
  canUndo,
  isSaved,
  onSave,
  onUndo,
  styles,
}) {
  if (!house) return null;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.cardScrollContent}
    >
      <Pressable
        onPress={allowImagePress ? onImagePress : undefined}
        disabled={!allowImagePress}
      >
        <Image
          source={{ uri: primaryPhotoUrl || 'https://via.placeholder.com/600x400' }}
          style={styles.image}
          contentFit="cover"
        />
      </Pressable>

      <View style={styles.cardBody}>
        <Text style={styles.price}>
          ${house.price ? house.price.toLocaleString() : '—'}
        </Text>

        <Text style={styles.address}>
          {meta.detailAddress?.line || house.address_line}, {meta.detailAddress?.city || house.city},{' '}
          {meta.detailAddress?.state_code || house.state}
        </Text>

        <Text style={styles.description}>
          {meta.beds ?? '—'} bd · {meta.baths ?? '—'} ba · {meta.sqft ?? '—'} sqft
          {meta.homeType ? ` · ${meta.homeType}` : ''}
        </Text>

        <ActionBar
          allowSave={allowSave}
          allowUndo={showUndo}
          canUndo={canUndo}
          isSaved={isSaved}
          onSave={onSave}
          onUndo={onUndo}
          styles={styles}
        />

        <Text style={styles.detailHeader}>Description</Text>
        <Text style={styles.detailBody}>
          {meta.descriptionText || 'No description available.'}
        </Text>

        <Text style={styles.detailHeader}>Details</Text>
        <Text style={styles.detailBody}>
          {meta.beds ?? '—'} beds · {meta.baths ?? '—'} baths · {meta.yearBuilt ?? '—'} year built · {meta.sqft ?? '—'} sqft
        </Text>

        <Text style={styles.detailHeader}>Additional Details</Text>
        {meta.detailItems.length === 0 ? (
          <Text style={styles.detailBody}>No additional details available.</Text>
        ) : (
          meta.detailItems.map((item, itemIndex) => {
            const lines = Array.isArray(item?.text) ? item.text : [item?.text].filter(Boolean);
            return (
              <View key={`${item?.category || 'detail'}-${itemIndex}`} style={styles.detailItem}>
                <Text style={styles.detailSubheader}>{item?.category || 'Details'}</Text>
                {lines.map((line, lineIndex) => (
                  <Text key={`${itemIndex}-${lineIndex}`} style={styles.detailBody}>
                    {line}
                  </Text>
                ))}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
