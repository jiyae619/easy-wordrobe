# AI Agents — How Stylemax Thinks

Stylemax uses **three specialized AI agents**, all powered by **Amazon Nova 2 Lite** via AWS Bedrock's Converse API. Each agent has a single, focused responsibility, its own optimized prompt, and its own temperature setting.

> **Important:** The agents do **not** run in a fixed sequential pipeline. They operate as a **dependency graph** — IntakeAgent and BehavioralAgent run independently, and StylistAgent consumes output from BehavioralAgent when generating outfits.

---

## Agent Dependency Graph

```
┌───────────────────┐
│   IntakeAgent     │  ← Runs independently on each photo upload
│   temp: 0.2       │     Image → structured clothing metadata
└───────────────────┘
        │
        │  ClothingItem saved to Firestore + Cloud Storage
        │  (wardrobe grows over time)
        ▼

┌───────────────────┐
│  BehavioralAgent  │  ← Runs independently when Insights page loads (cached per session)
│   temp: 0.85      │     21-day wear history → insights + nudges
└───────────────────┘
        │
        ├── leastWornItemIds ──────────┐
        │                              │
        │  User clicks "Will try"      │
        ├── tryItItemIds ──────────────┤
        │                              ▼
        │                    ┌───────────────────────┐
        │                    │   StylistAgent         │  ← Runs on Suggest page
        │                    │   temp: 0.75           │     Wardrobe + weather + mood
        │                    │                        │     + BehavioralContext → 3 outfits
        │                    └───────────────────────┘
        │                              │
        │                              │  User taps "Wear it"
        │                              ▼
        │                    logOutfitWear() updates wearFrequency
        │                              │
        └──────────────────────────────┘
              (next Insights refresh reflects new wear data)
```

**Key insight:** BehavioralAgent's output feeds *into* StylistAgent via a `BehavioralContext` object. This means BehavioralAgent must have run at least once (or its cached result must exist) before StylistAgent can incorporate wear-history priorities. If no insights are available yet, StylistAgent still works — it just skips the behavioral priority hint.

---

## Agent 1: IntakeAgent

**File:** `src/services/agents/IntakeAgent.ts`

**Trigger:** Every time a user uploads or photographs a clothing item.

**What it does:** Sends the base64-encoded image to Nova with a structured prompt asking for clothing metadata. The model responds with a JSON object that becomes the `ClothingItem` record stored in Firestore.

**Input:**
- Base64-encoded image (JPEG/PNG)
- Text prompt requesting JSON output in a defined schema

**Output (`ClothingItem` metadata):**
```json
{
  "category": "outerwear",
  "subcategory": "Denim Jacket",
  "color": "Medium Wash Blue",
  "colorHex": "#5B7C99",
  "season": ["spring", "summer", "fall"],
  "aiTags": ["casual", "streetwear", "weekend"]
}
```

**Design decisions:**
- Temperature **0.2** — very low, for consistent and repeatable categorization. Fashion categorization needs precision, not creativity.
- Multimodal input via Converse API: image block + text block in the same message.
- Safety check: the prompt first screens for inappropriate content (nudity, violence, etc.) before analyzing the clothing.
- Fallback: if the model returns malformed JSON or a timeout occurs, the item is saved with a default "unknown" category so the upload never silently fails.

---

## Agent 2: StylistAgent

**File:** `src/services/agents/StylistAgent.ts`

**Trigger:** When a user selects a mood on the Suggest page and taps "Get Suggestions."

**What it does:** Receives the user's entire wardrobe inventory (as a condensed JSON array), the current weather conditions, the selected mood, and a `BehavioralContext` from BehavioralAgent. Nova reasons about which combinations work together — considering color coordination, seasonal appropriateness, weather practicality, and wear-history priorities — and returns three distinct outfits with explanations.

**Input:**
```
wardrobe:          ClothingItem[]    (id, category, subcategory, color, season, userMoods)
weather:           WeatherData       (temperature, feelsLike, condition)
mood:              FashionMood       (id, name, description)
userProfile?:      { gender, height, weight }
behavioralContext?: BehavioralContext  (see below)
```

**BehavioralContext (cross-agent data):**
```typescript
type BehavioralContext = {
    leastWornItemIds: string[];  // Items unworn for 3+ weeks in current season (from BehavioralAgent)
    tryItItemIds: string[];      // Items the user explicitly tapped "Will try" on Insights page
};
```

These are merged into a `priorityIds` set and injected into the prompt as **BEHAVIORAL PRIORITY ITEMS**, with the instruction: *"incorporate at least one of these across your 3 outfits — the user wants to wear these more."* Items from `tryItItemIds` are marked as highest priority.

**Output (3 × `OutfitSuggestion`):**
```json
[
  {
    "itemIds": ["item-uuid-1", "item-uuid-2", "item-uuid-3"],
    "moodName": "Casual",
    "weatherMatch": 92,
    "wearScore": 74,
    "explanation": "Linen is breathable for the 30°C heat, but the collar maintains the professional mood."
  }
]
```

**How it prioritizes items:**
1. **"Try it" items** (highest) — user explicitly requested these from the Insights page
2. **Least-worn items** — BehavioralAgent flagged these as unworn for 3+ weeks in the current season
3. **Mood-tagged items** — items whose `userMoods` array includes the selected mood ID
4. **Weather + seasonal fit** — appropriate for current temperature and conditions
5. **Color coordination** — aesthetic cohesion guided by the mood's color palette

