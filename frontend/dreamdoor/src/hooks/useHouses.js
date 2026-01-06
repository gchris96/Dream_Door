import { useCallback, useEffect, useState } from 'react';
import { houseService } from '../services/houseService';

const normalizeResults = (data) => (Array.isArray(data?.results) ? data.results : data || []);

export default function useHouses() {
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const loadHouses = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(false);
    try {
      const data = await houseService.fetchDeck();
      setHouses(normalizeResults(data));
    } catch (err) {
      setError(true);
      console.error('API error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHouses(false);
  }, [loadHouses]);

  return {
    houses,
    loading,
    refreshing,
    error,
    reload: () => loadHouses(false),
    refresh: () => loadHouses(true),
  };
}
