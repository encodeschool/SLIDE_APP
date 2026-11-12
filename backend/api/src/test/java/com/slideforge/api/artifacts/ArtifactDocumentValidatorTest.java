package com.slideforge.api.artifacts;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ArtifactDocumentValidatorTest {
    private final ArtifactDocumentValidator validator = new ArtifactDocumentValidator(new ObjectMapper());

    @Test
    void normalizesAnEditableEssayWithoutChangingItsArtifactType() throws Exception {
        var id = UUID.randomUUID();
        var input = new ObjectMapper().readTree("""
                {"schemaVersion":1,"id":"draft","type":"essay","title":"  A study  ","language":"en",
                 "sections":[{"id":"s1","heading":"Opening","body":"Editable text"}]}
                """);
        var result = validator.normalize(input, id, "essay");
        assertEquals(id.toString(), result.path("id").asText());
        assertEquals("A study", result.path("title").asText());
        assertEquals("essay", result.path("type").asText());
    }

    @Test
    void rejectsQuizWithoutValidCorrectAnswer() throws Exception {
        var input = new ObjectMapper().readTree("""
                {"schemaVersion":1,"id":"draft","type":"quiz","title":"Quiz","language":"en",
                 "sections":[{"id":"s1","heading":"","body":"Practice"}],
                 "questions":[{"id":"q1","question":"Pick one","options":["A","B"],"answerIndex":2}]}
                """);
        assertThrows(IllegalArgumentException.class, () -> validator.normalize(input, UUID.randomUUID(), "quiz"));
    }

    @Test
    void rejectsCrosswordAnswerOutsideGridAndTypeMismatch() throws Exception {
        var input = new ObjectMapper().readTree("""
                {"schemaVersion":1,"id":"draft","type":"crossword","title":"Grid","language":"uz",
                 "sections":[{"id":"s1","heading":"","body":"Clues"}],
                 "crossword":{"rows":3,"columns":3,"entries":[
                   {"id":"e1","clue":"Ocean","answer":"OCEAN","row":0,"column":0,"direction":"across"}]}}
                """);
        assertThrows(IllegalArgumentException.class, () -> validator.normalize(input, UUID.randomUUID(), "crossword"));
        assertThrows(IllegalArgumentException.class, () -> validator.normalize(input, UUID.randomUUID(), "essay"));
    }

    @Test
    void rejectsConflictingCrosswordLetters() throws Exception {
        var input = new ObjectMapper().readTree("""
                {"schemaVersion":1,"id":"draft","type":"crossword","title":"Grid","language":"en",
                 "sections":[{"id":"s1","heading":"","body":"Clues"}],
                 "crossword":{"rows":5,"columns":5,"entries":[
                   {"id":"e1","clue":"Across","answer":"CAT","row":0,"column":0,"direction":"across"},
                   {"id":"e2","clue":"Down","answer":"DOG","row":0,"column":1,"direction":"down"}]}}
                """);
        assertThrows(IllegalArgumentException.class, () -> validator.normalize(input, UUID.randomUUID(), "crossword"));
    }
}
