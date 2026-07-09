# Locket — Setup Guide

Locket is a shared photo memory book for two people. This guide takes you from a
fresh clone to an installable Android APK. Budget about 10 minutes of setup plus
~10 minutes of cloud build time.

---

## 1. Install dependencies

```bash
npm install
```

The image assets (icon, splash, grain, paper texture) are already generated and
committed. To regenerate them at any time:

```bash
npm run generate-assets
```

---

## 2. Create a Firebase project (5 minutes)

1. Go to [firebase.google.com](https://firebase.google.com) → **Add project** →
   name it "Locket". You can disable Google Analytics.
2. In the project, click the **Web** icon (`</>`) to register a web app
   (this works for React Native too). Name it "Locket".
3. Copy the `firebaseConfig` object it shows you.

### Paste your config

Open **`lib/firebase.ts`** and replace the placeholder values:

```ts
const firebaseConfig = {
  apiKey: "…",
  authDomain: "…",
  projectId: "…",
  storageBucket: "…",
  messagingSenderId: "…",
  appId: "…",
};
```

Until you do this, the app shows a friendly "Almost there" screen instead of
crashing.

---

## 3. Enable Firebase services

In the Firebase console:

- **Authentication** → Get started → **Email/Password** → Enable.
- **Firestore Database** → Create database → Start in production mode → pick a region.
- **Storage** → Get started → Start in production mode.

### Deploy the security rules

The repo ships hardened rules in `firestore.rules` and `storage.rules`. Deploy
them with the Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase use --add        # select your project
firebase deploy --only firestore:rules,storage
```

(Or paste the contents of each file into the console's Rules tabs.)

No composite indexes are required — every query uses a single field.

---

## 4. Create an Expo account & link the project

1. Sign up at [expo.dev](https://expo.dev) (free).
2. Log in and link the project (this fills in your EAS project id):

```bash
npm install -g eas-cli
eas login
eas init            # writes extra.eas.projectId into app.json
```

---

## 5. Build the Android APK

```bash
eas build --platform android --profile preview
```

This runs on Expo's servers (~10 minutes) and prints a download link for the
`.apk` (also emailed to your Expo account).

### Install on your phone

- Android **Settings → Security → Install unknown apps** → allow your browser/files app.
- Open the download link on the phone and tap the `.apk` to install.

---

## 6. Connect with your partner

1. Open Locket → **Create account**.
2. Choose **Start a new book** → you'll get a 6-character invite code.
3. Your partner installs the same APK, creates their account, taps
   **Join with a code**, and enters your code.
4. You're connected — every photo either of you adds appears in both books
   instantly, and either of you can turn any photo into a postcard.

---

## Optional: push notifications on Android

Postcard and "on this day" **push** notifications are delivered through Expo's
push service, which needs Firebase Cloud Messaging credentials for Android
standalone builds. The app works fully without this — you just won't get
background push until it's set up.

To enable it:

1. In Firebase → Project settings → **Cloud Messaging**, make sure the
   **Firebase Cloud Messaging API (V1)** is enabled.
2. Run `eas credentials` → Android → set up the **FCM V1 service account key**
   (upload the service-account JSON from Firebase → Project settings →
   Service accounts → Generate new private key).

Local, in-app notifications (e.g. the on-device memory check) work without any
of this.

---

## Handy scripts

| Command | What it does |
|---|---|
| `npm start` | Start the Metro dev server (Expo Go / dev client) |
| `npm run android` | Start and open on a connected Android device/emulator |
| `npm run typecheck` | `tsc --noEmit` — type-check the whole app |
| `npm run generate-assets` | Regenerate icons, splash, and textures |
