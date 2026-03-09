import { useState, useCallback, useRef } from 'react';
import { api } from '../lib/api';

/**
 * useAIInvoke()
 * Provides invoke(pluginId, affordanceId, context) → Promise<string>
 * with loading and error state.
 */
export function useAIInvoke() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Per-key result cache: key = `${pluginId}:${affordanceId}:${context}`
  const cache = useRef({});

  const invoke = useCallback(async (pluginId, affordanceId, context) => {
    const key = `${pluginId}:${affordanceId}:${context}`;
    if (cache.current[key] !== undefined) return cache.current[key];

    setLoading(true);
    setError(null);
    try {
      const res = await api.invokePlugin(pluginId, { affordanceId, context });
      const result = res?.result ?? '';
      cache.current[key] = result;
      return result;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { invoke, loading, error };
}
