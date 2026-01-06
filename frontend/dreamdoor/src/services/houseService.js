const API_BASE = 'https://dreamdoor-production.up.railway.app';

const parseJson = async (res) => {
  if (!res.ok) {
    const bodyText = await res.text();
    const error = new Error(`API error: ${res.status}`);
    error.bodyText = bodyText;
    error.status = res.status;
    throw error;
  }
  return res.json();
};

export const houseService = {
  async fetchDeck() {
    const res = await fetch(`${API_BASE}/api/deck/`);
    return parseJson(res);
  },
  async fetchSaved() {
    const res = await fetch(`${API_BASE}/api/saved/`);
    return parseJson(res);
  },
  async fetchHouseDetail(id) {
    const res = await fetch(`${API_BASE}/api/houses/${id}/detail/`);
    return parseJson(res);
  },
  async fetchHousePhotos(id) {
    const res = await fetch(`${API_BASE}/api/houses/${id}/photos/`);
    return parseJson(res);
  },
  likeHouse(id) {
    return fetch(`${API_BASE}/api/houses/${id}/like/`, { method: 'POST' });
  },
  dislikeHouse(id) {
    return fetch(`${API_BASE}/api/houses/${id}/dislike/`, { method: 'POST' });
  },
  saveHouse(id) {
    return fetch(`${API_BASE}/api/houses/${id}/save/`, { method: 'POST' });
  },
  unsaveHouse(id) {
    return fetch(`${API_BASE}/api/houses/${id}/unsave/`, { method: 'DELETE' });
  },
};

export { API_BASE };
