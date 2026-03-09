import { useState, useEffect } from 'react';
import { api } from '../lib/api';

// Simple module-level cache so all consumers share the same fetch
let _cache = null;
let _pending = null;

async function fetchAffordances() {
  if (_cache) return _cache;
  if (_pending) return _pending;
  _pending = api.uiAffordances().then(res => {
    _cache = res?.affordances || [];
    _pending = null;
    return _cache;
  }).catch(() => {
    _pending = null;
    return [];
  });
  return _pending;
}

// Invalidate cache so next call re-fetches (e.g. after plugin toggle)
export function invalidateAffordancesCache() {
  _cache = null;
}

/**
 * useAffordances(target)
 * Returns all active affordances for a given target (e.g. "task-card").
 * Returns [] gracefully if the API is not ready.
 */
export function useAffordances(target) {
  const [affordances, setAffordances] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchAffordances().then(all => {
      if (cancelled) return;
      setAffordances(target ? all.filter(a => a.target === target) : all);
    });
    return () => { cancelled = true; };
  }, [target]);

  return affordances;
}
