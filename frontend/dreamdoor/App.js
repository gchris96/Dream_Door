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
  const [savedHouses, setSavedHouses] = useState([]);
  const [pendingLikeId, setPendingLikeId] = useState(null);
  const [pendingDislikeId, setPendingDislikeId] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [history, setHistory] = useState([]);
  const [showLikeBadge, setShowLikeBadge] = useState(false);
  const [likeBadgeId, setLikeBadgeId] = useState(null);
  const [showDislikeBadge, setShowDislikeBadge] = useState(false);
  const [dislikeBadgeId, setDislikeBadgeId] = useState(null);

  const position = useRef(new Animated.ValueXY()).current;
  const screenWidth = Dimensions.get('window').width;
  const swipeHouses = useMemo(
    () => houses.filter(house => !savedIds.has(house.id)),
    [houses, savedIds]
  );

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
  const saveCurrentHouse = () => {
    const house = swipeHouses[index];
    if (!house) return;

    const isSaved = savedIds.has(house.id);
    if (isSaved) {
      setSavedIds(prev => {
        const next = new Set(prev);
        next.delete(house.id);
        return next;
      });
      fetch(`http://127.0.0.1:8000/api/houses/${house.id}/unsave/`, {
        method: 'DELETE',
      }).catch(() => {});
    } else {
      setSavedIds(prev => new Set(prev).add(house.id));
      fetch(`http://127.0.0.1:8000/api/houses/${house.id}/save/`, {
        method: 'POST',
      }).catch(() => {});
      if (screen === 'swipe') {
        setIndex(prev => Math.min(prev, Math.max(0, swipeHouses.length - 2)));
      }
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
    position.setValue({ x: 0, y: 0 });
    setIndex(last.index);
  };

  // -------------------------
  // PAN RESPONDER
  // -------------------------
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !isAnimating,

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
              <View key={item.id} style={styles.savedCard}>
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
              </View>
            ))}
          </ScrollView>
        )}
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

  return (
    <View style={styles.container}>
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
            transform: [
              { translateX: position.x },
              { translateY: position.y },
            ],
          },
        ]}
      >
        <Image
          source={{ uri: house.primary_photo_url || 'https://via.placeholder.com/600x400' }}
          style={styles.image}
          contentFit="cover"
        />

        <Text style={styles.price}>
          ${house.price ? house.price.toLocaleString() : '—'}
        </Text>

        <Text style={styles.address}>
          {house.address_line}, {house.city}, {house.state}
        </Text>

        <Text style={styles.description}>
          {house.beds} bd · {house.baths} ba · {house.sqft} sqft
        </Text>

        <Text
          style={[
            styles.saveButton,
            savedIds.has(house.id) && styles.saved,
          ]}
          onPress={saveCurrentHouse}
        >
          {savedIds.has(house.id) ? 'Saved ✓' : 'Save'}
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
    borderRadius: 12,
    padding: 10,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 30,
    marginBottom: 20,
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
