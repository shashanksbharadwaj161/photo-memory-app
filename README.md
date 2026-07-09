# 📸 Locket — Shared Memory Book

A shared photo memory book for two people. Shoot photos inside the app, apply
beautiful film/vintage filters, and watch them accumulate in a shared "book"
that feels like flipping through a physical album. Memories resurface over time
("on this day"), and either partner can turn any photo into a postcard.

> Instagram's camera quality · Moleskine's physical feel · a letter from your
> grandmother's attic.

Built with **React Native · Expo SDK 51 · Expo Router · Firebase**.

---

## Quick start

```bash
npm install
# paste your Firebase config into lib/firebase.ts (see SETUP.md)
npm start
```

To build an installable Android APK, follow **[SETUP.md](./SETUP.md)**.

---

## Features

- **Camera** with 9 film filters (Kodak Gold, Polaroid, Silver B&W, Cyanotype,
  HDR Glow, Golden Hour, Portra, Noir + Original), a live filter preview, a
  post-capture intensity slider, grain and vignette, and gallery import.
- **The Book** — a horizontally-swipeable album where each photo is a cream page
  with a film frame, handwritten caption, date, and the avatar of whoever added
  it. Real-time sync between partners, page-thickness edges, and a spine shadow.
- **Memories** — "On this day", first photo, latest addition, most-captured
  month, and a this-year reel, all on tossed-on-the-table paper cards.
- **Postcards** — flip a photo into a classic front/back postcard, write a
  message, and send it to your partner with a push notification and a fly-away
  animation.
- **Full-screen viewer** — swipe down to dismiss, double-tap to favourite.
- **Settings** — display name, avatar colour, invite code, book name,
  notification toggles, export-to-gallery, sign out, and leave book.
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
components/          Reusable UI (FilteredImage, BookPage, PostcardLayout, …)
lib/                 firebase, book (Firestore), storage, filters, notifications, memories
hooks/               useAuth, useBook, useCamera, useFilters
constants/           colors, fonts, filters
assets/              Generated icons, splash, grain & paper textures
firestore.rules      Firestore security rules
storage.rules        Storage security rules
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

See **[SETUP.md](./SETUP.md)** for the full build & deployment guide.
