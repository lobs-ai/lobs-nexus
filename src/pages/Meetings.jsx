import { useState } from 'react';
import { usePolling } from '../hooks/usePolling';
import GlassCard from '../components/GlassCard';

async function getMeetings() {
  try {
    const res = await fetch('/api/meetings');
    if (!res.ok) return [];
    const data = await res.json();
    return data.meetings || [];
  } catch {
    return [];
  }
}

async function uploadMeeting(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await fetch('/api/meetings/upload', {
    method: 'POST',
    body: formData
  });
  
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

export default function Meetings() {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const { data: meetings, reload } = usePolling(
    () => getMeetings(),
    30000
  );

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      await uploadMeeting(file);
      reload();
      e.target.value = ''; // Reset file input
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const sortedMeetings = [...(meetings || [])].sort((a, b) => {
    const dateA = new Date(a.date || a.createdAt);
    const dateB = new Date(b.date || b.createdAt);
    return dateB - dateA;
  });

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
            Meetings
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
            Meeting recordings, transcripts, and summaries
          </p>
        </div>

        <label
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: uploading ? 'var(--muted)' : 'var(--teal)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: uploading ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.2s',
            display: 'inline-block'
          }}
          onMouseEnter={(e) => !uploading && (e.target.style.opacity = '0.8')}
          onMouseLeave={(e) => !uploading && (e.target.style.opacity = '1')}
        >
          {uploading ? 'Uploading...' : '+ Upload Meeting'}
          <input
            type="file"
            accept="audio/*,video/*,.txt,.md,.pdf"
            onChange={handleFileUpload}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {uploadError && (
        <div style={{ 
          padding: '12px 16px', 
          borderRadius: '8px', 
          background: '#ef444420', 
          border: '1px solid #ef4444', 
          color: '#ef4444', 
          marginBottom: '24px',
          fontSize: '14px'
        }}>
          Upload failed: {uploadError}
        </div>
      )}

      {/* Meetings List */}
      {sortedMeetings.length === 0 ? (
        <GlassCard>
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)' }}>
            No meetings yet. Upload a recording or transcript to get started.
          </div>
        </GlassCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {sortedMeetings.map((meeting, idx) => {
            const date = new Date(meeting.date || meeting.createdAt);
            const actionItems = meeting.actionItems || meeting.action_items || [];
            
            return (
              <GlassCard key={meeting.id || idx}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                    {meeting.title || `Meeting ${date.toLocaleDateString()}`}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                    {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at {date.toLocaleTimeString()}
                  </div>
                  {meeting.participants && (
                    <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
                      Participants: {Array.isArray(meeting.participants) ? meeting.participants.join(', ') : meeting.participants}
                    </div>
                  )}
                </div>

                {/* Summary */}
                {meeting.summary && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--muted)', marginBottom: '8px', fontFamily: 'var(--mono)' }}>
                      SUMMARY
                    </div>
                    <div style={{ 
                      padding: '16px', 
                      borderRadius: '8px', 
                      background: 'var(--faint)', 
                      fontSize: '14px', 
                      color: 'var(--text)', 
                      lineHeight: '1.7' 
                    }}>
                      {meeting.summary}
                    </div>
                  </div>
                )}

                {/* Action Items */}
                {actionItems.length > 0 && (
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--muted)', marginBottom: '12px', fontFamily: 'var(--mono)' }}>
                      ACTION ITEMS
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {actionItems.map((item, itemIdx) => (
                        <div
                          key={itemIdx}
                          style={{
                            padding: '12px',
                            borderRadius: '6px',
                            background: 'var(--faint)',
                            border: '1px solid var(--teal)',
                            fontSize: '14px',
                            color: 'var(--text)',
                            lineHeight: '1.6',
                            display: 'flex',
                            alignItems: 'start',
                            gap: '12px'
                          }}
                        >
                          <div style={{ 
                            width: '6px', 
                            height: '6px', 
                            borderRadius: '50%', 
                            background: 'var(--teal)',
                            marginTop: '6px',
                            flexShrink: 0
                          }} />
                          <div style={{ flex: 1 }}>
                            {typeof item === 'string' ? item : item.text || item.description}
                            {item.assignee && (
                              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                                Assigned to: {item.assignee}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Transcript preview if available */}
                {meeting.transcript && (
                  <div style={{ marginTop: '20px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--muted)', marginBottom: '8px', fontFamily: 'var(--mono)' }}>
                      TRANSCRIPT
                    </div>
                    <div style={{ 
                      padding: '16px', 
                      borderRadius: '8px', 
                      background: 'var(--faint)', 
                      fontSize: '13px', 
                      color: 'var(--muted)', 
                      lineHeight: '1.7',
                      fontFamily: 'var(--mono)',
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      {meeting.transcript.substring(0, 500)}
                      {meeting.transcript.length > 500 && '...'}
                    </div>
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
