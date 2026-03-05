import { useState, useEffect, useCallback } from 'react';

export function useApi(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (signal) => {
    try {
      setLoading(true);
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
    return () => controller.abort();
  }, [load]);

  const reload = useCallback(() => {
    const controller = new AbortController();
    load(controller.signal);
  }, [load]);

  return { data, loading, error, reload };
}
