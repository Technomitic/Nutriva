# Fresh App — Start Commands

All commands should be run from the `fresh-app` directory.

```bash
cd fresh-app
```

---

## 📱 Mobile Only (Expo Go)

```bash
npx expo start
```

Scan the QR code with **Expo Go** (Android) or the Camera app (iOS).

---

## 🌐 Web Only

```bash
npx expo start --web
```

Opens in your browser at `http://localhost:8081`.

---

## 📱 + 🌐 Both (Web + Mobile)

Run these in **two separate terminals**:

**Terminal 1 — Web:**

```bash
npx expo start --web --port 8081
```

**Terminal 2 — Mobile:**

```bash
npx expo start --port 8082
```

---

## Platform-Specific Shortcuts

| Command                  | What it does                    |
| ------------------------ | ------------------------------- |
| `npm run start`          | Start Expo dev server           |
| `npm run web`            | Start web only                  |
| `npm run android`        | Start with Android device/emu   |
| `npm run ios`            | Start with iOS simulator        |
| `npm run build:web`      | Export production web bundle     |

---

## 🔧 Useful Flags

| Flag              | Description                              |
| ----------------- | ---------------------------------------- |
| `--clear`         | Clear the Metro bundler cache            |
| `--port <number>` | Run on a custom port                     |
| `--tunnel`        | Use tunnel for remote device testing     |
| `--lan`           | Use LAN (devices on same Wi-Fi)          |
| `--localhost`     | Use localhost only                       |

### Example: Clear cache + start both

**Terminal 1:**

```bash
npx expo start --web --port 8081 --clear
```

**Terminal 2:**

```bash
npx expo start --port 8082 --clear
```
