# 📸 Locket — Shared Memory Book

A shared photo memory book for two people. Shoot photos inside the app, apply
beautiful film/vintage filters, and watch them accumulate in a shared "book"
that feels like flipping through a physical album. Memories resurface over time
("on this day"), and either partner can turn any photo into a postcard.

> Instagram's camera quality · Moleskine's physical feel · a letter from your
> grandmother's attic.

Built with **React Native · Expo SDK 51 · Expo Router · Firebase (Auth +
Firestore) · Cloudinary (photo storage)**.

---

## Quick start

```bash
npm install
# paste your Firebase config into lib/firebase.ts (see SETUP.md)
# paste your Cloudinary cloud name + upload preset into lib/storage.ts
npm start
```

To build an installable Android APK, follow **[SETUP.md](./SETUP.md)**.

---

## Features

- **Camera** with 13 film filters (including Ghibli, Fuji Film, Wes Anderson,
  Teal & Orange), a live filter preview, post-capture intensity slider, grain
  and vignette, gallery import, and a Film/Mine filter-strip with a sliding
  underline indicator.
- **The Book** — a horizontally-swipeable album with a film frame, handwritten
  caption, date, and avatar per page. Real-time sync, a warm radial backdrop
  with a seasonal tint, and a minimal floating header.
- **Memories** — "On this day", first photo, latest addition, most-captured
  month, a this-year reel, and a 12-month emotional-arc mood strip.
- **Your story** — a spine-style relationship timeline: first photo, busiest
  month, seasonal transitions, quiet-month gaps, and "right now".
- **Postcards** — flip a photo into a front/back postcard with a message, send
  it with a push notification and a fly-away animation.
- **Time-locked capsules** — seal a photo and a note until a future date; it
  arrives as a locked page in the book and opens itself, for both of you.
- **Letters to future us** — a ruled-paper letter, sealed with a wax-seal
  animation, that unfolds into the book on its unlock date.
- **The Quiet Page** — pin one favourite as a permanently highlighted page,
  with an optional looping ambient sound.
- **Ambient mode** — after a few idle minutes, the book quietly turns into a
  slow-fading slideshow of your memories.
- **Build your own filter** — six sliders (warmth, brightness, contrast, fade,
  grain, tint) with live preview, saved locally, and an optional "build
  together" mode where you and your partner drag the same sliders in real time.
- **Claude AI (optional)** — caption suggestions, sentence-finishing, "on this
  day" reflections, monthly narratives, and postcard-message drafts. Fully
  opt-in via your own API key in Settings; the app works completely without it.
- **Full-screen viewer** — swipe down to dismiss, double-tap to favourite.
- **Settings** — printed-form layout: profile, invite code, notifications,
  ambient timing, Claude AI, export-to-gallery, sign out, and leave book.
- Warm, on-brand loading (breathing gold dot), friendly error bars (never raw
  error codes), and a welcoming empty state.

---

## Project structure

```
app/                 Expo Router screens
  _layout.tsx        Fonts, providers, notification routing
  index.tsx          Splash + auth gate
  (auth)/            login, signup
  onboarding.tsx     Create or join a book
  (app)/             Tab navigator: book, camera, memories
  postcard.tsx       Postcard composer (modal)
  settings.tsx       Profile & book settings (modal)
  timelock.tsx       Time-lock capsule composer (modal)
  future-letter.tsx  Letter to future us composer (modal)
  filter-builder.tsx Custom filter builder, solo or "build together" (modal)
  timeline.tsx       Relationship timeline
components/          Reusable UI (FilteredImage, BookPage, PostcardLayout,
                     TimeLockPage, LetterPage, QuietPage, AmbientMode, …)
lib/                 firebase (Auth+Firestore), book (Firestore), storage
                     (Cloudinary), filters, presets, claude, timelocks,
                     letters, filterSessions, ambient, quietSound, seasons,
                     mood, notifications, memories
hooks/               useAuth, useBook, useCamera, useFilters
constants/           colors, fonts, filters, my-presets, typography, spacing
assets/              Generated icons, splash, grain & paper textures
firestore.rules      Firestore security rules
generate-assets.js   Regenerates all image assets with sharp
```

---

## Notes on the filter engine

Filters are 4×5 GPU colour matrices applied with
`react-native-color-matrix-image-filters`. The `FilteredImage` component is the
single source of truth for how a filtered photo looks — matrix + grain +
vignette — so the camera preview, the book, memories, and postcards all render
identically. The intensity slider interpolates between the identity matrix and
the filter matrix. On the live camera preview a colour tint approximates the
selected filter; the real colour matrix is baked in the moment you capture.

## Notes on photo storage

Photos upload directly from the device to **Cloudinary** using an unsigned
upload preset (`lib/storage.ts`) — no server or API secret required. Firebase
is used only for **Auth** and **Firestore** (accounts, books, photo metadata
and the Cloudinary `secure_url`s). Because unsigned uploads can't delete
assets client-side, removing a photo in Locket deletes its Firestore record
immediately; see `SETUP.md` for pruning orphaned Cloudinary assets.

See **[SETUP.md](./SETUP.md)** for the full build & deployment guide.
