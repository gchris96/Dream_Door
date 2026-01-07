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
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useFonts, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Gesture, GestureDetector, GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
  Extrapolate,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

export default function App() {
  const API_BASE = 'https://dreamdoor-production.up.railway.app';
  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
  });
  const [screen, setScreen] = useState('home');
  const [houses, setHouses] = useState([]);
  const [index, setIndex] = useState(0);
  const [likedIds, setLikedIds] = useState(new Set());
  const [dislikedIds, setDislikedIds] = useState(new Set());
  const [savedIds, setSavedIds] = useState(new Set());
  const [seenByFilterKey, setSeenByFilterKey] = useState(new Map());
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
  const [filterHomeTypes, setFilterHomeTypes] = useState([]);
  const [appliedFilterHomeTypes, setAppliedFilterHomeTypes] = useState([]);
  const [filterBeds, setFilterBeds] = useState(null);
  const [filterBaths, setFilterBaths] = useState(null);
  const [appliedFilterBeds, setAppliedFilterBeds] = useState(null);
  const [appliedFilterBaths, setAppliedFilterBaths] = useState(null);
  const [preferenceProfile, setPreferenceProfile] = useState({
    price: null,
    beds: null,
    baths: null,
    sqft: null,
    yearBuilt: null,
    typeWeights: {},
    dislikePriceCenters: [],
    dislikeTypeWeights: {},
    dislikeBeds: {},
    dislikeBaths: {},
  });
  const [preferenceVersion, setPreferenceVersion] = useState(0);
  const [forcedHouseId, setForcedHouseId] = useState(null);
  const [forcedHouseIndex, setForcedHouseIndex] = useState(null);
  const [lockedDeckIds, setLockedDeckIds] = useState(null);
  const [lockedUntilHouseId, setLockedUntilHouseId] = useState(null);
  const [filterLists, setFilterLists] = useState([]);
  const [activeFilterListId, setActiveFilterListId] = useState('all');
  const [showLists, setShowLists] = useState(true);
  const [filterReturnTo, setFilterReturnTo] = useState(null);
  const [showFilterPrompt, setShowFilterPrompt] = useState(false);
  const [filterTrackWidth, setFilterTrackWidth] = useState(0);
  const [housesError, setHousesError] = useState(false);
  const [isLoadingHouses, setIsLoadingHouses] = useState(true);
  const [isRefreshingHouses, setIsRefreshingHouses] = useState(false);

  const emptySeenIds = useRef(new Set());

  useEffect(() => {
    if (seenByFilterKey instanceof Map) return;
    setSeenByFilterKey(new Map());
  }, [seenByFilterKey]);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const swipeLocked = useSharedValue(false);
  const currentHouseId = useSharedValue(null);

  const savedToastOpacity = useRef(new RNAnimated.Value(0)).current;
  const savedToastTranslate = useRef(new RNAnimated.Value(20)).current;
  const photoViewerTranslate = useRef(new RNAnimated.Value(0)).current;
  const photoViewerOpacity = useRef(new RNAnimated.Value(1)).current;
  const photoListRef = useRef(null);
  const filterTrackRef = useRef(null);
  const filterTrackX = useRef(0);
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const homeTypeOptions = useMemo(() => {
    const options = new Set();
    houses.forEach((house) => {
      if (house?.property_type) {
        options.add(String(house.property_type));
      }
    });
    return Array.from(options);
  }, [houses]);


  const appliedFilterKey = useMemo(() => {
    const types = [...appliedFilterHomeTypes].sort().join(',');
    const beds = appliedFilterBeds ?? 'any';
    const baths = appliedFilterBaths ?? 'any';
    return `min:${appliedFilterMin}|max:${appliedFilterMax}|types:${types}|beds:${beds}|baths:${baths}`;
  }, [appliedFilterMin, appliedFilterMax, appliedFilterHomeTypes, appliedFilterBeds, appliedFilterBaths]);

  const seenKey = appliedFilterKey;
  const seenIds = useMemo(() => {
    if (!(seenByFilterKey instanceof Map)) {
      return emptySeenIds.current;
    }
    return seenByFilterKey.get(seenKey) || emptySeenIds.current;
  }, [seenByFilterKey, seenKey]);

  const filteredHouses = useMemo(() => {
    return houses.filter((house) => {
      const price = typeof house.price === 'number' ? house.price : Number(house.price);
      if (Number.isNaN(price)) return false;
      const bedsValue = typeof house.beds === 'number' ? house.beds : Number(house.beds);
      const bathsValue = typeof house.baths === 'number' ? house.baths : Number(house.baths);
      const bedsCount = Number.isNaN(bedsValue) ? 0 : bedsValue;
      const bathsCount = Number.isNaN(bathsValue) ? 0 : bathsValue;
      const matchesPrice = price >= appliedFilterMin && price <= appliedFilterMax;
      const matchesType =
        appliedFilterHomeTypes.length === 0 ||
        appliedFilterHomeTypes.includes(String(house?.property_type));
      const matchesBeds = appliedFilterBeds === null || bedsCount >= appliedFilterBeds;
      const matchesBaths = appliedFilterBaths === null || bathsCount >= appliedFilterBaths;
      return matchesPrice && matchesType && matchesBeds && matchesBaths;
    });
  }, [houses, appliedFilterMin, appliedFilterMax, appliedFilterHomeTypes, appliedFilterBeds, appliedFilterBaths]);
  const baseDeck = useMemo(
    () =>
      filteredHouses.filter((house) => {
        const isSavedFiltered = savedIds.has(house.id) && !savedOverrideIds.has(house.id);
        const isReplayHouse = lockedDeckIds?.includes(house.id);
        const isSeen = seenIds.has(house.id);
        return !isSavedFiltered && (!isSeen || isReplayHouse);
      }),
    [filteredHouses, savedIds, savedOverrideIds, seenIds, lockedDeckIds]
  );
  const swipeHouses = useMemo(() => {
    const {
      price,
      beds,
      baths,
      sqft,
      yearBuilt,
      typeWeights,
      dislikePriceCenters,
      dislikeTypeWeights,
      dislikeBeds,
      dislikeBaths,
    } = preferenceProfile;
    const hasPrefs =
      price !== null ||
      beds !== null ||
      baths !== null ||
      sqft !== null ||
      yearBuilt !== null ||
      Object.keys(typeWeights).length > 0 ||
      dislikePriceCenters.length > 0 ||
      Object.keys(dislikeTypeWeights).length > 0 ||
      Object.keys(dislikeBeds).length > 0 ||
      Object.keys(dislikeBaths).length > 0;
    const scored = (() => {
      if (!hasPrefs) return baseDeck;

      const scoreHouse = (house) => {
        let score = 0;
        const priceValue = typeof house.price === 'number' ? house.price : Number(house.price);
        const bedsValue = typeof house.beds === 'number' ? house.beds : Number(house.beds);
        const bathsValue = typeof house.baths === 'number' ? house.baths : Number(house.baths);
        const sqftValue = typeof house.sqft === 'number' ? house.sqft : Number(house.sqft);
        const yearValue = typeof house.year_built === 'number' ? house.year_built : Number(house.year_built);
        const typeValue = house?.property_type ? String(house.property_type) : null;

        if (!Number.isNaN(priceValue) && price !== null) {
          const delta = Math.abs(priceValue - price) / price;
          if (delta <= 0.15) score += 2;
          else if (delta <= 0.3) score += 1;
        }

        if (!Number.isNaN(bedsValue) && beds !== null) {
          const diff = Math.abs(bedsValue - beds);
          if (diff <= 0.5) score += 1;
          else if (diff >= 2) score -= 0.5;
        }

        if (!Number.isNaN(bathsValue) && baths !== null) {
          const diff = Math.abs(bathsValue - baths);
          if (diff <= 0.5) score += 1;
          else if (diff >= 2) score -= 0.5;
        }

        if (!Number.isNaN(sqftValue) && sqft !== null) {
          const delta = Math.abs(sqftValue - sqft) / sqft;
          if (delta <= 0.2) score += 1;
        }

        if (!Number.isNaN(yearValue) && yearBuilt !== null) {
          const delta = Math.abs(yearValue - yearBuilt);
          if (delta <= 5) score += 0.5;
        }

        if (typeValue && typeWeights[typeValue]) {
          score += Math.min(2, typeWeights[typeValue] * 0.6);
        }

        if (!Number.isNaN(priceValue) && dislikePriceCenters.length > 0) {
          const isNearDisliked = dislikePriceCenters.some((center) => {
            return Math.abs(priceValue - center) / center <= 0.1;
          });
          if (isNearDisliked) score -= 2;
        }

        if (typeValue && dislikeTypeWeights[typeValue]) {
          score -= Math.min(2, dislikeTypeWeights[typeValue] * 0.6);
        }

        if (!Number.isNaN(bedsValue) && dislikeBeds[bedsValue]) {
          score -= 1;
        }

        if (!Number.isNaN(bathsValue) && dislikeBaths[bathsValue]) {
          score -= 1;
        }

        return score;
      };

      const jitter = (id) => {
        const seed = `${id}-${preferenceVersion}`;
        let hash = 0;
        for (let i = 0; i < seed.length; i += 1) {
          hash = (hash << 5) - hash + seed.charCodeAt(i);
          hash |= 0;
        }
        const normalized = (hash % 1000) / 1000;
        return (normalized - 0.5) * 0.6;
      };

      const ranked = baseDeck
        .map((house, order) => ({
          house,
          order,
          score: scoreHouse(house),
          jitter: jitter(house.id ?? order),
        }))
        .sort((a, b) => {
          const scoreDiff = b.score + b.jitter - (a.score + a.jitter);
          if (scoreDiff !== 0) return scoreDiff;
          return a.order - b.order;
        })
        .map((entry) => entry.house);

      return ranked.length ? ranked : baseDeck;
    })();

    let ordered = scored;
    if (lockedDeckIds && lockedDeckIds.length > 0) {
      const mapById = new Map(scored.map((house) => [house.id, house]));
      const lockedOrdered = lockedDeckIds
        .map((id) => mapById.get(id))
        .filter(Boolean);
      const remaining = scored.filter((house) => !lockedDeckIds.includes(house.id));
      ordered = [...lockedOrdered, ...remaining];
    }

    if (!forcedHouseId) {
      return ordered;
    }

    const forcedHouse = ordered.find((house) => house.id === forcedHouseId);
    if (!forcedHouse) return ordered;
    const withoutForced = ordered.filter((house) => house.id !== forcedHouseId);
    const insertAt = Math.max(0, Math.min(forcedHouseIndex ?? 0, withoutForced.length));
    return [
      ...withoutForced.slice(0, insertAt),
      forcedHouse,
      ...withoutForced.slice(insertAt),
    ];
  }, [
    baseDeck,
    preferenceProfile,
    preferenceVersion,
    forcedHouseId,
    forcedHouseIndex,
    lockedDeckIds,
  ]);
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
  const loadHouses = async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshingHouses(true);
    } else {
      setIsLoadingHouses(true);
    }
    setHousesError(false);
    try {
      const res = await fetch(`${API_BASE}/api/deck/`);
      if (!res.ok) {
        const bodyText = await res.text();
        console.error('API error:', res.status, bodyText.slice(0, 200));
        setHousesError(true);
        return;
      }
      const data = await res.json();
      setHouses(data.results);
    } catch (e) {
      setHousesError(true);
      console.error('API error:', e);
    } finally {
      setIsLoadingHouses(false);
      setIsRefreshingHouses(false);
    }
  };

  useEffect(() => {
    loadHouses();
  }, []);

  useEffect(() => {
    if (screen !== 'saved') return;

    const loadSaved = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/saved/`);
        if (!res.ok) {
          const bodyText = await res.text();
          console.error('Saved API error:', res.status, bodyText.slice(0, 200));
          return;
        }
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

    fetch(`${API_BASE}/api/houses/${pendingLikeId}/like/`, {
      method: 'POST',
    }).catch(() => {});
  }, [pendingLikeId]);

  useEffect(() => {
    if (!pendingDislikeId) return;

    fetch(`${API_BASE}/api/houses/${pendingDislikeId}/dislike/`, {
      method: 'POST',
    }).catch(() => {});
  }, [pendingDislikeId]);

  useEffect(() => {
    if (screen !== 'swipe' && screen !== 'saved-detail') return;
    const current = screen === 'swipe' ? swipeHouses[index] : savedDetailHouse;
    if (!current || detailByHouseId[current.id]) return;

    fetch(`${API_BASE}/api/houses/${current.id}/detail/`)
      .then(async res => {
        if (res.ok) return res.json();
        const bodyText = await res.text();
        console.error('Detail API error:', res.status, bodyText.slice(0, 200));
        return null;
      })
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

    fetch(`${API_BASE}/api/houses/${current.id}/photos/`)
      .then(async res => {
        if (res.ok) return res.json();
        const bodyText = await res.text();
        console.error('Photos API error:', res.status, bodyText.slice(0, 200));
        return null;
      })
      .then(data => {
        if (!data) return;
        setPhotoByHouseId(prev => ({ ...prev, [current.id]: data }));
      })
      .catch(() => {});
  }, [screen, swipeHouses, index, savedDetailHouse, photoByHouseId]);

  useEffect(() => {
    if (screen !== 'saved' && screen !== 'liked' && screen !== 'disliked') return;
    const list = screen === 'saved' ? savedHouses : (screen === 'liked' ? likedHouses : dislikedHouses);
    list.forEach((house) => {
      if (!house || photoByHouseId[house.id]) return;
      fetch(`${API_BASE}/api/houses/${house.id}/photos/`)
        .then(async res => {
          if (res.ok) return res.json();
          const bodyText = await res.text();
          console.error('Photos API error:', res.status, bodyText.slice(0, 200));
          return null;
        })
        .then(data => {
          if (!data) return;
          setPhotoByHouseId(prev => ({ ...prev, [house.id]: data }));
        })
        .catch(() => {});
    });
  }, [screen, savedHouses, likedHouses, dislikedHouses, photoByHouseId]);

  const resetSwipePosition = () => {
    translateX.value = 0;
    translateY.value = 0;
    swipeLocked.value = false;
  };

  const resetDeckForFilters = ({ preserveSeen = true } = {}) => {
    setIndex(0);
    setHistory([]);
    if (!preserveSeen) {
      setSeenByFilterKey((prev) => {
        const next = new Map(prev);
        next.set(seenKey, new Set());
        return next;
      });
    }
    setForcedHouseId(null);
    setForcedHouseIndex(null);
    setLockedDeckIds(null);
    setLockedUntilHouseId(null);
    resetSwipePosition();
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
  const formatPriceCompact = (value) => {
    if (value >= 1000000) {
      const rounded = Math.round((value / 1000000) * 10) / 10;
      return `$${rounded}m`;
    }
    if (value >= 1000) {
      const rounded = Math.round(value / 1000);
      return `$${rounded}k`;
    }
    return `$${value}`;
  };
  const formatFilterTitle = (min, max, homeTypes, beds, baths) => {
    const maxLabel = max >= PRICE_MAX ? '$10M+' : formatPriceCompact(max);
    const typeLabel = Array.isArray(homeTypes) && homeTypes.length
      ? ` · ${homeTypes.length} types`
      : '';
    const bedsLabel = beds !== null ? ` · ${beds}+ bd` : '';
    const bathsLabel = baths !== null ? ` · ${baths}+ ba` : '';
    return `${formatPriceCompact(min)} - ${maxLabel}${typeLabel}${bedsLabel}${bathsLabel}`;
  };
  const toggleHomeType = (type) => {
    setFilterHomeTypes((prev) => {
      if (prev.includes(type)) {
        return prev.filter((item) => item !== type);
      }
      return [...prev, type];
    });
  };
  const ensureFilterList = (id, min, max, homeTypes, beds, baths) => {
    if (!id || id === 'all') return null;
    const title = formatFilterTitle(min, max, homeTypes, beds, baths);
    setFilterLists((prev) => {
      const exists = prev.some((item) => item.id === id);
      if (exists) {
        return prev.map((item) => (
          item.id === id ? { ...item, min, max, homeTypes, beds, baths, title } : item
        ));
      }
      return [...prev, { id, min, max, homeTypes, beds, baths, title }];
    });
    return id;
  };
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

  const updatePreferencesFromLike = (house) => {
    if (!house) return;
    setPreferenceProfile((prev) => {
      const next = { ...prev };
      const weight = 0.2;
      const setAvg = (key, value) => {
        if (value === null || Number.isNaN(value)) return;
        next[key] = next[key] === null ? value : next[key] * (1 - weight) + value * weight;
      };
      const priceValue = typeof house.price === 'number' ? house.price : Number(house.price);
      const bedsValue = typeof house.beds === 'number' ? house.beds : Number(house.beds);
      const bathsValue = typeof house.baths === 'number' ? house.baths : Number(house.baths);
      const sqftValue = typeof house.sqft === 'number' ? house.sqft : Number(house.sqft);
      const yearValue = typeof house.year_built === 'number' ? house.year_built : Number(house.year_built);
      setAvg('price', Number.isNaN(priceValue) ? null : priceValue);
      setAvg('beds', Number.isNaN(bedsValue) ? null : bedsValue);
      setAvg('baths', Number.isNaN(bathsValue) ? null : bathsValue);
      setAvg('sqft', Number.isNaN(sqftValue) ? null : sqftValue);
      setAvg('yearBuilt', Number.isNaN(yearValue) ? null : yearValue);

      if (house?.property_type) {
        const type = String(house.property_type);
        next.typeWeights = { ...next.typeWeights, [type]: (next.typeWeights[type] || 0) + 1 };
      }
      return next;
    });
    setPreferenceVersion((prev) => prev + 1);
  };

  const updatePreferencesFromDislike = (house) => {
    if (!house) return;
    setPreferenceProfile((prev) => {
      const next = { ...prev };
      const priceValue = typeof house.price === 'number' ? house.price : Number(house.price);
      if (!Number.isNaN(priceValue)) {
        next.dislikePriceCenters = [...next.dislikePriceCenters, priceValue].slice(-8);
      }
      if (house?.property_type) {
        const type = String(house.property_type);
        next.dislikeTypeWeights = {
          ...next.dislikeTypeWeights,
          [type]: (next.dislikeTypeWeights[type] || 0) + 1,
        };
      }
      const bedsValue = typeof house.beds === 'number' ? house.beds : Number(house.beds);
      if (!Number.isNaN(bedsValue)) {
        next.dislikeBeds = { ...next.dislikeBeds, [bedsValue]: (next.dislikeBeds[bedsValue] || 0) + 1 };
      }
      const bathsValue = typeof house.baths === 'number' ? house.baths : Number(house.baths);
      if (!Number.isNaN(bathsValue)) {
        next.dislikeBaths = { ...next.dislikeBaths, [bathsValue]: (next.dislikeBaths[bathsValue] || 0) + 1 };
      }
      return next;
    });
    setPreferenceVersion((prev) => prev + 1);
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

  const SWIPE_DISTANCE = Math.max(140, screenWidth * 0.28);
  const SWIPE_VELOCITY = 900;
  const SWIPE_SPRING = {
    damping: 20,
    stiffness: 180,
    mass: 0.9,
  };

  const markHouseSeen = (houseId) => {
    setSeenByFilterKey((prev) => {
      const next = new Map(prev);
      const current = new Set(next.get(seenKey) || []);
      current.add(houseId);
      next.set(seenKey, current);
      return next;
    });
  };

  const unmarkHouseSeen = (houseId) => {
    setSeenByFilterKey((prev) => {
      const next = new Map(prev);
      const current = new Set(next.get(seenKey) || []);
      current.delete(houseId);
      next.set(seenKey, current);
      return next;
    });
  };

  const handleSwipeComplete = (direction, houseId) => {
    const house = swipeHouses.find((item) => item.id === houseId);
    if (!house) {
      setIsAnimating(false);
      return;
    }
    const isForced = forcedHouseId && house.id === forcedHouseId;
    const isLockedTarget = lockedUntilHouseId && house.id === lockedUntilHouseId;
    const currentIndex = index;
    const isDislike = direction === 'left';
    if (isDislike) {
      setDislikedIds(prev => new Set(prev).add(house.id));
      setPendingDislikeId(house.id);
      updatePreferencesFromDislike(house);
    } else {
      setLikedIds(prev => new Set(prev).add(house.id));
      setPendingLikeId(house.id);
      updatePreferencesFromLike(house);
    }
    markHouseSeen(house.id);
    setHistory(prev => [
      ...prev,
      {
        index: currentIndex,
        houseId: house.id,
        likedAdded: !isDislike,
        dislikedAdded: isDislike,
      },
    ]);
    if (isLockedTarget) {
      setLockedDeckIds(null);
      setLockedUntilHouseId(null);
    }
    if (isForced) {
      setForcedHouseId(null);
      setForcedHouseIndex(null);
      setIndex(0);
    } else {
      setIndex(0);
    }
    resetSwipePosition();
    setIsAnimating(false);
  };

  const swipeOffScreen = (direction) => {
    if (isAnimating) return;
    const house = swipeHouses[index];
    if (!house) return;
    setIsAnimating(true);
    handleSwipeComplete(direction, house.id);
  };

  const likeCurrentHouse = () => {
    swipeOffScreen('right');
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
      fetch(`${API_BASE}/api/houses/${house.id}/unsave/`, {
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
      fetch(`${API_BASE}/api/houses/${house.id}/save/`, {
        method: 'POST',
      }).catch(() => {});
      setIsSaving(true);
      if (isSwipeContext && screen === 'swipe') {
        setIsAnimating(true);
        const isForced = forcedHouseId && house.id === forcedHouseId;
        const isLockedTarget = lockedUntilHouseId && house.id === lockedUntilHouseId;
        runToastAnimation('Saved!', () => {
          setSavedOverrideIds(prev => {
            const next = new Set(prev);
            next.delete(house.id);
            return next;
          });
          markHouseSeen(house.id);
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
          if (isLockedTarget) {
            setLockedDeckIds(null);
            setLockedUntilHouseId(null);
          }
          if (isForced) {
            setForcedHouseId(null);
            setForcedHouseIndex(null);
            setIndex(0);
          } else {
            setIndex(0);
          }
          resetSwipePosition();
          setIsSaving(false);
          setIsAnimating(false);
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
    if (last?.houseId) {
      setForcedHouseId(last.houseId);
      setForcedHouseIndex(last.index ?? 0);
      setLockedDeckIds(swipeHouses.map((house) => house.id));
      setLockedUntilHouseId(last.houseId);
    }
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
    if (last?.houseId) {
      unmarkHouseSeen(last.houseId);
    }
    resetSwipePosition();
    setIndex(last.index ?? 0);
  };

  const activeHouseId = swipeHouses[index]?.id ?? null;

  useEffect(() => {
    currentHouseId.value = activeHouseId;
  }, [activeHouseId]);

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
      const shouldSwipe = absX > SWIPE_DISTANCE || absVelocity > SWIPE_VELOCITY;
      if (shouldSwipe) {
        swipeLocked.value = true;
        runOnJS(setIsAnimating)(true);
        const direction = translateX.value >= 0 ? 1 : -1;
        const targetX = direction * (screenWidth + 80);
        const houseId = currentHouseId.value;
        if (!houseId) {
          swipeLocked.value = false;
          translateX.value = withSpring(0, { ...SWIPE_SPRING, velocity: event.velocityX });
          translateY.value = withSpring(0, { ...SWIPE_SPRING, velocity: event.velocityY });
          return;
        }
        translateX.value = withSpring(
          targetX,
          { ...SWIPE_SPRING, velocity: event.velocityX },
          (finished) => {
            if (finished) {
              runOnJS(handleSwipeComplete)(direction > 0 ? 'right' : 'left', houseId);
            }
          }
        );
        translateY.value = withSpring(0, { ...SWIPE_SPRING, velocity: event.velocityY });
      } else {
        translateX.value = withSpring(0, { ...SWIPE_SPRING, velocity: event.velocityX });
        translateY.value = withSpring(0, { ...SWIPE_SPRING, velocity: event.velocityY });
      }
    });

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
          <Text
            style={[
              styles.homeTitle,
              fontsLoaded ? styles.homeTitlePoppins : styles.homeTitleFallback,
            ]}
          >
            Dream Door
          </Text>
          <Image
            source={require('./assets/images/dream-door-house.png')}
            style={styles.homeHeroImage}
            contentFit="contain"
          />
          <Pressable
            style={[styles.primaryButton, styles.homeButton]}
            onPress={() => {
            setAppliedFilterMin(PRICE_MIN);
            setAppliedFilterMax(PRICE_MAX);
            setAppliedFilterHomeTypes([]);
            setAppliedFilterBeds(null);
            setAppliedFilterBaths(null);
            setFilterMin(PRICE_MIN);
            setFilterMax(PRICE_MAX);
            setFilterHomeTypes([]);
            setFilterBeds(null);
            setFilterBaths(null);
            setFilterMinInput(String(PRICE_MIN));
            setFilterMaxInput(String(PRICE_MAX));
            setActiveFilterListId('all');
            setScreen('swipe');
          }}
        >
          <Text style={styles.primaryButtonText}>Browse All Homes</Text>
        </Pressable>
        {filterLists.length === 0 ? (
          <Pressable
            style={[styles.secondaryButton, styles.homeButton, styles.listButton]}
            onPress={() => {
              setFilterReturnTo(null);
              setScreen('filters');
            }}
          >
            <Text style={styles.secondaryButtonText}>New List</Text>
          </Pressable>
        ) : (
          <View style={styles.listDropdown}>
            <Pressable
              style={[styles.listDropdownHeader, styles.listButton]}
              onPress={() => setShowLists(prev => !prev)}
            >
              <Text style={styles.listDropdownTitle}>Your Lists</Text>
              <Text style={styles.listDropdownChevron}>{showLists ? '▲' : '▼'}</Text>
            </Pressable>
            {showLists && (
              <View style={styles.listDropdownBody}>
                <Pressable
                  style={[styles.secondaryButton, styles.homeButton, styles.listButton]}
                  onPress={() => {
                    setFilterReturnTo(null);
                    setScreen('filters');
                  }}
                >
                  <Text style={styles.secondaryButtonText}>New List</Text>
                </Pressable>
                <View style={styles.listDropdownDivider} />
                {filterLists.map((item) => (
                  <Pressable
                    key={item.id}
                    style={[styles.secondaryButton, styles.homeButton, styles.listButton]}
                    onPress={() => {
                      setAppliedFilterMin(item.min);
                      setAppliedFilterMax(item.max);
                      setAppliedFilterHomeTypes(item.homeTypes || []);
                      setAppliedFilterBeds(item.beds ?? null);
                      setAppliedFilterBaths(item.baths ?? null);
                      setActiveFilterListId(item.id);
                      resetDeckForFilters();
                      setScreen('swipe');
                    }}
                  >
                    <Text style={styles.secondaryButtonText}>{item.title}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
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
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            <Pressable
              style={styles.backButton}
              onPress={() => {
                setShowFilterPrompt(false);
                setScreen(filterReturnTo || 'home');
              }}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
            <Text style={styles.sectionTitle}>Filter Homes</Text>
            <View style={styles.filterGroup}>
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
                  testID="filter-min-input"
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
                  testID="filter-max-input"
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
              <View style={styles.filterCard}>
            <Text style={styles.filterLabel}>Home Type</Text>
            <View style={styles.filterChipRow}>
              {homeTypeOptions.map((type) => {
                const label = String(type).replace(/_/g, ' ');
                const isActive = filterHomeTypes.includes(type);
                return (
                  <Pressable
                    key={type}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                    onPress={() => toggleHomeType(type)}
                  >
                    <Text
                      style={[styles.filterChipText, isActive && styles.filterChipTextActive]}
                    >
                      {isActive ? '✓ ' : ''}{label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
              <View style={styles.filterCard}>
            <Text style={styles.filterLabel}>Bedrooms</Text>
            <View style={styles.filterChipRow}>
              {[null, 1, 2, 3, 4, 5].map((value) => {
                const isActive = filterBeds === value;
                const label = value === null ? 'Any' : `${value}+`;
                return (
                  <Pressable
                    key={`beds-${value ?? 'any'}`}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                    onPress={() => setFilterBeds(value)}
                  >
                    <Text
                      style={[styles.filterChipText, isActive && styles.filterChipTextActive]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
              <View style={styles.filterCard}>
            <Text style={styles.filterLabel}>Bathrooms</Text>
            <View style={styles.filterChipRow}>
              {[null, 1, 2, 3, 4, 5].map((value) => {
                const isActive = filterBaths === value;
                const label = value === null ? 'Any' : `${value}+`;
                return (
                  <Pressable
                    key={`baths-${value ?? 'any'}`}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                    onPress={() => setFilterBaths(value)}
                  >
                    <Text
                      style={[styles.filterChipText, isActive && styles.filterChipTextActive]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
              </View>
            </View>
          </ScrollView>
          <View style={styles.filterFooter}>
            <Pressable
              style={styles.primaryButton}
              onPress={() => {
                if (filterReturnTo === 'swipe' && activeFilterListId !== 'all') {
                  setShowFilterPrompt(true);
                  return;
                }
                const nextId = `custom-${Date.now()}`;
                setAppliedFilterMin(filterMin);
                setAppliedFilterMax(filterMax);
                setAppliedFilterHomeTypes(filterHomeTypes);
                setAppliedFilterBeds(filterBeds);
                setAppliedFilterBaths(filterBaths);
                if (filterReturnTo === 'swipe' && activeFilterListId === 'all') {
                  setActiveFilterListId('all');
                } else {
                  setActiveFilterListId(nextId);
                  setFilterLists((prev) => [
                    ...prev,
                    {
                      id: nextId,
                      min: filterMin,
                      max: filterMax,
                      homeTypes: filterHomeTypes,
                      beds: filterBeds,
                      baths: filterBaths,
                      title: formatFilterTitle(filterMin, filterMax, filterHomeTypes, filterBeds, filterBaths),
                    },
                  ]);
                }
                resetDeckForFilters();
                setFilterReturnTo(null);
                setScreen('swipe');
              }}
            >
              <Text style={styles.primaryButtonText}>Apply Filters</Text>
            </Pressable>
          </View>
        </View>
        <Modal
          transparent
          animationType="fade"
          visible={showFilterPrompt}
          onRequestClose={() => setShowFilterPrompt(false)}
        >
          <Pressable
            style={styles.filterPromptOverlay}
            onPress={() => setShowFilterPrompt(false)}
          >
            <View style={styles.filterPromptCard}>
              <Text style={styles.filterPromptText}>
                Update current list or create a new one?
              </Text>
              <View style={styles.filterPromptActions}>
                <Pressable
                  style={[styles.secondaryButton, styles.listButton, styles.filterPromptButton]}
                onPress={() => {
                  setAppliedFilterMin(filterMin);
                  setAppliedFilterMax(filterMax);
                  setAppliedFilterHomeTypes(filterHomeTypes);
                  setAppliedFilterBeds(filterBeds);
                  setAppliedFilterBaths(filterBaths);
                  ensureFilterList(activeFilterListId, filterMin, filterMax, filterHomeTypes, filterBeds, filterBaths);
                  setShowFilterPrompt(false);
                  resetDeckForFilters();
                  setFilterReturnTo(null);
                  runToastAnimation('List updated ✓');
                  setScreen('swipe');
                }}
              >
                <Text style={styles.secondaryButtonText}>Update</Text>
              </Pressable>
                <Pressable
                  style={[styles.secondaryButton, styles.listButton, styles.filterPromptButton]}
                onPress={() => {
                  const nextId = `custom-${Date.now()}`;
                  setAppliedFilterMin(filterMin);
                  setAppliedFilterMax(filterMax);
                  setAppliedFilterHomeTypes(filterHomeTypes);
                  setAppliedFilterBeds(filterBeds);
                  setAppliedFilterBaths(filterBaths);
                  setActiveFilterListId(nextId);
                  setFilterLists((prev) => [
                    ...prev,
                    {
                      id: nextId,
                      min: filterMin,
                      max: filterMax,
                      homeTypes: filterHomeTypes,
                      beds: filterBeds,
                      baths: filterBaths,
                      title: formatFilterTitle(filterMin, filterMax, filterHomeTypes, filterBeds, filterBaths),
                    },
                  ]);
                  setShowFilterPrompt(false);
                  resetDeckForFilters();
                  setFilterReturnTo(null);
                  runToastAnimation('New list created!');
                  setScreen('swipe');
                }}
              >
                <Text style={styles.secondaryButtonText}>Create New</Text>
              </Pressable>
              </View>
            </View>
          </Pressable>
        </Modal>
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
                      fetch(`${API_BASE}/api/houses/${item.id}/unsave/`, {
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

  if (housesError) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <ScrollView
          contentContainerStyle={[styles.container, styles.center]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshingHouses}
              onRefresh={() => loadHouses(true)}
            />
          }
        >
          <Pressable
            style={styles.backButton}
            onPress={() => setScreen('home')}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <Text style={styles.endText}>
            Couldn't load houses. Pull to retry.
          </Text>
        </ScrollView>
      </GestureHandlerRootView>
    );
  }

  if (!isLoadingHouses && filteredHouses.length === 0 && houses.length > 0) {
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
            No houses in this range
          </Text>
          <Pressable
            style={[styles.secondaryButton, styles.homeButton]}
            onPress={() => {
              setFilterMin(appliedFilterMin);
              setFilterMax(appliedFilterMax);
              setFilterMinInput(String(appliedFilterMin));
              setFilterMaxInput(String(appliedFilterMax));
              setFilterHomeTypes(appliedFilterHomeTypes);
              setFilterBeds(appliedFilterBeds);
              setFilterBaths(appliedFilterBaths);
              setFilterReturnTo('swipe');
              setShowFilterPrompt(false);
              setScreen('filters');
            }}
          >
            <Text style={styles.secondaryButtonText}>Modify Filters</Text>
          </Pressable>
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
            No more homes. Modify filters to show more.
          </Text>
          <Pressable
            style={[styles.secondaryButton, styles.homeButton]}
            onPress={() => {
              setFilterMin(appliedFilterMin);
              setFilterMax(appliedFilterMax);
              setFilterMinInput(String(appliedFilterMin));
              setFilterMaxInput(String(appliedFilterMax));
              setFilterHomeTypes(appliedFilterHomeTypes);
              setFilterBeds(appliedFilterBeds);
              setFilterBaths(appliedFilterBaths);
              setFilterReturnTo('swipe');
              setShowFilterPrompt(false);
              setScreen('filters');
            }}
          >
            <Text style={styles.secondaryButtonText}>Modify Filters</Text>
          </Pressable>
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
  const activeListTitle = activeFilterListId !== 'all'
    ? (filterLists.find((item) => item.id === activeFilterListId)?.title ||
        formatFilterTitle(appliedFilterMin, appliedFilterMax, appliedFilterHomeTypes, appliedFilterBeds, appliedFilterBaths))
    : formatFilterTitle(appliedFilterMin, appliedFilterMax, appliedFilterHomeTypes, appliedFilterBeds, appliedFilterBaths);

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={[styles.container, styles.swipeContainer]}>
        <View style={styles.swipeHeaderContainer}>
          <View style={styles.swipeHeader}>
            <Pressable
              style={[styles.backButton, styles.backButtonInline]}
              onPress={() => setScreen('home')}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
            <Text style={styles.swipeFilterLabel} numberOfLines={1}>
              {activeListTitle}
            </Text>
            <Pressable
              style={styles.filterButton}
              onPress={() => {
                setFilterMin(appliedFilterMin);
                setFilterMax(appliedFilterMax);
                setFilterMinInput(String(appliedFilterMin));
                setFilterMaxInput(String(appliedFilterMax));
                setFilterHomeTypes(appliedFilterHomeTypes);
                setFilterBeds(appliedFilterBeds);
                setFilterBaths(appliedFilterBaths);
                setFilterReturnTo('swipe');
                setShowFilterPrompt(false);
                setScreen('filters');
              }}
            >
              <Text style={styles.filterButtonText}>Filter</Text>
            </Pressable>
          </View>
        </View>
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
              {renderHouseScrollContent(nextHouse, nextMeta, { allowImagePress: false, allowSave: false })}
            </View>
          )}
          {process.env.NODE_ENV === 'test' && (
            <Pressable
              testID="test-like"
              onPress={likeCurrentHouse}
              style={styles.testHiddenButton}
            />
          )}
          <GestureDetector gesture={swipeGesture}>
            <Animated.View
              testID="swipe-card"
              style={[styles.card, cardAnimatedStyle]}
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
            </Animated.View>
          </GestureDetector>
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
    fontSize: 40,
    color: '#1f2933',
    marginBottom: 18,
  },
  homeTitlePoppins: {
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  homeTitleFallback: {
    fontWeight: '700',
  },
  homeHeroImage: {
    width: '60%',
    maxWidth: 260,
    aspectRatio: 1,
    marginBottom: 32,
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
  backButtonInline: {
    marginBottom: 0,
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
  filterGroup: {
    backgroundColor: '#eef2f7',
    borderRadius: 18,
    padding: 12,
    marginBottom: 16,
  },
  filterScrollContent: {
    paddingBottom: 24,
  },
  filterFooter: {
    paddingTop: 12,
    paddingBottom: 8,
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
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  filterChipActive: {
    borderColor: '#111827',
    backgroundColor: '#111827',
  },
  filterChipText: {
    fontSize: 13,
    color: '#374151',
    textTransform: 'capitalize',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  filterPromptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  filterPromptCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  filterPromptActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  filterPromptButton: {
    flex: 1,
  },
  filterPromptText: {
    fontSize: 14,
    color: '#374151',
  },
  swipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  swipeHeaderContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  swipeFilterLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: '#374151',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#111827',
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listDropdown: {
    width: '100%',
    marginBottom: 12,
  },
  listDropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
  },
  listDropdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  listDropdownChevron: {
    fontSize: 14,
    color: '#111827',
  },
  listDropdownBody: {
    marginTop: 10,
  },
  listDropdownDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  listButton: {
    paddingVertical: 10,
    borderRadius: 10,
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
  testHiddenButton: {
    width: 1,
    height: 1,
    opacity: 0,
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
