# System Architecture

This document describes the full technical architecture of Stylemax: how the frontend, Firebase backend, AWS Bedrock AI services, and weather API are connected, how data flows through the system, and the key TypeScript data structures used throughout.

For a focused explanation of the three AI agents specifically, see [AGENTS.md](AGENTS.md).

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

Wardrobe AI is a **React-based mobile web application** with a **three-tier architecture**:

- **Frontend**: React 19 with TypeScript, Vite, React Router
- **Backend**: Firebase (Authentication, Firestore, Cloud Storage, Cloud Functions)
- **AI Services**: AWS Bedrock (Nova 2 Lite), reached through an auth-checked Cloud Functions proxy (`aiProxy`) that keeps the key server-side
- **External APIs**: National Weather Service (NWS)

### Technology Stack

```
Frontend: React 19 | TypeScript 5.9 | Vite 7.3 | React Router 7.13 | Tailwind CSS 4.1
State Management: React Context API
Database: Firestore (NoSQL)
Storage: Firebase Cloud Storage
Authentication: Firebase Auth (Email/Password + Google OAuth)
AI Models: AWS Bedrock - Nova 2 Lite
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
│                          │  - weather: WeatherData          │ │
│                          │  - insights: UserInsight         │ │
│                          └──────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              MAIN PAGES (React Router)                   │ │
│  │                                                          │ │
│  │  /login    /       /wardrobe    /suggest    /insights   │ │
│  │  ┌─────┐  ┌────┐  ┌─────────┐  ┌────────┐  ┌────────┐  │ │
│  │  │Login│  │Home│  │Wardrobe │  │Suggest │  │Insights│  │ │
│  │  │Page │  │Page│  │  Grid   │  │Mood+AI │  │Analytics│ │ │
│  │  └─────┘  └────┘  └─────────┘  └────────┘  └────────┘  │ │
│  │              │          │           │           │        │ │
│  │              └──────────┴───────────┴───────────┘        │ │
│  │                           │                              │ │
│  │              ┌────────────────────────────┐              │ │
│  │              │  CameraScannerOverlay      │              │ │
│  │              │  (Global Upload Component) │              │ │
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
│   ├── / → Home (ProtectedRoute)
│   │   ├── WeatherCard
│   │   ├── OutfitCard (preview)
│   │   └── ActionButtons
│   ├── /wardrobe → Wardrobe (ProtectedRoute)
│   │   ├── FilterBar
│   │   ├── WardrobeGrid
│   │   │   └── WardrobeCard (item)
│   │   │       └── ItemDetailModal
│   │   └── CameraScannerOverlay (global)
│   │       └── ImageUpload
│   ├── BulkUploadOverlay (global) — up to 10 photos → analyze → auto-save
│   ├── /suggest → Suggest (ProtectedRoute)
│   │   ├── MoodSelector
│   │   │   └── MoodCard (multiple)
│   │   ├── WeatherSummary
│   │   └── OutfitCard (multiple suggestions)
│   └── /insights → Insights (ProtectedRoute)
│       ├── WeeklyTimeline
│       ├── WearFrequencyChart
│       ├── ColorDistribution
│       ├── NudgeCard
│       ├── WeeklyOutfitTimeline
│       └── OutfitHistory (browse past wears + one-tap re-wear)
│
└── Navigation (fixed bottom mobile nav)
    ├── Home icon
    ├── Wardrobe icon
    ├── Camera (scan) button → opens CameraScannerOverlay
    ├── Suggest icon
    └── Insights icon
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

### AWS Bedrock (AI Services)

```
┌─────────────────────────────────────────────────────────────────┐
│           AWS BEDROCK (AI Services - us-east-2)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Model: Amazon Nova 2 Lite (us.amazon.nova-2-lite-v1:0)        │
│  Access: via aiProxy Cloud Function (key stays server-side)    │
│  API: Converse API (multimodal)                                │
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
│  │                │ │ • FashionMood  │ │ • WearRecord[]   │   │
│  │ Output:        │ │ • WeatherData  │ │   (14 days)      │   │
│  │ • category     │ │                │ │                  │   │
│  │ • color/hex    │ │ Output:        │ │ Output:          │   │
│  │ • pattern      │ │ • 3x Outfits   │ │ • mostWornColors │   │
│  │ • season[]     │ │ • weatherMatch │ │ • mostWornItems  │   │
│  │ • aiTags[]     │ │ • wearScore    │ │ • leastWornItems │   │
│  │ • subcategory  │ │ • explanation  │ │ • nudges[]       │   │
│  └────────────────┘ └────────────────┘ │ • weeklyPattern  │   │
│                                        └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**How the client reaches the models (via the AI proxy):**

