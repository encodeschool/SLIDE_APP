package com.slideforge.api.common;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/status")
public class StatusController {
    @GetMapping
    public Map<String, String> getStatus() {
        return Map.of("application", "slideforge-api", "status", "available");
    }
}