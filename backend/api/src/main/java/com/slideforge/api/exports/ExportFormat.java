package com.slideforge.api.exports;

public enum ExportFormat {
    PPTX("pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
    PDF("pdf", "application/pdf");

    private final String extension;
    private final String contentType;

    ExportFormat(String extension, String contentType) {
        this.extension = extension;
        this.contentType = contentType;
    }

    public String extension() {
        return extension;
    }

    public String contentType() {
        return contentType;
    }

    public String rendererPath() {
        return extension;
    }
}