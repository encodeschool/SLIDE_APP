CREATE TABLE marketplace_categories (
    slug VARCHAR(40) PRIMARY KEY,
    display_name VARCHAR(80) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO marketplace_categories (slug, display_name) VALUES
    ('business', 'Business'),
    ('education', 'Education'),
    ('marketing', 'Marketing'),
    ('technology', 'Technology'),
    ('other', 'Other')
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE listings
    ADD COLUMN category VARCHAR(40) NOT NULL DEFAULT 'other'
        REFERENCES marketplace_categories(slug);

CREATE TABLE marketplace_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    preferred_category VARCHAR(40) REFERENCES marketplace_categories(slug),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_listings_category_catalog
    ON listings(category, updated_at DESC, id)
    WHERE status = 'PUBLISHED';
