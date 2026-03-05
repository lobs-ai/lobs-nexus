import { useState, useEffect, useCallback, useRef } from 'react';

export function usePolling(fetcher, intervalMs = 10000, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const inflightRef = useRef(null);

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
    // Cancel any previous in-flight request before starting a new poll cycle
    const startPoll = () => {
      if (inflightRef.current) inflightRef.current.abort();
      const controller = new AbortController();
      inflightRef.current = controller;
      load(controller.signal);
    };

    startPoll();
    const id = setInterval(startPoll, intervalMs);
    return () => {
      clearInterval(id);
      if (inflightRef.current) {
        inflightRef.current.abort();
        inflightRef.current = null;
      }
    };
  }, [load, intervalMs]);

  const reload = useCallback(() => {
    if (inflightRef.current) inflightRef.current.abort();
    const controller = new AbortController();
    inflightRef.current = controller;
    load(controller.signal);
  }, [load]);

  return { data, loading, error, reload };
}
