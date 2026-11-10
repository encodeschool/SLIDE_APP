ALTER TABLE marketplace_categories
    ADD COLUMN display_name_ru VARCHAR(80) NOT NULL DEFAULT '',
    ADD COLUMN display_name_uz VARCHAR(80) NOT NULL DEFAULT '';

UPDATE marketplace_categories
SET display_name_ru = CASE slug
        WHEN 'business' THEN 'Бизнес'
        WHEN 'education' THEN 'Образование'
        WHEN 'marketing' THEN 'Маркетинг'
        WHEN 'technology' THEN 'Технологии'
        ELSE 'Другое'
    END,
    display_name_uz = CASE slug
        WHEN 'business' THEN 'Biznes'
        WHEN 'education' THEN 'Ta’lim'
        WHEN 'marketing' THEN 'Marketing'
        WHEN 'technology' THEN 'Texnologiya'
        ELSE 'Boshqa'
    END;

ALTER TABLE generation_jobs
    DROP CONSTRAINT generation_jobs_language_check,
    ADD CONSTRAINT generation_jobs_language_check
        CHECK (language IN ('en', 'ru', 'uz'));
