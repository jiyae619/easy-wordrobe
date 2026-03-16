# Stylemax — AI Fashion Companion

> Turn closet chaos into curated confidence. Stylemax is a mobile-first AI app that photographs your clothes, understands your mood and the weather, and suggests outfits from your actual wardrobe — powered by a three-agent Amazon Nova pipeline.

**Live Demo:** [https://main.d2zt0kp8qilpd0.amplifyapp.com](https://main.d2zt0kp8qilpd0.amplifyapp.com)  
**AI Agent Deep Dive:** [AGENTS.md](AGENTS.md)  
**System Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md)

---

## The Problem

Most people wear only ~20% of their wardrobe regularly. Every morning, 65% of working professionals spend 10–15 minutes staring at a closet asking "what should I wear?" — a decision made harder by changing weather, shifting moods, and no memory of what they wore last week.

---

## How It Works

Stylemax uses **three specialized AI agents**, all powered by Amazon Nova 2 Lite via AWS Bedrock:

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
| AI | AWS Bedrock — Amazon Nova 2 Lite (`us.amazon.nova-2-lite-v1:0`) |
| Auth | Firebase Authentication (Email + Google OAuth) |
| Database | Cloud Firestore |
| Storage | Firebase Cloud Storage |
| Weather | National Weather Service API (free, no key required) |
| Deployment | AWS Amplify |

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
- AWS Bedrock access (us-east-2) with Amazon Nova 2 Lite enabled
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
VITE_AWS_REGION=us-east-2
VITE_BEDROCK_API_KEY=your-bedrock-api-key

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
