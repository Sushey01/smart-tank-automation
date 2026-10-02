# Smart Tank mobile

Expo app for the same tank, alerts, history, and replica set as the web dashboard. It only reads the Express API. The phone and the API machine need to be on the same Wi-Fi.

## Setup

From `mobile/`:

```bash
npm install
cp .env.example .env
```

Set `EXPO_PUBLIC_API_BASE_URL` to the phone base URL printed when the API starts (`npm run server` in the project root). Example: `http://192.168.1.20:3000`. Do not use `localhost` — that is the phone itself. An Android emulator reaches the host at `http://10.0.2.2:3000`.

If the phone cannot connect, allow inbound TCP on the API port (3000 unless `PORT` is set).

```bash
npx expo start
```

Open the project in Expo Go. iOS App Store and Play Store builds are not part of this lab.

**Arm siren** vibrates and plays a short tone while an overflow or dry-run alert is active. **Silence** stops the current sound until that alert clears and a new one starts. The app does not read the Telegram token.