The browser NEVER holds a model key. It POSTs to the `aiProxy` Cloud Function
(`VITE_AI_PROXY_URL`) with the signed-in user's Firebase ID token; the function verifies the
token, rate-limits per user, and forwards to Bedrock/Gemini with the server-side key.

```
Browser                             aiProxy (Cloud Function)         AWS Bedrock / Gemini
POST {VITE_AI_PROXY_URL}            verifyIdToken(token) → uid
  Authorization: Bearer <idToken>   rate-limit(uid) [Firestore]
  { target: "bedrock",         ──▶  forward with SERVER key      ──▶ POST .../converse
    payload: { messages,             ◀───── raw upstream JSON ───────◀   (key in Secret Manager)
      inferenceConfig } }       ◀──  (passed straight through)
```

Auth is a Firebase **ID token**, never an API key. The same proxy serves the Gemini vision path
(`target: "gemini"`). Response parsing stays entirely on the client. See `functions/README.md`.

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
│  1. GET /points/{lat},{lon}                                    │
│     → Get forecast URL & grid data                             │
│                                                                 │
│  2. GET /gridpoints/{office}/{x},{y}                           │
│     → Get detailed forecast periods                            │
│                                                                 │
│  3. GET /stations/{id}/observations                            │
│     → Get current humidity & conditions                        │
│                                                                 │
│  Returns: WeatherData                                          │
│  • temperature (Celsius)                                       │
│  • feelsLike                                                   │
│  • condition (Sunny, Rainy, etc.)                              │
│  • humidity (0-100%)                                           │
│  • windSpeed (km/h)                                            │
│  • location (city, state)                                      │
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
│  Home Page (/)                           │
│  • Protected Route                       │
│  • Load user data from Firestore         │
└──────────────────────────────────────────┘
```

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
      │ POST /model/{modelId}/converse
      ▼
┌──────────────────────────────────────────┐
│  AWS Bedrock (Nova 2 Lite)               │
│  • Vision + Language model               │
│  • Analyzes: category, color, pattern    │
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
                │  Wardrobe Page updates  │
                │  • New item visible     │
                │  • Grid re-rendered     │
                └─────────────────────────┘
```

### Flow 3: Outfit Suggestion (Mood + Weather → AI → Suggestions)

```
User navigates to /suggest page
      │
      ▼
┌──────────────────────────────────────────┐
│  Suggest Page loads                      │
│  • Display mood selector                 │
│  • Load wardrobe from context            │
└──────────────────────────────────────────┘
      │
      │ User selects a mood (e.g., "Minimal Chic")
      ▼
┌──────────────────────────────────────────┐
│  setMood(selectedMood)                   │
│  • Store in WardrobeContext              │
└──────────────────────────────────────────┘
      │
      │ Parallel: Fetch weather
      ├─────────────────────────────────────┐
      ▼                                     ▼
┌────────────────────┐         ┌──────────────────────────┐
│ Get user location  │         │ weatherService           │
│ • Geolocation API  │────────▶│ .getCurrentWeather()     │
│ • lat, lon         │         └──────────────────────────┘
└────────────────────┘                     │
                                          │ GET /points/{lat},{lon}
                                          ▼
                                 ┌──────────────────────────┐
                                 │ NWS API                  │
                                 │ • Get forecast URL       │
                                 │ • Get observation station│
                                 └──────────────────────────┘
                                          │
                                          │ WeatherData
                                          ▼
                                 ┌──────────────────────────┐
                                 │ Store in WardrobeContext │
                                 │ .weather = weatherData   │
                                 └──────────────────────────┘
      │
      │ Both mood & weather available
      ▼
┌──────────────────────────────────────────┐
│  StylistAgent.generateOutfitSuggestions()│
│  • Prepare prompt with:                  │
│    - Wardrobe inventory (IDs, metadata)  │
│    - Selected mood (name, description)   │
│    - Weather (temp, condition)           │
└──────────────────────────────────────────┘
      │
      │ POST /model/{modelId}/converse
      ▼
┌──────────────────────────────────────────┐
│  AWS Bedrock (Nova 2 Lite)               │
│  • Generate 3 outfit combinations        │
│  • Prioritize least-worn items           │
│  • Return item IDs + explanation copy    │
└──────────────────────────────────────────┘
      │
      │ raw suggestions (itemIds + copy)
      ▼
┌──────────────────────────────────────────┐
│  Map + score in code (agentOutputGuards) │
│  • Look up each ID in context.clothes    │
│  • Validate outfit composition           │
│  • Compute weatherMatch & wearScore       │
│  • Prepare OutfitCard data               │
└──────────────────────────────────────────┘
      │
      │ Display 3 OutfitCard components
      ▼
┌──────────────────────────────────────────┐
│  User reviews suggestions                │
│  • See outfit preview                    │
│  • Read AI explanation                   │
│  • Click "Wear this"                     │
└──────────────────────────────────────────┘
      │
      │ User confirms outfit
      ▼
┌──────────────────────────────────────────┐
│  logOutfitWear(outfit)                   │
│  • Create WearRecord                     │
│  • Increment wearFrequency for each item │
│  • Update lastWorn dates                 │
└──────────────────────────────────────────┘
      │
      │ Parallel operations
      ├─────────────────────┬────────────────────┐
      ▼                     ▼                    ▼
┌─────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│ Save to         │  │ Update Firestore │  │ Update Context       │
│ Firestore       │  │ • Batch update   │  │ • clothes[]          │
│ /users/{uid}/   │  │   all items      │  │ • outfits[]          │
│  outfits/{id}   │  │ • wearFrequency  │  │                      │
│                 │  │ • lastWorn       │  │ Triggers re-render   │
└─────────────────┘  └──────────────────┘  └──────────────────────┘
```

