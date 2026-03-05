import { useState, useEffect, useCallback } from 'react';

export function usePolling(fetcher, intervalMs = 10000, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (signal) => {
    try {
      setError(null);
      const result = await fetcher(signal);
      if (signal?.aborted) return;
      setData(result);
    } catch (e) {
      if (e.name === 'AbortError') return;
      setError(e.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    const id = setInterval(() => {
      // Each poll gets its own controller so only the unmount abort matters
      load(controller.signal);
    }, intervalMs);
    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, [load, intervalMs]);

  const reload = useCallback(() => {
    const controller = new AbortController();
    load(controller.signal);
  }, [load]);

  return { data, loading, error, reload };
}
