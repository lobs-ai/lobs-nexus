import { usePolling } from '../hooks/usePolling';
import GlassCard from '../components/GlassCard';
import { api } from '../lib/api';

export default function Reflections() {
  const { data: reflectionsData } = usePolling(
    (signal) => api.reflections({}, signal),
    30000
  );

  const reflections = reflectionsData?.reflections || [];

  // Sort by date descending
  const sortedReflections = [...reflections].sort((a, b) => {
    const dateA = new Date(a.createdAt || a.date);
    const dateB = new Date(b.createdAt || b.date);
    return dateB - dateA;
  });

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
          Reflections
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
          Automated insights and pattern recognition from the reflection system
        </p>
      </div>

      {/* Reflections List */}
      {sortedReflections.length === 0 ? (
        <GlassCard>
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)' }}>
            No reflections yet
          </div>
        </GlassCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {sortedReflections.map((reflection) => {
            const date = new Date(reflection.createdAt || reflection.date);
            const keyFindings = reflection.keyFindings || reflection.key_findings || [];
            const patterns = reflection.patterns || [];
            
            return (
              <GlassCard key={reflection.id}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                    Reflection: {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                    {date.toLocaleTimeString()}
                  </div>
                </div>

                {/* Key Findings */}
                {keyFindings.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--muted)', marginBottom: '12px', fontFamily: 'var(--mono)' }}>
                      KEY FINDINGS
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {keyFindings.map((finding, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '12px',
                            borderRadius: '6px',
                            background: 'var(--faint)',
                            border: '1px solid var(--border)',
                            fontSize: '14px',
                            color: 'var(--text)',
                            lineHeight: '1.6'
                          }}
                        >
                          {typeof finding === 'string' ? finding : finding.text || finding.description}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Patterns */}
                {patterns.length > 0 && (
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--muted)', marginBottom: '12px', fontFamily: 'var(--mono)' }}>
                      PATTERNS
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {patterns.map((pattern, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '12px',
                            borderRadius: '6px',
                            background: 'var(--faint)',
                            border: '1px solid var(--teal)',
                            fontSize: '14px',
                            color: 'var(--text)',
                            lineHeight: '1.6'
                          }}
                        >
                          {typeof pattern === 'string' ? pattern : pattern.text || pattern.description}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary if available */}
                {reflection.summary && (
                  <div style={{ marginTop: '20px', padding: '16px', borderRadius: '8px', background: 'var(--faint)', fontSize: '14px', color: 'var(--muted)', lineHeight: '1.7' }}>
                    {reflection.summary}
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
