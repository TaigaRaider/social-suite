import { useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function CreatePost({ onPost }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [useUrl, setUseUrl] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const fileInputRef = useRef(null);

  const initials = (user?.firstName?.[0] || '') + (user?.lastName?.[0] || '') || user?.username?.[0] || '?';

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setImageFile(file);
    setUseUrl(false);
    setImageUrl('');
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, [handleFile]);

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        handleFile(item.getAsFile());
        break;
      }
    }
  }, [handleFile]);

  const clearImage = () => { setImageFile(null); setImagePreview(null); setImageUrl(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !imageFile && !imageUrl && !showPoll) return;
    setLoading(true);
    try {
      let finalImageUrl = imageUrl;
      if (imageFile) {
        const uploaded = await api.uploadImage(imageFile);
        finalImageUrl = uploaded.url;
      }
      const poll = showPoll && pollQuestion.trim() && pollOptions.filter(o => o.trim()).length >= 2
        ? { question: pollQuestion.trim(), options: pollOptions.filter(o => o.trim()) }
        : undefined;
      const body = { content, image: finalImageUrl || '', scheduledAt: scheduledAt || undefined, poll };
      const post = await api.createPost(body);
      setContent('');
      clearImage();
      setScheduledAt('');
      setShowSchedule(false);
      setShowPoll(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      onPost?.(post);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const canPost = content.trim() || imageFile || imageUrl || (showPoll && pollQuestion.trim());

  return (
    <div className="card" onPaste={handlePaste}>
      <div className="create-post">
        <div className="avatar">{initials}</div>
        <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea placeholder={`What's on your mind, ${user?.firstName || 'friend'}?`} value={content} onChange={e => setContent(e.target.value)} style={{ minHeight: 40, borderRadius: 20 }} />

          {imagePreview && (
            <div style={{ position: 'relative' }}>
              <img src={imagePreview} alt="" style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 8 }} />
              <button type="button" onClick={clearImage} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14 }}>&#10005;</button>
            </div>
          )}

          {!imagePreview && !useUrl && (
            <div
              className={`drop-zone ${dragOver ? 'drop-zone-active' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--fb-blue)' : 'var(--fb-border)'}`,
                borderRadius: 8, padding: '20px', textAlign: 'center', cursor: 'pointer',
                color: 'var(--fb-gray)', fontSize: 13, transition: 'border-color 0.2s, background 0.2s',
                background: dragOver ? 'rgba(24,119,242,0.05)' : 'transparent'
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 4 }}>&#128247;</div>
              <div>Drag & drop an image, click to browse, or Ctrl+V to paste</div>
              <div style={{ marginTop: 6, fontSize: 12 }}>
                <span style={{ color: 'var(--fb-blue)', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setUseUrl(true); }}>Use URL instead</span>
              </div>
            </div>
          )}

          {!imagePreview && useUrl && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="url" placeholder="https://example.com/photo.jpg" value={imageUrl} onChange={e => setImageUrl(e.target.value)} style={{ flex: 1 }} />
              <button type="button" onClick={() => { setUseUrl(false); setImageUrl(''); }} style={{ background: 'none', color: 'var(--fb-gray)', border: 'none', cursor: 'pointer', fontSize: 12 }}>Use upload</button>
            </div>
          )}

          <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />

          {showPoll && (
            <div style={{ border: '1px solid var(--fb-border)', borderRadius: 8, padding: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Create Poll</div>
              <input placeholder="Ask a question..." value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} style={{ marginBottom: 8 }} />
              {pollOptions.map((opt, i) => (
                <input key={i} placeholder={`Option ${i + 1}`} value={opt} onChange={e => { const next = [...pollOptions]; next[i] = e.target.value; setPollOptions(next); }} style={{ marginBottom: 6 }} />
              ))}
              {pollOptions.length < 4 && (
                <button type="button" onClick={() => setPollOptions([...pollOptions, ''])} style={{ background: 'none', color: 'var(--fb-blue)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>+ Add option</button>
              )}
              <button type="button" onClick={() => { setShowPoll(false); setPollQuestion(''); setPollOptions(['', '']); }} style={{ background: 'none', color: 'var(--fb-gray)', border: 'none', cursor: 'pointer', fontSize: 12, marginTop: 4 }}>Remove poll</button>
            </div>
          )}

          {showSchedule && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', border: '1px solid var(--fb-border)', borderRadius: 8, padding: 10 }}>
              <span style={{ fontSize: 13, color: 'var(--fb-gray)' }}>Schedule:</span>
              <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} style={{ flex: 1, fontSize: 13, padding: '6px 8px' }} />
              <button type="button" onClick={() => { setShowSchedule(false); setScheduledAt(''); }} style={{ background: 'none', color: 'var(--fb-gray)', border: 'none', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
            </div>
          )}

          {(canPost || content.trim()) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--fb-border)', paddingTop: 8 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <button type="button" onClick={() => fileInputRef.current?.click()} title="Add photo" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--fb-green)' }}>&#128247;</button>
                <button type="button" onClick={() => setShowPoll(!showPoll)} title="Add poll" style={{ background: showPoll ? 'rgba(24,119,242,0.1)' : 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: showPoll ? 'var(--fb-blue)' : 'var(--fb-gray)', borderRadius: 4 }}>&#128202;</button>
                <button type="button" onClick={() => setShowSchedule(!showSchedule)} title="Schedule post" style={{ background: showSchedule ? 'rgba(24,119,242,0.1)' : 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: showSchedule ? 'var(--fb-blue)' : 'var(--fb-gray)', borderRadius: 4 }}>&#128197;</button>
              </div>
              <button className="btn btn-primary" disabled={loading || !canPost} type="submit">{loading ? 'Posting...' : scheduledAt ? 'Schedule' : 'Post'}</button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
