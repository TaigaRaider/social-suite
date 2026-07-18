import { useState, useRef, useCallback } from 'react';
import { api } from '../api';

export default function CreatePost({ onClose, onCreated }) {
  const [image, setImage] = useState('');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setImageFile(file);
    setImage('');
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

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

  const clearImage = () => { setImageFile(null); setImagePreview(null); setImage(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image.trim() && !imageFile) return;
    setLoading(true);
    setError('');
    try {
      let finalImage = image;
      if (imageFile) {
        setUploading(true);
        const uploaded = await api.uploadImage(imageFile);
        finalImage = uploaded.url;
        setUploading(false);
      }
      const post = await api.createPost({ image: finalImage, caption, scheduledAt: scheduledAt || undefined });
      onCreated(post);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const canPost = image.trim() || imageFile;

  return (
    <div className="modal-overlay" onClick={onClose} onPaste={handlePaste}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create new post</h3>
          <button className="modal-close" onClick={onClose}>&#10005;</button>
        </div>
        <div className="modal-body">
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={handleSubmit}>
            {imagePreview ? (
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <img src={imagePreview} alt="" style={{ width: '100%', maxHeight: 400, objectFit: 'cover', borderRadius: 10 }} />
                <button type="button" onClick={clearImage} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14 }}>&#10005;</button>
              </div>
            ) : (
              <div className="form-group">
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragOver ? '#833ab4' : 'var(--border)'}`,
                    borderRadius: 12, padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: 14, transition: 'border-color 0.2s, background 0.2s',
                    background: dragOver ? 'rgba(131,58,180,0.05)' : 'var(--bg-tertiary)'
                  }}
                >
                  <div style={{ fontSize: 36, marginBottom: 8 }}>&#128247;</div>
                  <div>Drag & drop an image, click to browse, or Ctrl+V to paste</div>
                </div>
                <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                <div style={{ marginTop: 10 }}>
                  <label style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Or enter image URL</label>
                  <input
                    type="url"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                  />
                </div>
              </div>
            )}
            <div className="form-group">
              <label>Caption</label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption..."
                rows={3}
              />
            </div>
            {showSchedule && (
              <div style={{ marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg-tertiary)', borderRadius: 10, padding: '10px 14px' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Schedule:</span>
                <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} style={{ flex: 1, fontSize: 13, padding: '6px 8px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                <button type="button" onClick={() => { setShowSchedule(false); setScheduledAt(''); }} style={{ background: 'none', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button type="button" onClick={() => setShowSchedule(!showSchedule)} style={{ background: showSchedule ? 'rgba(131,58,180,0.15)' : 'var(--bg-tertiary)', color: showSchedule ? '#833ab4' : 'var(--text-secondary)', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}>
                &#128197; {showSchedule ? 'Scheduling' : 'Schedule'}
              </button>
            </div>
            <button type="submit" className="btn-post" disabled={loading || (!canPost)}>
              {loading ? (uploading ? 'Uploading...' : 'Posting...') : scheduledAt ? 'Schedule' : 'Share'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
