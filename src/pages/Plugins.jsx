import { useState } from 'react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import { showToast } from '../components/Toast';
import { useApi } from '../hooks/useApi';
import { invalidateAffordancesCache } from '../hooks/useAffordances';
import { api } from '../lib/api';

const CATEGORY_COLORS = {
  dev: 'var(--blue)',
  academic: 'var(--purple)',
  productivity: 'var(--amber)',
  lifestyle: 'var(--green)',
};

const CATEGORY_GLOW = {
  dev: 'rgba(56,189,248,0.15)',
  academic: 'rgba(167,139,250,0.15)',
  productivity: 'rgba(251,191,36,0.15)',
  lifestyle: 'rgba(52,211,153,0.15)',
};

const CATEGORIES = ['dev', 'academic', 'productivity', 'lifestyle'];

function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={e => { e.stopPropagation(); onChange(!checked); }}
      style={{
        position: 'relative',
        width: 40,
        height: 22,
        borderRadius: 11,
        border: 'none',
        background: checked ? 'var(--teal)' : 'rgba(255,255,255,0.12)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s',
        flexShrink: 0,
        boxShadow: checked ? '0 0 10px rgba(45,212,191,0.4)' : 'none',
      }}
    >
      <span style={{
        position: 'absolute',
        top: 3,
        left: checked ? 20 : 3,
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: 'white',
        transition: 'left 0.2s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </button>
  );
}

function AffordanceRow({ affordance }) {
  const typeColors = {
    button: 'var(--teal)',
    chips: 'var(--blue)',
    'inline-text': 'var(--muted)',
    badge: 'var(--purple)',
    'rewrite-menu': 'var(--amber)',
    'context-panel': 'var(--green)',
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 12px',
      borderRadius: 8,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <span style={{ fontSize: '0.9rem' }}>✨</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'var(--text)', fontSize: '0.82rem', fontWeight: 600 }}>
          {affordance.label || affordance.aiAction}
        </div>
        <div style={{ color: 'var(--faint)', fontSize: '0.72rem', marginTop: 2 }}>
          Shows on: <span style={{ color: 'var(--muted)' }}>{affordance.target}</span>
        </div>
      </div>
      <Badge label={affordance.type} color={typeColors[affordance.type] || 'var(--muted)'} />
      <Badge label={affordance.aiAction} color="var(--purple)" />
    </div>
  );
}

function ConfigEditor({ schema, config, onChange }) {
  if (!schema || Object.keys(schema).length === 0) {
    return <div style={{ color: 'var(--faint)', fontSize: '0.8rem' }}>No configuration options.</div>;
  }

  const renderField = (key, fieldSchema) => {
    const val = config?.[key] ?? fieldSchema?.default ?? '';
    const type = fieldSchema?.type || 'string';
    const label = fieldSchema?.title || key;
    const description = fieldSchema?.description;

    if (type === 'boolean') {
      return (
        <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ color: 'var(--text)', fontSize: '0.82rem', fontWeight: 500 }}>{label}</div>
            {description && <div style={{ color: 'var(--faint)', fontSize: '0.72rem' }}>{description}</div>}
          </div>
          <ToggleSwitch checked={!!val} onChange={v => onChange({ ...config, [key]: v })} />
        </div>
      );
    }

    return (
      <div key={key}>
        <label style={{ color: 'var(--muted)', fontSize: '0.78rem', display: 'block', marginBottom: 4 }}>{label}</label>
        {description && <div style={{ color: 'var(--faint)', fontSize: '0.72rem', marginBottom: 6 }}>{description}</div>}
        {type === 'integer' || type === 'number' ? (
          <input
            type="number"
            className="nx-input"
            value={val}
            onChange={e => onChange({ ...config, [key]: type === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value) })}
          />
        ) : (
          <input
            type="text"
            className="nx-input"
            value={val}
            onChange={e => onChange({ ...config, [key]: e.target.value })}
            placeholder={fieldSchema?.examples?.[0] || ''}
          />
        )}
      </div>
    );
  };

  // Support JSON Schema with properties
  const props = schema?.properties || schema;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Object.entries(props).map(([key, fieldSchema]) => renderField(key, fieldSchema))}
    </div>
  );
}

