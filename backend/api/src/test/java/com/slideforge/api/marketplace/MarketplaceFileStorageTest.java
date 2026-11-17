package com.slideforge.api.marketplace;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.slideforge.api.common.exception.ApiException;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

class MarketplaceFileStorageTest {
    @TempDir
    Path storagePath;

    @Test
    void storesPdfWithPrivateRandomKeyAndSanitizedFileName() throws Exception {
        MarketplaceFileStorage storage = new MarketplaceFileStorage(storagePath.toString());
        byte[] content = "%PDF-1.7\nsample".getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        MockMultipartFile upload = new MockMultipartFile(
                "file", "C:\\private\\client-report.pdf", "application/pdf", content);

        StoredMarketplaceFile stored = storage.store(upload, "document");

        assertEquals("client-report.pdf", stored.fileName());
        assertTrue(stored.objectKey().matches("^[0-9a-f-]{36}\\.pdf$"));
        assertEquals(HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content)), stored.sha256());
        assertArrayEquals(content, Files.readAllBytes(storage.resolveStoredFile(stored.objectKey())));
        storage.delete(stored.objectKey());
        assertFalse(Files.exists(storagePath.resolve(stored.objectKey())));
    }

    @Test
    void acceptsValidOoxmlForMatchingWorkTypeAndRejectsMacroPackages() throws Exception {
        MarketplaceFileStorage storage = new MarketplaceFileStorage(storagePath.toString());
        byte[] document = zipWithEntries("word/document.xml");

        StoredMarketplaceFile stored = storage.store(
                new MockMultipartFile("file", "lesson.docx", "application/vnd.openxmlformats", document),
                "document");
        assertTrue(Files.exists(storage.resolveStoredFile(stored.objectKey())));

        byte[] macroDocument = zipWithEntries("word/document.xml", "word/vbaProject.bin");
        ApiException error = assertThrows(
                ApiException.class,
                () -> storage.store(
                        new MockMultipartFile("file", "lesson.docx", "application/vnd.openxmlformats", macroDocument),
                        "document"));
        assertEquals("FILE_CONTENT_MISMATCH", error.getCode());
    }

    @Test
    void rejectsUnsupportedWorkFormatAndMismatchedContent() {
        MarketplaceFileStorage storage = new MarketplaceFileStorage(storagePath.toString());
        ApiException unsupported = assertThrows(
                ApiException.class,
                () -> storage.store(
                        new MockMultipartFile("file", "sheet.xlsx", "application/pdf", "%PDF-1.7".getBytes()),
                        "document"));
        assertEquals(HttpStatus.BAD_REQUEST, unsupported.getStatus());
        assertEquals("UNSUPPORTED_FILE_TYPE", unsupported.getCode());

        ApiException mismatch = assertThrows(
                ApiException.class,
                () -> storage.store(
                        new MockMultipartFile("file", "report.pdf", "application/pdf", "not a pdf".getBytes()),
                        "document"));
        assertEquals("FILE_CONTENT_MISMATCH", mismatch.getCode());
    }

    @Test
    void rejectsUploadsLargerThanTwentyFiveMibBeforeReadingThem() {
        MultipartFile oversized = mock(MultipartFile.class);
        when(oversized.isEmpty()).thenReturn(false);
        when(oversized.getOriginalFilename()).thenReturn("report.pdf");
        when(oversized.getSize()).thenReturn(MarketplaceFileStorage.MAX_FILE_SIZE_BYTES + 1);
        MarketplaceFileStorage storage = new MarketplaceFileStorage(storagePath.toString());

        ApiException error = assertThrows(ApiException.class, () -> storage.store(oversized, "document"));

        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, error.getStatus());
        assertEquals("FILE_TOO_LARGE", error.getCode());
    }

    private byte[] zipWithEntries(String... names) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(output)) {
            for (String name : names) {
                zip.putNextEntry(new ZipEntry(name));
                zip.write(new byte[] {1});
                zip.closeEntry();
            }
        }
        return output.toByteArray();
    }
}
