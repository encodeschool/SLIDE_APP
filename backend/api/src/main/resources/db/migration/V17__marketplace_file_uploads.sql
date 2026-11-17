ALTER TABLE listing_versions
    ADD COLUMN work_type VARCHAR(20) NOT NULL DEFAULT 'presentation'
        CHECK (work_type IN ('presentation', 'document', 'coursework', 'worksheet', 'design', 'other')),
    ADD COLUMN file_name VARCHAR(255),
    ADD COLUMN file_size BIGINT,
    ADD CONSTRAINT listing_versions_file_metadata_complete
        CHECK (
            (file_name IS NULL AND file_size IS NULL)
            OR (file_name IS NOT NULL AND file_size BETWEEN 1 AND 26214400)
        );
