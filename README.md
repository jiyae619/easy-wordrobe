# Stylemax — AI Fashion Companion

> Turn closet chaos into curated confidence. Stylemax is a mobile-first AI app that photographs your clothes, understands your mood and the weather, and suggests outfits from your actual wardrobe — powered by a three-agent Google Gemini pipeline.

**Live Demo:** https://easy-wardrobe-f10c6.web.app
**AI Agent Deep Dive:** [AGENTS.md](AGENTS.md)  
**System Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md)

---

## The Problem

Most people wear only ~20% of their wardrobe regularly. Every morning, 65% of working professionals spend 10–15 minutes staring at a closet asking "what should I wear?" — a decision made harder by changing weather, shifting moods, and no memory of what they wore last week.

---

## How It Works

Stylemax uses **three specialized AI agents**, all powered by Google Gemini 3.5 Flash-Lite via the `aiProxy` Cloud Function:

```
User uploads photo
       │
       ▼
 IntakeAgent        ← Vision AI analyzes the photo: category, color, pattern, season, mood tags
       │
       ▼
 Firestore + Storage ← Item saved to user's cloud wardrobe
       │
       ▼
 StylistAgent       ← Takes wardrobe + live weather + chosen mood → generates 3 outfit combos
       │
       ▼
 BehavioralAgent    ← Analyzes 21-day wear history → personalized style nudges + analytics
```

See [AGENTS.md](AGENTS.md) for a detailed breakdown of each agent's inputs, outputs, and design decisions.

---

## Features

- **Smart wardrobe intake** — Photograph any clothing item; AI auto-tags category, color, pattern, season, and mood compatibility. No manual entry.
- **Outfit suggestions** — Pick a mood (Minimal Chic, Streetwear, Professional, etc.), get three weather-aware outfit combinations with AI reasoning.
- **Wear tracking** — Log which outfits you actually wear. Increments wear counts, tracks last-worn dates.
- **Behavioral insights** — Visualize color distribution, wear frequency, and weekly patterns. AI surfaces nudges like "your mint cardigan hasn't been worn in 3 weeks — try it with those gray jeans."
- **Firebase Auth** — Email/password and Google sign-in. All data is user-scoped and isolated.

---

## Who It's For

**Busy Professional (22–35)** — Juggles work and social life, wants to look put-together in under 30 seconds each morning. Owns 100+ items but defaults to the same 10.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, React Router 7 |
| State | React Context API |
| AI | Google Gemini 3.5 Flash-Lite, via the `aiProxy` Cloud Function |
| Auth | Firebase Authentication (Email + Google OAuth) |
| Database | Cloud Firestore |
| Storage | Firebase Cloud Storage |
| Weather | National Weather Service API (free, no key required) |
| Deployment | Firebase Hosting |

---

## Project History

Stylemax was originally built for an **AWS hackathon**: the frontend was hosted on **AWS Amplify** and all three agents ran on **Amazon Nova 2 Lite via AWS Bedrock**.

After the AWS account was suspended (Oct 2026), the app moved to **Firebase Hosting** and **Google Gemini 3.5 Flash-Lite**. Firebase Auth, Firestore, Storage and the `aiProxy` Cloud Function were already on Google, so they didn't change.

- The hackathon version is preserved on the branch [`aws-hackathon`](https://github.com/jiyae619/easy-wordrobe/tree/aws-hackathon) (Amplify config `amplify.yml` / `customHttp.yml`, Bedrock proxy route).
- The Nova adapter (`src/services/vision/novaProvider.ts`, `bedrockClient.ts`) is kept in the client for reference.
- The original Nova vs Gemini 2.5 Flash intake benchmark is kept in `scripts/eval/last-report.md`.

---

## Project Structure

```
src/
├── services/agents/    # AI agents: IntakeAgent, StylistAgent, BehavioralAgent
├── services/           # bedrockClient, firebaseConfig, firestoreService, storageService, weatherService
├── context/            # AuthContext, WardrobeContext (global state)
├── pages/              # Home, Wardrobe, Suggest, Insights, Login
├── components/         # upload/, wardrobe/, suggestions/, insights/, mood/
├── hooks/              # useLocation
└── types/              # TypeScript interfaces (ClothingItem, OutfitSuggestion, UserInsight, WearRecord)
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- A Gemini API key (Google AI Studio), stored as a Cloud Functions secret
- Firebase project (Auth, Firestore, Cloud Storage)

### Install

```bash
git clone https://github.com/jiyae619/easy-wordrobe.git
cd wardrobe-ai
npm install
```

### Environment Variables

Copy the example and fill in your credentials:

```bash
cp .env.example .env
```

```env
VITE_AI_PROXY_URL=https://your-aiproxy-url
VITE_VISION_PROVIDER=gemini
VITE_GEMINI_MODEL=gemini-3.5-flash-lite

VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

Never commit `.env` — it is gitignored. See [SECURITY.md](SECURITY.md) for key rotation guidance.

### Run

```bash
npm run dev        # http://localhost:5173
npm run build      # production build
npm run preview    # preview production build
npm run lint       # ESLint
```

### Deploy (Firebase Hosting)

Vite bakes `VITE_*` values in at build time, so put the production values in `.env.production`
(gitignored) first. `firebase.json` runs the build before upload.

```bash
firebase use --add                  # once: pick the project in VITE_FIREBASE_PROJECT_ID
firebase deploy --only hosting      # → https://<project-id>.web.app
firebase deploy --only functions    # AI proxy, see functions/README.md
```

#### Automatic deploys from the `production` branch

`.github/workflows/deploy-production.yml` deploys on every push to `production`: Hosting always, and the
`aiProxy` function only when `functions/` changed (or when run manually from the Actions tab with
"Also deploy the aiProxy function").

One-time setup:

1. **Service account:** Google Cloud Console → IAM & Admin → Service Accounts → *Create*. Grant
   **Firebase Admin**, **Cloud Functions Admin**, **Service Account User** and **Secret Manager Viewer**.
   Then open it → *Keys* → *Add key* → JSON, and download the file.
2. **GitHub → Settings → Secrets and variables → Actions:**
   - *Secrets* tab: `FIREBASE_SERVICE_ACCOUNT` = the full contents of that JSON file. Delete the
     downloaded file afterwards.
   - *Variables* tab: `FIREBASE_PROJECT_ID`, plus the same `VITE_*` values as `.env.production`.
3. Create the branch from `master` and push:
   `git checkout master && git pull && git checkout -b production && git push -u origin production`

To ship afterwards: merge into `master`, then `git checkout production && git merge master && git push`.

---

## Want to explore without your own wardrobe?

Click **"Populate Demo Data"** on the Home page after signing in. It loads a sample wardrobe of 10 clothing items so you can immediately try outfit suggestions, insights, and the full AI pipeline.

---

## Further Reading

| Document | What's Inside |
|----------|--------------|
| [AGENTS.md](AGENTS.md) | How the three AI agents work, their prompts, inputs/outputs, and trade-offs |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Full system architecture: data flows, Firestore schema, component hierarchy, TypeScript types |
| [SECURITY.md](SECURITY.md) | API key management and rotation policy |

---

## License

MIT
