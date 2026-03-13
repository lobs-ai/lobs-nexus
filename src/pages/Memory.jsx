import { useState } from 'react';
import { usePolling } from '../hooks/usePolling';
import GlassCard from '../components/GlassCard';

const MEMORY_API = 'http://localhost:7420';

async function searchMemory(query, maxResults = 10) {
  const res = await fetch(`${MEMORY_API}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, maxResults })
  });
  if (!res.ok) return { results: [] };
  return res.json();
}

async function getMemoryStatus() {
  try {
    const res = await fetch(`${MEMORY_API}/status`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default function Memory() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const { data: status } = usePolling(
    () => getMemoryStatus(),
    30000
  );

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setSearching(true);
    try {
      const data = await searchMemory(query, 10);
      setSearchResults(data);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults({ results: [] });
    } finally {
      setSearching(false);
    }
  };

  const collections = status?.collections || [];
  const totalDocs = collections.reduce((sum, c) => sum + (c.documentCount || 0), 0);

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
          Memory
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
          Semantic search across agent memory collections
        </p>
      </div>

      {/* Memory Server Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <GlassCard>
          <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '8px', fontFamily: 'var(--mono)' }}>
            SERVER STATUS
          </div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: status ? 'var(--teal)' : '#ef4444' }}>
            {status ? 'ONLINE' : 'OFFLINE'}
          </div>
        </GlassCard>

        <GlassCard>
          <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '8px', fontFamily: 'var(--mono)' }}>
            COLLECTIONS
          </div>
          <div style={{ fontSize: '36px', fontWeight: '600', color: 'var(--text)' }}>
            {collections.length}
          </div>
        </GlassCard>

        <GlassCard>
          <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '8px', fontFamily: 'var(--mono)' }}>
            TOTAL DOCUMENTS
          </div>
          <div style={{ fontSize: '36px', fontWeight: '600', color: 'var(--text)' }}>
            {totalDocs.toLocaleString()}
          </div>
        </GlassCard>
      </div>

      {/* Search */}
      <GlassCard style={{ marginBottom: '24px' }}>
        <form onSubmit={handleSearch}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search memory..."
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--faint)',
                color: 'var(--text)',
                fontSize: '15px',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={searching || !query.trim()}
              style={{
                padding: '14px 28px',
                borderRadius: '8px',
                border: 'none',
                background: searching ? 'var(--muted)' : 'var(--teal)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: searching ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => !searching && (e.target.style.opacity = '0.8')}
              onMouseLeave={(e) => !searching && (e.target.style.opacity = '1')}
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>
      </GlassCard>

      {/* Search Results */}
      {searchResults && (
        <GlassCard style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px' }}>
            Search Results
          </div>
          {searchResults.results.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>
              No results found for "{query}"
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {searchResults.results.map((result, idx) => (
                <div key={idx} style={{ padding: '16px', borderRadius: '8px', background: 'var(--faint)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ 
                      fontSize: '11px', 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      background: 'var(--teal)',
                      color: '#fff',
                      fontFamily: 'var(--mono)',
                      fontWeight: '600'
                    }}>
                      {result.collection}
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                      score: {result.score?.toFixed(3) || 'N/A'}
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '8px', fontFamily: 'var(--mono)' }}>
                    {result.path || result.id}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.6' }}>
                    {result.snippet || result.text || result.content || '(no preview)'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* Collections */}
      {collections.length > 0 && (
        <GlassCard>
          <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px' }}>
            Collections
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {collections.map((collection) => (
              <div key={collection.name} style={{ padding: '16px', borderRadius: '8px', background: 'var(--faint)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px', fontFamily: 'var(--mono)' }}>
                  {collection.name}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                  {(collection.documentCount || 0).toLocaleString()} documents
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
