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
- **Backend**: Firebase (Authentication, Firestore, Cloud Storage)
- **AI Services**: AWS Bedrock with Nova 2 Lite models
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
│       └── WeeklyOutfitTimeline
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
│  Auth: Bearer Token (VITE_BEDROCK_API_KEY)                     │
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

**API Endpoint:**
```
POST https://bedrock-runtime.us-east-2.amazonaws.com/model/us.amazon.nova-2-lite-v1:0/converse

Headers:
- Content-Type: application/json
- Authorization: Bearer {VITE_BEDROCK_API_KEY}

Body:
{
  messages: [{ role: "user", content: [...] }],
  inferenceConfig: { maxTokens: 512, temperature: 0.3 }
}
```

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
│  • Calculate weatherMatch score          │
│  • Prioritize least-worn items           │
│  • Return JSON array                     │
└──────────────────────────────────────────┘
      │
      │ OutfitSuggestion[] (3 suggestions)
      ▼
┌──────────────────────────────────────────┐
│  Map item IDs to ClothingItem objects    │
│  • Look up each ID in context.clothes    │
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
│  • Collect wardrobe data (last 14 days)  │
│  • Collect wear history (all outfits)    │
└──────────────────────────────────────────┘
      │
      │ Wardrobe[] + WearRecord[]
      ▼
┌──────────────────────────────────────────┐
│  BehavioralAgent.generateInsights()      │
│  • Prepare detailed prompt               │
└──────────────────────────────────────────┘
      │
      │ POST /model/{modelId}/converse
      ▼
┌──────────────────────────────────────────┐
│  AWS Bedrock (Nova 2 Lite)               │
│  • Analyze wear patterns                 │
│  • Identify most/least worn items        │
│  • Generate 3 behavioral nudges          │
│  • Calculate weekly wear distribution    │
│  • Return JSON with insights             │
└──────────────────────────────────────────┘
      │
      │ UserInsight object
      ▼
┌──────────────────────────────────────────┐
│  Update WardrobeContext.insights         │
│  • Store insights                        │
│  • Timestamp for cache invalidation      │
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
  category: string              // "tops" | "bottoms" | "outerwear" | "dresses" | "shoes" | "accessories" | "bags"
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
  items: ClothingItem[]         // Array of 3-5 items: top, bottom, shoes, optional outerwear/bag
  weatherMatch: number          // 0-100 score indicating weather appropriateness
  wearScore: number             // Priority score based on least-worn items
  explanation: string           // "Perfect for 18°C sunny weather..."
  comment: string               // "This combo will turn heads!"
  mood: string                  // "Minimal Chic"
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
| AWS Bedrock | Bearer token | JSON (Converse API) | 100 req/min |
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

Indexes:
  • wardrobe: indexed by category, dateAdded, wearFrequency
  • outfits: indexed by date (descending)
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
