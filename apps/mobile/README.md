# Slideforge mobile

Flutter client for the Slideforge API. Presentation editing uses the existing
schema-version-1 deck payload and versioned save API.

The editor supports slide navigation, add/remove/reorder, text elements with
title/heading/paragraph presets, font family/size/weight/italic/underline,
alignment and text color, slide background colors, icon-like text glyphs, and
gallery image insertion. Imported images are embedded as base64 data URIs
(maximum 3 MB before encoding). Saving keeps the existing version-conflict
reload behavior.

Run locally from this directory:

```powershell
flutter pub get
flutter analyze
flutter test
flutter build apk --debug --dart-define=API_BASE_URL=http://10.0.2.2:8080
```
