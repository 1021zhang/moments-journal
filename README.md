# Moments Journal

A minimal photo-first digital scrapbook prototype.

The app groups photos by the day they are added to the journal. It does not read EXIF data and does not group by original shooting date.

## Prototype Structure

- Memory Pile: a pure white home screen with stacked polaroids and a small plus button.
- Daybook: a vertical date flow grouped by `dateKey`, generated from each photo's `addedAt` import time.
- Single Day Page: a quiet single-day collage with editable short note.

## Photo Storage

Imported photos are compressed in the browser, saved locally with IndexedDB, and restored after refresh.

Stored user photo fields:

- `id`
- `imageDataUrl`
- `addedAt`
- `dateKey`
- `label`

## Run

Open `index.html` in a browser.

No dependencies or build step are required.
