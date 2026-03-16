# AI Agents — How Stylemax Thinks

Stylemax uses **three specialized AI agents**, all powered by **Amazon Nova 2 Lite** via AWS Bedrock's Converse API. Each agent has a single, focused responsibility, its own optimized prompt, and its own temperature setting. They run sequentially as the user moves through the app.

---

## The Three-Agent Pipeline

```
User uploads clothing photo
            │
            ▼
    ┌───────────────────┐
    │   IntakeAgent     │  ← "What is this item?"
    │   temp: 0.3       │     Vision + language model
    │   ~300 in tokens  │     Image → structured metadata
    └───────────────────┘
            │
            │  ClothingItem saved to Firestore + Cloud Storage
            ▼
    ┌───────────────────┐
    │   StylistAgent    │  ← "What should I wear today?"
    │   temp: 0.6       │     Wardrobe + weather + mood → outfits
    │   ~1000 in tokens │     Returns 3 outfit combinations
    └───────────────────┘
            │
            │  User logs worn outfit → wear history grows
            ▼
    ┌───────────────────┐
    │  BehavioralAgent  │  ← "How can I wear my wardrobe better?"
    │   temp: 0.7       │     21-day wear history → insights
    │   ~800 in tokens  │     Returns nudges + analytics
    └───────────────────┘
```

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
- Temperature **0.3** — low, for consistent and repeatable categorization. Fashion categorization needs precision, not creativity.
- Multimodal input via Converse API: image block + text block in the same message.
- Fallback: if the model returns malformed JSON or a timeout occurs, the item is saved with a default "unknown" category so the upload never silently fails.

---

## Agent 2: StylistAgent

**File:** `src/services/agents/StylistAgent.ts`

**Trigger:** When a user selects a mood on the Suggest page and taps "Get Suggestions."

**What it does:** Receives the user's entire wardrobe inventory (as a condensed JSON array), the current weather conditions, and the selected mood. Nova reasons about which combinations work together — considering color coordination, seasonal appropriateness, and weather practicality — and returns three distinct outfits with explanations.

**Input:**
```
wardrobe: ClothingItem[]    (id, category, color, pattern, season, aiTags, wearFrequency)
weather:  { temperature, condition, humidity }
mood:     { name, description }   e.g., "Minimal Chic — clean lines, neutral palette"
```

**Output (3 × `OutfitSuggestion`):**
```json
[
  {
    "items": ["item-uuid-1", "item-uuid-2", "item-uuid-3"],
    "explanation": "Linen is breathable for the 30°C heat, but the collar maintains the professional mood.",
    "weatherMatch": 92,
    "wearScore": 74
  }
]
```

`wearScore` is a priority hint calculated from `wearFrequency` — the agent is prompted to prefer items the user hasn't worn recently, nudging wardrobe diversity.

**Design decisions:**
- Temperature **0.6** — balanced between creativity and coherence. Outfit combinations need some novelty, but can't be random.
- Wardrobe JSON is trimmed to only the fields Nova needs (no `imageUrl`, no `userNotes`) to minimize input token cost.
- Outfit structure is enforced in the prompt: must include at least one top, one bottom, and shoes. Outerwear and accessories are optional.
- Items are passed by ID, not name, to prevent the model from "inventing" items. The app validates that every returned ID actually exists in the wardrobe before rendering.

---

## Agent 3: BehavioralAgent

**File:** `src/services/agents/BehavioralAgent.ts`

**Trigger:** When a user navigates to the Insights page (cached for the session; refreshed if data is stale).

**What it does:** Analyzes the user's 14-day wear history against their full wardrobe composition. Nova identifies patterns — overused items, neglected items, color biases, day-of-week habits — and generates three personalized behavioral nudges alongside analytics data.

**Input:**
```
wardrobe:   ClothingItem[]     (full wardrobe)
wearHistory: WearRecord[]      (last 14 days of logged outfits)
```

**Output (`UserInsight`):**
```json
{
  "mostWornColors": [{ "color": "Navy Blue", "hex": "#1B2A4A", "count": 8 }],
  "mostWornItems": [{ "itemId": "uuid", "count": 5 }],
  "leastWornItems": ["uuid-a", "uuid-b", "uuid-c"],
  "suggestedVariations": [
    "You wear dark colors on rainy days but have three pastel sweaters gathering dust! Next drizzle, try your mint cardigan with those gray jeans.",
    "Your vintage denim jacket hasn't seen sunlight in 3 weeks — it's begging for a sunny afternoon.",
    "Friday is your most experimental style day. Lean into it: try that floral shirt you've been avoiding."
  ],
  "weeklyWearPattern": [
    { "day": "Mon", "count": 1 }, { "day": "Fri", "count": 3 }
  ]
}
```

**Design decisions:**
- Temperature **0.7** — highest of the three agents, intentionally. Behavioral nudges need to feel like a conversation with a knowledgeable friend, not a data report. Warmth and specificity are goals.
- 21-day window is a deliberate trade-off: long enough to find meaningful patterns, short enough to keep input token count manageable and insights feeling current.
- The prompt emphasizes user-specific observations over generic advice. "You have 5 blue shirts but only wore 1 last week" beats "try wearing more variety."

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

## Error Handling & Fallbacks

- **Malformed JSON from Nova** — `bedrockClient.ts` strips markdown code fences and attempts `JSON.parse`. If it fails, the agent throws a typed error and the calling page displays a user-facing error banner.
- **Bedrock API timeout** — 30-second timeout with one automatic retry. If both fail, IntakeAgent falls back to a default mock item; StylistAgent and BehavioralAgent surface an error state.
- **Item ID hallucination (StylistAgent)** — After parsing, each returned item ID is validated against `context.clothes`. Any ID not found is silently dropped; if fewer than 2 valid items remain in a suggestion, that outfit is discarded.
