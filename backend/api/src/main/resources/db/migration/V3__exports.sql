CREATE TABLE export_jobs (
    id              UUID PRIMARY KEY,
    owner_id        UUID NOT NULL REFERENCES users(id),
    presentation_id  UUID NOT NULL REFERENCES presentations(id),
    version          INT NOT NULL CHECK (version > 0),
    export_format    VARCHAR(8) NOT NULL CHECK (export_format IN ('PPTX','PDF')),
    status           VARCHAR(20) NOT NULL CHECK (status IN ('QUEUED','RUNNING','SUCCEEDED','FAILED')),
    file_path        TEXT,
    failure_code     VARCHAR(40),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_export_jobs_queue ON export_jobs(status, created_at);
CREATE INDEX idx_export_jobs_owner ON export_jobs(owner_id, created_at DESC);