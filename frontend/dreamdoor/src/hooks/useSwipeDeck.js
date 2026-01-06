import { useEffect, useMemo, useRef, useState } from 'react';

export default function useSwipeDeck({
  houses,
  savedIds,
  savedOverrideIds,
  setSavedOverrideIds,
  appliedFilterMin,
  appliedFilterMax,
  appliedFilterHomeTypes,
  appliedFilterBeds,
  appliedFilterBaths,
}) {
  const [index, setIndex] = useState(0);
  const [likedIds, setLikedIds] = useState(new Set());
  const [dislikedIds, setDislikedIds] = useState(new Set());
  const [pendingLikeId, setPendingLikeId] = useState(null);
  const [pendingDislikeId, setPendingDislikeId] = useState(null);
  const [history, setHistory] = useState([]);
  const [seenByFilterKey, setSeenByFilterKey] = useState(new Map());
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
  const emptySeenIds = useRef(new Set());

  useEffect(() => {
    if (seenByFilterKey instanceof Map) return;
    setSeenByFilterKey(new Map());
  }, [seenByFilterKey]);

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
  };

  const undoSwipe = () => {
    if (history.length === 0) return;
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
    setIndex(last.index ?? 0);
  };

  return {
    index,
    setIndex,
    history,
    setHistory,
    likedIds,
    dislikedIds,
    pendingLikeId,
    pendingDislikeId,
    setPendingLikeId,
    setPendingDislikeId,
    swipeHouses,
    filteredHouses,
    preferenceProfile,
    updatePreferencesFromLike,
    updatePreferencesFromDislike,
    handleSwipeComplete,
    undoSwipe,
    forcedHouseId,
    forcedHouseIndex,
    setForcedHouseId,
    setForcedHouseIndex,
    lockedDeckIds,
    lockedUntilHouseId,
    setLockedDeckIds,
    setLockedUntilHouseId,
    seenByFilterKey,
    setSeenByFilterKey,
    markHouseSeen,
    unmarkHouseSeen,
    appliedFilterKey,
  };
}
