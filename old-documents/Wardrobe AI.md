# Wardrobe AI

## 1. Project Overview

**Wardrobe AI** is a mobile-first web app that helps users manage their closet and receive AI-powered outfit suggestions based on their mood, weather, and personal style. Built with React, Vite, Tailwind CSS, and AWS Bedrock (Nova model).

### Core Features
- **Smart Closet Management** — Upload clothing photos, auto-categorize by type/color/season via AI image analysis
- **Mood-Based Styling** — Select your mood and get outfit recommendations that match how you feel
- **Weather-Aware Suggestions** — Real-time weather integration to suggest weather-appropriate outfits
- **Wardrobe Insights** — Analytics on wear frequency, color distribution, and style nudges to maximize your closet

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript, Vite, Tailwind CSS |
| AI/ML | AWS Bedrock (Amazon Nova) for image analysis & outfit generation |
| Weather | OpenWeatherMap API |
| Design | Olive/sage green palette, Poppins font, mobile-first (480px container) |

---

## 2. Problem Statement

**The "I have nothing to wear" problem.**

Most people only wear ~20% of their wardrobe regularly. Users struggle with:
- **Decision fatigue** — Spending too much time choosing outfits every morning
- **Underutilized clothes** — Forgetting about items buried in their closet
- **Weather mismatches** — Dressing inappropriately for the day's conditions
- **Event disconnect** — Wearing clothes that matches appropriate event.
- **No outfit memory** — Repeating the same outfits without realizing it

**Our solution:** An AI-powered personal stylist that knows your entire wardrobe, understands the weather, reads your context, and suggests outfits you'll actually love, all in under 30 seconds!

---

## 3. User Persona

### Primary: "Busy Professional"
- **Age:** 22–35
- **Lifestyle:** Works full-time, active social life, values efficiency
- **Pain point:** Spends 10–15 min each morning deciding what to wear
- **Goal:** Look put-together with minimal effort
- **Tech comfort:** High — uses apps daily, comfortable with AI tools

### Secondary: "Fashion Explorer"
- **Age:** 18–28
- **Lifestyle:** Enjoys experimenting with style, follows fashion trends
- **Pain point:** Has many clothes but struggles to create new combinations and always spend time on Instgram or Pinterest to find outfit ideas.
- **Goal:** Discover fresh outfit combinations from existing wardrobe
- **Tech comfort:** Very high — early adopter

---

## 4. User Journey

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  DISCOVER   │────▶│   ONBOARD    │────▶│  BUILD       │────▶│  DAILY USE   │
│  the app    │     │  Upload      │     │  WARDROBE    │     │  Get outfit  │
│             │     │  first items │     │  Add more    │     │  suggestions │
└─────────────┘     └──────────────┘     │  clothes     │     │  each morning│
                                         └──────────────┘     └──────┬───────┘
                                                                     │
                                                              ┌──────▼───────┐
                                                              │  INSIGHTS    │
                                                              │  Review      │
                                                              │  habits &    │
                                                              │  optimize    │
                                                              └──────────────┘
```

| Stage | User Action | App Response |
|-------|------------|--------------|
| **Discover** | Opens app for the first time | Hero page with value proposition + quick upload CTA |
| **Onboard** | Uploads first clothing photo | AI analyzes image → auto-tags category, color, season |
| **Build** | Adds more items to wardrobe | Wardrobe grid fills up with organized, filterable cards |
| **Daily Use** | Selects mood → taps "Suggest" | AI generates outfit combos from their closet + weather data |
| **Insights** | Checks analytics over time | Sees wear frequency, color distribution, style nudges |

---

## 5. User Flow

```
HOME ──────────────────────────────────────────────
│  • Hero section with greetings
│  • Quick stats (items count, outfits generated)
│  • Weather preview
│  • Quick outfit suggestion based on current weather
│  • Camera button to upload new items in the nav bar
│
├──▶ WARDROBE ─────────────────────────────────────
│    • Grid of all uploaded clothing items
│    • Filter by category (Tops, Bottoms, Shoes, etc.)
│    • Search by color or tag
│    • Upload new items (camera / gallery)
│
├──▶ MOOD ─────────────────────────────────────────
│    • Select current mood (Happy, Chill, Bold, Romantic,etc.)
│    • Mood selection feeds into suggestion engine
│    │
│    └──▶ SUGGEST ─────────────────────────────────
│         • AI-generated outfit cards
│         • Shows match score + reasoning
│         • "Wear This" action to log outfit and "Try Another" action to generate new outfit
│
└──▶ INSIGHTS ─────────────────────────────────────
     • Weekly outfit timeline (based on logged outfits)
     - Suggest outfits for the next week based on least worn clothes with "Let's try this outfit" button
     • Wear frequency chart (most/least worn)
     • Style nudges ("Try wearing X more")
```

---

## 6. Information Architecture

```
wardrobe-ai/
├── src/
│   ├── pages/                    ← 5 main views
│   │   ├── Home.tsx              ← Landing, hero, upload entry point
│   │   ├── Wardrobe.tsx          ← Closet grid + filters
│   │   ├── Mood.tsx              ← Mood selection
│   │   ├── Suggest.tsx           ← AI outfit recommendations
│   │   └── Insights.tsx          ← Analytics dashboard
│   │
│   ├── components/               ← Reusable UI components
│   │   ├── upload/               ← ImageUpload
│   │   ├── wardrobe/             ← WardrobeCard, WardrobeGrid, FilterBar
│   │   ├── mood/                 ← MoodCard
│   │   ├── suggestions/          ← OutfitCard, WeatherSummary
│   │   └── insights/             ← WeeklyTimeline, WearFrequencyChart,
│   │                               ColorDistribution, NudgeCard
│   │
│   ├── context/                  ← WardrobeContext (global state)
│   ├── services/                 ← AWS Nova AI, weather API
│   ├── hooks/                    ← Custom React hooks
│   ├── types/                    ← TypeScript interfaces
│   └── data/                     ← Demo/sample data
│
├── Navigation: Bottom tab bar (mobile-first)
│   [Home] [Wardrobe] [Mood] [Suggest] [Insights]
│
└── Design System: index.css
    Colors: Olive/sage green palette
    Font: Poppins
    Style: Glassmorphism nav, card hover effects, micro-animations
```