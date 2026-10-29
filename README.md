# Smart Capture & Notes

A cross-platform mobile app (React Native + Expo) to capture or select photos, attach a title, notes and category, and organise them offline.

## Features

**Required**
- Capture a photo with the camera or pick from the gallery, with image preview
- Add title, notes and category to each record
- Records persist across app restarts (SQLite)
- List view with thumbnails and titles; view, edit and delete records
- Search (title + notes) and category filter
- Permission-denied handling (with "Open Settings" shortcut), missing-image placeholders, input validation, loading indicators and error messages

**Bonus implemented**
- Export a record's notes as a `.txt` file and share the image (system share sheet)
- Offline-friendly image compression (resized to max 1280px wide, JPEG 70%)
- Multiple image attachments per record (up to 6)
- Dashboard showing record counts by category

## Technologies

- React Native 0.88 with Expo SDK 58 (JavaScript)
- `expo-sqlite` – local database
- `expo-image-picker` – camera and gallery
- `expo-image-manipulator` – compression / resizing
- `expo-file-system` – permanent image storage
- `expo-sharing` – export / share
- `react-native-safe-area-context` – safe-area handling on notched devices

## Setup & Run

Prerequisites: Node.js 20+ (LTS), npm, VS Code, and the **Expo Go** app on a phone (or an Android emulator / iOS simulator).

```bash
git clone <your-repo-url>
cd smart-capture-notes
npm install
npx expo start
```

Then scan the QR code with Expo Go (Android) or the Camera app (iOS). The phone and computer must be on the same Wi-Fi. If the QR code does not connect, run `npx expo start --tunnel`.

Android emulator: press `a` in the terminal. iOS simulator (macOS only): press `i`.

## Project Structure

```
App.js                         Entry point, DB initialisation, simple screen navigation
src/
  constants.js                 Categories, limits, colours
  db/database.js               SQLite schema + all queries (data layer)
  services/imageService.js     Permissions, camera/gallery, compression, file storage
  components/                  Reusable UI: Header, RecordCard, CategoryChips, SafeImage, Dashboard
  screens/                     HomeScreen (list/search/filter), RecordFormScreen (add/edit), RecordDetailScreen
  utils/format.js              Date and file-name helpers
```

## Storage Approach

- **Record details** are stored in a local SQLite database (`smart_capture.db`) with two tables:
  - `records(id, title, notes, category, created_at, updated_at)`
  - `record_images(id, record_id → records.id ON DELETE CASCADE, file_name, position)`
- **Images** are compressed, then copied into the app's permanent document directory (`<documents>/images/`). The database stores only the **file name**, not the absolute path, because the app container path can change between launches or updates (notably on iOS). The full URI is resolved at runtime.
- Saving is transactional: the record and its image rows are written together. If saving fails, freshly written image files are deleted so no orphan files remain. Deleting a record removes its rows (cascade) and its image files.
- Everything works fully offline; no backend is required.

## Architecture

A simple layered structure:

1. **Data layer** (`db/database.js`) – the only code that talks to SQLite.
2. **Service layer** (`services/imageService.js`) – the only code that touches the camera, gallery, image compression and the file system.
3. **UI layer** (`screens/`, `components/`) – screens call the data and service layers; components are presentational and reusable.

Navigation is a small state-based switch in `App.js` (home / detail / form) with Android hardware-back support. This avoids an extra navigation dependency for a three-screen app. Search text and the selected category filter are held in `App.js` so they are preserved when returning to the list.

## Error Handling & Edge Cases

- Camera permission denied → explanatory alert with an **Open Settings** button
- Gallery/camera failure or cancelled selection → handled without crashing
- Missing/corrupted image files → "Image missing" placeholder; other data still opens
- Validation: title required (max 100 chars), notes max 2000 chars, at least one photo, max 6 photos
- Database open/load failures → error message with Retry
- Record deleted or not found → friendly message and return to list
- Loading indicators on startup, list loading, record loading and saving

## Known Limitations

- Video recording (bonus) is not implemented.
- Export shares notes and images separately (one file per share action) rather than as a single bundled archive.
- Navigation is custom/state-based, so there are no animated screen transitions or deep links.
- No cloud sync or backup; data lives only on the device (uninstalling the app removes it).
- Tested through the Expo Go workflow; a production build via EAS has not been generated.

## Screenshots / Demo

Screen recording: [video/ScreenRecord.mp4](video/ScreenRecord.mp4)

| Home | Add record |
|---|---|
| ![Home](<screenshot/Home page.jpeg>) | ![Add](<screenshot/adding new record.jpeg>) |

| Record detail | Edit record |
|---|---|
| ![Record](<screenshot/Record.jpeg>) | ![Edit](<screenshot/Editing record.jpeg>) |

| Search | Filter |
|---|---|
| ![Search](<screenshot/search page.jpeg>) | ![Filter](<screenshot/filter record.jpeg>) |