### Flow 4: Insights Generation (Wear History → AI → Analytics)

```
User navigates to /insights page
      │
      ▼
┌──────────────────────────────────────────┐
│  Insights Page loads                     │
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
      │                                          (NO Bedrock call)
      │ cache miss / stale
      ▼
┌──────────────────────────────────────────┐
│  BehavioralAgent.generateInsights()      │
│  • analytics computed in code            │
│  • Bedrock writes ONLY the 3 nudges      │
└──────────────────────────────────────────┘
      │
      │ POST → aiProxy → Bedrock (nudge copy only)
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
│  Render Insight Visualizations           │
│  • ColorDistribution chart               │
│  • WearFrequencyChart                    │
│  • WeeklyTimeline                        │
│  • NudgeCard (3 behavioral nudges)       │
│  • WeeklyOutfitTimeline                  │
└──────────────────────────────────────────┘
```

### Flow 5: Weather Integration

```
Home page loads OR Suggest page requests weather
      │
      ▼
┌──────────────────────────────────────────┐
│  Check WardrobeContext.weather           │
│  • Is cached? (< 30 min old)             │
└──────────────────────────────────────────┘
      │
      │ Need fresh weather
      ▼
┌──────────────────────────────────────────┐
│  Request browser geolocation permission  │
└──────────────────────────────────────────┘
      │
      ├─────── Permission GRANTED ──────┐
      ▼                                 ▼
┌─────────────────────┐      ┌─────────────────────────┐
│ navigator           │      │ weatherService          │
│ .geolocation        │─────▶│ .getCurrentWeather(     │
│ .getCurrentPosition │      │   lat, lon              │
│                     │      │ )                       │
└─────────────────────┘      └─────────────────────────┘
                                      │
                                      │ Step 1: GET /points/{lat},{lon}
                                      ▼
                             ┌─────────────────────────┐
                             │ NWS API                 │
                             │ • Returns: forecastUrl  │
                             │ • Returns: station IDs  │
                             └─────────────────────────┘
                                      │
                                      │ Step 2: GET {forecastUrl}
                                      ▼
                             ┌─────────────────────────┐
                             │ NWS Forecast API        │
                             │ • Current period        │
                             │ • Temperature           │
                             │ • Condition             │
                             └─────────────────────────┘
                                      │
                                      │ Step 3: GET /stations/{id}/observations
                                      ▼
                             ┌─────────────────────────┐
                             │ NWS Observation API     │
                             │ • Humidity              │
                             │ • Wind speed            │
                             └─────────────────────────┘
                                      │
                                      │ Combine data
                                      ▼
                             ┌─────────────────────────┐
                             │ WeatherData object      │
                             │ • temperature           │
                             │ • feelsLike             │
                             │ • condition             │
                             │ • humidity              │
                             │ • windSpeed             │
                             │ • location              │
                             └─────────────────────────┘
                                      │
                                      ▼
                             ┌─────────────────────────┐
                             │ Store in WardrobeContext│
                             │ .weather = weatherData  │
                             └─────────────────────────┘
      │
      └─────── Permission DENIED ───────┐
                                        ▼
                              ┌─────────────────────────┐
                              │ Fallback: Use default   │
                              │ city (San Francisco)    │
                              │ OR mock weather data    │
                              └─────────────────────────┘
```

