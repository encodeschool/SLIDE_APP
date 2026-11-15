import { useEffect, useMemo, useState } from "react";
import type { ArtifactDocument, ArtifactSection, ArtifactType, CrosswordEntry, QuizQuestion } from "../../../../../packages/shared-types/src/artifact.ts";
import { authorizedFetch } from "../../shared/api/client";
import type { AuthResponse, Locale } from "../../shared/types";
import { artifactWorkspaceCopy } from "../../i18n/artifacts";
import { generationTypeNames } from "../../i18n/generation";

interface ArtifactSummary {
  id: string;
  type: ArtifactType;
  title: string;
  language: Locale;
  currentVersion: number;
  updatedAt: string;
}

interface ArtifactWorkspaceProps {
  locale: Locale;
  token: string;
  initialDraft: ArtifactDocument | null;
  onSession: (session: AuthResponse) => void;
  onExpired: () => void;
}

export function ArtifactWorkspace({ locale, token, initialDraft, onSession, onExpired }: ArtifactWorkspaceProps) {
  const copy = artifactWorkspaceCopy[locale];
  const typeNames = generationTypeNames[locale];
  const [artifacts, setArtifacts] = useState<ArtifactSummary[]>([]);
  const [document, setDocument] = useState<ArtifactDocument | null>(null);
  const [saved, setSaved] = useState<ArtifactSummary | null>(null);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, number>>({});
  const [crosswordAnswers, setCrosswordAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const send = (path: string, init: RequestInit = {}) =>
    authorizedFetch(path, token, init, onSession, onExpired);

  async function loadLibrary() {
    try {
      const response = await send("/api/v1/artifacts?page=0&size=50");
      if (!response.ok) throw new Error(copy.loadError);
      const result = await response.json() as { items: ArtifactSummary[] };
      setArtifacts(result.items);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.loadError);
    }
  }

  useEffect(() => { void loadLibrary(); }, [token]);

  useEffect(() => {
    if (!initialDraft) return;
    setDocument(initialDraft);
    setSaved(null);
    setDraftAnswers({});
    setCrosswordAnswers({});
    setMessage("");
  }, [initialDraft]);

  async function openArtifact(summary: ArtifactSummary) {
    setLoading(true);
    setMessage("");
    try {
      const response = await send(`/api/v1/artifacts/${summary.id}`);
      if (!response.ok) throw new Error(copy.openError);
      const result = await response.json() as { document: ArtifactDocument } & ArtifactSummary;
      setDocument(result.document);
      setSaved(summary);
      setDraftAnswers({});
      setCrosswordAnswers({});
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.openError);
    } finally {
      setLoading(false);
    }
  }

  async function saveArtifact() {
    if (!document) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await send(saved ? `/api/v1/artifacts/${saved.id}` : "/api/v1/artifacts", {
        method: saved ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saved
          ? { expectedVersion: saved.currentVersion, document }
          : { type: document.type, title: document.title, language: document.language, document }),
      });
      if (!response.ok) {
        const problem = await response.json().catch(() => null) as { detail?: string } | null;
        throw new Error(problem?.detail ?? copy.saveError);
      }
      const result = await response.json() as { document: ArtifactDocument } & ArtifactSummary;
      setDocument(result.document);
      const summary = { id: result.id, type: result.type, title: result.title, language: result.language,
        currentVersion: result.currentVersion, updatedAt: result.updatedAt };
      setSaved(summary);
      setArtifacts((items) => [summary, ...items.filter((item) => item.id !== summary.id)]);
      setMessage(copy.savedVersion.replace("{version}", String(summary.currentVersion)));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function exportArtifact(format: "docx" | "pdf") {
    if (!saved) return;
    try {
      const response = await send(`/api/v1/artifacts/${saved.id}/exports/${format}?version=${saved.currentVersion}`);
      if (!response.ok) throw new Error(copy.exportError.replace("{format}", format.toUpperCase()));
      const file = await response.blob();
      const url = URL.createObjectURL(file);
      const anchor = Object.assign(window.document.createElement("a"), { href: url, download: `${document?.title ?? "artifact"}.${format}` });
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.exportFailed);
    }
  }

  const cells = useMemo(() => {
    if (document?.type !== "crossword" || !document.crossword) return [];
    const map = new Map<string, { answer: string; entries: string[] }>();
    for (const entry of document.crossword.entries) {
      [...entry.answer.toUpperCase()].forEach((letter, index) => {
        const row = entry.row + (entry.direction === "down" ? index : 0);
        const column = entry.column + (entry.direction === "across" ? index : 0);
        const key = `${row}-${column}`;
        const cell = map.get(key) ?? { answer: letter, entries: [] };
        cell.entries.push(entry.id);
        map.set(key, cell);
      });
    }
    return Array.from({ length: document.crossword.rows }, (_, row) =>
      Array.from({ length: document.crossword!.columns }, (_, column) => map.get(`${row}-${column}`) ?? null));
  }, [document]);

  function updateSection(index: number, patch: Partial<ArtifactSection>) {
    if (!document) return;
    setDocument({ ...document, sections: document.sections.map((section, at) => at === index ? { ...section, ...patch } : section) });
  }

  function updateQuestion(index: number, patch: Partial<QuizQuestion>) {
    if (!document?.questions) return;
    setDocument({ ...document, questions: document.questions.map((question, at) => at === index ? { ...question, ...patch } : question) });
  }

  function updateEntry(index: number, patch: Partial<CrosswordEntry>) {
    if (!document?.crossword) return;
    setDocument({ ...document, crossword: { ...document.crossword,
      entries: document.crossword.entries.map((entry, at) => at === index ? { ...entry, ...patch } : entry) } });
  }

  return (
    <section className="projects-section artifact-workspace" aria-labelledby="artifact-create-title">
      <div className="projects-header">
        <div><h2 id="artifact-create-title">{copy.title}</h2>
          <p>{copy.intro}</p></div>
      </div>
      {artifacts.length === 0 ? <p>{copy.empty}</p> : (
        <ul className="project-list">{artifacts.map((item) => (
          <li className="project-row" key={item.id}>
            <span className="project-title"><strong>{item.title}</strong><small>{typeNames[item.type]} · v{item.currentVersion}</small></span>
            <button type="button" className="text-button" disabled={loading} onClick={() => void openArtifact(item)}>
              {loading ? copy.opening : copy.open}
            </button>
          </li>
        ))}</ul>
      )}
      {message && <p role="status">{message}</p>}

      {document && (
        <div className="artifact-editor">
          <h3>{saved ? copy.editSaved : copy.editDraft}</h3>
          <label>{copy.documentTitle}<input value={document.title} maxLength={200} onChange={(event) => setDocument({ ...document, title: event.target.value })} /></label>
          {document.sections.map((section, index) => (
            <fieldset key={section.id}>
              <legend>{copy.section} {index + 1}</legend>
              <label>{copy.heading}<input value={section.heading} onChange={(event) => updateSection(index, { heading: event.target.value })} /></label>
              <label>{copy.text}<textarea rows={5} value={section.body} onChange={(event) => updateSection(index, { body: event.target.value })} /></label>
            </fieldset>
          ))}
          {document.type === "quiz" && document.questions && (
            <section aria-label={copy.interactiveQuiz}>
              <h4>{copy.tryQuiz}</h4>
              {document.questions.map((question, index) => (
                <fieldset key={question.id}>
                  <legend>{index + 1}. {question.question}</legend>
                  {question.options.map((option, optionIndex) => (
                    <label key={`${question.id}-${optionIndex}`} style={{ display: "block" }}>
                      <input type="radio" name={`play-${question.id}`} checked={draftAnswers[question.id] === optionIndex}
                        onChange={() => setDraftAnswers({ ...draftAnswers, [question.id]: optionIndex })} />
                      {option}
                    </label>
                  ))}
                  <label>{copy.editQuestion}<input value={question.question} onChange={(event) => updateQuestion(index, { question: event.target.value })} /></label>
                  {question.options.map((option, optionIndex) => (
                    <label key={`edit-${question.id}-${optionIndex}`}>{copy.option} {optionIndex + 1}
                      <input value={option} onChange={(event) => updateQuestion(index, {
                        options: question.options.map((value, at) => at === optionIndex ? event.target.value : value),
                      })} />
                    </label>
                  ))}
                  <label>{copy.correctAnswer}
                    <select value={question.answerIndex} onChange={(event) => updateQuestion(index, { answerIndex: Number(event.target.value) })}>
                      {question.options.map((option, at) => <option key={at} value={at}>{option}</option>)}
                    </select>
                  </label>
                  {draftAnswers[question.id] !== undefined && <p role="status">
                    {draftAnswers[question.id] === question.answerIndex ? copy.correct : copy.tryAgain}
                    {question.explanation ? ` — ${question.explanation}` : ""}
                  </p>}
                </fieldset>
              ))}
            </section>
          )}
          {document.type === "crossword" && document.crossword && (
            <section aria-label={copy.interactiveCrossword}>
              <h4>{copy.crossword}</h4>
              <div role="grid" aria-label={copy.crosswordGrid} style={{ display: "grid", gridTemplateColumns: `repeat(${document.crossword.columns}, 2rem)`, gap: 2, width: "max-content" }}>
                {cells.flatMap((row, rowIndex) => row.map((cell, columnIndex) => (
                  <div role="gridcell" key={`${rowIndex}-${columnIndex}`}
                    style={{ width: "2rem", height: "2rem", background: cell ? "white" : "#37413b", border: "1px solid #87938a" }}>
                    {cell && <input aria-label={copy.rowColumn.replace("{row}", String(rowIndex + 1)).replace("{column}", String(columnIndex + 1))} maxLength={1}
                      value={crosswordAnswers[`${rowIndex}-${columnIndex}`] ?? ""}
                      onChange={(event) => setCrosswordAnswers({ ...crosswordAnswers, [`${rowIndex}-${columnIndex}`]: event.target.value.toUpperCase() })}
                      style={{ width: "100%", height: "100%", padding: 0, textAlign: "center", border: 0 }} />}
                  </div>
                )))}
              </div>
              <ol>{document.crossword.entries.map((entry, index) => (
                <li key={entry.id}>
                  {entry.direction === "across" ? copy.across : copy.down}: {entry.clue}
                  <label>{copy.editClue}<input value={entry.clue} onChange={(event) => updateEntry(index, { clue: event.target.value })} /></label>
                  <label>{copy.answerKey}<input value={entry.answer} onChange={(event) => updateEntry(index, { answer: event.target.value.toUpperCase() })} /></label>
                  <span>{[...entry.answer.toUpperCase()].every((letter, at) => {
                    const row = entry.row + (entry.direction === "down" ? at : 0);
                    const column = entry.column + (entry.direction === "across" ? at : 0);
                    return (crosswordAnswers[`${row}-${column}`] ?? "").toUpperCase() === letter;
                  }) ? " ✓" : ""}</span>
                </li>
              ))}</ol>
            </section>
          )}
          <div className="editor-actions">
            <button className="primary-button" type="button" disabled={saving} onClick={() => void saveArtifact()}>
              {saving ? copy.saving : saved ? copy.saveVersion : copy.save}
            </button>
            {saved && <>
              <button className="text-button" type="button" onClick={() => void exportArtifact("docx")}>{copy.downloadDocx}</button>
              <button className="text-button" type="button" onClick={() => void exportArtifact("pdf")}>{copy.downloadPdf}</button>
            </>}
          </div>
        </div>
      )}
    </section>
  );
}
