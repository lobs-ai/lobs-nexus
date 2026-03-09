import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export function useUIConfig() {
  const [config, setConfig] = useState({
    layout: 'command-center',
    widgetOrder: [],
    hiddenWidgets: [],
    agentHighlights: [],
  });

  useEffect(() => {
    api.uiConfig?.()?.then(setConfig).catch(() => {});
  }, []);

  const updateConfig = useCallback(async (patch) => {
    const updated = { ...config, ...patch };
    setConfig(updated);
    try { await api.updateUiConfig?.(patch); } catch {}
  }, [config]);

  return { config, updateConfig };
}
