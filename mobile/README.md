# Advaspire — Mobile

Native React Native + Expo app for the Advaspire parent portal. Android-first (Phase 1); iOS enabled in Phase 1.5.

Plan: `~/.claude/plans/no-is-not-event-proud-bee.md`

## Stack

- React Native 0.85 + Expo SDK 56 (managed workflow)
- `expo-router` (file-based routing, mirrors Next.js App Router)
- `@supabase/supabase-js` with `expo-secure-store` session persistence
- `@tanstack/react-query` for server state
- `@expo/vector-icons` for tab icons
- EAS Build / Update / Submit for Android (iOS later)

## Project structure

```
src/
├── app/                     expo-router file routes
│   ├── _layout.tsx          root layout: providers + auth gate
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   └── login.tsx        email/password sign-in
│   └── (tabs)/
│       ├── _layout.tsx      bottom tab bar
│       ├── index.tsx        Home (dashboard)
│       ├── calendar.tsx     Calendar (Phase 2)
│       ├── inbox.tsx        Inbox (Phase 2)
│       └── profile.tsx      Profile + sign out
├── contexts/
│   └── auth.tsx             session state + signIn/signOut
└── lib/
    └── supabase.ts          Supabase client with SecureStore adapter
```

## Running locally

```bash
cd mobile
npm start
```

Then scan the QR code with **Expo Go** on your Android phone. Both your phone and your Mac must be on the same Wi-Fi network.

For iOS Expo Go (Phase 1.5+): same flow, scan with the iPhone camera.

## Environment

`.env` (not committed — already in root `.gitignore`):

```
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

Both values must match the web app's Supabase project. Production values come from EAS Secrets for builds.

## Building for Google Play (Phase 1 deliverable)

1. `npx eas login` (one-time, with your Expo account)
2. `npx eas build:configure` (one-time)
3. **Internal Testing build**:
   ```bash
   npx eas build --platform android --profile staging
   ```
4. **Production build**:
   ```bash
   npx eas build --platform android --profile production
   ```
5. **Submit to Play Store**:
   ```bash
   npx eas submit --platform android
   ```

You'll need:
- Google Play Developer account ($25 one-time)
- Expo account (free tier OK to start; EAS subscription $29/mo for production tier later)

## OTA updates

Once a binary is live in the Play Store:

```bash
npx eas update --channel production --platform android --message "describe the fix"
```

Pushes JS-only changes to devices within minutes. Native module changes (new permissions, new dependencies that bridge native) need a fresh build.

## Memory rules that apply here

The codebase memory at `~/.claude/projects/-Users-angy-Documents-GitHub-claude-test-adcoinSystem/memory/` still applies — all business invariants (pool formula, attendance hidden when done, sessions can be negative, etc.) are the same on mobile. Future-Claude should read those memories before changing data flows.
