package com.slideforge.api.generations;

import com.fasterxml.jackson.databind.JsonNode;

public interface GenerationProvider {
    boolean isConfigured();

    JsonNode generate(String prompt, String language, int slideCount);
}
