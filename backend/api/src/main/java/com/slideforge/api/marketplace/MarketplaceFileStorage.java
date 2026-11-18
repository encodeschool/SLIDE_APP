package com.slideforge.api.marketplace;

import com.slideforge.api.common.exception.ApiException;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.Reader;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.Normalizer;
import java.util.Enumeration;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import java.util.zip.ZipException;
import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamReader;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class MarketplaceFileStorage {
    public static final long MAX_FILE_SIZE_BYTES = 25L * 1024 * 1024;

    private static final Logger logger = LoggerFactory.getLogger(MarketplaceFileStorage.class);
    private static final Map<String, Set<String>> EXTENSIONS_BY_WORK_TYPE = Map.of(
            "presentation", Set.of("pptx", "pdf", "odp"),
            "document", Set.of("docx", "odt", "rtf", "txt", "md", "html", "htm", "pdf"),
            "coursework", Set.of(
                    "docx", "pptx", "xlsx", "odt", "odp", "ods", "pdf", "rtf", "txt", "md", "html", "htm", "csv"),
            "worksheet", Set.of("xlsx", "ods", "docx", "odt", "pdf", "txt", "md", "csv"),
            "design", Set.of("pdf", "png", "jpg", "jpeg", "webp", "svg", "gif", "bmp"),
            "other", Set.of(
                    "docx", "pptx", "xlsx", "odt", "odp", "ods", "pdf", "rtf", "txt", "md", "html", "htm", "csv",
                    "png", "jpg", "jpeg", "webp", "svg", "gif", "bmp"));
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "docx", "pptx", "xlsx", "odt", "odp", "ods", "pdf", "rtf", "txt", "md", "html", "htm", "csv",
            "png", "jpg", "jpeg", "webp", "svg", "gif", "bmp");
    private static final String OBJECT_KEY_PATTERN = "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.[a-z0-9]{2,5}$";
    private static final byte[] ZIP_SIGNATURE = new byte[] {0x50, 0x4b, 0x03, 0x04};
    private static final Set<String> UNSAFE_SVG_ELEMENTS = Set.of("script", "style", "foreignObject", "image");
    private final Path storageRoot;

    public MarketplaceFileStorage(@Value("${app.marketplace.storage-path}") String storagePath) {
        this.storageRoot = Path.of(storagePath).toAbsolutePath().normalize();
    }

    public StoredMarketplaceFile store(MultipartFile upload, String workType) {
        if (upload == null || upload.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "EMPTY_FILE", "Choose a non-empty file to upload");
        }

        String fileName = safeFileName(upload.getOriginalFilename());
        String extension = extension(fileName);
        Set<String> extensions = EXTENSIONS_BY_WORK_TYPE.get(workType);
        if (extensions == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_WORK_TYPE", "The selected work type is not supported");
        }
        if (!extensions.contains(extension)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "UNSUPPORTED_FILE_TYPE",
                    "This file format is not supported for the selected work type");
        }
        if (upload.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE", "Files must be 25 MB or smaller");
        }

        Path temporaryFile = null;
        Path storedFile = null;
        try {
            Files.createDirectories(storageRoot);
            temporaryFile = Files.createTempFile(storageRoot, ".marketplace-upload-", ".tmp");
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            long sizeBytes;
            try (InputStream input = new DigestInputStream(upload.getInputStream(), digest);
                    OutputStream output = Files.newOutputStream(
                            temporaryFile, StandardOpenOption.WRITE, StandardOpenOption.TRUNCATE_EXISTING)) {
                sizeBytes = copyWithLimit(input, output);
            }
            if (sizeBytes == 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "EMPTY_FILE", "Choose a non-empty file to upload");
            }
            try {
                validateContent(temporaryFile, extension);
            } catch (ZipException exception) {
                throw new ApiException(
                        HttpStatus.BAD_REQUEST,
                        "FILE_CONTENT_MISMATCH",
                        "The uploaded file content does not match its file extension");
            }

            String objectKey = UUID.randomUUID() + "." + extension;
            storedFile = storageRoot.resolve(objectKey);
            moveAtomically(temporaryFile, storedFile);
            return new StoredMarketplaceFile(objectKey, fileName, sizeBytes, HexFormat.of().formatHex(digest.digest()));
        } catch (ApiException exception) {
            cleanup(temporaryFile, storedFile);
            throw exception;
        } catch (IOException exception) {
            cleanup(temporaryFile, storedFile);
            throw new IllegalStateException("Marketplace file could not be stored", exception);
        } catch (NoSuchAlgorithmException exception) {
            cleanup(temporaryFile, storedFile);
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    public Path resolveStoredFile(String objectKey) {
        requireValidObjectKey(objectKey);
        Path resolved = storageRoot.resolve(objectKey).normalize();
        if (!storageRoot.equals(resolved.getParent())
                || !Files.isRegularFile(resolved, LinkOption.NOFOLLOW_LINKS)) {
            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "PURCHASE_FILE_UNAVAILABLE",
                    "The purchased file is temporarily unavailable");
        }
        return resolved;
    }

    public byte[] readPreviewCache(String objectKey) {
        Path cache = previewCachePath(objectKey);
        if (!Files.isRegularFile(cache, LinkOption.NOFOLLOW_LINKS)) return null;
        try {
            return Files.readAllBytes(cache);
        } catch (IOException exception) {
            throw new IllegalStateException("Marketplace preview cache could not be read", exception);
        }
    }

    public void writePreviewCache(String objectKey, byte[] contents) {
        Path cache = previewCachePath(objectKey);
        Path temporaryFile = null;
        try {
            Files.createDirectories(cache.getParent());
            temporaryFile = Files.createTempFile(cache.getParent(), ".preview-", ".tmp");
            Files.write(temporaryFile, contents, StandardOpenOption.TRUNCATE_EXISTING);
            moveAtomically(temporaryFile, cache);
        } catch (IOException exception) {
            if (temporaryFile != null) {
                try {
                    Files.deleteIfExists(temporaryFile);
                } catch (IOException cleanupException) {
                    logger.error("Could not clean up marketplace preview cache temporary file", cleanupException);
                }
            }
            throw new IllegalStateException("Marketplace preview cache could not be stored", exception);
        }
    }

    public void delete(String objectKey) {
        if (objectKey == null || !objectKey.matches(OBJECT_KEY_PATTERN)) {
            throw new IllegalArgumentException("Marketplace file object key is invalid");
        }
        try {
            Files.deleteIfExists(storageRoot.resolve(objectKey).normalize());
            Files.deleteIfExists(previewCachePath(objectKey));
        } catch (IOException exception) {
            logger.error("Could not remove marketplace upload {}", objectKey, exception);
        }
    }

    private Path previewCachePath(String objectKey) {
        requireValidObjectKey(objectKey);
        return storageRoot.resolve(".previews").resolve(objectKey + ".json").normalize();
    }

    private void requireValidObjectKey(String objectKey) {
        if (objectKey == null || !objectKey.matches(OBJECT_KEY_PATTERN)) {
            throw new IllegalStateException("Marketplace file object key is invalid");
        }
    }

    private long copyWithLimit(InputStream input, OutputStream output) throws IOException {
        byte[] buffer = new byte[8192];
        long total = 0;
        int read;
        while ((read = input.read(buffer)) != -1) {
            total += read;
            if (total > MAX_FILE_SIZE_BYTES) {
                throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE", "Files must be 25 MB or smaller");
            }
            output.write(buffer, 0, read);
        }
        return total;
    }

    private String safeFileName(String submittedName) {
        if (submittedName == null || submittedName.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FILE_NAME", "The uploaded file must have a name");
        }
        String normalized = Normalizer.normalize(submittedName.replace('\\', '/'), Normalizer.Form.NFC);
        String baseName = normalized.substring(normalized.lastIndexOf('/') + 1);
        int dot = baseName.lastIndexOf('.');
        if (dot <= 0 || dot == baseName.length() - 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "UNSUPPORTED_FILE_TYPE", "The uploaded file format is not supported");
        }
        String extension = baseName.substring(dot + 1).toLowerCase(Locale.ROOT);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "UNSUPPORTED_FILE_TYPE", "The uploaded file format is not supported");
        }
        String name = baseName.substring(0, dot)
                .replaceAll("[\\p{Cntrl}<>:\"/\\\\|?*]", "_")
                .strip()
                .replaceAll("[. ]+$", "");
        if (name.isBlank()) {
            name = "work";
        }
        int maximumBaseLength = 255 - extension.length() - 1;
        if (name.length() > maximumBaseLength) {
            name = name.substring(0, maximumBaseLength);
        }
        return name + "." + extension;
    }

    private String extension(String fileName) {
        return fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    }

    private void validateContent(Path file, String extension) throws IOException {
        byte[] prefix = readPrefix(file, 512);
        boolean valid = switch (extension) {
            case "pdf" -> startsWith(prefix, "%PDF-".getBytes(StandardCharsets.US_ASCII));
            case "png" -> startsWith(prefix, new byte[] {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a});
            case "jpg", "jpeg" -> startsWith(prefix, new byte[] {(byte) 0xff, (byte) 0xd8, (byte) 0xff});
            case "webp" -> prefix.length >= 12
                    && startsWith(prefix, "RIFF".getBytes(StandardCharsets.US_ASCII))
                    && startsWithAt(prefix, "WEBP".getBytes(StandardCharsets.US_ASCII), 8);
            case "gif" -> startsWith(prefix, "GIF87a".getBytes(StandardCharsets.US_ASCII))
                    || startsWith(prefix, "GIF89a".getBytes(StandardCharsets.US_ASCII));
            case "bmp" -> startsWith(prefix, "BM".getBytes(StandardCharsets.US_ASCII));
            case "svg" -> isSvg(file);
            case "rtf" -> startsWith(prefix, "{\\rtf".getBytes(StandardCharsets.US_ASCII));
            case "txt", "md", "html", "htm", "csv" -> isUtf8Text(file);
            case "docx" -> isOfficeZip(file, "word/document.xml");
            case "pptx" -> isOfficeZip(file, "ppt/presentation.xml");
            case "xlsx" -> isOfficeZip(file, "xl/workbook.xml");
            case "odt" -> isOpenDocumentZip(file, "application/vnd.oasis.opendocument.text");
            case "odp" -> isOpenDocumentZip(file, "application/vnd.oasis.opendocument.presentation");
            case "ods" -> isOpenDocumentZip(file, "application/vnd.oasis.opendocument.spreadsheet");
            default -> false;
        };
        if (!valid) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "FILE_CONTENT_MISMATCH",
                    "The uploaded file content does not match its file extension");
        }
    }

    private byte[] readPrefix(Path file, int maximumBytes) throws IOException {
        try (InputStream input = Files.newInputStream(file)) {
            return input.readNBytes(maximumBytes);
        }
    }

    private boolean isUtf8Text(Path file) throws IOException {
        try (Reader reader = new InputStreamReader(
                Files.newInputStream(file),
                StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT))) {
            char[] chars = new char[4096];
            int read;
            while ((read = reader.read(chars)) != -1) {
                for (int index = 0; index < read; index++) {
                    if (chars[index] == 0) return false;
                }
            }
            return true;
        } catch (CharacterCodingException exception) {
            return false;
        }
    }

    private boolean isSvg(Path file) throws IOException {
        XMLInputFactory factory = XMLInputFactory.newFactory();
        factory.setProperty(XMLInputFactory.SUPPORT_DTD, false);
        factory.setProperty("javax.xml.stream.isSupportingExternalEntities", false);
        try (InputStream input = Files.newInputStream(file)) {
            XMLStreamReader reader = factory.createXMLStreamReader(input, StandardCharsets.UTF_8.name());
            try {
                boolean rootSeen = false;
                while (reader.hasNext()) {
                    int event = reader.next();
                    if (event == XMLStreamConstants.DTD) return false;
                    if (event == XMLStreamConstants.START_ELEMENT) {
                        String element = reader.getLocalName();
                        if (!rootSeen) {
                            if (!"svg".equals(element)) return false;
                            rootSeen = true;
                        } else if (UNSAFE_SVG_ELEMENTS.contains(element)) {
                            return false;
                        }
                        for (int index = 0; index < reader.getAttributeCount(); index++) {
                            String name = reader.getAttributeLocalName(index).toLowerCase(Locale.ROOT);
                            String value = reader.getAttributeValue(index).strip().toLowerCase(Locale.ROOT);
                            if (name.startsWith("on")
                                    || ("href".equals(name) && !value.startsWith("#"))
                                    || value.matches(".*url\\(\\s*['\"]?(?!#).*")
                                    || value.contains("javascript:")
                                    || value.contains("@import")
                                    || value.contains("expression(")) {
                                return false;
                            }
                        }
                    }
                }
                return rootSeen;
            } finally {
                reader.close();
            }
        } catch (XMLStreamException exception) {
            return false;
        }
    }

    private boolean isOfficeZip(Path file, String requiredEntry) throws IOException {
        if (!startsWith(readPrefix(file, ZIP_SIGNATURE.length), ZIP_SIGNATURE)) return false;
        return zipContains(file, requiredEntry, true);
    }

    private boolean isOpenDocumentZip(Path file, String expectedMimeType) throws IOException {
        if (!startsWith(readPrefix(file, ZIP_SIGNATURE.length), ZIP_SIGNATURE)) return false;
        try (ZipFile zip = new ZipFile(file.toFile(), StandardCharsets.UTF_8)) {
            if (!zipContains(zip, null, true)) return false;
            ZipEntry mimeTypeEntry = zip.getEntry("mimetype");
            if (mimeTypeEntry == null || mimeTypeEntry.getSize() > 128) return false;
            try (InputStream input = zip.getInputStream(mimeTypeEntry)) {
                return expectedMimeType.equals(new String(input.readNBytes(129), StandardCharsets.US_ASCII));
            }
        }
    }

    private boolean zipContains(Path file, String requiredEntry, boolean rejectMacros) throws IOException {
        try (ZipFile zip = new ZipFile(file.toFile(), StandardCharsets.UTF_8)) {
            return zipContains(zip, requiredEntry, rejectMacros);
        }
    }

    private boolean zipContains(ZipFile zip, String requiredEntry, boolean rejectMacros) throws IOException {
        boolean foundRequiredEntry = requiredEntry == null;
        Enumeration<? extends ZipEntry> entries = zip.entries();
        int entryCount = 0;
        while (entries.hasMoreElements()) {
            if (++entryCount > 10_000) return false;
            String name = entries.nextElement().getName();
            if (requiredEntry != null && requiredEntry.equals(name)) {
                foundRequiredEntry = true;
            }
            String lowerName = name.toLowerCase(Locale.ROOT);
            if (rejectMacros && (lowerName.endsWith("vbaproject.bin")
                    || lowerName.startsWith("basic/")
                    || lowerName.startsWith("scripts/"))) {
                return false;
            }
        }
        return foundRequiredEntry;
    }

    private boolean startsWith(byte[] value, byte[] prefix) {
        return startsWithAt(value, prefix, 0);
    }

    private boolean startsWithAt(byte[] value, byte[] prefix, int offset) {
        if (value.length < offset + prefix.length) return false;
        for (int index = 0; index < prefix.length; index++) {
            if (value[offset + index] != prefix[index]) return false;
        }
        return true;
    }

    private void moveAtomically(Path source, Path destination) throws IOException {
        try {
            Files.move(source, destination, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } catch (AtomicMoveNotSupportedException exception) {
            Files.move(source, destination, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    private void cleanup(Path temporaryFile, Path storedFile) {
        for (Path path : new Path[] {temporaryFile, storedFile}) {
            if (path == null) continue;
            try {
                Files.deleteIfExists(path);
            } catch (IOException exception) {
                logger.error("Could not clean up marketplace upload {}", path.getFileName(), exception);
            }
        }
    }
}
