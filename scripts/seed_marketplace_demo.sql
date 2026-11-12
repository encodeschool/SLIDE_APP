-- Local-only, repeatable sample catalog data. Requires Flyway migrations through V12.
-- The seller account has no usable password and is only a catalog display record.
BEGIN;

WITH demo_seller AS (
    INSERT INTO users (
        id, email, password_hash, display_name, locale, email_verified, status
    )
    VALUES (
        'f1000000-0000-4000-8000-000000000001',
        'marketplace-demo-seller@slideforge.local',
        '!disabled-demo-account',
        'Slideforge Demo Studio',
        'en',
        FALSE,
        'ACTIVE'
    )
    ON CONFLICT (email) DO UPDATE
        SET display_name = EXCLUDED.display_name
    RETURNING id
)
INSERT INTO user_roles (user_id, role)
SELECT id, 'SELLER' FROM demo_seller
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO listings (
    id, seller_id, title, description, category, status, current_version,
    created_at, updated_at
)
SELECT samples.id, seller.id, samples.title, samples.description,
       samples.category, 'PUBLISHED', 1, now(), now()
FROM (
    VALUES
      ('f2000000-0000-4000-8000-000000000001'::uuid, 'Investor pitch deck',
       'A polished, editable startup funding presentation.', 'business'),
      ('f2000000-0000-4000-8000-000000000002'::uuid, 'Learning roadmap',
       'A clear curriculum plan for a modern learning program.', 'education'),
      ('f2000000-0000-4000-8000-000000000003'::uuid, 'Brand launch strategy',
       'A practical launch plan with campaign milestones.', 'marketing')
) AS samples(id, title, description, category)
CROSS JOIN (
    SELECT id FROM users
    WHERE email = 'marketplace-demo-seller@slideforge.local'
) AS seller
ON CONFLICT (id) DO UPDATE SET
    seller_id = EXCLUDED.seller_id,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    status = 'PUBLISHED',
    current_version = 1,
    updated_at = now();

INSERT INTO listing_versions (
    id, listing_id, version, price_tiyin, currency, file_object_key,
    file_sha256, license_terms, document, title, description, created_at
)
VALUES
(
    'f3000000-0000-4000-8000-000000000001',
    'f2000000-0000-4000-8000-000000000001', 1, 1299000, 'UZS',
    'demo/catalog/investor-pitch-deck.json', repeat('0', 64),
    'Demo license: editable for your own projects. No resale or redistribution of the source file.',
    '{
      "schemaVersion": 1,
      "id": "f2000000-0000-4000-8000-000000000001",
      "title": "Investor pitch deck",
      "language": "en",
      "size": {"width": 1280, "height": 720},
      "slides": [
        {"id":"pitch-1","title":"Investor pitch deck","backgroundColor":"#F3F5F1","accentColor":"#28765D","elements":[{"id":"pitch-text-1","type":"text","x":64,"y":100,"w":1000,"h":120,"text":"A compelling opportunity for long-term growth."}]},
        {"id":"pitch-2","title":"The opportunity","backgroundColor":"#F4F0E8","accentColor":"#8A6945","elements":[{"id":"pitch-text-2","type":"text","x":64,"y":100,"w":1000,"h":120,"text":"A clear market need and a focused solution."}]},
        {"id":"pitch-3","title":"Growth plan","backgroundColor":"#EDF1F5","accentColor":"#526C89","elements":[{"id":"pitch-text-3","type":"text","x":64,"y":100,"w":1000,"h":120,"text":"Milestones, metrics, and the next steps."}]}
      ]
    }'::jsonb,
    'Investor pitch deck',
    'A polished, editable startup funding presentation.',
    now()
),
(
    'f3000000-0000-4000-8000-000000000002',
    'f2000000-0000-4000-8000-000000000002', 1, 850000, 'UZS',
    'demo/catalog/learning-roadmap.json', repeat('1', 64),
    'Demo license: editable for your own projects. No resale or redistribution of the source file.',
    '{
      "schemaVersion": 1,
      "id": "f2000000-0000-4000-8000-000000000002",
      "title": "Learning roadmap",
      "language": "en",
      "size": {"width": 1280, "height": 720},
      "slides": [
        {"id":"learn-1","title":"Learning roadmap","backgroundColor":"#F3F5F1","accentColor":"#28765D","elements":[{"id":"learn-text-1","type":"text","x":64,"y":100,"w":1000,"h":120,"text":"A practical path from learning goals to confident skills."}]},
        {"id":"learn-2","title":"Learning stages","backgroundColor":"#F4F0E8","accentColor":"#8A6945","elements":[{"id":"learn-text-2","type":"text","x":64,"y":100,"w":1000,"h":120,"text":"Build knowledge through focused, achievable stages."}]},
        {"id":"learn-3","title":"Measure progress","backgroundColor":"#EDF1F5","accentColor":"#526C89","elements":[{"id":"learn-text-3","type":"text","x":64,"y":100,"w":1000,"h":120,"text":"Use feedback and milestones to keep learners moving."}]}
      ]
    }'::jsonb,
    'Learning roadmap',
    'A clear curriculum plan for a modern learning program.',
    now()
),
(
    'f3000000-0000-4000-8000-000000000003',
    'f2000000-0000-4000-8000-000000000003', 1, 990000, 'UZS',
    'demo/catalog/brand-launch-strategy.json', repeat('2', 64),
    'Demo license: editable for your own projects. No resale or redistribution of the source file.',
    '{
      "schemaVersion": 1,
      "id": "f2000000-0000-4000-8000-000000000003",
      "title": "Brand launch strategy",
      "language": "en",
      "size": {"width": 1280, "height": 720},
      "slides": [
        {"id":"brand-1","title":"Brand launch strategy","backgroundColor":"#F3F5F1","accentColor":"#28765D","elements":[{"id":"brand-text-1","type":"text","x":64,"y":100,"w":1000,"h":120,"text":"A coordinated plan to introduce a memorable new brand."}]},
        {"id":"brand-2","title":"Campaign milestones","backgroundColor":"#F4F0E8","accentColor":"#8A6945","elements":[{"id":"brand-text-2","type":"text","x":64,"y":100,"w":1000,"h":120,"text":"Align launch activities, channels, and key dates."}]},
        {"id":"brand-3","title":"Measure impact","backgroundColor":"#EDF1F5","accentColor":"#526C89","elements":[{"id":"brand-text-3","type":"text","x":64,"y":100,"w":1000,"h":120,"text":"Track reach, engagement, and meaningful outcomes."}]}
      ]
    }'::jsonb,
    'Brand launch strategy',
    'A practical launch plan with campaign milestones.',
    now()
)
ON CONFLICT (listing_id, version) DO UPDATE SET
    price_tiyin = EXCLUDED.price_tiyin,
    currency = EXCLUDED.currency,
    file_object_key = EXCLUDED.file_object_key,
    file_sha256 = EXCLUDED.file_sha256,
    license_terms = EXCLUDED.license_terms,
    document = EXCLUDED.document,
    title = EXCLUDED.title,
    description = EXCLUDED.description;

COMMIT;

-- Verify what the public API should expose:
-- SELECT l.id, lv.title, l.category, lv.price_tiyin, lv.currency, u.display_name
-- FROM listings l
-- JOIN listing_versions lv ON lv.listing_id = l.id AND lv.version = l.current_version
-- JOIN users u ON u.id = l.seller_id
-- WHERE l.status = 'PUBLISHED'
--   AND u.email = 'marketplace-demo-seller@slideforge.local'
-- ORDER BY l.id;
