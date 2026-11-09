---
name: slideforge-project-mapping
description: "Create or update Mermaid charts and concise handoff maps for Slideforge. Use when mapping project architecture, app and service relationships, data flows, API journeys, entities, roadmap status, or deciding where to continue without reading the whole repository."
---

# Slideforge Project Mapping

Create source-grounded diagrams and compact continuation notes so future work can start from the project map instead of rereading the repository.

## Start with the map

1. Read `docs/CONTINUATION.md`, `docs/PROJECT_MAP.md`, and `docs/ROADMAP.md`.
2. Read `docs/ARCHITECTURE.md` and the relevant API, data model, development, or security document for the requested diagram.
3. Inspect only the code paths needed to verify or update the requested part of the map. Do not scan the whole repository by default.
4. Treat checked-in code and tests as evidence for implemented behavior. Mark roadmap-only or unverified behavior as planned; never infer that a feature works from a diagram or old note.

## Choose a diagram

- Use a Mermaid `flowchart` for components, ownership boundaries, and dependencies.
- Use a Mermaid `sequenceDiagram` for a specific user/API/job workflow.
- Use Mermaid `erDiagram` for persisted entities and relationships; cross-check `docs/ERD.md` and migrations.
- Keep diagrams focused. Split unrelated concerns rather than drawing every module in one chart.
- Label implemented and planned paths clearly. Use solid edges for verified behavior and dashed edges for planned behavior.
- Add a short component/path/status table when it helps readers locate implementation without opening unrelated folders.

## Update project knowledge

When project structure or behavior changes:

1. Update `docs/PROJECT_MAP.md` with the verified architecture, key flows, and source locations affected by the change.
2. Update `docs/CONTINUATION.md` with the new checkpoint, validation performed, blockers, and one specific next task with likely entry points.
3. Reconcile phase status and checkpoint claims in `docs/ROADMAP.md`; keep `README.md`'s current checkpoint consistent when user-facing capabilities change.
4. Keep notes concise and link to focused docs or code rather than copying their contents.
5. Validate Mermaid syntax by checking balanced fences and reviewing node/edge references. Run project tests only when code changed.

## Continuation handoff format

Record:

- Current phase and the last completed, verified slice.
- Exact next task and why it is next.
- Likely entry points (paths) and the related test command.
- Known blockers or required local services.
- Tests/checks run and whether they passed.

Do not write a generic todo list or claim a task is complete without evidence.
