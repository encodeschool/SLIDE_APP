-- Marketplace listings snapshot the existing canonical presentation document.
-- Existing V2 file-backed rows remain readable but are not exposed by this API.
ALTER TABLE listing_versions
    ADD COLUMN IF NOT EXISTS document JSONB,
    ADD COLUMN IF NOT EXISTS title VARCHAR(200),
    ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE listings
    ADD COLUMN IF NOT EXISTS current_version INT NOT NULL DEFAULT 1;

ALTER TABLE listings
    DROP CONSTRAINT IF EXISTS listings_status_check,
    ADD CONSTRAINT listings_status_check
        CHECK (status IN ('DRAFT','SUBMITTED','IN_REVIEW','PUBLISHED','REJECTED','SUSPENDED','ARCHIVED'));

CREATE INDEX IF NOT EXISTS idx_listings_published_catalog
    ON listings(updated_at DESC, id)
    WHERE status = 'PUBLISHED';
