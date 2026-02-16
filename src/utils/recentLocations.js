/**
 * Recent Ship From / Ship To locations (client-side, localStorage).
 * Each location: { id, name, address, lastUsedAt }.
 * Display value sent to API: "Name - Address" (or just name if no address).
 */

const STORAGE_KEY = 'shipment_recent_locations';
const MAX_RECENT = 5;

export function getRecentLocations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function addRecentLocation(location) {
  const { id, name, address } = location;
  const fullDisplay = formatLocationDisplay(name, address);
  const now = Date.now();
  let list = getRecentLocations();
  const existing = list.find((loc) => loc.id === id || formatLocationDisplay(loc.name, loc.address) === fullDisplay);
  if (existing) {
    list = list.filter((loc) => loc.id !== existing.id && formatLocationDisplay(loc.name, loc.address) !== fullDisplay);
  }
  const entry = {
    id: id || `loc_${now}`,
    name: name || '',
    address: address || '',
    lastUsedAt: now,
  };
  list = [entry, ...list].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('recentLocations: localStorage set failed', e);
  }
  return list;
}

export function touchRecentLocation(location) {
  const fullDisplay = typeof location === 'string' ? location : formatLocationDisplay(location?.name, location?.address);
  const list = getRecentLocations();
  const found = list.find((loc) => formatLocationDisplay(loc.name, loc.address) === fullDisplay);
  if (found) {
    found.lastUsedAt = Date.now();
    const rest = list.filter((l) => formatLocationDisplay(l.name, l.address) !== fullDisplay);
    const next = [found, ...rest].slice(0, MAX_RECENT);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('recentLocations: localStorage set failed', e);
    }
    return next;
  }
  return list;
}

export function formatLocationDisplay(name, address) {
  const n = (name || '').trim();
  const a = (address || '').trim();
  if (!n && !a) return '';
  if (!a) return n;
  if (!n) return a;
  return `${n} - ${a}`;
}

export function parseLocationDisplay(displayValue) {
  if (!displayValue || typeof displayValue !== 'string') return { name: '', address: '' };
  const idx = displayValue.indexOf(' - ');
  if (idx === -1) return { name: displayValue.trim(), address: '' };
  return {
    name: displayValue.slice(0, idx).trim(),
    address: displayValue.slice(idx + 3).trim(),
  };
}
