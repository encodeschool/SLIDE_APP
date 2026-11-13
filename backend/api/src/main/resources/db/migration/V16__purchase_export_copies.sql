ALTER TABLE entitlements
    ADD COLUMN copied_presentation_id UUID REFERENCES presentations(id);

CREATE UNIQUE INDEX uq_entitlements_copied_presentation
    ON entitlements(copied_presentation_id)
    WHERE copied_presentation_id IS NOT NULL;
