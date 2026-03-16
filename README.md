# Wardrobe AI (Stylemax)

An AI-powered fashion companion that helps you maximize your closet. Upload clothing photos, get weather-aware outfit suggestions, and discover insights about your wearing patterns.

## Features

- **Smart wardrobe intake** — AI analyzes clothing photos and auto-categorizes items by type, color, pattern, and season
- **Outfit suggestions** — Weather-aware, mood-matched outfit combinations powered by Amazon Nova
- **Wear insights** — Track wearing patterns and get nudges to diversify your wardrobe
- **Firebase auth** — Email/password and Google sign-in
- **Cloud storage** — Clothing images stored in Firebase Storage

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **AI:** AWS Bedrock (Amazon Nova 2 Lite)
- **Backend:** Firebase (Auth, Firestore, Cloud Storage)
- **Weather:** OpenWeatherMap API

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Install

```bash
git clone https://github.com/jiyae619/easy-wordrobe.git
cd wardrobe-ai
npm install
```

### Environment Variables

1. Copy the example env file:
   ```bash
   cp .env.example .env
   ```

2. Add your credentials to `.env`:
   - **AWS Bedrock** — API key for Amazon Nova
   - **Firebase** — Create a project at [Firebase Console](https://console.firebase.google.com) and add your config

3. **Never commit `.env`** — It is gitignored. See [SECURITY.md](SECURITY.md) for key management and rotation.

### Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Build

```bash
npm run build
npm run preview   # preview production build
```

### Production (Amplify / Firebase)

If the app works locally but fails in production (Populate Demo Data, Add to Wardrobe, camera), configure Firebase for your production domain. See **[PRODUCTION_FIREBASE_SETUP.md](PRODUCTION_FIREBASE_SETUP.md)** for:

- Firestore and Storage security rules
- Storage CORS configuration (required for uploads)
- Authorized domains

## Project Structure

```
src/
├── components/     # UI components (wardrobe, upload, suggestions, insights)
├── context/       # AuthContext, WardrobeContext
├── pages/         # Home, Wardrobe, Suggest, Insights, Login
├── services/      # Firebase, Bedrock, weather, AI agents
├── hooks/         # useLocation, etc.
└── types/         # TypeScript definitions
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## License

MIT
