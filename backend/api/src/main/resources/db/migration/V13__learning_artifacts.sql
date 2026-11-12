CREATE TABLE learning_artifacts (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    artifact_type VARCHAR(32) NOT NULL CHECK (artifact_type IN (
        'essay','independent-work','coursework','dissertation','research-article',
        'quiz','crossword','thesis-abstract','glossary','argumentative-essay'
    )),
    title VARCHAR(200) NOT NULL,
    language VARCHAR(5) NOT NULL CHECK (language IN ('en','ru','uz')),
    current_version INT NOT NULL CHECK (current_version >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_learning_artifacts_owner ON learning_artifacts(owner_id, updated_at DESC);

CREATE TABLE learning_artifact_versions (
    artifact_id UUID NOT NULL REFERENCES learning_artifacts(id) ON DELETE CASCADE,
    version INT NOT NULL CHECK (version >= 1),
    document JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (artifact_id, version)
);
