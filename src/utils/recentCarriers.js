/**
 * Recent carriers (client-side, localStorage).
 * Each carrier: { id, name, lastUsedAt }.
 * Shows up to 5 most recently used; seeded with known carriers if empty.
 */

const STORAGE_KEY = 'shipment_recent_carriers';
const MAX_RECENT = 5;

const SEED_CARRIERS = [
  { id: 'carrier_weship', name: 'WeShip', lastUsedAt: 0 },
  { id: 'carrier_topcarrier', name: 'TopCarrier', lastUsedAt: 0 },
  { id: 'carrier_wwexpress', name: 'Worldwide Express', lastUsedAt: 0 },
];

export function getRecentCarriers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_CARRIERS;
    const list = JSON.parse(raw);
    const arr = Array.isArray(list) ? list : [];
    return arr.length > 0 ? arr : SEED_CARRIERS;
  } catch {
    return SEED_CARRIERS;
  }
}

export function addRecentCarrier(carrier) {
  const name = (carrier?.name || '').trim();
  if (!name) return getRecentCarriers();
  const now = Date.now();
  let list = getRecentCarriers();
  const existing = list.find((c) => (c.name || '').toLowerCase() === name.toLowerCase());
  if (existing) {
    list = list.filter((c) => (c.name || '').toLowerCase() !== name.toLowerCase());
  }
  const entry = {
    id: carrier?.id || `carrier_${now}`,
    name,
    lastUsedAt: now,
  };
  list = [entry, ...list].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('recentCarriers: localStorage set failed', e);
  }
  return list;
}

export function touchRecentCarrier(carrierName) {
  const name = (carrierName || '').trim();
  if (!name) return getRecentCarriers();
  const list = getRecentCarriers();
  const found = list.find((c) => (c.name || '').toLowerCase() === name.toLowerCase());
  if (found) {
    found.lastUsedAt = Date.now();
    const rest = list.filter((c) => (c.name || '').toLowerCase() !== name.toLowerCase());
    const next = [found, ...rest].slice(0, MAX_RECENT);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('recentCarriers: localStorage set failed', e);
    }
    return next;
  }
  return list;
}