function PluginCard({ plugin, onToggle, onSaveConfig }) {
  const [expanded, setExpanded] = useState(false);
  const [config, setConfig] = useState(plugin.config || {});
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const catColor = CATEGORY_COLORS[plugin.category] || 'var(--muted)';
  const catGlow = CATEGORY_GLOW[plugin.category] || 'transparent';

  const handleToggle = async (val) => {
    setToggling(true);
    try {
      await onToggle(plugin.id, val);
    } finally {
      setToggling(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveConfig(plugin.id, config);
      showToast('Config saved', 'success');
    } catch (e) {
      showToast('Failed to save: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard
      style={{
        padding: 0,
        overflow: 'hidden',
        transition: 'all 0.25s',
        boxShadow: plugin.enabled ? `0 0 20px ${catGlow}` : 'none',
        borderColor: plugin.enabled ? `${catColor}30` : undefined,
      }}
    >
      {/* Header row */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '16px 20px',
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {/* Icon */}
        <div style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: `${catColor}18`,
          border: `1px solid ${catColor}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.1rem',
          flexShrink: 0,
        }}>
          {plugin.category === 'dev' ? '⚙️' : plugin.category === 'academic' ? '📚' : plugin.category === 'productivity' ? '⚡' : '🌿'}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text)', fontWeight: 700, fontSize: '0.9rem' }}>{plugin.name}</span>
            <Badge label={plugin.category} color={catColor} />
            {plugin.uiAffordances?.length > 0 && (
              <span style={{ color: 'var(--faint)', fontSize: '0.72rem' }}>
                ✨ {plugin.uiAffordances.length} affordance{plugin.uiAffordances.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div style={{ color: 'var(--muted)', fontSize: '0.8rem', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {plugin.description}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <ToggleSwitch checked={plugin.enabled} onChange={handleToggle} disabled={toggling} />
          <span style={{
            color: 'var(--faint)',
            transition: 'transform 0.2s',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
            fontSize: '0.75rem',
          }}>▾</span>
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}>
          {/* Description */}
          <div>
            <div style={{ color: 'var(--muted)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '1px', marginBottom: 8, textTransform: 'uppercase' }}>
              About
            </div>
            <p style={{ color: 'var(--text)', fontSize: '0.85rem', lineHeight: 1.65, margin: 0 }}>{plugin.description}</p>
          </div>

          {/* Affordances */}
          {plugin.uiAffordances?.length > 0 && (
            <div>
              <div style={{ color: 'var(--muted)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '1px', marginBottom: 10, textTransform: 'uppercase' }}>
                UI Affordances
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {plugin.uiAffordances.map(a => <AffordanceRow key={a.id} affordance={a} />)}
              </div>
            </div>
          )}

          {/* Config */}
          <div>
            <div style={{ color: 'var(--muted)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '1px', marginBottom: 12, textTransform: 'uppercase' }}>
              Configuration
            </div>
            <ConfigEditor
              schema={plugin.configSchema}
              config={config}
              onChange={setConfig}
            />
            {plugin.configSchema && Object.keys(plugin.configSchema?.properties || plugin.configSchema || {}).length > 0 && (
              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                  style={{ fontSize: '0.8rem', padding: '7px 18px' }}
                >
                  {saving ? 'Saving…' : 'Save Config'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </GlassCard>
  );
}

export default function Plugins() {
  const { data, loading, error, reload } = useApi(signal => api.plugins(signal));

  const plugins = data?.plugins || [];

  const handleToggle = async (id, enabled) => {
    try {
      await api.updatePlugin(id, { enabled });
      invalidateAffordancesCache();
      reload();
    } catch (e) {
      showToast('Failed to update plugin: ' + e.message, 'error');
    }
  };

  const handleSaveConfig = async (id, config) => {
    await api.updatePlugin(id, { config });
    reload();
  };

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = plugins.filter(p => p.category === cat);
    return acc;
  }, {});

  const enabledCount = plugins.filter(p => p.enabled).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <span className="section-label">System</span>
          <h2 style={{ color: 'var(--text)', fontWeight: 700 }}>Plugins</h2>
        </div>
        {plugins.length > 0 && (
          <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
            {enabledCount} / {plugins.length} enabled
          </div>
        )}
      </div>

      {loading && <LoadingSkeleton lines={3} height={72} />}

      {error && (
        <GlassCard style={{ borderColor: 'rgba(248,113,113,0.3)' }}>
          <div style={{ color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🧩</div>
            <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: 6 }}>Plugin API not available yet</div>
            <div>The plugin system is being set up. Check back soon.</div>
          </div>
        </GlassCard>
      )}

      {!loading && !error && plugins.length === 0 && (
        <EmptyState
          icon="🧩"
          title="No plugins installed"
          description="Plugins extend the PAW system with AI micro-features and integrations."
        />
      )}

      {!loading && !error && plugins.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {CATEGORIES.map(cat => {
            const catPlugins = grouped[cat];
            if (catPlugins.length === 0) return null;
            return (
              <div key={cat}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 14,
                }}>
                  <span style={{ width: 3, height: 18, borderRadius: 2, background: CATEGORY_COLORS[cat], display: 'inline-block' }} />
                  <span style={{ color: CATEGORY_COLORS[cat], fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
                    {cat}
                  </span>
                  <span style={{ color: 'var(--faint)', fontSize: '0.75rem' }}>({catPlugins.length})</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {catPlugins.map(plugin => (
                    <PluginCard
                      key={plugin.id}
                      plugin={plugin}
                      onToggle={handleToggle}
                      onSaveConfig={handleSaveConfig}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
