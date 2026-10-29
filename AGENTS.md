# AI Agents — How Stylemax Thinks

Stylemax uses **three specialized AI agents**, all powered by **Google Gemini 3.5 Flash-Lite** (`gemini-3.5-flash-lite`) through the `aiProxy` Cloud Function. `VITE_VISION_PROVIDER` selects the provider for **all** agents at once (`src/services/vision/providerRegistry.ts`). The legacy Amazon Nova 2 Lite adapter is still in the client, but the proxy no longer serves AWS Bedrock. Each agent has a single, focused responsibility, its own optimized prompt, and its own temperature setting.

> **Important:** The agents do **not** run in a fixed sequential pipeline. They operate as a **dependency graph** — IntakeAgent and BehavioralAgent run independently, and StylistAgent consumes output from BehavioralAgent when generating outfits.

***

## Agent Dependency Graph

```text
┌───────────────────┐
│   IntakeAgent     │  ← Runs independently on each photo upload
│   temp: 0.2       │     Image → structured clothing metadata
└───────────────────┘
        │
        │  ClothingItem saved to Firestore + Cloud Storage
        │  (wardrobe grows over time)
        ▼

┌───────────────────┐
│  BehavioralAgent  │  ← Runs when Style Log loads, and again after each logged wear
│   temp: 0.85      │     21-day wear history → insights + nudges
└───────────────────┘
        │
        ├── leastWornItemIds ──────────┐
        │                              │
        │  User tags "Wear more"       │
        ├── tryItItemIds ──────────────┤
        │                              ▼
        │                    ┌───────────────────────┐
        │                    │   StylistAgent         │  ← Runs on Today
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

**Key insight:** StylistAgent receives a `BehavioralContext` object describing which items to prioritize. The `leastWornItemIds` in that context are computed **deterministically in code** (`computeSeasonalLeastWornIds` — least-worn, in-season, owned 3+ weeks) directly from wear history, so the wear-history priority hint is available on **every** Suggest request, whether or not the Insights page has been opened this session. BehavioralAgent is the copywriter for the Insights page; it does not gate the Stylist.

***

## Agent 1: IntakeAgent

**File:** `src/services/agents/IntakeAgent.ts`

**Trigger:** Every time a user uploads or photographs a clothing item.

**What it does:** Sends the base64-encoded image to Gemini with a structured prompt asking for clothing metadata. The model responds with a JSON object that becomes the `ClothingItem` record stored in Firestore.

**Input:**

* Base64-encoded image (JPEG/PNG)

* Text prompt requesting JSON output in a defined schema

**Output (**`ClothingItem`**&#x20;metadata):**

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

* Temperature **0.2** — very low, for consistent and repeatable categorization. Fashion categorization needs precision, not creativity.

* Multimodal input via Gemini `generateContent`: `inline_data` image part + text part in the same message (`responseMimeType: application/json`).

* Model choice: on the 190 photos shared by both intake evals (`scripts/eval/last-report.md`, `scripts/eval/last-report-gemini-3.5-flash-lite.md`), Gemini 3.5 Flash-Lite (with the one-piece-dress rule) has the best category accuracy of the three models (92.1% vs Nova 90.0%, Gemini 2.5 Flash 88.4%), gets 27/27 shoes, and has no announced shutdown date. Known weak spot: slip dresses (3/10) are still often labeled as tops.

* Detects clothing **and shoes** (category one of tops / bottoms / outerwear / dresses / shoes); bags, hats, and other accessories are intentionally excluded.

* Mood tags: 1–2 of professional / casual / romantic, each defined in the prompt by example garments so tags agree with the Stylist's mood rules (`src/data/moodStyles.ts`). They become `aiTags` / `userMoods` and feed the mood-fit score.

* Safety check: the prompt first screens for inappropriate content (nudity, violence, etc.) before analyzing the clothing.

* Fallback: if the model returns malformed JSON or a timeout occurs, the item is saved with a default "unknown" category so the upload never silently fails.

***

## Agent 2: StylistAgent

**File:** `src/services/agents/StylistAgent.ts`

**Trigger:** When Today needs looks for the selected mood and today's weather. One batch is fetched per (wardrobe items, mood, weather bucket) and cached for the rest of the day (`useStylistLooks`: memory, then `localStorage`; the weather part of the key is wet/dry + the temperature band `computeWeatherMatch` scores against (≤5 / ≤15 / ≤24 / >24 °C), so the 30-minute "now" refresh does not re-run the model or reset the swipe stack; code-assembled fallback batches are never persisted and expire from memory after 60s). Weather is optional: with no location and no city, looks are generated without it (the prompt says so and `computeWeatherMatch` scores against the calendar season); while the first reading is still loading, the hook waits for it instead of making two calls. After a mood switch the previous mood's looks are not shown while the new batch loads; instead the hook offers `previewLooks`, code-assembled mood looks (`buildCodeLooks`, flagged `isFallback`, stable ids) available from first paint, before weather or the model answer, which the UI can show while the AI looks load (Today currently shows a "Styling for the best looks…" card instead). The AI batch: Today shows it as a swipe stack, and Tweak mode's **Spin** lands the hanger rails on it (respecting locked pieces), then falls back to code-assembled combinations once the batch is used up.

**What it does:** Scores every piece for the selected mood in code, drops the pieces that clash with it, and sends the rest (as a condensed JSON array, best fit first, each labeled `"fit": "high" | "ok"`) together with a **mood brief** (what the mood means in garments), the current weather (or "unknown"), and a `BehavioralContext` from BehavioralAgent. Gemini reasons about which combinations work together — mood first, then weather practicality, composition, wear-history priorities and color — and returns three distinct outfits with explanations. The looks are re-ranked by a computed `moodMatch` so the best mood fit leads the swipe stack.

**Moods:** Professional, Casual, Romantic. (Creative and Sporty were retired; athleisure — hoodies, joggers, leggings, track jackets — now reads as Casual. Stored `creative` / `sporty` selections, `preferredVibe` values and item tags are ignored — `useMood` falls through to the next valid source, `normalizeMoodIds` drops the tag, and past wear records still show the old name via `moodLabel`.)

**Mood rules (`src/data/moodStyles.ts`):** a curated table, built from established dress conventions (business / business-casual dress codes, smart casual, athleisure, the romantic style vocabulary), that says for each mood what to reach for, silhouettes and fabrics, colors, and what breaks the mood, plus keyword lists matched against item subcategories. `src/services/agents/moodFit.ts` turns it into a score per piece (0–1): neutral 0.5, +0.3 if the user tagged the piece with this mood, +0.35 / +0.15 for a textbook / suitable garment type, −0.45 for a clashing one (which beats a tag), small color and category nudges. Pieces under 0.35 are **off-mood** and never reach the prompt (unless a group would be too thin to build looks, in which case the best of that group is kept); 0.7+ is "high".

**Weather rules (`src/data/weatherStyles.ts`):** the weather twin of the mood table, built from wet-weather dressing guides and clothing-insulation (clo) rankings. `readWeather` reduces the reading to a temperature band on "feels like" (cold ≤5 / cool ≤15 / mild ≤24 / hot >24 °C) plus rain, snow and wind (≥30 km/h). Each active rule scores a piece by keyword (`src/services/agents/weatherFit.ts`): +0.3 made for it, +0.15 works, −0.15 mildly wrong; any "avoid" term caps the piece at 0.2, so a warm band can't rescue it. Rain rules out leather, suede, canvas, silk and open shoes, and allows knits only under a weatherproof layer (`underShellOnly`: kept when the closet has a mood-fitting rain jacket / trench / shell, which `applyWeatherNeeds` then puts on every look; vetoed otherwise); heat rules out puffers, wool coats and fleece; cold rules out shorts, sandals, sundresses and linen. Pieces under 0.35 are **off-weather** and never reach the prompt (same thin-group top-up as mood). Every look, AI or code-built, then gets what the weather requires (`applyWeatherNeeds`): a weatherproof layer (rain jacket, trench, shell, parka) in rain or wind, some outer layer when cold or cool, and boots in place of other shoes in rain, each only if the closet has one. The prompt gets a `WEATHER NOW` block with the reading, each active rule and the allowed raincoat / boot aliases. The card's Weather score is `40 × season share + 60 × weather fit` with the fit rescaled so 0.2 → 0 and 0.8+ → 1 (a raincoat-and-boots look in the rain reaches 100); with no rules yet it is the old season-only `50 + 50 × share`. IntakeAgent names the material in `subcategory` when visible ("Leather Biker Jacket", "Waterproof Rain Jacket") so these keywords can match.

**Input:**

```text
wardrobe:          ClothingItem[]    (alias id, category, subcategory, color, season, fit) — off-mood and off-weather pieces removed
weather:           WeatherData|null  (temperature, feelsLike, condition)
mood:              FashionMood       (id, name) + its MoodStyle brief
userProfile?:      { gender, height, weight }
behavioralContext?: BehavioralContext  (see below)
```

**BehavioralContext (cross-agent data):**

```typescript
type BehavioralContext = {
    leastWornItemIds: string[];      // Items unworn for 3+ weeks in current season (computed in code)
    tryItItemIds: string[];          // Items the user tagged "Wear more" (scanner or Closet); cleared once worn
    deprioritizeItemIds?: string[];  // Items the user keeps skipping & has never worn — surfaced less
};
```

These are merged into a `priorityIds` set and injected into the prompt as rule 4, **after** mood, weather and composition: *"once 1 to 3 are satisfied, include at least one of these across the 3 outfits."* Items from `tryItItemIds` are named as explicitly requested. A priority piece that is off-mood is not sent at all: a "Wear more" hoodie waits for a mood it suits instead of landing in a Professional look.

**Output (3 ×&#x20;**`OutfitSuggestion`**):**

```json
[
  {
    "itemIds": ["i3", "i7", "i12"],
    "explanation": "Linen is breathable for the 30°C heat, but the collar maintains the professional mood."
  }
]
```

**How it prioritizes items** (the order is stated in the prompt):

1. **Mood fit** (highest) — every outfit must read as the mood; anchored on a "high" fit piece; consistent formality. Enforced in code too (off-mood pieces are filtered out, looks re-ranked by `moodMatch`).

2. **Weather** — the `WEATHER NOW` rules (band, rain, snow, wind). Enforced in code too: off-weather pieces filtered out, required layers and boots added.

3. **Composition** — the strict bottoms-based / dress-based rules below

4. **"Wear more" and least-worn items** — at least one across the 3 outfits, among pieces that fit the mood; "Wear more" first

5. **Color coordination** — aesthetic cohesion guided by the mood's palette

Previously mood was a name plus "prioritize userMoods", ranked below the wear-more priorities, with no definition of the mood and no code check, so neglected or "Wear more" pieces routinely beat it.

Items the user **repeatedly skips and has never worn** (3+ times, from `suggestionEvents`) are **deprioritized** — surfaced at most once across the 3 outfits. This rejection signal overrides "least-worn" but never an explicit "Try it", and the `wearFrequency` guard means it can never suppress an item the user actually wears.

**Design decisions:**

* Temperature **0.75** — balanced toward creativity. Outfit combinations need novelty, but can't be random.

* Wardrobe JSON is trimmed to only the fields the model needs (no `imageUrl`, no `userNotes`) to minimize input token cost.

* **Latency budget.** Items are sent under short prompt-local aliases (`i1`, `i2`, … via `StylistAliases`) instead of 20–36 character ids, and the model is asked only for `itemIds` + `explanation` (scores are computed in code anyway). For a 40-item wardrobe this roughly halves the prompt (~2.6k → ~1.3k tokens) and cuts the generated output by ~70% (~420 → ~130 tokens). Text agents run with Gemini thinking at `minimal` (`geminiProvider.callText`, override with `VITE_GEMINI_THINKING_LEVEL`), since thinking tokens are generated before the first answer token. The Stylist call times out at 15s and is not retried after a timeout (429/5xx still retry once).

* Outfit structure is enforced in the prompt AND re-validated in code: each outfit is EITHER bottoms-based (1 bottom + ≥1 top layer) OR dress-based (1 dress + optional outerwear), with an optional single "shoes" item added to either shape. Anything else is dropped.

* `weatherMatch`, `wearScore` and `moodMatch` are **computed in code** (`computeWeatherMatch` from item seasons vs. temperature; `computeWearScore` from real wear counts) — the model's self-reported numbers are ignored. Same principle as BehavioralAgent's analytics: scoring is arithmetic, so it is code's job, not the model's.

* Items are passed by ID (a short alias that code maps back to the real ID), not name, to prevent the model from "inventing" items. The app validates that every returned ID actually exists in the wardrobe before rendering; an alias the prompt never issued is dropped like any other unknown ID.

* Tone varies across the 3 outfits: one punchy/hype, one poetic/editorial, one warm/encouraging.

***

## Agent 3: BehavioralAgent

**File:** `src/services/agents/BehavioralAgent.ts`

**Trigger:** When a user opens the Style Log page, and again after each logged wear or closet change while it is open. The generated **nudge copy is cached in Firestore** (`/insights/latest`) keyed by a signature of season + wear state, so a repeat visit skips the model call unless the wear data changed or the cache is >24h old. The analytics (counts, most/least worn, weekly pattern) are always recomputed in code, so charts are never stale even on a cache hit.

**What it does:** Analyzes the user's 21-day (3-week) wear history against their full wardrobe composition, filtered to the current season. Gemini identifies patterns — overused items, neglected items, color biases, day-of-week habits — and generates three personalized behavioral nudges alongside analytics data.

**Its output also feeds into StylistAgent** — the `leastWornItems` list becomes `leastWornItemIds` in the `BehavioralContext`, and any items the user tags "Wear more" become `tryItItemIds`. This creates a feedback loop where insights directly influence the next outfit suggestion.

**Input:**

```text
wardrobe:    ClothingItem[]     (full wardrobe, filtered to current season before prompting)
wearHistory: WearRecord[]      (last 21 days of logged outfits)
```

**Output (**`UserInsight`**):**

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

* Temperature **0.85** — highest of the three agents, intentionally. Behavioral nudges need to feel like a conversation with a knowledgeable friend, not a data report. Warmth and specificity are goals.

* 21-day window is a deliberate trade-off: long enough to find meaningful patterns, short enough to keep input token count manageable and insights feeling current.

* Only items matching the **current season** are considered — a winter coat unworn in summer doesn't count as "neglected."

* A **21-day ownership grace period** applies: an item must have been in the wardrobe for 3+ weeks before it can be flagged as least-worn. This stops a freshly added wardrobe (or a new demo user) from being nudged about items with a false "unworn for 3 weeks" claim. Least-worn items are sorted by `lastWorn ?? dateAdded` ascending (most neglected first).

* The prompt emphasizes user-specific observations over generic advice. "You have 5 blue shirts but only wore 1 last week" beats "try wearing more variety."

* Fallback: if the AI returns no least-worn items, the agent dynamically computes them by diffing worn IDs against the seasonal wardrobe.

***

## Why Three Agents Instead of One?

The single-agent approach would collapse all three responsibilities into one mega-prompt, hurting each task:

| Concern     | Single Agent                                                    | Three Agents                                 |
| ----------- | --------------------------------------------------------------- | -------------------------------------------- |
| Accuracy    | One prompt balances competing goals                             | Each prompt optimized for its task           |
| Tuning      | Changing one behavior risks breaking others                     | Update one agent without touching the others |
| Cost        | Pays for full capability even for simple intake                 | Each agent only uses what it needs           |
| Temperature | One temperature for tasks that need different creativity levels | Per-agent temperature tuning                 |

The tradeoff is latency — each model call adds 2–5 seconds. For intake (one-time per item) this is acceptable. For outfit generation and insights, the app shows a loading state with skeleton cards.

***

## Cross-Agent Data Flow

```text
Style Log                                  Today
─────────                                  ─────
BehavioralAgent.generateInsights()
        │
        ├─→ insights.leastWornItems ──────→ behavioralContext.leastWornItemIds
        │                                          │
        │   User tags "Wear more" (scan / Closet)  │
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

