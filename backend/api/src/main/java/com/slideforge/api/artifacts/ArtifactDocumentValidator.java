package com.slideforge.api.artifacts;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class ArtifactDocumentValidator {
    private static final Set<String> TYPES = Set.of(
            "essay", "independent-work", "coursework", "dissertation", "research-article",
            "quiz", "crossword", "thesis-abstract", "glossary", "argumentative-essay");
    private static final Set<String> LANGUAGES = Set.of("en", "ru", "uz");
    private final ObjectMapper mapper;

    public ArtifactDocumentValidator(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public JsonNode normalize(JsonNode input, UUID id, String expectedType) {
        if (input == null || !input.isObject() || !input.path("schemaVersion").canConvertToInt()
                || input.path("schemaVersion").asInt() != 1) {
            throw invalid("Artifact schemaVersion must be 1");
        }
        String type = input.path("type").asText("");
        String title = input.path("title").asText("").strip();
        String language = input.path("language").asText("");
        if (!TYPES.contains(type) || (expectedType != null && !expectedType.equals(type))) {
            throw invalid("Unsupported or mismatched artifact type");
        }
        if (title.isBlank() || title.length() > 200) throw invalid("Artifact title is invalid");
        if (!LANGUAGES.contains(language)) throw invalid("Artifact language is invalid");
        JsonNode sections = input.path("sections");
        if (!sections.isArray() || sections.isEmpty() || sections.size() > 100) {
            throw invalid("Artifact must contain 1 to 100 sections");
        }
        for (JsonNode section : sections) {
            if (!section.path("id").isTextual() || section.path("id").asText().isBlank()
                    || !section.path("heading").isTextual() || section.path("heading").asText().length() > 300
                    || !section.path("body").isTextual() || section.path("body").asText().length() > 30000) {
                throw invalid("Artifact section is invalid");
            }
        }
        if ("quiz".equals(type)) validateQuiz(input.path("questions"));
        else if (input.has("questions")) throw invalid("Only quizzes may contain questions");
        if ("crossword".equals(type)) validateCrossword(input.path("crossword"));
        else if (input.has("crossword")) throw invalid("Only crosswords may contain a grid");
        ObjectNode result = (ObjectNode) input.deepCopy();
        result.put("id", id.toString());
        result.put("title", title);
        return result;
    }

    private void validateQuiz(JsonNode questions) {
        if (!questions.isArray() || questions.isEmpty() || questions.size() > 100) {
            throw invalid("Quiz must contain 1 to 100 questions");
        }
        for (JsonNode question : questions) {
            JsonNode options = question.path("options");
            int answer = question.path("answerIndex").asInt(-1);
            if (!question.path("id").isTextual() || question.path("id").asText().isBlank()
                    || !question.path("question").isTextual() || question.path("question").asText().isBlank()
                    || !options.isArray() || options.size() < 2 || options.size() > 8
                    || answer < 0 || answer >= options.size()) {
                throw invalid("Quiz question is invalid");
            }
            if (question.has("explanation")
                    && !question.path("explanation").isMissingNode()
                    && !question.path("explanation").isTextual()) {
                throw invalid("Quiz explanation is invalid");
            }
            for (JsonNode option : options) {
                if (!option.isTextual() || option.asText().isBlank()) throw invalid("Quiz options are invalid");
            }
        }
    }

    private void validateCrossword(JsonNode puzzle) {
        int rows = puzzle.path("rows").asInt(-1);
        int columns = puzzle.path("columns").asInt(-1);
        JsonNode entries = puzzle.path("entries");
        if (rows < 3 || rows > 30 || columns < 3 || columns > 30
                || !entries.isArray() || entries.isEmpty() || entries.size() > 100) {
            throw invalid("Crossword grid or entries are invalid");
        }
        java.util.Map<String, Integer> occupied = new java.util.HashMap<>();
        for (JsonNode entry : entries) {
            String answer = entry.path("answer").asText("").strip();
            int[] letters = answer.toUpperCase(java.util.Locale.ROOT).codePoints().toArray();
            String direction = entry.path("direction").asText("");
            int row = entry.path("row").asInt(-1);
            int column = entry.path("column").asInt(-1);
            boolean hasLetters = !answer.isEmpty() && answer.codePoints().allMatch(Character::isLetter);
            if (!entry.path("id").isTextual() || entry.path("id").asText().isBlank()
                    || !entry.path("clue").isTextual() || entry.path("clue").asText().isBlank() || !hasLetters
                    || row < 0 || column < 0
                    || !Set.of("across", "down").contains(direction)
                    || row + ("down".equals(direction) ? letters.length - 1 : 0) >= rows
                    || column + ("across".equals(direction) ? letters.length - 1 : 0) >= columns) {
                throw invalid("Crossword entry is invalid");
            }
            for (int offset = 0; offset < letters.length; offset++) {
                int cellRow = row + ("down".equals(direction) ? offset : 0);
                int cellColumn = column + ("across".equals(direction) ? offset : 0);
                String key = cellRow + "-" + cellColumn;
                Integer previous = occupied.putIfAbsent(key, letters[offset]);
                if (previous != null && previous != letters[offset]) {
                    throw invalid("Crossword answers contain conflicting letters");
                }
            }
        }
    }

    private IllegalArgumentException invalid(String message) {
        return new IllegalArgumentException(message);
    }
}
