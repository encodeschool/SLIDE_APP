package com.slideforge.api.exports;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CreateExportRequest(
        @NotBlank @Pattern(regexp = "pptx|pdf") String format,
        @Min(1) Integer version) {
    public ExportFormat exportFormat() {
        return ExportFormat.valueOf(format.toUpperCase());
    }
}