***

## Error Handling & Fallbacks

* **Malformed JSON from the model** — the provider adapter (`geminiProvider.ts`, via `extractJsonFromText` in `bedrockClient.ts`) strips markdown code fences and attempts `JSON.parse`. If it fails, the agent throws a typed error and the calling page displays a user-facing error banner.

* **Model API timeout** — 30-second timeout with one automatic retry (StylistAgent: 15 seconds, no retry after a timeout, because Today is waiting on it). If both fail, IntakeAgent falls back to a default placeholder item (flagged `usedFallback`); StylistAgent returns code-assembled fallback outfits flagged `isFallback: true` (rendered as "quick picks — AI stylist unavailable"), built by `assembleMoodLooks` from mood fit first, then weather fit and wear priorities (an outer layer when it is cool, shoes when there are any), with **real, computed** scores (never fabricated numbers); BehavioralAgent returns computed analytics with pre-written nudge copy.

* **Item ID hallucination (StylistAgent)** — After parsing, each returned item ID is validated against `context.clothes`. Any ID not found is silently dropped; if the surviving items can't form a valid bottoms-based or dress-based outfit, that outfit is discarded.

* **Empty least-worn list (BehavioralAgent)** — If the AI returns no least-worn items, a dynamic fallback computes them by diffing worn item IDs against the seasonal wardrobe.

* **Behavioral nudge fallback** — If AI nudges are empty or the call fails entirely, pre-written fallback nudges reference actual unworn items by color and type from three tone pools (hype, witty, editorial).

⠀