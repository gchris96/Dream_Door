import React, { useEffect } from 'react';
import { Animated as RNAnimated, Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolate,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import HouseCard from './HouseCard';

const DEFAULT_DISTANCE = 140;
const DEFAULT_VELOCITY = 900;
const SPRING = {
  damping: 20,
  stiffness: 180,
  mass: 0.9,
};

export default function SwipeDeck({
  currentHouse,
  nextHouse,
  currentMeta,
  nextMeta,
  currentPhotoUrl,
  nextPhotoUrl,
  onSwipeComplete,
  onSave,
  onUndo,
  onImagePress,
  isSaved,
  canUndo,
  toastMessage,
  savedToastOpacity,
  savedToastTranslate,
  styles,
  screenWidth,
  screenHeight,
  isAnimating,
  setIsAnimating,
  testLikeEnabled,
  onTestLike,
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const swipeLocked = useSharedValue(false);
  const currentHouseId = useSharedValue(null);

  useEffect(() => {
    currentHouseId.value = currentHouse?.id ?? null;
    translateX.value = 0;
    translateY.value = 0;
    swipeLocked.value = false;
  }, [currentHouse?.id]);

  const swipeDistance = Math.max(DEFAULT_DISTANCE, screenWidth * 0.28);

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-screenWidth, 0, screenWidth],
      [-10, 0, 10],
      Extrapolate.CLAMP
    );
    const lift = interpolate(
      Math.abs(translateX.value),
      [0, screenWidth],
      [0, -10],
      Extrapolate.CLAMP
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value + lift },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const likeBadgeAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, screenWidth * 0.25],
      [0, 1],
      Extrapolate.CLAMP
    );
    const nudge = translateX.value * 0.08;
    return {
      opacity,
      transform: [{ translateX: -40 + nudge }, { translateY: -40 }],
    };
  });

  const dislikeBadgeAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-screenWidth * 0.25, 0],
      [1, 0],
      Extrapolate.CLAMP
    );
    const nudge = translateX.value * 0.08;
    return {
      opacity,
      transform: [{ translateX: -40 + nudge }, { translateY: -40 }],
    };
  });

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-15, 15])
    .enabled(!isAnimating)
    .onUpdate((event) => {
      if (swipeLocked.value) return;
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.12;
    })
    .onEnd((event) => {
      if (swipeLocked.value) return;
      const absX = Math.abs(translateX.value);
      const absVelocity = Math.abs(event.velocityX);
      const shouldSwipe = absX > swipeDistance || absVelocity > DEFAULT_VELOCITY;
      if (shouldSwipe) {
        swipeLocked.value = true;
        runOnJS(setIsAnimating)(true);
        const direction = translateX.value >= 0 ? 1 : -1;
        const targetX = direction * (screenWidth + 80);
        const houseId = currentHouseId.value;
        if (!houseId) {
          swipeLocked.value = false;
          translateX.value = withSpring(0, { ...SPRING, velocity: event.velocityX });
          translateY.value = withSpring(0, { ...SPRING, velocity: event.velocityY });
          return;
        }
        translateX.value = withSpring(
          targetX,
          { ...SPRING, velocity: event.velocityX },
          (finished) => {
            if (finished) {
              runOnJS(onSwipeComplete)(direction > 0 ? 'right' : 'left', houseId);
            }
          }
        );
        translateY.value = withSpring(0, { ...SPRING, velocity: event.velocityY });
      } else {
        translateX.value = withSpring(0, { ...SPRING, velocity: event.velocityX });
        translateY.value = withSpring(0, { ...SPRING, velocity: event.velocityY });
      }
    });

  return (
    <View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.likeBadgeContainer,
          {
            left: screenWidth / 2,
            top: screenHeight * 0.45,
          },
          likeBadgeAnimatedStyle,
        ]}
      >
        <Text style={styles.likeBadge}>✓</Text>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.dislikeBadgeContainer,
          {
            left: screenWidth / 2,
            top: screenHeight * 0.45,
          },
          dislikeBadgeAnimatedStyle,
        ]}
      >
        <Text style={styles.dislikeBadge}>✕</Text>
      </Animated.View>
      <View style={styles.cardStack}>
        {nextHouse && nextMeta && (
          <View style={[styles.card, styles.underCard]} pointerEvents="none">
            <HouseCard
              house={nextHouse}
              meta={nextMeta}
              primaryPhotoUrl={nextPhotoUrl}
              allowImagePress={false}
              allowSave={false}
              showUndo={false}
              isSaved={false}
              onSave={() => {}}
              onUndo={() => {}}
              styles={styles}
            />
          </View>
        )}
        {testLikeEnabled && (
          <Pressable
            testID="test-like"
            onPress={onTestLike}
            style={styles.testHiddenButton}
          />
        )}
        <GestureDetector gesture={swipeGesture}>
          <Animated.View testID="swipe-card" style={[styles.card, cardAnimatedStyle]}>
            {toastMessage && (
              <RNAnimated.View
                pointerEvents="none"
                style={[
                  styles.savedToast,
                  {
                    opacity: savedToastOpacity,
                    transform: [{ translateY: savedToastTranslate }],
                  },
                ]}
              >
                <Text style={styles.savedToastText}>{toastMessage}</Text>
              </RNAnimated.View>
            )}
            <HouseCard
              house={currentHouse}
              meta={currentMeta}
              primaryPhotoUrl={currentPhotoUrl}
              allowImagePress
              onImagePress={onImagePress}
              allowSave
              showUndo
              canUndo={canUndo}
              isSaved={isSaved}
              onSave={onSave}
              onUndo={onUndo}
              styles={styles}
            />
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
}
