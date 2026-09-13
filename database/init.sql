CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY, name VARCHAR(80) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY, name VARCHAR(80) UNIQUE NOT NULL, slug VARCHAR(100) UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY, title VARCHAR(200) NOT NULL, slug VARCHAR(220) UNIQUE NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '', content TEXT NOT NULL, cover_image TEXT,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  published BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY, post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS posts_created_idx ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS comments_post_idx ON comments(post_id);

-- Deterministic demo records (password is demo-password).
INSERT INTO users (name,email,password_hash) VALUES
 ('Demo Author','demo@example.com','$2a$10$BN1VoefS8osz.FJwe/bf1.GbygCeKxfHPfpqHSLOYyOZSA17cgfS6')
ON CONFLICT (email) DO NOTHING;
INSERT INTO categories (name,slug) VALUES ('Technology','technology'),('Travel','travel'),('Design','design')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO posts (title,slug,excerpt,content,cover_image,author_id,category_id)
SELECT 'Welcome to InkForge','welcome-to-tier-3-blog','A short tour of this demo blog.',
 'This is a seeded post. Sign in as the demo user or register to create your own posts and comments.',
 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=85',
 u.id,c.id FROM users u, categories c WHERE u.email='demo@example.com' AND c.slug='technology'
AND NOT EXISTS (SELECT 1 FROM posts WHERE slug='welcome-to-tier-3-blog');
