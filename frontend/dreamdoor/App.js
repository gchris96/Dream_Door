import {
  Text,
  View,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
  ScrollView,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [houses, setHouses] = useState([]);
  const [index, setIndex] = useState(0);
  const [likedIds, setLikedIds] = useState(new Set());
  const [dislikedIds, setDislikedIds] = useState(new Set());
  const [savedIds, setSavedIds] = useState(new Set());
  const [savedOverrideIds, setSavedOverrideIds] = useState(new Set());
  const [savedHouses, setSavedHouses] = useState([]);
  const [savedDetailId, setSavedDetailId] = useState(null);
  const [pendingLikeId, setPendingLikeId] = useState(null);
  const [pendingDislikeId, setPendingDislikeId] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [detailByHouseId, setDetailByHouseId] = useState({});
  const [showLikeBadge, setShowLikeBadge] = useState(false);
  const [likeBadgeId, setLikeBadgeId] = useState(null);
  const [showDislikeBadge, setShowDislikeBadge] = useState(false);
  const [dislikeBadgeId, setDislikeBadgeId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const position = useRef(new Animated.ValueXY()).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const savedToastOpacity = useRef(new Animated.Value(0)).current;
  const savedToastTranslate = useRef(new Animated.Value(20)).current;
  const screenWidth = Dimensions.get('window').width;
  const swipeHouses = useMemo(
    () => houses.filter(house => !savedIds.has(house.id) || savedOverrideIds.has(house.id)),
    [houses, savedIds, savedOverrideIds]
  );
  const savedDetailHouse = useMemo(() => {
    if (!savedDetailId) return null;
    return (
      savedHouses.find(item => item.id === savedDetailId) ||
      houses.find(item => item.id === savedDetailId) ||
      null
    );
  }, [savedDetailId, savedHouses, houses]);

  // -------------------------
  // LOAD HOUSES
  // -------------------------
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/deck/');
        const data = await res.json();
        setHouses(data.results);
      } catch (e) {
        console.error('API error:', e);
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (screen !== 'saved') return;

    const loadSaved = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/saved/');
        const data = await res.json();
        const results = data.results || data;
        setSavedHouses(results);
        setSavedIds(new Set(results.map(item => item.id)));
      } catch (e) {
        console.error('Saved API error:', e);
      }
    };

    loadSaved();
  }, [screen]);

  // -------------------------
  // BACKEND LIKE SYNC (SAFE)
  // -------------------------
  useEffect(() => {
    if (!pendingLikeId) return;

    fetch(`http://127.0.0.1:8000/api/houses/${pendingLikeId}/like/`, {
      method: 'POST',
    }).catch(() => {});
  }, [pendingLikeId]);

  useEffect(() => {
    if (!pendingDislikeId) return;

    fetch(`http://127.0.0.1:8000/api/houses/${pendingDislikeId}/dislike/`, {
      method: 'POST',
    }).catch(() => {});
  }, [pendingDislikeId]);

  useEffect(() => {
    if (screen !== 'swipe' && screen !== 'saved-detail') return;
    const current = screen === 'swipe' ? swipeHouses[index] : savedDetailHouse;
    if (!current || detailByHouseId[current.id]) return;

    fetch(`http://127.0.0.1:8000/api/houses/${current.id}/detail/`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!data) return;
        setDetailByHouseId(prev => ({ ...prev, [current.id]: data }));
      })
      .catch(() => {});
  }, [screen, swipeHouses, index, savedDetailHouse, detailByHouseId]);

  const animateCardIn = () => {
    cardOpacity.setValue(0);
    Animated.timing(cardOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  useEffect(() => {
    if (screen !== 'swipe') return;
    animateCardIn();
  }, [screen, index]);

  // -------------------------
  // SWIPE LEFT
  // -------------------------
  const swipeOffScreen = (direction) => {
    if (isAnimating) return;
    const house = swipeHouses[index];
    if (!house) return;

    setIsAnimating(true);
    const currentIndex = index;
    const isDislike = direction === 'left';
    if (isDislike) {
      setDislikedIds(prev => new Set(prev).add(house.id));
      setPendingDislikeId(house.id);
      setDislikeBadgeId(house.id);
      setShowDislikeBadge(true);
    }

    Animated.timing(position, {
      toValue: {
        x: direction === 'right' ? screenWidth : -screenWidth,
        y: 0,
      },
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      setShowDislikeBadge(false);
      position.setValue({ x: 0, y: 0 });
      setHistory(prev => [
        ...prev,
        {
          index: currentIndex,
          houseId: house.id,
          likedAdded: false,
          dislikedAdded: isDislike,
        },
      ]);
      setIndex(prev => prev + 1);
      setIsAnimating(false);
    });
  };

  // -------------------------
  // ❤️ LIKE (SWIPE RIGHT)
  // -------------------------
  const likeCurrentHouse = () => {
    const house = swipeHouses[index];
    if (!house || isAnimating) return;

    setIsAnimating(true);
    setLikedIds(prev => new Set(prev).add(house.id));
    setPendingLikeId(house.id);
    setLikeBadgeId(house.id);
    setShowLikeBadge(true);
    const currentIndex = index;

    Animated.timing(position, {
      toValue: { x: screenWidth, y: 0 },
      duration: 220,
      useNativeDriver: false,
    }).start(() => {
      setShowLikeBadge(false);
      position.setValue({ x: 0, y: 0 });
      setHistory(prev => [
        ...prev,
        {
          index: currentIndex,
          houseId: house.id,
          likedAdded: true,
          dislikedAdded: false,
        },
      ]);
      setIndex(prev => prev + 1);
      setIsAnimating(false);
    });
  };

  // -------------------------
  // 💾 SAVE (BUTTON)
  // -------------------------
  const saveCurrentHouse = (overrideHouse) => {
    const house = overrideHouse || swipeHouses[index];
    if (!house || isSaving) return;

    const currentIndex = index;
    const isSwipeContext = !overrideHouse;
    const isSaved = savedIds.has(house.id);
    if (isSaved) {
      fetch(`http://127.0.0.1:8000/api/houses/${house.id}/unsave/`, {
        method: 'DELETE',
      }).catch(() => {});
      setIsSaving(true);
      setToastMessage('Unsaved');
      savedToastOpacity.setValue(0);
      savedToastTranslate.setValue(20);
      Animated.sequence([
        Animated.parallel([
          Animated.timing(savedToastOpacity, {
            toValue: 1,
            duration: 260,
            useNativeDriver: true,
          }),
          Animated.timing(savedToastTranslate, {
            toValue: 0,
            duration: 260,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(700),
        Animated.parallel([
          Animated.timing(savedToastOpacity, {
            toValue: 0,
            duration: 260,
            useNativeDriver: true,
          }),
          Animated.timing(savedToastTranslate, {
            toValue: -10,
            duration: 260,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        setToastMessage(null);
        setSavedIds(prev => {
          const next = new Set(prev);
          next.delete(house.id);
          return next;
        });
        setSavedOverrideIds(prev => {
          const next = new Set(prev);
          next.delete(house.id);
          return next;
        });
        if (!isSwipeContext || screen === 'saved' || screen === 'saved-detail') {
          setSavedHouses(prev => prev.filter(item => item.id !== house.id));
        }
        setIsSaving(false);
      });
    } else {
      setSavedIds(prev => new Set(prev).add(house.id));
      if (isSwipeContext) {
        setSavedOverrideIds(prev => new Set(prev).add(house.id));
      }
      fetch(`http://127.0.0.1:8000/api/houses/${house.id}/save/`, {
        method: 'POST',
      }).catch(() => {});
      setIsSaving(true);
      setToastMessage('Saved!');
      savedToastOpacity.setValue(0);
      savedToastTranslate.setValue(20);
      Animated.sequence([
        Animated.parallel([
          Animated.timing(savedToastOpacity, {
            toValue: 1,
            duration: 260,
            useNativeDriver: true,
          }),
          Animated.timing(savedToastTranslate, {
            toValue: 0,
            duration: 260,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(700),
        Animated.parallel([
          Animated.timing(savedToastOpacity, {
            toValue: 0,
            duration: 260,
            useNativeDriver: true,
          }),
          Animated.timing(savedToastTranslate, {
            toValue: -10,
            duration: 260,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        setToastMessage(null);
        setSavedOverrideIds(prev => {
          const next = new Set(prev);
          next.delete(house.id);
          return next;
        });
        if (isSwipeContext) {
          setHistory(prev => [
            ...prev,
            {
              index: currentIndex,
              houseId: house.id,
              likedAdded: false,
              dislikedAdded: false,
              savedAdded: true,
            },
          ]);
          if (screen === 'swipe') {
            const nextLength = Math.max(0, swipeHouses.length - 1);
            setIndex(() => Math.min(currentIndex, Math.max(0, nextLength - 1)));
            animateCardIn();
          }
        }
        setIsSaving(false);
      });
    }
  };

  const undoSwipe = () => {
    if (isAnimating || history.length === 0) return;
    const last = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    if (last?.likedAdded && last.houseId) {
      setLikedIds(prev => {
        const next = new Set(prev);
        next.delete(last.houseId);
        return next;
      });
    }
    if (last?.dislikedAdded && last.houseId) {
      setDislikedIds(prev => {
        const next = new Set(prev);
        next.delete(last.houseId);
        return next;
      });
    }
    if (last?.savedAdded && last.houseId) {
      setSavedOverrideIds(prev => new Set(prev).add(last.houseId));
    }
    position.setValue({ x: 0, y: 0 });
    setIndex(last.index);
  };

  // -------------------------
  // PAN RESPONDER
  // -------------------------
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => {
          if (isAnimating) return false;
          const isHorizontal = Math.abs(gesture.dx) > Math.abs(gesture.dy);
          return isHorizontal && Math.abs(gesture.dx) > 10;
        },

        onPanResponderMove: (_, gesture) => {
          if (!isAnimating) {
            position.setValue({ x: gesture.dx, y: gesture.dy });
          }
        },

        onPanResponderRelease: (_, gesture) => {
          if (isAnimating) return;

          if (gesture.dx > 120) {
            likeCurrentHouse();
          } else if (gesture.dx < -120) {
            swipeOffScreen('left');
          } else {
            Animated.spring(position, {
              toValue: { x: 0, y: 0 },
              useNativeDriver: false,
            }).start();
          }
        },
      }),
    [isAnimating, likeCurrentHouse, swipeOffScreen, position]
  );

  const savedDetailResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => {
          const isHorizontal = Math.abs(gesture.dx) > Math.abs(gesture.dy);
          return isHorizontal && Math.abs(gesture.dx) > 10;
        },
        onPanResponderRelease: (_, gesture) => {
          if (Math.abs(gesture.dx) > 120) {
            setScreen('saved');
          }
        },
      }),
    []
  );

  if (screen === 'home') {
    return (
      <View style={[styles.container, styles.center]}>
        <View style={styles.homeGraphic}>
          <View style={styles.dreamGlow} />
          <View style={styles.sparkle} />
          <View style={[styles.sparkle, styles.sparkleSmall]} />
          <View style={[styles.sparkle, styles.sparkleTiny]} />
          <View style={styles.doorFrame}>
            <View style={styles.doorOpening} />
            <View style={styles.doorPanelOpen}>
              <View style={styles.doorKnob} />
            </View>
          </View>
        </View>
        <Text style={styles.homeTitle}>Dream Door</Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            setIndex(0);
            setHistory([]);
            position.setValue({ x: 0, y: 0 });
            setScreen('swipe');
          }}
        >
          <Text style={styles.primaryButtonText}>Browse Homes</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => {
            setScreen('saved');
          }}
        >
          <Text style={styles.secondaryButtonText}>View Saved</Text>
        </Pressable>
      </View>
    );
  }

  if (screen === 'saved') {
    return (
      <View style={styles.container}>
        <Pressable
          style={styles.backButton}
          onPress={() => setScreen('home')}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Text style={styles.sectionTitle}>Saved Homes</Text>
        {savedHouses.length === 0 ? (
          <View style={[styles.center, styles.savedEmpty]}>
            <Text style={styles.endText}>no saved houses yet</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {savedHouses.map(item => (
              <Pressable
                key={item.id}
                style={styles.savedCard}
                onPress={() => {
                  setSavedDetailId(item.id);
                  setScreen('saved-detail');
                }}
              >
                <Image
                  source={{ uri: item.primary_photo_url || 'https://via.placeholder.com/600x400' }}
                  style={styles.savedImage}
                  contentFit="cover"
                />
                <Text style={styles.price}>
                  ${item.price ? item.price.toLocaleString() : '—'}
                </Text>
                <Text style={styles.address}>
                  {item.address_line}, {item.city}, {item.state}
                </Text>
                <Text style={styles.description}>
                  {item.beds} bd · {item.baths} ba · {item.sqft} sqft
                </Text>
                <Pressable
                  style={styles.removeSavedButton}
                  onPress={() => {
                    setSavedIds(prev => {
                      const next = new Set(prev);
                      next.delete(item.id);
                      return next;
                    });
                    fetch(`http://127.0.0.1:8000/api/houses/${item.id}/unsave/`, {
                      method: 'DELETE',
                    }).catch(() => {});
                    setSavedHouses(prev => prev.filter(house => house.id !== item.id));
                  }}
                >
                  <Text style={styles.removeSavedButtonText}>Remove</Text>
                </Pressable>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  if (screen === 'saved-detail') {
    if (!savedDetailHouse) {
      return (
        <View style={[styles.container, styles.center]}>
          <Pressable
            style={styles.backButton}
            onPress={() => setScreen('saved')}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <Text style={styles.endText}>
            saved house not found
          </Text>
        </View>
      );
    }

    const house = savedDetailHouse;
    const detail = detailByHouseId[house.id];
    const isHouseSaved = savedIds.has(house.id);
    const descriptionText = detail?.description?.text;
    const detailItems = Array.isArray(detail?.details) ? detail.details : [];
    const detailAddress = detail?.location?.address;
    const beds = detail?.description?.beds ?? house.beds;
    const baths = detail?.description?.baths ?? house.baths;
    const yearBuilt = detail?.description?.year_built;
    const sqft = detail?.description?.sqft ?? house.sqft;
    const homeTypeRaw = detail?.description?.type || detail?.description?.sub_type || house.property_type;
    const homeType = homeTypeRaw ? homeTypeRaw.replace(/_/g, ' ') : null;

    return (
      <View style={[styles.container, styles.swipeContainer]}>
        <Pressable
          style={styles.backButton}
          onPress={() => setScreen('saved')}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <View {...savedDetailResponder.panHandlers} style={styles.card}>
          {toastMessage && (
            <Animated.View
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
            </Animated.View>
          )}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.cardScrollContent}
        >
          <Image
            source={{ uri: house.primary_photo_url || 'https://via.placeholder.com/600x400' }}
            style={styles.image}
            contentFit="cover"
          />

          <View style={styles.cardBody}>
            <Text style={styles.price}>
              ${house.price ? house.price.toLocaleString() : '—'}
            </Text>

            <Text style={styles.address}>
              {detailAddress?.line || house.address_line}, {detailAddress?.city || house.city},{' '}
              {detailAddress?.state_code || house.state}
            </Text>

            <Text style={styles.description}>
              {beds ?? '—'} bd · {baths ?? '—'} ba · {sqft ?? '—'} sqft
              {homeType ? ` · ${homeType}` : ''}
            </Text>

            <View style={styles.cardActions}>
              <Text
                style={[
                  styles.saveButton,
                  isHouseSaved && styles.saved,
                ]}
                onPress={() => saveCurrentHouse(house)}
              >
                {isHouseSaved ? 'Saved ✓' : 'Save'}
              </Text>
            </View>

            <Text style={styles.detailHeader}>Description</Text>
            <Text style={styles.detailBody}>
              {descriptionText || 'No description available.'}
            </Text>

            <Text style={styles.detailHeader}>Details</Text>
            <Text style={styles.detailBody}>
              {beds ?? '—'} beds · {baths ?? '—'} baths · {yearBuilt ?? '—'} year built · {sqft ?? '—'} sqft
            </Text>

            <Text style={styles.detailHeader}>Additional Details</Text>
            {detailItems.length === 0 ? (
              <Text style={styles.detailBody}>No additional details available.</Text>
            ) : (
              detailItems.map((item, itemIndex) => {
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
        </View>
      </View>
    );
  }

  if (!swipeHouses.length || index >= swipeHouses.length) {
    return (
      <View style={[styles.container, styles.center]}>
        <Pressable
          style={styles.backButton}
          onPress={() => setScreen('home')}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Text style={styles.endText}>
          you've reached the end
        </Text>
      </View>
    );
  }

  const house = swipeHouses[index];
  const detail = detailByHouseId[house.id];
  const isHouseSaved = savedIds.has(house.id);
  const descriptionText = detail?.description?.text;
  const detailItems = Array.isArray(detail?.details) ? detail.details : [];
  const detailAddress = detail?.location?.address;
  const beds = detail?.description?.beds ?? house.beds;
  const baths = detail?.description?.baths ?? house.baths;
  const yearBuilt = detail?.description?.year_built;
  const sqft = detail?.description?.sqft ?? house.sqft;
  const homeTypeRaw = detail?.description?.type || detail?.description?.sub_type || house.property_type;
  const homeType = homeTypeRaw ? homeTypeRaw.replace(/_/g, ' ') : null;

  return (
    <View style={[styles.container, styles.swipeContainer]}>
      <Pressable
        style={styles.backButton}
        onPress={() => setScreen('home')}
      >
        <Text style={styles.backButtonText}>Back</Text>
      </Pressable>
      {showLikeBadge && likeBadgeId === house.id && (
        <View style={styles.likeBadgeContainer}>
          <Text style={styles.likeBadge}>❤️</Text>
        </View>
      )}
      {showDislikeBadge && dislikeBadgeId === house.id && (
        <View style={styles.dislikeBadgeContainer}>
          <Text style={styles.dislikeBadge}>👎</Text>
        </View>
      )}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.card,
          {
            opacity: cardOpacity,
            transform: [
              { translateX: position.x },
              { translateY: position.y },
            ],
          },
        ]}
      >
        {toastMessage && (
          <Animated.View
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
          </Animated.View>
        )}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.cardScrollContent}
        >
          <Image
            source={{ uri: house.primary_photo_url || 'https://via.placeholder.com/600x400' }}
            style={styles.image}
            contentFit="cover"
          />

          <View style={styles.cardBody}>
            <Text style={styles.price}>
              ${house.price ? house.price.toLocaleString() : '—'}
            </Text>

            <Text style={styles.address}>
              {detailAddress?.line || house.address_line}, {detailAddress?.city || house.city},{' '}
              {detailAddress?.state_code || house.state}
            </Text>

            <Text style={styles.description}>
              {beds ?? '—'} bd · {baths ?? '—'} ba · {sqft ?? '—'} sqft
              {homeType ? ` · ${homeType}` : ''}
            </Text>

            <View style={styles.cardActions}>
              <Text
                style={[
                  styles.saveButton,
                  isHouseSaved && styles.saved,
                ]}
                onPress={() => saveCurrentHouse()}
              >
                {isHouseSaved ? 'Saved ✓' : 'Save'}
              </Text>
              <Text
                style={[
                  styles.undoButton,
                  history.length === 0 && styles.undoDisabled,
                ]}
                onPress={undoSwipe}
              >
                Undo
              </Text>
            </View>

            <Text style={styles.detailHeader}>Description</Text>
            <Text style={styles.detailBody}>
              {descriptionText || 'No description available.'}
            </Text>

            <Text style={styles.detailHeader}>Details</Text>
            <Text style={styles.detailBody}>
              {beds ?? '—'} beds · {baths ?? '—'} baths · {yearBuilt ?? '—'} year built · {sqft ?? '—'} sqft
            </Text>

            <Text style={styles.detailHeader}>Additional Details</Text>
            {detailItems.length === 0 ? (
              <Text style={styles.detailBody}>No additional details available.</Text>
            ) : (
              detailItems.map((item, itemIndex) => {
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
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 120,
  },
  swipeContainer: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  homeGraphic: {
    width: 220,
    height: 220,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dreamGlow: {
    position: 'absolute',
    top: 50,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#ffeaa7',
    opacity: 0.6,
  },
  sparkle: {
    position: 'absolute',
    top: 20,
    right: 40,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff6e5',
    opacity: 0.9,
  },
  sparkleSmall: {
    top: 44,
    left: 46,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sparkleTiny: {
    top: 78,
    right: 60,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  doorFrame: {
    width: 120,
    height: 170,
    borderRadius: 12,
    backgroundColor: '#6d4c41',
    padding: 8,
    elevation: 4,
  },
  doorOpening: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 70,
    height: 154,
    borderRadius: 8,
    backgroundColor: '#fff6e5',
    opacity: 0.9,
  },
  doorPanelOpen: {
    position: 'absolute',
    top: 8,
    right: -18,
    width: 70,
    height: 154,
    borderRadius: 8,
    backgroundColor: '#8d6e63',
    transform: [{ skewY: '-8deg' }],
  },
  doorKnob: {
    position: 'absolute',
    right: 16,
    bottom: 40,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f5d76e',
  },
  homeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#111827',
    marginBottom: 12,
  },
  primaryButtonText: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
  },
  secondaryButtonText: {
    textAlign: 'center',
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  backButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#d7d2ceff',
    borderRadius: 28,
    padding: 0,
    elevation: 3,
    flex: 1,
    marginBottom: 0,
    overflow: 'hidden',
  },
  cardScrollContent: {
    paddingBottom: 20,
  },
  cardBody: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 20,
  },
  cardActions: {
    gap: 8,
  },
  image: {
    width: '100%',
    height: 420,
    borderRadius: 28,
    marginBottom: 0,
    backgroundColor: '#eee',
    borderWidth: .1,
    borderColor: '#f2f2f2',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  address: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  detailHeader: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  detailSubheader: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  detailBody: {
    marginTop: 6,
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  detailItem: {
    marginTop: 4,
  },
  savedToast: {
    position: 'absolute',
    top: 140,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  savedToastText: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#111827',
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  likeBadgeContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -40 }],
    zIndex: 20,
  },
  likeBadge: {
    fontSize: 80,
  },
  dislikeBadgeContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -40 }],
    zIndex: 20,
  },
  dislikeBadge: {
    fontSize: 80,
  },
  saveButton: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    textAlign: 'center',
    backgroundColor: '#eee',
    fontSize: 16,
  },
  saved: {
    backgroundColor: '#ffebee',
    color: '#d32f2f',
  },
  savedCard: {
    backgroundColor: '#d7d2ceff',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },
  savedImage: {
    width: '100%',
    height: 220,
    borderRadius: 22,
    marginBottom: 16,
    backgroundColor: '#eee',
    borderWidth: 0.5,
    borderColor: '#f2f2f2',
  },
  removeSavedButton: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fdecea',
  },
  removeSavedButtonText: {
    textAlign: 'center',
    color: '#b42318',
    fontSize: 15,
    fontWeight: '600',
  },
  savedEmpty: {
    flex: 1,
  },
  undoButton: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    textAlign: 'center',
    backgroundColor: '#e3f2fd',
    fontSize: 16,
    color: '#1565c0',
  },
  undoDisabled: {
    backgroundColor: '#f2f2f2',
    color: '#9e9e9e',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  endText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
});
