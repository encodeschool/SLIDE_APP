package com.slideforge.api.common;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;

import com.slideforge.api.common.config.SecurityConfiguration;
import com.slideforge.api.common.config.WebCorsConfiguration;
import com.slideforge.api.common.controller.StatusController;
import com.slideforge.api.users.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(StatusController.class)
@Import({SecurityConfiguration.class, com.slideforge.api.auth.JwtConfiguration.class, WebCorsConfiguration.class})
class StatusControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserRepository userRepository;

    @Test
    void returnsApiAvailability() throws Exception {
        mockMvc.perform(get("/api/v1/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.application").value("slideforge-api"))
                .andExpect(jsonPath("$.status").value("available"));
    }

    @Test
    void allowsConfiguredWebClientOrigin() throws Exception {
        mockMvc.perform(get("/api/v1/status").header("Origin", "http://localhost:5174"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5174"));
    }

    @Test
    void allowsViteLoopbackOrigin() throws Exception {
        mockMvc.perform(get("/api/v1/status").header("Origin", "http://127.0.0.1:5173"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://127.0.0.1:5173"));
    }
}