import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import Modal from '../components/Modal';
import { api } from '../lib/api';

export default function MicroLearning() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'topics';

  const [topics, setTopics] = useState([]);
  const [cards, setCards] = useState([]);
  const [dueCards, setDueCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [stats, setStats] = useState(null);
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [generateContent, setGenerateContent] = useState('');
  const [generateCount, setGenerateCount] = useState(10);

  useEffect(() => {
    loadTopics();
    loadStats();
    if (mode === 'review') loadDueCards();
  }, [mode]);

  const loadTopics = async () => {
    try {
      const data = await api.learningTopics();
      setTopics(data);
    } catch (err) {
      console.error('Failed to load topics:', err);
    }
  };

  const loadStats = async () => {
    try {
      const data = await api.learningStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const loadDueCards = async () => {
    try {
      const data = await api.cardsDue();
      setDueCards(data);
      setCurrentCardIndex(0);
      setShowAnswer(false);
    } catch (err) {
      console.error('Failed to load due cards:', err);
    }
  };

  const handleReview = async (grade) => {
    const card = dueCards[currentCardIndex];
    try {
      await api.reviewCard(card.id, grade);
      if (currentCardIndex + 1 < dueCards.length) {
        setCurrentCardIndex(currentCardIndex + 1);
        setShowAnswer(false);
      } else {
        // Done!
        setSearchParams({ mode: 'topics' });
        await loadStats();
        alert('Review complete! 🎉');
      }
    } catch (err) {
      console.error('Review failed:', err);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTopic) return;
    try {
      await api.generateCards(selectedTopic.id, { content: generateContent, count: generateCount });
      setShowGenerate(false);
      setGenerateContent('');
      await loadTopics();
      alert(`Generated ${generateCount} cards!`);
    } catch (err) {
      console.error('Generate failed:', err);
      alert('Failed to generate cards: ' + err.message);
    }
  };

  const renderTopics = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text)' }}>Learning Topics</h1>
        <button
          onClick={() => setShowNewTopic(true)}
          style={{ padding: '10px 20px', background: 'var(--teal)', border: 'none', borderRadius: 6, color: 'white', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}
        >
          + New Topic
        </button>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {topics.map((topic) => (
          <GlassCard key={topic.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{topic.name}</div>
                {topic.description && <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 10 }}>{topic.description}</div>}
                <div style={{ fontSize: '0.75rem', color: 'var(--faint)' }}>{topic.cardCount} cards</div>
              </div>
              <button
                onClick={() => {
                  setSelectedTopic(topic);
                  setShowGenerate(true);
                }}
                style={{ padding: '6px 12px', background: 'rgba(45,212,191,0.1)', border: '1px solid var(--teal)', borderRadius: 4, color: 'var(--teal)', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Generate Cards
              </button>
            </div>
          </GlassCard>
        ))}
      </div>

      {showNewTopic && (
        <Modal onClose={() => setShowNewTopic(false)} title="New Topic">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const name = e.target.name.value;
              const description = e.target.description.value;
              try {
                await api.createLearningTopic({ name, description });
                setShowNewTopic(false);
                await loadTopics();
              } catch (err) {
                alert('Failed to create topic: ' + err.message);
              }
            }}
          >
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 6 }}>Name</label>
              <input
                name="name"
                required
                style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: '0.9rem' }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 6 }}>Description (optional)</label>
              <textarea
                name="description"
                rows={3}
                style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: '0.9rem' }}
              />
            </div>
            <button type="submit" style={{ width: '100%', padding: '10px', background: 'var(--teal)', border: 'none', borderRadius: 6, color: 'white', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
              Create
            </button>
          </form>
        </Modal>
      )}

      {showGenerate && selectedTopic && (
        <Modal onClose={() => setShowGenerate(false)} title={`Generate Cards for ${selectedTopic.name}`}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 6 }}>
              Content (optional) — paste lecture notes, concepts, etc.
            </label>
            <textarea
              value={generateContent}
              onChange={(e) => setGenerateContent(e.target.value)}
              rows={6}
              placeholder="Leave blank to generate based on topic name only"
              style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: '0.9rem' }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 6 }}>Number of cards</label>
            <input
              type="number"
              value={generateCount}
              onChange={(e) => setGenerateCount(parseInt(e.target.value, 10))}
              min={1}
              max={50}
              style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: '0.9rem' }}
            />
          </div>
          <button
            onClick={handleGenerate}
            style={{ width: '100%', padding: '10px', background: 'var(--teal)', border: 'none', borderRadius: 6, color: 'white', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}
          >
            Generate {generateCount} Cards
          </button>
        </Modal>
      )}
    </div>
  );

  const renderReview = () => {
    if (dueCards.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>All caught up!</div>
          <div style={{ fontSize: '1rem', color: 'var(--muted)' }}>No cards due for review right now.</div>
        </div>
      );
    }

    const card = dueCards[currentCardIndex];

    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 20, fontSize: '0.9rem', color: 'var(--muted)' }}>
          Card {currentCardIndex + 1} of {dueCards.length}
        </div>

        <GlassCard style={{ minHeight: 300, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 40, textAlign: 'center', cursor: 'pointer' }} onClick={() => setShowAnswer(!showAnswer)}>
          <div style={{ fontSize: '1.3rem', color: 'var(--text)', marginBottom: 20, lineHeight: 1.6 }}>
            {card.question}
          </div>

          {showAnswer && (
            <div style={{ borderTop: '2px solid var(--teal)', paddingTop: 20, marginTop: 20 }}>
              <div style={{ fontSize: '1.1rem', color: 'var(--teal)', fontWeight: 600, marginBottom: 12 }}>
                {card.answer}
              </div>
              {card.explanation && (
                <div style={{ fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                  {card.explanation}
                </div>
              )}
            </div>
          )}

          {!showAnswer && (
            <div style={{ fontSize: '0.8rem', color: 'var(--faint)', fontStyle: 'italic' }}>
              Click to reveal answer
            </div>
          )}
        </GlassCard>

        {showAnswer && (
          <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'center' }}>
            {[
              { label: 'Again', grade: 0, color: 'var(--red)' },
              { label: 'Hard', grade: 2, color: 'var(--amber)' },
              { label: 'Good', grade: 3, color: 'var(--teal)' },
              { label: 'Easy', grade: 4, color: 'var(--green)' },
              { label: 'Perfect', grade: 5, color: 'var(--blue)' },
            ].map((btn) => (
              <button
                key={btn.grade}
                onClick={() => handleReview(btn.grade)}
                style={{
                  padding: '10px 16px',
                  background: `${btn.color}20`,
                  border: `1px solid ${btn.color}`,
                  borderRadius: 6,
                  color: btn.color,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = btn.color;
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `${btn.color}20`;
                  e.currentTarget.style.color = btn.color;
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderStats = () => (
    <div>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text)', marginBottom: 24 }}>Learning Stats</h1>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          <GlassCard>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text)' }}>{stats.totalCards}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Cards</div>
          </GlassCard>
          <GlassCard>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--teal)' }}>{stats.dueToday}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Due Today</div>
          </GlassCard>
          <GlassCard>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--green)' }}>{stats.reviewedToday}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Reviewed Today</div>
          </GlassCard>
        </div>
      )}

      {stats?.topicBreakdown && stats.topicBreakdown.length > 0 && (
        <GlassCard>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Cards by Topic</div>
          {stats.topicBreakdown.map((topic) => (
            <div key={topic.id} style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text)', fontSize: '0.9rem' }}>{topic.name}</span>
              <span style={{ color: 'var(--muted)', fontSize: '0.85rem', fontFamily: 'var(--mono)' }}>{topic.cardCount} cards</span>
            </div>
          ))}
        </GlassCard>
      )}
    </div>
  );

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 32, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
        {['topics', 'review', 'stats'].map((m) => (
          <button
            key={m}
            onClick={() => {
              setSearchParams({ mode: m });
              if (m === 'review') loadDueCards();
            }}
            style={{
              padding: '8px 16px',
              background: mode === m ? 'rgba(45,212,191,0.1)' : 'transparent',
              border: 'none',
              borderBottom: mode === m ? '2px solid var(--teal)' : '2px solid transparent',
              color: mode === m ? 'var(--teal)' : 'var(--muted)',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === 'topics' && renderTopics()}
      {mode === 'review' && renderReview()}
      {mode === 'stats' && renderStats()}
    </div>
  );
}