**Design decisions:**
- Temperature **0.75** — balanced toward creativity. Outfit combinations need novelty, but can't be random.
- Wardrobe JSON is trimmed to only the fields Nova needs (no `imageUrl`, no `userNotes`) to minimize input token cost.
- Outfit structure is enforced in the prompt: must include a top + bottoms OR a dress. Outerwear is optional.
- Items are passed by ID, not name, to prevent the model from "inventing" items. The app validates that every returned ID actually exists in the wardrobe before rendering.
- Tone varies across the 3 outfits: one punchy/hype, one poetic/editorial, one warm/encouraging.

---

## Agent 3: BehavioralAgent

**File:** `src/services/agents/BehavioralAgent.ts`

**Trigger:** When a user navigates to the Insights page (cached for the session; refreshed if data is stale).

**What it does:** Analyzes the user's 21-day (3-week) wear history against their full wardrobe composition, filtered to the current season. Nova identifies patterns — overused items, neglected items, color biases, day-of-week habits — and generates three personalized behavioral nudges alongside analytics data.

**Its output also feeds into StylistAgent** — the `leastWornItems` list becomes `leastWornItemIds` in the `BehavioralContext`, and any items the user marks "Will try" become `tryItItemIds`. This creates a feedback loop where insights directly influence the next outfit suggestion.

**Input:**
```
wardrobe:    ClothingItem[]     (full wardrobe, filtered to current season before prompting)
wearHistory: WearRecord[]      (last 21 days of logged outfits)
```

**Output (`UserInsight`):**
```json
{
  "mostWornColors": [{ "color": "Navy Blue", "hex": "#1B2A4A", "count": 8 }],
  "mostWornItems": [{ "itemId": "uuid", "count": 5 }],
  "leastWornItems": ["uuid-a", "uuid-b", "uuid-c"],
  "suggestedVariations": [
    "Your vintage denim jacket hasn't seen sunlight in 3 weeks — it's begging for a sunny afternoon.",
    "Your wardrobe called — it says you keep picking the same three things. Time to branch out.",
    "A wardrobe is only as interesting as its least-worn piece — the untold story is always the most compelling one."
  ],
  "weeklyWearPattern": [
    { "day": "Mon", "count": 1 }, { "day": "Fri", "count": 3 }
  ]
}
```

**Behavioral nudges** are written in three distinct voices:
1. **Hype Coach** — short, punchy, motivating. References a specific unworn item by color and type.
2. **Witty Best Friend** — playful, teasing, warm. Calls out a wear pattern (e.g., always the same color).
3. **Fashion Editor** — one elegant, inspiring sentence about wardrobe potential.

**Design decisions:**
- Temperature **0.85** — highest of the three agents, intentionally. Behavioral nudges need to feel like a conversation with a knowledgeable friend, not a data report. Warmth and specificity are goals.
- 21-day window is a deliberate trade-off: long enough to find meaningful patterns, short enough to keep input token count manageable and insights feeling current.
- Only items matching the **current season** are considered — a winter coat unworn in summer doesn't count as "neglected."
- The prompt emphasizes user-specific observations over generic advice. "You have 5 blue shirts but only wore 1 last week" beats "try wearing more variety."
- Fallback: if the AI returns no least-worn items, the agent dynamically computes them by diffing worn IDs against the seasonal wardrobe.

---

## Why Three Agents Instead of One?

The single-agent approach would collapse all three responsibilities into one mega-prompt, hurting each task:

| Concern | Single Agent | Three Agents |
|---------|-------------|-------------|
| Accuracy | One prompt balances competing goals | Each prompt optimized for its task |
| Tuning | Changing one behavior risks breaking others | Update one agent without touching the others |
| Cost | Pays for full capability even for simple intake | Each agent only uses what it needs |
| Temperature | One temperature for tasks that need different creativity levels | Per-agent temperature tuning |

The tradeoff is latency — each Bedrock call adds 2–5 seconds. For intake (one-time per item) this is acceptable. For outfit generation and insights, the app shows a loading state with skeleton cards.

---

## Cross-Agent Data Flow

```
Insights Page                              Suggest Page
─────────────                              ────────────
BehavioralAgent.generateInsights()
        │
        ├─→ insights.leastWornItems ──────→ behavioralContext.leastWornItemIds
        │                                          │
        │   User taps "Will try"                   │
        ├─→ tryItItemIds (saved to Firestore) ──→ behavioralContext.tryItItemIds
        │                                          │
        │                                          ▼
        │                              StylistAgent.generateOutfitSuggestions()
        │                                          │
        │                                          ▼
        │                              User taps "Wear it"
        │                                          │
        │                              logOutfitWear() → Firestore
        │                                          │
        └──────────────────────────────────────────┘
                  Next refresh picks up new wear data
```

This creates a **virtuous cycle**: BehavioralAgent surfaces neglected items → StylistAgent incorporates them into outfits → user wears them → wear history updates → BehavioralAgent no longer flags them as neglected.

---

## Error Handling & Fallbacks

- **Malformed JSON from Nova** — `bedrockClient.ts` strips markdown code fences and attempts `JSON.parse`. If it fails, the agent throws a typed error and the calling page displays a user-facing error banner.
- **Bedrock API timeout** — 30-second timeout with one automatic retry. If both fail, IntakeAgent falls back to a default mock item; StylistAgent and BehavioralAgent surface an error state with mock data.
- **Item ID hallucination (StylistAgent)** — After parsing, each returned item ID is validated against `context.clothes`. Any ID not found is silently dropped; if fewer than 2 valid items remain in a suggestion, that outfit is discarded.
- **Empty least-worn list (BehavioralAgent)** — If the AI returns no least-worn items, a dynamic fallback computes them by diffing worn item IDs against the seasonal wardrobe.
- **Behavioral nudge fallback** — If AI nudges are empty or the call fails entirely, pre-written fallback nudges reference actual unworn items by color and type from three tone pools (hype, witty, editorial).
