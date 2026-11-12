/**
 * Canonical model for editable written and interactive learning artifacts.
 * Slides remain the separate Deck model; these types are never serialized as decks.
 */
export const artifactTypes = [
  "essay",
  "independent-work",
  "coursework",
  "dissertation",
  "research-article",
  "quiz",
  "crossword",
  "thesis-abstract",
  "glossary",
  "argumentative-essay",
] as const;

export type ArtifactType = (typeof artifactTypes)[number];
export type ArtifactLocale = "en" | "ru" | "uz";

export interface ArtifactSection {
  id: string;
  heading: string;
  body: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation?: string;
}

export interface CrosswordEntry {
  id: string;
  clue: string;
  answer: string;
  row: number;
  column: number;
  direction: "across" | "down";
}

export interface ArtifactDocument {
  schemaVersion: 1;
  id: string;
  type: ArtifactType;
  title: string;
  language: ArtifactLocale;
  sections: ArtifactSection[];
  questions?: QuizQuestion[];
  crossword?: {
    rows: number;
    columns: number;
    entries: CrosswordEntry[];
  };
}

export function isArtifactType(value: unknown): value is ArtifactType {
  return typeof value === "string" && artifactTypes.includes(value as ArtifactType);
}

/** Returns validation errors instead of coercing or silently repairing AI output. */
export function validateArtifact(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return ["Artifact must be an object"];
  const artifact = value as Partial<ArtifactDocument>;
  const errors: string[] = [];
  if (artifact.schemaVersion !== 1) errors.push("Unsupported artifact schemaVersion");
  if (typeof artifact.id !== "string" || artifact.id.length === 0) errors.push("Artifact id is required");
  if (!isArtifactType(artifact.type)) errors.push("Unsupported artifact type");
  if (typeof artifact.title !== "string" || !artifact.title.trim() || artifact.title.length > 200) {
    errors.push("Artifact title must contain 1 to 200 characters");
  }
  if (!["en", "ru", "uz"].includes(artifact.language ?? "")) errors.push("Unsupported artifact language");
  if (!Array.isArray(artifact.sections) || artifact.sections.length < 1 || artifact.sections.length > 100) {
    errors.push("Artifact must contain 1 to 100 sections");
  } else {
    artifact.sections.forEach((section, index) => {
      if (!section || typeof section.id !== "string" || !section.id
        || typeof section.heading !== "string" || section.heading.length > 300
        || typeof section.body !== "string" || section.body.length > 30000) {
        errors.push(`Section ${index + 1} is invalid`);
      }
    });
  }

  if (artifact.type === "quiz") {
    if (!Array.isArray(artifact.questions) || artifact.questions.length < 1 || artifact.questions.length > 100) {
      errors.push("Quiz must contain 1 to 100 questions");
    } else {
      artifact.questions.forEach((question, index) => {
        if (!question || typeof question.id !== "string" || !question.id
          || typeof question.question !== "string" || !question.question.trim()
          || !Array.isArray(question.options) || question.options.length < 2 || question.options.length > 8
          || !Number.isInteger(question.answerIndex) || question.answerIndex < 0
          || question.answerIndex >= question.options.length
          || question.options.some((option) => typeof option !== "string" || !option.trim())
          || (question.explanation !== undefined && typeof question.explanation !== "string")) {
          errors.push(`Quiz question ${index + 1} is invalid`);
        }
      });
    }
  } else if (artifact.questions !== undefined) {
    errors.push("Only quizzes may contain questions");
  }

  if (artifact.type === "crossword") {
    const puzzle = artifact.crossword;
    if (!puzzle || !Number.isInteger(puzzle.rows) || puzzle.rows < 3 || puzzle.rows > 30
      || !Number.isInteger(puzzle.columns) || puzzle.columns < 3 || puzzle.columns > 30
      || !Array.isArray(puzzle.entries) || puzzle.entries.length < 1 || puzzle.entries.length > 100) {
      errors.push("Crossword grid or entries are invalid");
    } else {
      const occupied = new Map<string, string>();
      puzzle.entries.forEach((entry, index) => {
        const answer = typeof entry?.answer === "string" ? entry.answer.trim() : "";
        const letters = [...answer];
        const validDirection = entry?.direction === "across" || entry?.direction === "down";
        const endRow = entry?.row + (entry?.direction === "down" ? letters.length - 1 : 0);
        const endColumn = entry?.column + (entry?.direction === "across" ? letters.length - 1 : 0);
        if (!entry || typeof entry.id !== "string" || !entry.id
          || typeof entry.clue !== "string" || !entry.clue.trim() || !/^[\p{L}]+$/u.test(answer)
          || !Number.isInteger(entry.row) || !Number.isInteger(entry.column) || !validDirection
          || entry.row < 0 || entry.column < 0 || endRow >= puzzle.rows || endColumn >= puzzle.columns) {
          errors.push(`Crossword entry ${index + 1} is invalid`);
          return;
        }
        letters.forEach((letter, offset) => {
          const row = entry.row + (entry.direction === "down" ? offset : 0);
          const column = entry.column + (entry.direction === "across" ? offset : 0);
          const key = `${row}-${column}`;
          if (occupied.has(key) && occupied.get(key) !== letter.toLocaleUpperCase()) {
            errors.push(`Crossword entry ${index + 1} conflicts with another answer`);
          }
          occupied.set(key, letter.toLocaleUpperCase());
        });
      });
    }
  } else if (artifact.crossword !== undefined) {
    errors.push("Only crosswords may contain a crossword grid");
  }
  return errors;
}
