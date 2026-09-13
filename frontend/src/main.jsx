import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const API = import.meta.env.VITE_API_URL || '/api';
const fallbackImage = 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=85';
const categoryImages = {
  Technology: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=85',
  Travel: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85',
  Design: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1200&q=85',
};

async function api(path, options = {}) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Request failed');
  }
  return response.status === 204 ? null : response.json();
}

function imageFor(post) {
  return post.cover_image || categoryImages[post.category] || fallbackImage;
}

function App() {
  const [posts, setPosts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const [form, setForm] = useState({ email: 'demo@example.com', password: 'demo-password' });
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');
  const [loadingComment, setLoadingComment] = useState(false);

  useEffect(() => {
    api('/posts').then(setPosts).catch((error) => setMessage(error.message));
  }, []);

  async function login(event) {
    event.preventDefault();
    try {
      const result = await api('/auth/login', { method: 'POST', body: JSON.stringify(form) });
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      setUser(result.user);
      setMessage('Welcome back.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function openPost(slug) {
    try {
      setSelected(await api(`/posts/${slug}`));
      setMessage('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function addComment(event) {
    event.preventDefault();
    if (!user) {
      setMessage('Sign in to join the conversation.');
      return;
    }
    if (!comment.trim()) return;
    setLoadingComment(true);
    try {
      const created = await api(`/posts/${selected.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: comment }),
      });
      setSelected({ ...selected, comments: [...(selected.comments || []), created] });
      setComment('');
      setMessage('Comment published.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoadingComment(false);
    }
  }

  function signOut() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setMessage('Signed out.');
  }

  const featured = posts[0];

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" onClick={(event) => { event.preventDefault(); setSelected(null); }}>
          <span className="brand-mark">I</span>
          <span>InkForge</span>
        </a>
        <div className="header-actions">
          <span className="header-tag">Ideas worth sharing</span>
          {user ? <><span className="welcome">Hi, {user.name}</span><button className="ghost-button" onClick={signOut}>Sign out</button></> : (
            <form className="login-form" onSubmit={login}>
              <input aria-label="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              <input aria-label="password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
              <button>Sign in</button>
            </form>
          )}
        </div>
      </header>

      <main>
        {message && <p className="notice">{message}</p>}
        {selected ? (
          <section className="post-view">
            <button className="back-button" onClick={() => setSelected(null)}>← Back to stories</button>
            <img className="post-hero-image" src={imageFor(selected)} alt="" />
            <div className="post-heading">
              <span className="eyebrow">{selected.category || 'Journal'}</span>
              <h1>{selected.title}</h1>
              <p className="byline">By {selected.author} · {new Date(selected.created_at).toLocaleDateString()}</p>
            </div>
            <p className="post-content">{selected.content}</p>
            <section className="comments">
              <div className="section-heading"><span className="eyebrow">The conversation</span><h2>Comments <span>{selected.comments?.length || 0}</span></h2></div>
              {user ? (
                <form className="comment-form" onSubmit={addComment}>
                  <textarea aria-label="Write a comment" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Share your perspective..." maxLength="1000" />
                  <button disabled={loadingComment || !comment.trim()}>{loadingComment ? 'Publishing...' : 'Publish comment'}</button>
                </form>
              ) : <p className="muted">Sign in above to add your voice to this story.</p>}
              <div className="comment-list">
                {selected.comments?.length ? selected.comments.map((item) => (
                  <div className="comment" key={item.id}><div className="avatar">{item.author.charAt(0)}</div><div><strong>{item.author}</strong><p>{item.body}</p><small>{new Date(item.created_at).toLocaleDateString()}</small></div></div>
                )) : <p className="muted">No comments yet. Start the conversation.</p>}
              </div>
            </section>
          </section>
        ) : (
          <>
            <section className="hero">
              <div className="hero-copy"><span className="eyebrow">A fresh point of view</span><h1>Stories for the <em>curious</em> mind.</h1><p>InkForge is a calm corner of the internet for thoughtful ideas, creative practice, and the people shaping what comes next.</p><a className="primary-link" href="#stories">Explore the journal <span>↓</span></a></div>
              <div className="hero-art"><img src={featured ? imageFor(featured) : fallbackImage} alt="A creative workspace" /><span className="floating-note">Read slowly.<br />Think deeply.</span></div>
            </section>
            <section className="intro-row" id="stories"><div><span className="eyebrow">From the journal</span><h2>Featured stories</h2></div><p>New perspectives on technology, culture, and making a life with intention.</p></section>
            <section className="post-grid">
              {posts.map((post, index) => <article className={`story-card ${index === 0 ? 'featured-card' : ''}`} key={post.id} onClick={() => openPost(post.slug)}>
                <img src={imageFor(post)} alt="" /><div className="story-body"><span className="eyebrow">{post.category || 'Journal'}</span><h3>{post.title}</h3><p>{post.excerpt}</p><div className="story-meta"><span>{post.author}</span><button onClick={(event) => { event.stopPropagation(); openPost(post.slug); }}>Read story ↗</button></div></div>
              </article>)}
            </section>
          </>
        )}
      </main>
      <footer><span>InkForge</span><span>Made for meaningful ideas.</span><span>© {new Date().getFullYear()}</span></footer>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
