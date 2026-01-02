import {
  Text,
  View,
  StyleSheet,
  PanResponder,
  Animated as RNAnimated,
  Dimensions,
  ScrollView,
  Pressable,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';

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
  const [photoByHouseId, setPhotoByHouseId] = useState({});
  const [showLikeBadge, setShowLikeBadge] = useState(false);
  const [likeBadgeId, setLikeBadgeId] = useState(null);
  const [showDislikeBadge, setShowDislikeBadge] = useState(false);
  const [dislikeBadgeId, setDislikeBadgeId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [photoViewerHouseId, setPhotoViewerHouseId] = useState(null);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);
  const [detailOrigin, setDetailOrigin] = useState('saved');
  const [filterMin, setFilterMin] = useState(0);
  const [filterMax, setFilterMax] = useState(10000000);
  const [filterMinInput, setFilterMinInput] = useState('0');
  const [filterMaxInput, setFilterMaxInput] = useState('10000000');
  const [appliedFilterMin, setAppliedFilterMin] = useState(0);
  const [appliedFilterMax, setAppliedFilterMax] = useState(10000000);
  const [filterTrackWidth, setFilterTrackWidth] = useState(0);

  const position = useRef(new RNAnimated.ValueXY()).current;
  const cardOpacity = useRef(new RNAnimated.Value(1)).current;
  const savedToastOpacity = useRef(new RNAnimated.Value(0)).current;
  const savedToastTranslate = useRef(new RNAnimated.Value(20)).current;
  const photoViewerTranslate = useRef(new RNAnimated.Value(0)).current;
  const photoViewerOpacity = useRef(new RNAnimated.Value(1)).current;
  const photoListRef = useRef(null);
  const filterTrackRef = useRef(null);
  const filterTrackX = useRef(0);
  const badgeDragX = useRef(new RNAnimated.Value(0)).current;
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const cardTilt = position.x.interpolate({
    inputRange: [-screenWidth, 0, screenWidth],
    outputRange: ['-12deg', '0deg', '12deg'],
    extrapolate: 'clamp',
  });
  const cardLift = position.x.interpolate({
    inputRange: [-screenWidth, 0, screenWidth],
    outputRange: [12, 0, 12],
    extrapolate: 'clamp',
  });
  const likeBadgeOpacity = position.x.interpolate({
    inputRange: [0, screenWidth * 0.25],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const dislikeBadgeOpacity = position.x.interpolate({
    inputRange: [-screenWidth * 0.25, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const likeBadgeApproach = badgeDragX.interpolate({
    inputRange: [0, screenWidth * 0.9, screenWidth],
    outputRange: [screenWidth * 0.8, 0, screenWidth * 1.1],
    extrapolate: 'clamp',
  });
  const dislikeBadgeApproach = badgeDragX.interpolate({
    inputRange: [-screenWidth, -screenWidth * 0.9, 0],
    outputRange: [-screenWidth * 1.1, 0, -screenWidth * 0.8],
    extrapolate: 'clamp',
  });
  const badgeFollow = RNAnimated.subtract(position.x, badgeDragX);
  const likeBadgeTranslate = RNAnimated.add(likeBadgeApproach, badgeFollow);
  const dislikeBadgeTranslate = RNAnimated.add(dislikeBadgeApproach, badgeFollow);
  const filteredHouses = useMemo(() => {
    return houses.filter((house) => {
      const price = typeof house.price === 'number' ? house.price : Number(house.price);
      if (Number.isNaN(price)) return false;
      return price >= appliedFilterMin && price <= appliedFilterMax;
    });
  }, [houses, appliedFilterMin, appliedFilterMax]);
  const swipeHouses = useMemo(
    () => filteredHouses.filter(house => !savedIds.has(house.id) || savedOverrideIds.has(house.id)),
    [filteredHouses, savedIds, savedOverrideIds]
  );
  const likedHouses = useMemo(
    () => houses.filter(house => likedIds.has(house.id)),
    [houses, likedIds]
  );
  const dislikedHouses = useMemo(
    () => houses.filter(house => dislikedIds.has(house.id)),
    [houses, dislikedIds]
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

  useEffect(() => {
    if (screen !== 'swipe' && screen !== 'saved-detail') return;
    const current = screen === 'swipe' ? swipeHouses[index] : savedDetailHouse;
    if (!current || photoByHouseId[current.id]) return;

    fetch(`http://127.0.0.1:8000/api/houses/${current.id}/photos/`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!data) return;
        setPhotoByHouseId(prev => ({ ...prev, [current.id]: data }));
      })
      .catch(() => {});
  }, [screen, swipeHouses, index, savedDetailHouse, photoByHouseId]);

  const resetPositionNextTick = () => {
    requestAnimationFrame(() => {
      badgeDragX.setValue(0);
      position.setValue({ x: 0, y: 0 });
    });
  };

  const runToastAnimation = (message, onComplete) => {
    setToastMessage(message);
    savedToastOpacity.setValue(0);
    savedToastTranslate.setValue(20);
    RNAnimated.sequence([
      RNAnimated.parallel([
        RNAnimated.timing(savedToastOpacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
        RNAnimated.timing(savedToastTranslate, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
      ]),
      RNAnimated.delay(700),
      RNAnimated.parallel([
        RNAnimated.timing(savedToastOpacity, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
        RNAnimated.timing(savedToastTranslate, {
          toValue: -10,
          duration: 260,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setToastMessage(null);
      if (onComplete) {
        onComplete();
      }
    });
  };

  const PRICE_MIN = 0;
  const PRICE_MAX = 10000000;
  const PRICE_STEP = 25000;

  const clampPrice = (value) => Math.min(PRICE_MAX, Math.max(PRICE_MIN, value));
  const formatPrice = (value) => `$${value.toLocaleString()}`;
  const getStepForValue = (value) => {
    if (value > 5000000) return 1000000;
    if (value >= 1000000) return 250000;
    return PRICE_STEP;
  };
  const snapDirectional = (value, direction) => {
    const step = getStepForValue(value);
    if (direction >= 0) {
      return Math.ceil(value / step) * step;
    }
    return Math.floor(value / step) * step;
  };

  const setMinPrice = (value) => {
    const next = clampPrice(value);
    const capped = Math.min(next, filterMax);
    setFilterMin(capped);
    setFilterMinInput(String(capped));
    if (capped > filterMax) {
      setFilterMax(capped);
      setFilterMaxInput(String(capped));
    }
  };

  const setMaxPrice = (value) => {
    const next = clampPrice(value);
    const capped = Math.max(next, filterMin);
    setFilterMax(capped);
    setFilterMaxInput(String(capped));
    if (capped < filterMin) {
      setFilterMin(capped);
      setFilterMinInput(String(capped));
    }
  };

  const normalizePriceInput = (text) => {
    const cleaned = text.replace(/[^\d]/g, '');
    if (!cleaned) return null;
    const value = Number(cleaned);
    if (Number.isNaN(value)) return null;
    return clampPrice(value);
  };

  const minPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          if (!filterTrackRef.current?.measureInWindow) return;
          filterTrackRef.current.measureInWindow((x) => {
            filterTrackX.current = x;
          });
        },
        onPanResponderMove: (_, gesture) => {
          if (!filterTrackWidth) return;
          const range = PRICE_MAX - PRICE_MIN;
          const nextX = Math.min(
            filterTrackWidth,
            Math.max(0, gesture.moveX - filterTrackX.current)
          );
          const nextValue = PRICE_MIN + (nextX / filterTrackWidth) * range;
          const snapped = snapDirectional(nextValue, gesture.dx);
          const capped = Math.min(clampPrice(snapped), filterMax);
          setFilterMin(capped);
          setFilterMinInput(String(capped));
        },
      }),
    [filterMin, filterMax, filterTrackWidth]
  );

  const maxPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          if (!filterTrackRef.current?.measureInWindow) return;
          filterTrackRef.current.measureInWindow((x) => {
            filterTrackX.current = x;
          });
        },
        onPanResponderMove: (_, gesture) => {
          if (!filterTrackWidth) return;
          const range = PRICE_MAX - PRICE_MIN;
          const nextX = Math.min(
            filterTrackWidth,
            Math.max(0, gesture.moveX - filterTrackX.current)
          );
          const nextValue = PRICE_MIN + (nextX / filterTrackWidth) * range;
          const snapped = snapDirectional(nextValue, gesture.dx);
          const capped = Math.max(clampPrice(snapped), filterMin);
          setFilterMax(capped);
          setFilterMaxInput(String(capped));
        },
      }),
    [filterMin, filterMax, filterTrackWidth]
  );

  useEffect(() => {
    if (screen !== 'swipe') return;
    cardOpacity.setValue(1);
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
    }

    RNAnimated.timing(position, {
      toValue: {
        x: direction === 'right' ? screenWidth : -screenWidth,
        y: 0,
      },
      duration: 280,
      useNativeDriver: false,
    }).start(() => {
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
      resetPositionNextTick();
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
    const currentIndex = index;

    RNAnimated.timing(position, {
      toValue: { x: screenWidth, y: 0 },
      duration: 280,
      useNativeDriver: false,
    }).start(() => {
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
      resetPositionNextTick();
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
      runToastAnimation('Unsaved', () => {
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
      if (isSwipeContext && screen === 'swipe') {
        setIsAnimating(true);
        runToastAnimation('Saved!', () => {
          RNAnimated.timing(position, {
            toValue: { x: screenWidth, y: 0 },
            duration: 280,
            useNativeDriver: false,
          }).start(() => {
            setSavedOverrideIds(prev => {
              const next = new Set(prev);
              next.delete(house.id);
              return next;
            });
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
            setIndex(prev => prev + 1);
            resetPositionNextTick();
            setIsSaving(false);
            setIsAnimating(false);
          });
        });
      } else {
        runToastAnimation('Saved!', () => {
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
          }
          setIsSaving(false);
        });
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
            badgeDragX.setValue(gesture.dx);
            position.setValue({ x: gesture.dx, y: gesture.dy * 0.1 });
          }
        },

        onPanResponderRelease: (_, gesture) => {
          if (isAnimating) return;

          if (gesture.dx > 120) {
            likeCurrentHouse();
          } else if (gesture.dx < -120) {
            swipeOffScreen('left');
          } else {
            RNAnimated.spring(position, {
              toValue: { x: 0, y: 0 },
              friction: 7,
              tension: 40,
              useNativeDriver: false,
            }).start();
          }
        },
      }),
    [isAnimating, likeCurrentHouse, swipeOffScreen, position]
  );

  const closePhotoViewer = (direction = 1) => {
    RNAnimated.parallel([
      RNAnimated.timing(photoViewerTranslate, {
        toValue: direction * screenHeight,
        duration: 300,
        useNativeDriver: true,
      }),
      RNAnimated.timing(photoViewerOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      photoViewerTranslate.setValue(0);
      photoViewerOpacity.setValue(1);
      setShowPhotoViewer(false);
      setPhotoViewerHouseId(null);
      setPhotoViewerIndex(0);
    });
  };

  const photoGestureEvent = RNAnimated.event(
    [{ nativeEvent: { translationY: photoViewerTranslate } }],
    {
      useNativeDriver: true,
      listener: (event) => {
        const dy = event.nativeEvent.translationY || 0;
        const fade = Math.min(Math.abs(dy) / screenHeight, 0.5);
        photoViewerOpacity.setValue(1 - fade);
      },
    }
  );

  const onPhotoHandlerStateChange = (event) => {
    const { state, translationY } = event.nativeEvent;
    if (state !== State.END && state !== State.CANCELLED && state !== State.FAILED) {
      return;
    }
    if (Math.abs(translationY) > 80) {
      closePhotoViewer(translationY > 0 ? 1 : -1);
      return;
    }
    RNAnimated.parallel([
      RNAnimated.spring(photoViewerTranslate, {
        toValue: 0,
        useNativeDriver: true,
      }),
      RNAnimated.timing(photoViewerOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const openPhotoViewer = (houseId, initialIndex = 0) => {
    setPhotoViewerHouseId(houseId);
    setPhotoViewerIndex(initialIndex);
    setShowPhotoViewer(true);
    photoViewerTranslate.setValue(0);
    photoViewerOpacity.setValue(1);
    requestAnimationFrame(() => {
      if (photoListRef.current && initialIndex > 0) {
        photoListRef.current.scrollToIndex({ index: initialIndex, animated: false });
      }
    });
  };

  const currentPhotoList = photoViewerHouseId
    ? (photoByHouseId[photoViewerHouseId] || [])
    : [];

  const getPrimaryPhotoUrl = (house) => {
    const photos = photoByHouseId[house.id];
    if (Array.isArray(photos) && photos.length > 0) {
      const first = photos[0];
      if (first && typeof first === 'object') {
        return first.href || first.href_fallback || house.primary_photo_url;
      }
    }
    return house.primary_photo_url;
  };

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
            setScreen(detailOrigin || 'saved');
          }
        },
      }),
    [detailOrigin]
  );

  if (screen === 'home') {
    return (
      <GestureHandlerRootView style={styles.root}>
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
          style={[styles.primaryButton, styles.homeButton]}
          onPress={() => {
            setAppliedFilterMin(PRICE_MIN);
            setAppliedFilterMax(PRICE_MAX);
            setFilterMin(PRICE_MIN);
            setFilterMax(PRICE_MAX);
            setFilterMinInput(String(PRICE_MIN));
            setFilterMaxInput(String(PRICE_MAX));
            setScreen('swipe');
          }}
        >
          <Text style={styles.primaryButtonText}>Browse All Homes</Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryButton, styles.homeButton]}
          onPress={() => {
            setScreen('filters');
          }}
        >
          <Text style={styles.secondaryButtonText}>Filter Homes</Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryButton, styles.homeButton]}
          onPress={() => {
            setScreen('saved');
          }}
        >
          <Text style={styles.secondaryButtonText}>View Saved</Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryButton, styles.homeButton]}
          onPress={() => {
            setScreen('liked');
          }}
        >
          <Text style={styles.secondaryButtonText}>View Liked</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => {
            setScreen('disliked');
          }}
        >
          <Text style={styles.secondaryButtonText}>View Disliked</Text>
        </Pressable>
      </View>
      </GestureHandlerRootView>
    );
  }

  if (screen === 'filters') {
    const trackWidth = filterTrackWidth || 1;
    const minX = ((filterMin - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * trackWidth;
    const maxX = ((filterMax - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * trackWidth;
    const rangeWidth = Math.max(0, maxX - minX);
    return (
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.container}>
          <Pressable
            style={styles.backButton}
            onPress={() => setScreen('home')}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <Text style={styles.sectionTitle}>Filter Homes</Text>
          <View style={styles.filterCard}>
            <Text style={styles.filterLabel}>Price Range</Text>
            <Text style={styles.filterRangeLabel}>
              {formatPrice(filterMin)} - {filterMax >= PRICE_MAX ? '$10M+' : formatPrice(filterMax)}
            </Text>
            <View style={styles.sliderRow}>
              <Text style={styles.sliderLimit}>{formatPrice(PRICE_MIN)}</Text>
              <View
                style={styles.sliderTrackContainer}
                ref={filterTrackRef}
                onLayout={(event) => {
                  setFilterTrackWidth(event.nativeEvent.layout.width);
                  if (filterTrackRef.current?.measureInWindow) {
                    filterTrackRef.current.measureInWindow((x) => {
                      filterTrackX.current = x;
                    });
                  }
                }}
              >
                <View style={styles.sliderTrack} />
                <View style={[styles.sliderRange, { left: minX, width: rangeWidth }]} />
                <View
                  style={[styles.sliderThumb, { left: minX - 12 }]}
                  {...minPanResponder.panHandlers}
                />
                <View
                  style={[styles.sliderThumb, { left: maxX - 12 }]}
                  {...maxPanResponder.panHandlers}
                />
              </View>
              <Text style={styles.sliderLimit}>$10M+</Text>
            </View>
            <View style={styles.filterInputRow}>
              <View style={styles.filterInputGroup}>
                <Text style={styles.filterInputLabel}>Min</Text>
                <TextInput
                  style={styles.filterInput}
                  keyboardType="numeric"
                  value={filterMinInput}
                  onChangeText={(text) => {
                    setFilterMinInput(text.replace(/[^\d]/g, ''));
                  }}
                  onEndEditing={() => {
                    const normalized = normalizePriceInput(filterMinInput);
                    if (normalized === null) {
                      setFilterMinInput(String(filterMin));
                      return;
                    }
                    setMinPrice(normalized);
                  }}
                />
              </View>
              <View style={styles.filterInputGroup}>
                <Text style={styles.filterInputLabel}>Max</Text>
                <TextInput
                  style={styles.filterInput}
                  keyboardType="numeric"
                  value={filterMaxInput}
                  onChangeText={(text) => {
                    setFilterMaxInput(text.replace(/[^\d]/g, ''));
                  }}
                  onEndEditing={() => {
                    const normalized = normalizePriceInput(filterMaxInput);
                    if (normalized === null) {
                      setFilterMaxInput(String(filterMax));
                      return;
                    }
                    setMaxPrice(normalized);
                  }}
                />
              </View>
            </View>
          </View>
          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              setAppliedFilterMin(filterMin);
              setAppliedFilterMax(filterMax);
              setIndex(0);
              setHistory([]);
              position.setValue({ x: 0, y: 0 });
              setScreen('swipe');
            }}
          >
            <Text style={styles.primaryButtonText}>Apply Filters</Text>
          </Pressable>
        </View>
      </GestureHandlerRootView>
    );
  }

  if (screen === 'liked' || screen === 'disliked') {
    const list = screen === 'liked' ? likedHouses : dislikedHouses;
    const title = screen === 'liked' ? 'Liked Homes' : 'Disliked Homes';
    return (
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.container}>
          <Pressable
            style={styles.backButton}
            onPress={() => setScreen('home')}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <Text style={styles.sectionTitle}>{title}</Text>
          {list.length === 0 ? (
            <View style={[styles.center, styles.savedEmpty]}>
              <Text style={styles.endText}>no homes yet</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {list.map(item => (
                <Pressable
                  key={item.id}
                  style={styles.savedCard}
                  onPress={() => {
                    setSavedDetailId(item.id);
                    setDetailOrigin(screen);
                    setScreen('saved-detail');
                  }}
                >
                  <Image
                    source={{ uri: getPrimaryPhotoUrl(item) || 'https://via.placeholder.com/600x400' }}
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
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </GestureHandlerRootView>
    );
  }

  if (screen === 'saved') {
    return (
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.container}>
          <Pressable
            style={styles.backButton}
            onPress={() => setScreen('home')}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <Text style={styles.sectionTitle}>Saved Homes</Text>
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
                    setDetailOrigin('saved');
                    setScreen('saved-detail');
                  }}
                >
                  <Image
                    source={{ uri: getPrimaryPhotoUrl(item) || 'https://via.placeholder.com/600x400' }}
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
                      if (isSaving) return;
                      fetch(`http://127.0.0.1:8000/api/houses/${item.id}/unsave/`, {
                        method: 'DELETE',
                      }).catch(() => {});
                      setIsSaving(true);
                      runToastAnimation('Removed', () => {
                        setSavedIds(prev => {
                          const next = new Set(prev);
                          next.delete(item.id);
                          return next;
                        });
                        setSavedOverrideIds(prev => {
                          const next = new Set(prev);
                          next.delete(item.id);
                          return next;
                        });
                        setSavedHouses(prev => prev.filter(house => house.id !== item.id));
                        setIsSaving(false);
                      });
                    }}
                  >
                    <Text style={styles.removeSavedButtonText}>Remove</Text>
                  </Pressable>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </GestureHandlerRootView>
    );
  }

  if (screen === 'saved-detail') {
    if (!savedDetailHouse) {
      return (
        <View style={[styles.container, styles.center]}>
          <Pressable
            style={styles.backButton}
            onPress={() => setScreen(detailOrigin || 'saved')}
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
      <GestureHandlerRootView style={styles.root}>
        <View style={[styles.container, styles.swipeContainer]}>
          <Pressable
            style={styles.backButton}
            onPress={() => setScreen(detailOrigin || 'saved')}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <View {...savedDetailResponder.panHandlers} style={styles.card}>
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
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.cardScrollContent}
          >
            <Pressable
              onPress={() => openPhotoViewer(house.id, 0)}
            >
              <Image
                source={{ uri: getPrimaryPhotoUrl(house) || 'https://via.placeholder.com/600x400' }}
                style={styles.image}
                contentFit="cover"
              />
            </Pressable>

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
        <Modal
          visible={showPhotoViewer}
          transparent
          animationType="none"
          onRequestClose={closePhotoViewer}
        >
          <View style={styles.photoViewerBackdrop}>
            <PanGestureHandler
              onGestureEvent={photoGestureEvent}
              onHandlerStateChange={onPhotoHandlerStateChange}
              activeOffsetY={[-10, 10]}
              failOffsetX={[-15, 15]}
            >
              <RNAnimated.View
                style={[
                  styles.photoViewerDragLayer,
                  {
                    transform: [{ translateY: photoViewerTranslate }],
                    opacity: photoViewerOpacity,
                  },
                ]}
              >
                <Pressable style={styles.photoViewerBack} onPress={closePhotoViewer}>
                  <Text style={styles.photoViewerBackText}>Back</Text>
                </Pressable>
                <FlatList
                  ref={photoListRef}
                  data={currentPhotoList}
                  keyExtractor={(item, idx) => `${photoViewerHouseId || 'house'}-${idx}`}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(event) => {
                    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
                    setPhotoViewerIndex(nextIndex);
                  }}
                  directionalLockEnabled
                  renderItem={({ item }) => (
                    <View
                      style={[styles.photoViewerSlide, { width: screenWidth }]}
                    >
                      <Image
                        source={{ uri: item?.href || 'https://via.placeholder.com/600x400' }}
                        style={styles.photoViewerImage}
                        contentFit="contain"
                      />
                    </View>
                  )}
                />
                <Text style={styles.photoViewerCounter}>
                  {currentPhotoList.length ? `${photoViewerIndex + 1}/${currentPhotoList.length}` : '0/0'}
                </Text>
              </RNAnimated.View>
            </PanGestureHandler>
          </View>
        </Modal>
        </View>
      </GestureHandlerRootView>
    );
  }

  if (!swipeHouses.length || index >= swipeHouses.length) {
    return (
      <GestureHandlerRootView style={styles.root}>
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
      </GestureHandlerRootView>
    );
  }

  const currentHouse = swipeHouses[index];
  const nextHouse = swipeHouses[index + 1];

  const getHouseMeta = (house) => {
    const detail = detailByHouseId[house.id];
    const descriptionText = detail?.description?.text;
    const detailItems = Array.isArray(detail?.details) ? detail.details : [];
    const detailAddress = detail?.location?.address;
    const beds = detail?.description?.beds ?? house.beds;
    const baths = detail?.description?.baths ?? house.baths;
    const yearBuilt = detail?.description?.year_built;
    const sqft = detail?.description?.sqft ?? house.sqft;
    const homeTypeRaw = detail?.description?.type || detail?.description?.sub_type || house.property_type;
    const homeType = homeTypeRaw ? homeTypeRaw.replace(/_/g, ' ') : null;

    return {
      descriptionText,
      detailItems,
      detailAddress,
      beds,
      baths,
      yearBuilt,
      sqft,
      homeType,
    };
  };

  const renderHouseScrollContent = (house, meta, options = {}) => {
    const isHouseSaved = savedIds.has(house.id);
    const showActions = options.allowSave || options.showUndo;
    const primaryPhotoUrl = getPrimaryPhotoUrl(house);
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.cardScrollContent}
      >
        <Pressable
          onPress={options.allowImagePress ? () => openPhotoViewer(house.id, 0) : undefined}
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

          {showActions && (
            <View style={styles.cardActions}>
              {options.allowSave && (
                <Text
                  style={[
                    styles.saveButton,
                    isHouseSaved && styles.saved,
                  ]}
                  onPress={() => saveCurrentHouse()}
                >
                  {isHouseSaved ? 'Saved ✓' : 'Save'}
                </Text>
              )}
              {options.showUndo && (
                <Text
                  style={[
                    styles.undoButton,
                    history.length === 0 && styles.undoDisabled,
                  ]}
                  onPress={undoSwipe}
                >
                  Undo
                </Text>
              )}
            </View>
          )}

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
  };

  const currentMeta = getHouseMeta(currentHouse);
  const nextMeta = nextHouse ? getHouseMeta(nextHouse) : null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={[styles.container, styles.swipeContainer]}>
        <Pressable
          style={styles.backButton}
          onPress={() => setScreen('home')}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <RNAnimated.View
          pointerEvents="none"
          style={[
            styles.likeBadgeContainer,
            {
              left: screenWidth / 2,
              top: screenHeight * 0.45,
              opacity: likeBadgeOpacity,
              transform: [
                { translateX: -40 },
                { translateY: -40 },
                { translateX: likeBadgeTranslate },
              ],
            },
          ]}
        >
          <Text style={styles.likeBadge}>✓</Text>
        </RNAnimated.View>
        <RNAnimated.View
          pointerEvents="none"
          style={[
            styles.dislikeBadgeContainer,
            {
              left: screenWidth / 2,
              top: screenHeight * 0.45,
              opacity: dislikeBadgeOpacity,
              transform: [
                { translateX: -40 },
                { translateY: -40 },
                { translateX: dislikeBadgeTranslate },
              ],
            },
          ]}
        >
          <Text style={styles.dislikeBadge}>✕</Text>
        </RNAnimated.View>
        <View style={styles.cardStack}>
          {nextHouse && nextMeta && (
            <View style={[styles.card, styles.underCard]} pointerEvents="none">
              {renderHouseScrollContent(nextHouse, nextMeta, { allowImagePress: false, allowSave: false })}
            </View>
          )}
          <RNAnimated.View
            {...panResponder.panHandlers}
            style={[
              styles.card,
              {
                opacity: cardOpacity,
                transform: [
                  { translateX: position.x },
                  { translateY: position.y },
                  { translateY: cardLift },
                  { rotate: cardTilt },
                ],
              },
            ]}
          >
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
            {renderHouseScrollContent(currentHouse, currentMeta, {
              allowImagePress: true,
              allowSave: true,
              showUndo: true,
            })}
          </RNAnimated.View>
        </View>
        <Modal
          visible={showPhotoViewer}
          transparent
          animationType="none"
          onRequestClose={closePhotoViewer}
        >
          <View style={styles.photoViewerBackdrop}>
            <PanGestureHandler
              onGestureEvent={photoGestureEvent}
              onHandlerStateChange={onPhotoHandlerStateChange}
              activeOffsetY={[-10, 10]}
              failOffsetX={[-15, 15]}
            >
              <RNAnimated.View
                style={[
                  styles.photoViewerDragLayer,
                  {
                    transform: [{ translateY: photoViewerTranslate }],
                    opacity: photoViewerOpacity,
                  },
                ]}
              >
                <Pressable style={styles.photoViewerBack} onPress={closePhotoViewer}>
                  <Text style={styles.photoViewerBackText}>Back</Text>
                </Pressable>
                <FlatList
                  ref={photoListRef}
                  data={currentPhotoList}
                  keyExtractor={(item, idx) => `${photoViewerHouseId || 'house'}-${idx}`}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(event) => {
                    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
                    setPhotoViewerIndex(nextIndex);
                  }}
                  directionalLockEnabled
                  renderItem={({ item }) => (
                    <View
                      style={[styles.photoViewerSlide, { width: screenWidth }]}
                    >
                      <Image
                        source={{ uri: item?.href || 'https://via.placeholder.com/600x400' }}
                        style={styles.photoViewerImage}
                        contentFit="contain"
                      />
                    </View>
                  )}
                />
                <Text style={styles.photoViewerCounter}>
                  {currentPhotoList.length ? `${photoViewerIndex + 1}/${currentPhotoList.length}` : '0/0'}
                </Text>
              </RNAnimated.View>
            </PanGestureHandler>
          </View>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
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
  homeButton: {
    marginBottom: 12,
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
  filterCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  filterRangeLabel: {
    marginTop: 6,
    fontSize: 14,
    color: '#4b5563',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  sliderLimit: {
    width: 60,
    fontSize: 12,
    color: '#6b7280',
  },
  sliderTrackContainer: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
  },
  sliderRange: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
    backgroundColor: '#111827',
  },
  sliderThumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  filterInputGroup: {
    flex: 1,
  },
  filterInputLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    fontSize: 14,
    color: '#111827',
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
  cardStack: {
    flex: 1,
    position: 'relative',
  },
  underCard: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.12,
    transform: [{ scale: 0.98 }, { translateY: 8 }],
  },
  cardScrollContent: {
    paddingBottom: 20,
  },
  cardBody: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 20,
  },
  photoViewerBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#000',
  },
  photoViewerDragLayer: {
    flex: 1,
  },
  photoViewerBack: {
    position: 'absolute',
    top: 60,
    left: 16,
    zIndex: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  photoViewerBackText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  photoViewerSlide: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  photoViewerImage: {
    width: '100%',
    height: '100%',
  },
  photoViewerCounter: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.4)',
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
    zIndex: 20,
  },
  likeBadge: {
    fontSize: 80,
  },
  dislikeBadgeContainer: {
    position: 'absolute',
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
