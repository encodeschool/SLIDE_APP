CREATE TABLE generation_jobs (
    id              UUID PRIMARY KEY,
    owner_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prompt          VARCHAR(4000) NOT NULL,
    language        VARCHAR(5) NOT NULL CHECK (language IN ('en','ru')),
    slide_count     INT NOT NULL CHECK (slide_count BETWEEN 1 AND 20),
    status          VARCHAR(20) NOT NULL CHECK (status IN ('QUEUED','RUNNING','SUCCEEDED','FAILED')),
    result_document JSONB,
    failure_code    VARCHAR(40),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_generation_jobs_queue ON generation_jobs(status, created_at);
CREATE INDEX idx_generation_jobs_owner ON generation_jobs(owner_id, created_at DESC);
