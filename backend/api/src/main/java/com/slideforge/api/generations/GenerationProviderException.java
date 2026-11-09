package com.slideforge.api.generations;

public class GenerationProviderException extends RuntimeException {
    private final String code;

    public GenerationProviderException(String code, String message) {
        super(message);
        this.code = code;
    }

    public GenerationProviderException(String code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
