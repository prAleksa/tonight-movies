const KEY = 'tonight-favorites-v1';

export function getFavorites() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.map(Number) : [];
  } catch {
    return [];
  }
}

export function isFavorite(id) {
  return getFavorites().includes(Number(id));
}

export function toggleFavorite(id) {
  const n = Number(id);
  const set = new Set(getFavorites());
  if (set.has(n)) set.delete(n);
  else set.add(n);
  const next = [...set];
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