---

## Key Data Structures

### ClothingItem

```typescript
{
  id: string                    // UUID
  imageUrl: string              // Firebase Cloud Storage URL
  category: string              // "tops" | "bottoms" | "outerwear" | "dresses" | "shoes"  (accessories/bags = future)
  subcategory: string           // e.g., "Crew Neck T-Shirt", "Slim Fit Jeans"
  color: string                 // e.g., "Navy Blue", "Forest Green"
  colorHex: string              // e.g., "#1B2A4A"
  pattern: string               // e.g., "solid", "striped", "floral", "geometric"
  season: string[]              // ["spring", "summer", "fall", "winter"]
  wearFrequency: number         // Incremented each time worn
  lastWorn: Date | null
  dateAdded: Date
  aiTags: string[]              // ["casual", "professional", "minimalist"]
  userNotes?: string            // Optional user-added notes
}
```

### OutfitSuggestion

```typescript
{
  id: string                    // UUID generated app-side
  items: ClothingItem[]         // Bottoms-based (top layer(s) + 1 bottom) OR dress-based (1 dress + optional outerwear)
  weatherMatch: number          // 0-100, COMPUTED IN CODE from item seasons vs. current temperature
  wearScore: number             // 0-100, COMPUTED IN CODE from real wear counts (higher = less worn)
  explanation: string           // "Perfect for 18°C sunny weather..." (from the model, sanitized)
  mood: FashionMood             // The selected mood object
  isFallback?: boolean          // true when these are code-assembled picks (AI stylist unavailable)
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
  location: string              // "San Francisco, CA", "New York, NY"
}
```

### WearRecord

```typescript
{
  id: string                    // UUID
  date: Date                    // When outfit was worn
  items: ClothingItem[]         // Array of items in outfit
  mood: string                  // Mood at time of wearing
  weather: WeatherData          // Weather conditions that day
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
| AWS Bedrock (behind proxy) | Server-side key (Secret Manager) | JSON (Converse API) | 100 req/min |
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
    by a signature of season + wear state and expires after 24h, so a repeat visit skips the Bedrock
    call unless something changed.

Indexes:
  • wardrobe: indexed by category, dateAdded, wearFrequency
  • outfits: indexed by date (descending) — supports the date-bounded recent-outfits query
```

### Error Handling & Fallbacks

- **Firebase Auth errors** → Translate to user-friendly messages in AuthContext
- **Firestore failures** → Retry with exponential backoff (built-in SDK)
- **Cloud Storage quota** → Compress images before upload, show error if quota exceeded
- **Bedrock API timeout** → Show "AI is thinking..." with 30s timeout, retry once
- **NWS API failure** → Fallback to mock weather data (San Francisco, 18°C, Sunny)
- **Geolocation denied** → Use default city coordinates (San Francisco)
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
     │Firebase│    │   AWS    │    │    NWS     │
     │ (Auth, │    │ Bedrock  │    │  Weather   │
     │ Store, │    │ (Nova AI)│    │    API     │
     │ Cloud) │    │          │    │            │
     └────────┘    └──────────┘    └────────────┘
```

---

## Component Responsibility Matrix

| Component | State Source | External API | Responsibility |
|-----------|-------------|--------------|----------------|
| **Login** | AuthContext | Firebase Auth | Email/password/Google auth UI |
| **Home** | WardrobeContext + local | NWS API, Bedrock | Weather display, quick suggestion |
| **Wardrobe** | WardrobeContext | None | Item browsing, filtering, detail view |
| **Suggest** | WardrobeContext | NWS, Bedrock | Outfit suggestions by mood |
| **Insights** | WardrobeContext | Bedrock | Analytics & behavioral nudges |
| **CameraScannerOverlay** | Local state | Bedrock (via IntakeAgent) | Image capture & AI analysis |

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
  outfits: WearRecord[]
  bookmarkedItems: string[]
  currentMood: FashionMood | null
  weather: WeatherData | null
  insights: UserInsight | null
  userSettings: UserSettings | null
  isLoading: boolean
  error: string | null

  // Methods
  addClothingItem, updateClothingItem, deleteClothingItem
  incrementWearCount, decrementWearCount
  logOutfitWear
  setMood, refreshWeather
  fetchInsights, populateDemoData
  bookmarkItem, unbookmarkItem
  updateUserSettings
}
```
