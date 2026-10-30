# System Architecture

This document describes the full technical architecture of Stylemax: how the frontend, Firebase backend, AI services (Google Gemini by default), and weather API are connected, how data flows through the system, and the key TypeScript data structures used throughout.

For a focused explanation of the three AI agents specifically, see [AGENTS.md](AGENTS.md).

> **History:** Stylemax was first built for an AWS hackathon on AWS Amplify (hosting) and Amazon Nova 2 Lite via AWS Bedrock (AI). It now runs on Firebase Hosting and Google Gemini. The AWS version is preserved on the branch `aws-hackathon`. See [README → Project History](README.md#project-history).

---

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Frontend Layer](#frontend-layer)
- [Backend Services Layer](#backend-services-layer)
- [External APIs Layer](#external-apis-layer)
- [Data Flows](#data-flows)
- [Key Data Structures](#key-data-structures)
- [Integration Summary](#integration-summary)

---

## Architecture Overview

Stylemax is a **React-based mobile web application** with a **three-tier architecture**:

- **Frontend**: React 19 with TypeScript, Vite, React Router
- **Backend**: Firebase (Authentication, Firestore, Cloud Storage, Cloud Functions, Hosting)
- **AI Services**: Google Gemini 3.5 Flash-Lite, reached through an auth-checked Cloud Functions proxy (`aiProxy`) that keeps the key server-side
- **External APIs**: National Weather Service (NWS)
- **Style rules**: curated mood and weather rule tables in code (`src/data/moodStyles.ts`, `src/data/weatherStyles.ts`), listed in [docs/STYLE_RULES.md](docs/STYLE_RULES.md)

### Technology Stack

```
Frontend: React 19 | TypeScript 5.9 | Vite 7.3 | React Router 7.13 | Tailwind CSS 4.1
State Management: React Context API
Database: Firestore (NoSQL)
Storage: Firebase Cloud Storage
Authentication: Firebase Auth (Email/Password + Google OAuth)
AI Models: Google Gemini 3.5 Flash-Lite
Hosting: Firebase Hosting
Weather API: National Weather Service (free, no key required)
```

---

## Frontend Layer

```
┌────────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER (React)                      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────┐     ┌──────────────────────────────────┐ │
│  │  AuthContext    │────▶│  User Authentication State       │ │
│  │  (Firebase Auth)│     │  - user: AuthUser | null        │ │
│  └─────────────────┘     │  - signIn, signUp, signOut       │ │
│                          └──────────────────────────────────┘ │
│                                                                │
│  ┌─────────────────┐     ┌──────────────────────────────────┐ │
│  │ WardrobeContext │────▶│  Wardrobe & Outfit State         │ │
│  │   (Core State)  │     │  - clothes: ClothingItem[]       │ │
│  └─────────────────┘     │  - outfits: WearRecord[]         │ │
│                          │  - tryItItemIds, suggestionEvents│ │
│                          │  - insights: UserInsight         │ │
│                          └──────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              MAIN PAGES (React Router)                   │ │
│  │                                                          │ │
│  │  /login      /           /wardrobe      /insights        │ │
│  │  ┌─────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐    │ │
│  │  │Login│  │  Today   │  │  Closet  │  │ Style Log  │    │ │
│  │  │     │  │mood+looks│  │  rails   │  │ wear log + │    │ │
│  │  │     │  │ +weather │  │          │  │  insights  │    │ │
│  │  └─────┘  └──────────┘  └──────────┘  └────────────┘    │ │
│  │                │             │               │           │ │
│  │                └─────────────┴───────────────┘           │ │
│  │                           │                              │ │
│  │              ┌────────────────────────────┐              │ │
│  │              │  Scanner · Bulk upload ·   │              │ │
│  │              │  Starter picker (global)   │              │ │
│  │              └────────────────────────────┘              │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
App.tsx (Layout wrapper with navigation)
├── AuthProvider (manages user session)
├── WardrobeProvider (manages wardrobe state)
├── Router (React Router)
│   ├── /login → Login page
│   │   └── LoginForm
│   ├── / → Today (ProtectedRoute) — the stylist
│   │   ├── Weather pill (useTodayWeather) + MoodChips (useMood)
│   │   ├── Closet still loading → skeleton (never the empty-closet prompt)
│   │   ├── LooksDeck: SwipeDeck of MirrorCard (3 AI looks: right wear · left skip · up tweak);
│   │   │   tap a piece → PieceSheet (close-up + "Swap it for")
│   │   ├── OutfitBuilder ("Tweak"): HangerReel ×4 (layer / top / bottom-or-dress / shoes) — lock + Spin;
│   │   │   also logs a past day when opened from the Style Log calendar
│   │   └── FirstWeekChecklist (then closet-growth nudge) + StreakCard
│   ├── /wardrobe → Wardrobe = "Closet" (ProtectedRoute) — bird's-eye view
│   │   ├── ClosetRail ×5 (Layers / Tops / Bottoms / Dresses / Shoes), natively scrolling
│   │   └── Picked-piece bar: Info (ItemDetailModal) · Wear more · Style it → Today with the piece locked
│   ├── CameraScannerOverlay (global) — one photo, several pieces: AI-filled review,
│   │   "Wear more" toggle, "Add all", then "Style it" on the new piece
│   ├── BulkUploadOverlay (global) — several gallery photos → one AI-filled review list → Add all
│   ├── StarterPickerOverlay (global) — "Do you own this?" over 22 basics (catalog photos), one
│   │   item per picked color, saved in one Firestore batch; opened by "Pick my basics"
│   ├── /suggest → redirects to / (Picks merged into Today)
│   └── /insights → Insights = "Style Log" (ProtectedRoute)
│       ├── WeeklyOutfitTimeline (scrollable weeks + logging streak bar; tap a day to log a forgotten outfit:
│       │   a recent look, the rails, or OutfitPhotoLog from photos; "From photos" takes a batch
│       │   and puts each photo on the day it was taken, read from its EXIF date)
│       ├── Forgotten gems (least worn) · Style it
│       ├── Your go-tos (2+ wears)
│       └── OutfitHistory (browse past wears + one-tap re-wear)
│
└── Navigation (fixed bottom mobile nav)
    ├── Today
    ├── Closet
    ├── Scan (+) → opens CameraScannerOverlay
    ├── Style Log
    └── You (account menu: profile, settings, sign out)
```

---

## Backend Services Layer

### Firebase (Google Cloud Platform)

```
┌─────────────────────────────────────────────────────────────────┐
│                    FIREBASE SERVICES                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐  │
│  │ Firebase Auth │  │  Firestore DB │  │  Cloud Storage    │  │
│  │ ───────────── │  │  ──────────── │  │  ──────────────── │  │
│  │ • Email/Pass  │  │  /users/{uid}/│  │  /wardrobe/{uid}/ │  │
│  │ • Google OAuth│  │    - wardrobe/│  │    - {itemId}.jpg │  │
│  │ • Sessions    │  │    - outfits/ │  │                   │  │
│  │               │  │    - settings/│  │  Returns:         │  │
│  │ Returns:      │  │               │  │  • Download URLs  │  │
│  │ • uid         │  │  Stores:      │  │                   │  │
│  │ • email       │  │  • ClothingItem│  │  Handles:        │  │
│  │ • displayName │  │  • WearRecord │  │  • uploadString() │  │
│  │ • idToken     │  │  • UserSettings│  │  • getDownloadURL│  │
│  └───────────────┘  └───────────────┘  └───────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Configuration:** Set via environment variables — see `.env.example` for the full list of `VITE_FIREBASE_*` keys.

### AI Services (Gemini by default)

```
┌─────────────────────────────────────────────────────────────────┐
│           AI SERVICES (via aiProxy)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Default: Google Gemini 3.5 Flash-Lite (gemini-3.5-flash-lite) │
│  Access: via aiProxy Cloud Function (key stays server-side)    │
│  API: Gemini generateContent (multimodal)                      │
│                                                                 │
│  ┌────────────────┐ ┌────────────────┐ ┌──────────────────┐   │
│  │ IntakeAgent    │ │ StylistAgent   │ │ BehavioralAgent  │   │
│  │ ────────────── │ │ ────────────── │ │ ──────────────── │   │
│  │ Purpose:       │ │ Purpose:       │ │ Purpose:         │   │
│  │ Analyze        │ │ Generate       │ │ Analyze wear     │   │
│  │ clothing images│ │ outfit combos  │ │ patterns         │   │
│  │                │ │                │ │                  │   │
│  │ Input:         │ │ Input:         │ │ Input:           │   │
│  │ • Base64 image │ │ • Wardrobe[]   │ │ • Wardrobe[]     │   │
│  │                │ │   (mood- and   │ │ • WearRecord[]   │   │
│  │ Output:        │ │   weather-     │ │   (21 days)      │   │
│  │ • category     │ │   filtered)    │ │                  │   │
│  │ • subcategory  │ │ • Mood brief   │ │ Output:          │   │
│  │   (+ material) │ │ • WEATHER NOW  │ │ • 3 nudges       │   │
│  │ • color/hex    │ │                │ │ (analytics are   │   │
│  │ • season[]     │ │ Output:        │ │  computed in     │   │
│  │ • mood tags    │ │ • 3x Outfits:  │ │  code)           │   │
│  │ • bbox         │ │   ids + copy   │ │                  │   │
│  └────────────────┘ └────────────────┘ └──────────────────┘   │
│                                                                 │
│  Helper: WeatherAgent writes the one-line weather cheer on      │
│  Today. Scores (weatherMatch, wearScore, moodMatch) are always  │
│  computed in code, never taken from a model.                    │
└─────────────────────────────────────────────────────────────────┘
```

**Choosing the provider:** `VITE_VISION_PROVIDER` (`gemini` default; `nova-2-lite` is legacy and no
longer served by the proxy) selects the provider for **all** agents — Intake, Stylist, Behavioral and the Weather cheer line
(`src/services/vision/providerRegistry.ts`). `VITE_GEMINI_MODEL` overrides the Gemini model. Text agents run
with Gemini thinking at `minimal` (`VITE_GEMINI_THINKING_LEVEL` overrides it) to keep latency down.

**How the client reaches the models (via the AI proxy):**

The browser NEVER holds a model key. It POSTs to the `aiProxy` Cloud Function
(`VITE_AI_PROXY_URL`) with the signed-in user's Firebase ID token; the function verifies the
token, rate-limits per user, and forwards to Gemini with the server-side key.

```
Browser                             aiProxy (Cloud Function)         Gemini
POST {VITE_AI_PROXY_URL}            verifyIdToken(token) → uid
  Authorization: Bearer <idToken>   rate-limit(uid) [Firestore]
  { target: "gemini",          ──▶  forward with SERVER key      ──▶ POST .../{model}:generateContent
    model, payload: {                ◀───── raw upstream JSON ───────◀   (key in Secret Manager)
      contents, generationConfig } } ◀──  (passed straight through)
```

Auth is a Firebase **ID token**, never an API key. Response parsing stays entirely on the client. See `functions/README.md`.

---

## External APIs Layer

### National Weather Service (NWS) API

```
┌─────────────────────────────────────────────────────────────────┐
│            National Weather Service (NWS) API                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Base URL: https://api.weather.gov                             │
│  Auth: None (Public API, requires User-Agent header)           │
│                                                                 │
│  Endpoints:                                                     │
│  1. GET /points/{lat},{lon}            (cached per location)    │
│     → city, hourly forecast URL, nearest stations              │
│                                                                 │
│  2. GET /stations/{id}/observations/latest                     │
│     → "now": used when under 90 min old (tries 2 stations)     │
│                                                                 │
│  3. GET {forecastHourly}                                       │
│     → "now" fallback (the current hour) + today's outlook      │
│       (morning / daytime high / evening, local time)           │
│                                                                 │
│  Returns: WeatherData                                          │
│  • temperature (Celsius)                                       │
│  • feelsLike                                                   │
│  • condition (Sunny, Rainy, etc.)                              │
│  • humidity (0-100%)                                           │
│  • windSpeed (km/h)                                            │
│  • location (city, state)                                      │
│  • source ('observation' | 'hourly-forecast') + asOf           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flows

### Flow 1: User Authentication

```
User visits app
      │
      ▼
┌─────────────────┐
│  Login Page     │
│  /login         │
└─────────────────┘
      │
      │ User enters credentials OR clicks "Sign in with Google"
      ▼
┌──────────────────────────────────────────┐
│  authService.signInWithEmail()           │
│       OR                                 │
│  authService.signInWithGoogle()          │
└──────────────────────────────────────────┘
      │
      │ HTTP POST
      ▼
┌──────────────────────────────────────────┐
│  Firebase Authentication                 │
│  • Validates credentials                 │
│  • Creates/retrieves user session        │
│  • Returns: uid, email, idToken          │
└──────────────────────────────────────────┘
      │
      │ Success
      ▼
┌──────────────────────────────────────────┐
│  AuthContext.setUser()                   │
│  • Store user in context                 │
│  • Trigger onAuthStateChanged            │
└──────────────────────────────────────────┘
      │
      │ Redirect
      ▼
┌──────────────────────────────────────────┐
│  Today (/)                               │
│  • Protected Route                       │
│  • Load user data from Firestore         │
│  • isWardrobeLoading until the read      │
│    lands: skeleton, not "closet empty"   │
└──────────────────────────────────────────┘
```

Sign-in errors are mapped to readable messages in `AuthContext` (unauthorized domain, blocked pop-up,
provider disabled); anything else shows its Firebase error code and is logged to the console.

### Flow 2: Add Clothing Item (Camera → AI Analysis → Storage)

> **Bulk variant:** `BulkUploadOverlay` runs up to 10 gallery photos through the same
> analyze → crop-to-bbox → save pipeline sequentially with a progress bar, auto-saving each
> detected item with its AI labels (low-confidence / "Unknown" items keep the "needs attention"
> badge for later fix-up). No per-item review screen — optimized for fast wardrobe onboarding.

```
User taps Camera button in Navigation
      │
      ▼
┌──────────────────────────────────────────┐
│  CameraScannerOverlay opens              │
│  • Camera permission requested           │
│  • Live preview displayed                │
└──────────────────────────────────────────┘
      │
      │ User captures photo OR uploads file
      ▼
┌──────────────────────────────────────────┐
│  ImageUpload component                   │
│  • Convert image to base64               │
│  • Compress if needed                    │
└──────────────────────────────────────────┘
      │
      │ base64ImageData
      ▼
┌──────────────────────────────────────────┐
│  IntakeAgent.analyzeClothingImage()      │
│  • Prepare multimodal prompt             │
│  • Include image + instructions          │
└──────────────────────────────────────────┘
      │
      │ POST → aiProxy → Gemini generateContent
      ▼
┌──────────────────────────────────────────┐
│  Gemini 3.5 Flash-Lite                   │
│  • Vision + Language model               │
│  • Analyzes: category, name (+material), │
│    color, season, mood tags, bbox        │
│  • Returns: JSON with metadata           │
└──────────────────────────────────────────┘
      │
      │ ClothingItem metadata
      ▼
┌──────────────────────────────────────────┐
│  Create ClothingItem object              │
│  • Generate UUID                         │
│  • Set dateAdded, wearFrequency: 0       │
└──────────────────────────────────────────┘
      │
      │ Parallel operations
      ├─────────────────────┬────────────────────┐
      ▼                     ▼                    ▼
┌─────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│ Upload to Cloud │  │ Save to Firestore│  │ Update Context       │
│ Storage         │  │                  │  │                      │
│ • /wardrobe/    │  │ /users/{uid}/    │  │ WardrobeContext      │
│   {uid}/        │  │  wardrobe/{id}   │  │ .clothes.push(item)  │
│   {id}.jpg      │  │                  │  │                      │
│                 │  │ Returns: docRef  │  │ Triggers re-render   │
│ Returns: imgURL │  │                  │  │                      │
└─────────────────┘  └──────────────────┘  └──────────────────────┘
      │                     │                    │
      └─────────────────────┴────────────────────┘
                            │
                            ▼
                ┌─────────────────────────┐
                │  Closet updates         │
                │  • New piece on its rail│
                │  • "Style it" → Today   │
                └─────────────────────────┘
```

### Flow 3: Outfit Suggestion (Mood + Weather → AI → Suggestions)

```
User opens Today (/)
      │
      ▼
┌──────────────────────────────────────────┐
│  Today                                   │
│  • MoodChips: Professional · Casual ·    │
│    Special day (useMood, session-wide)   │
│  • useTodayWeather (Flow 5)              │
└──────────────────────────────────────────┘
      │
      ▼
┌──────────────────────────────────────────┐
│  useStylistLooks(mood, weather)          │
│  • Cache key: day + closet + mood +      │
│    weather bucket (band on feels-like,   │
│    wet/dry, snow, wind), so a 1° change  │
│    doesn't restyle you                   │
│  • Memory, then localStorage (rest of    │
│    the day); a hit makes no model call   │
│  • Waits for the first weather reading;  │
│    no location → styles without weather  │
└──────────────────────────────────────────┘
      │ cache miss: card shows "Styling for the best looks…"
      ▼
┌──────────────────────────────────────────┐
│  StylistAgent.generateOutfitSuggestions()│
│  1. readWeather → band + rain/snow/wind  │
│  2. selectMoodCandidates: score every    │
│     piece for mood (moodFit) and weather │
│     (weatherFit); drop off-mood and      │
│     off-weather pieces                   │
│  3. Prompt: MOOD brief, WEATHER NOW      │
│     rules (+ raincoat / boot aliases),   │
│     pieces as short aliases (i1, i2…),   │
│     wear-more / least-worn priorities    │
└──────────────────────────────────────────┘
      │
      │ POST → aiProxy → Gemini (15s timeout, no retry after a timeout)
      ▼
┌──────────────────────────────────────────┐
│  Gemini 3.5 Flash-Lite                   │
│  • 3 outfits: itemIds + explanation      │
└──────────────────────────────────────────┘
      │
      ▼
┌──────────────────────────────────────────┐
│  Map + check in code                     │
│  • Aliases → real ids; unknown ids drop  │
│  • Composition (bottoms- or dress-based, │
│    at most 1 pair of shoes)              │
│  • applyWeatherNeeds: raincoat + boots   │
│    in rain, a coat when cold             │
│  • weatherMatch, wearScore, moodMatch    │
│  • Best mood match first                 │
│  On any failure → code-built looks       │
│  (assembleMoodLooks), flagged isFallback │
└──────────────────────────────────────────┘
      │
      ▼
┌──────────────────────────────────────────┐
│  LooksDeck: swipe right to wear (4s      │
│  undo), left to skip, up to tweak;       │
│  tap a piece for a close-up or a swap    │
└──────────────────────────────────────────┘
      │ wear
      ▼
┌──────────────────────────────────────────┐
│  logOutfitWear(itemIds, mood, weather)   │
│  • WearRecord → /users/{uid}/outfits     │
│  • wearFrequency + lastWorn per item     │
│  Skips → suggestionEvents (never-worn,   │
│  often-skipped pieces are shown less)    │
└──────────────────────────────────────────┘
```

Rules and sample scores: [docs/STYLE_RULES.md](docs/STYLE_RULES.md).

### Flow 4: Insights Generation (Wear History → AI → Analytics)

```
User navigates to /insights page
      │
      ▼
┌──────────────────────────────────────────┐
│  Style Log (/insights) loads             │
│  • Check if insights cached in context   │
│  • If stale, trigger fetchInsights()     │
└──────────────────────────────────────────┘
      │
      │ Need fresh insights
      ▼
┌──────────────────────────────────────────┐
│  fetchInsights()                         │
│  • Compute analytics IN CODE             │
│    (most/least worn, colors, weekly)     │
│  • Build signature of season+wear state  │
│  • Read /insights/latest nudge cache     │
└──────────────────────────────────────────┘
      │
      ├─ cache hit (signature matches, <24h) ─▶ use cached nudges + code analytics
      │                                          (NO model call)  
      │ cache miss / stale
      ▼
┌──────────────────────────────────────────┐
│  BehavioralAgent.generateInsights()      │
│  • analytics computed in code            │
│  • Gemini writes ONLY the 3 nudges       │
└──────────────────────────────────────────┘
      │
      │ POST → aiProxy → Gemini (nudge copy only)
      ▼
┌──────────────────────────────────────────┐
│  Update WardrobeContext.insights         │
│  • Save nudges + signature to Firestore  │
│    (/insights/latest) for next visit     │
└──────────────────────────────────────────┘
      │
      │ Trigger re-render with new data
      ▼
┌──────────────────────────────────────────┐
│  Render the Style Log                    │
│  • WeeklyOutfitTimeline (weeks + streak; │
│    tap a day to log a forgotten outfit)  │
│  • Forgotten gems (least worn) + the top │
│    nudge · Style it                      │
│  • Your go-tos (2+ wears)                │
│  • OutfitHistory (past wears, re-wear)   │
└──────────────────────────────────────────┘
```

### Flow 5: Weather Integration (`useTodayWeather`)

```
Today (or any page) asks for weather
      │
      ▼
┌──────────────────────────────────────────┐
│  Reading under 30 min old? → use it      │
│  (one load shared by every page; the tab │
│  coming back into view refreshes it)     │
└──────────────────────────────────────────┘
      │ need a fresh reading
      ▼
┌──────────────────────────────────────────┐
│  Where? in order:                        │
│  1. Device location (8s timeout)         │
│  2. The city in Settings                 │
│  3. Last real device position (≤3 days)  │
│  4. None → weather: null,                │
│     "Location off · set your city"       │
│     (never another city's weather)       │
└──────────────────────────────────────────┘
      │
      ▼
┌──────────────────────────────────────────┐
│  weatherService.getTodayWeather(lat,lon) │
│  • /points (cached) → stations + hourly  │
│  • Now: latest station observation if    │
│    under 90 min old, else this hour's    │
│    forecast; °C and km/h                 │
│  • Outlook from hourly periods           │
│  • source + asOf on the reading          │
└──────────────────────────────────────────┘
      │
      ├── error → keep a real reading under 2h old, else no weather;
      │           retry after 2 min (no made-up numbers)
      ▼
┌──────────────────────────────────────────┐
│  Header: "9° now · Cloudy"               │
│  Cheer line (WeatherAgent, Gemini) loads │
│  in the background; weather never waits  │
│  for it                                  │
└──────────────────────────────────────────┘
```

### Flow 6: Starter Picker (no-photo closet)

```
"Pick my basics" (Today / Closet / first-week checklist)
      │ open-starter-picker event (optional category filter)
      ▼
StarterPickerOverlay → buildStarterDeck(owned closet) → 22 cards in category order
      │ "Got it" per card, one item per picked color
      ▼
addCatalogItems → one Firestore batch; images stay as /catalog-images/*.webp
("Stock photo" badge until the user swaps in their own photo)
```

---

## Key Data Structures

### ClothingItem

```typescript
{
  id: string                    // UUID
  imageUrl: string              // Cloud Storage URL, or /catalog-images/… for starter-picker pieces
  thumbnailUrl?: string         // Smaller image for lists
  category: string              // "tops" | "bottoms" | "outerwear" | "dresses" | "shoes"
  subcategory: string           // e.g., "Slim-Fit Chinos", "Waterproof Rain Jacket" (names the material when visible)
  color: string                 // Palette color name, e.g., "Navy"
  colorHex: string              // Snapped to the palette; the raw model color is kept in aiColor
  aiColor?: { name, hex }       // Model's first color guess (for correction scoring)
  colorSource?: 'ai' | 'user'
  season: string[]              // ["spring", "summer", "fall", "winter"]
  wearFrequency: number         // Incremented each time worn
  lastWorn: Date | null
  dateAdded: Date
  aiTags: string[]              // Mood tags from intake ("professional", "casual", "occasion") + free tags
  userMoods?: string[]          // Mood ids the user picked
  userNotes?: string
  sourceImageUrl?: string       // Full photo when imageUrl is a crop
  detectionBox?, detectionConfidence?, focusPoint?, focusZoom?, focusRoi?   // crop / framing
}
```

### OutfitSuggestion

```typescript
{
  id: string                    // UUID generated app-side
  items: ClothingItem[]         // Bottoms-based (top layer(s) + 1 bottom) OR dress-based (1 dress + optional outerwear)
  weatherMatch: number          // 0-100, COMPUTED IN CODE from season tags + the weather rules
  wearScore: number             // 0-100, COMPUTED IN CODE from real wear counts (higher = less worn)
  explanation: string           // "Perfect for 18°C sunny weather..." (from the model, sanitized)
  mood: FashionMood             // The selected mood object
  isFallback?: boolean          // true when these are code-assembled picks (AI stylist unavailable)
  moodMatch?: number            // 0-100, COMPUTED IN CODE: mean mood fit of the pieces
}
```

### UserInsight

```typescript
{
  mostWornColors: Array<{
    color: string               // "Navy Blue"
    hex: string                 // "#1B2A4A"
    count: number               // Times worn in period
  }>
  mostWornItems: Array<{
    item: ClothingItem
    count: number
  }>
  leastWornItems: ClothingItem[]
  suggestedVariations: string[] // 3 behavioral nudges from AI
  weeklyWearPattern: Array<{
    day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun"
    count: number               // Outfits worn on that day
  }>
}
```

### WeatherData

```typescript
{
  temperature: number           // Celsius, e.g., 18.5
  feelsLike: number             // Celsius, accounts for wind chill
  condition: string             // "Sunny", "Partly Cloudy", "Rainy", "Windy", "Snow"
  humidity: number              // 0-100, percentage
  windSpeed: number             // km/h
  location: string              // "Seattle, WA"
}
// The weather hook returns LiveWeather = WeatherData + { source: 'observation' | 'hourly-forecast', asOf: ISO time }
```

### WearRecord

```typescript
{
  id: string                    // UUID
  date: Date                    // When outfit was worn
  outfitItems: string[]         // Item ids in the outfit
  mood: string                  // Mood id at the time (old records may say "creative", "sporty", "romantic")
  weather: WeatherData | null   // Weather that day (null when unavailable)
  favorite?: boolean            // Marked to re-wear
}
```

---

## Integration Summary

### Service Integration Matrix

| Service | Authentication | Data Format | Rate Limits |
|---------|---------------|-------------|-------------|
| Firebase Auth | idToken (JWT) | JSON | 10 req/sec |
| Firestore | Firebase Auth | JSON + subcollections | 10K writes/day (free) |
| Cloud Storage | Firebase Auth | Binary (JPEG/PNG) | 5GB storage (free) |
| aiProxy (Cloud Function) | Firebase ID token | JSON | Per-user (default 30/min) |
| Gemini API (behind proxy) | Server-side key (Secret Manager) | JSON (generateContent) | Per Google AI Studio tier |
| NWS Weather API | User-Agent header | JSON (GeoJSON) | None (public) |

### Firestore Collection Structure

```
/users
  /{uid}                        (User document - created on signup)
    /wardrobe                   (Subcollection - clothing items)
      /{itemId}                 → ClothingItem document
    /outfits                    (Subcollection - wear records)
      /{outfitId}               → WearRecord document
    /settings                   (Subcollection - user preferences)
      /preferences              → UserSettings document
    /insights                   (Subcollection - cached Insights nudge copy)
      /latest                   → { nudges[], signature, computedAt }
    /colorCorrections           (Subcollection - {AI → user} color eval data)
      /{correctionId}           → ColorCorrection document
    /suggestionEvents           (Subcollection - rejected suggestions: skipped / regenerated)
      /{eventId}                → SuggestionEvent document (feeds Stylist deprioritization)
    /agentHealth                (Subcollection - daily agent telemetry aggregate)
      /{YYYY-MM-DD}             → { <agent>Total, <agent>Fallback, parseErrors } (atomic increments)

  /aiRateLimits                 (Top-level; written only by the aiProxy function via Admin SDK)
    /{uid}                      → { windowStart, count }

Notes:
  • Wear history is loaded date-bounded (last 90 days) — getRecentOutfits(uid, days) — not the full history.
  • Only BehavioralAgent's LLM nudge copy is cached in /insights; the analytics (counts, most/least
    worn, weekly pattern) are recomputed deterministically in code on every read. The cache is keyed
    by a signature of season + wear state and expires after 24h, so a repeat visit skips the model
    call unless something changed.

Indexes:
  • wardrobe: indexed by category, dateAdded, wearFrequency
  • outfits: indexed by date (descending) — supports the date-bounded recent-outfits query
```

### Error Handling & Fallbacks

- **Firebase Auth errors** → Translate to user-friendly messages in AuthContext
- **Firestore failures** → Retry with exponential backoff (built-in SDK)
- **Cloud Storage quota** → Compress images before upload, show error if quota exceeded
- **Model API timeout** → 30s timeout, one retry (Stylist: 15s, no retry after a timeout); then code-built fallbacks (see AGENTS.md)
- **NWS API failure** → Keep a real reading under 2h old; otherwise show no weather and retry after 2 min. No made-up numbers.
- **Geolocation denied** → The city from Settings, then the last real position (≤3 days), then "Location off · set your city"
- **Today's looks** → Cached in localStorage for the day, so a reload or brief outage still shows them
- **No internet** → Show cached data from context (no auto-refresh)

---

## System Boundary Diagram

```
┌──────────────────────────────────────────────────┐
│              CLIENT (React Browser)              │
│  ┌────────────────────────────────────────────┐  │
│  │ App State (React Context + Local Vars)    │  │
│  │  - clothes, outfits, mood, weather        │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
         │                │                │
         ↓                ↓                ↓
     ┌────────┐    ┌──────────┐    ┌────────────┐
     │Firebase│    │  Gemini  │    │    NWS     │
     │ (Auth, │    │ (via     │    │  Weather   │
     │ Store, │    │ aiProxy) │    │    API     │
     │ Cloud) │    │          │    │            │
     └────────┘    └──────────┘    └────────────┘
```

---

## Component Responsibility Matrix

| Component | State Source | External API | Responsibility |
|-----------|-------------|--------------|----------------|
| **Login** | AuthContext | Firebase Auth | Email/password/Google auth UI |
| **Today** | WardrobeContext + useTodayWeather + useStylistLooks | NWS API, Gemini | Weather, mood, outfit swipe deck, Tweak mode |
| **Wardrobe ("Closet")** | WardrobeContext | None | Rails by type, item detail, "Wear more" |
| **Insights ("Style Log")** | WardrobeContext | Gemini | Wear log, streaks, analytics & behavioral nudges |
| **CameraScannerOverlay** | Local state | Gemini (via IntakeAgent) | Image capture & AI analysis (several pieces per photo) |
| **BulkUploadOverlay** | Local state | Gemini (via IntakeAgent) | Several gallery photos at once |
| **StarterPickerOverlay** | WardrobeContext | None | No-photo closet from catalog basics |

---

## Context Nesting

```typescript
<AuthProvider>
  <WardrobeProvider>
    <Router>
      <App />
    </Router>
  </WardrobeProvider>
</AuthProvider>
```

### AuthContext State

```typescript
{
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  signInWithEmail(email, password)
  signUpWithEmail(email, password, displayName)
  signInWithGoogle()
  logout()
  resetPassword(email)
  clearError()
}
```

### WardrobeContext State

```typescript
{
  clothes: ClothingItem[]
  outfits: WearRecord[]               // last 90 days
  bookmarkedItems: string[]
  tryItItemIds: string[]              // "Wear more" pieces
  suggestionEvents: SuggestionEvent[] // skips / regenerations
  currentMood: FashionMood | null
  insights: UserInsight | null
  userSettings: UserSettings | null
  isLoading: boolean
  isWardrobeLoading: boolean          // until the signed-in user's closet is read
  error: string | null

  // Methods
  addClothingItem, addCatalogItems, updateClothingItem, deleteClothingItem
  correctItemColor, replaceItemPhoto
  incrementWearCount, decrementWearCount
  logOutfitWear, toggleOutfitFavorite, logSuggestionEvent
  addTryItItem, removeTryItItem
  fetchInsights
  bookmarkItem, unbookmarkItem
  updateUserSettings
}
```

Weather comes from `useTodayWeather` (one reading shared across pages) and the selected mood from `useMood`.
