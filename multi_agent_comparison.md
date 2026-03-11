# Wardrobe AI: Architecture Comparison

## Current Architecture (Single Agent + Mocks)

Right now, your application uses **one AI model call** for one specific task:
*   **Agent 1 (Vision/Intake):** Extracts details (category, subcategory, color, pattern, mood, season) from an uploaded image using the Amazon Nova Lite 2 model.

For the other main features, the application simulates intelligence using mock data and local logic:
*   **Outfit Suggestions:** A TypeScript function (`getMockOutfitSuggestions`) randomly selects items from the user's wardrobe categories (top, bottom, shoes) and returns them, ignoring the actual weather or requested mood.
*   **Insights:** A TypeScript function (`getMockInsights`) returns hardcoded advice (e.g., "You wear a lot of black") and static weekly wear graphs, rather than analyzing real user behavior.

---

## Proposed Architecture (Multi-Agent System)

The multi-agent approach means we replace the random/hardcoded logic with dedicated AI prompts, creating specialized "personas" or agents.

*   **Agent 1 (Intake Specialist):** Looks at the image and extracts structural metadata (This is already implemented).
*   **Agent 2 (Personal Stylist):** Takes the user's *entire wardrobe JSON*, the *current weather condition/temperature*, and the *desired vibe/mood* to generate logical outfit combinations with explanations.
*   **Agent 3 (Behavioral Analyst):** Analyzes the user's *wear history* and *wardrobe distribution* to provide personalized fashion advice (e.g., "You have 5 blue shirts but only wear 1. Try pairing the others with your beige chinos").

---

## Benefits of a Multi-Agent System

1.  **True Personalization (The "Wow" Factor):**
    *   *Current:* Randomly picks a t-shirt, jeans, and sneakers.
    *   *Multi-Agent:* The AI sees it's 30°C and the user wants a "professional" vibe. It intentionally selects a linen button-down, breathable slacks, and loafers. It provides a real explanation: *"Linen is breathable for the 30°C heat, but the collar maintains the professional mood."*
2.  **Scalability of Intelligence:**
    *   By separating the prompts, you can tune them individually. If the Stylist is making bad choices, you just update the Stylist's prompt without risking breaking the Vision agent.
3.  **Fulfills Hackathon/Judging Criteria:**
    *   This actively uses the LLM for the core value proposition of the app, directly satisfying the "Creativity and Innovation" (specifically "innovative use of multi-agent systems") and "Technical Implementation" criteria for the AWS Nova hackathon.

---

## Costs & Trade-offs

1.  **Latency (Speed):**
    *   *Current:* Outfit suggestions are instant (though there is a simulated 2-second timeout in the current code, the actual logic executes immediately).
    *   *Multi-Agent:* Every time the user asks for an outfit or views insights, the app must wait for the Bedrock API to respond (typically 2-5 seconds depending on the prompt size and model load).
2.  **Token Usage (Cost):**
    *   *Current:* You only pay for LLM inference when a user uploads a new piece of clothing.
    *   *Multi-Agent:* You pay every time they request an outfit or view insights. Passing the entire wardrobe JSON structure into the prompt consumes more input tokens. (While Nova-Lite is cost-effective, it's still a factor to consider at scale).
3.  **Reliability & Parsing Errors:**
    *   LLMs can sometimes hallucinate or return improperly formatted JSON. The application code must be robust enough to handle cases where the Stylist agent suggests an item ID that doesn't exist in the database, or forgets a closing bracket in its JSON response.

### Summary

The current version serves as a very strong **UI Demo** with a single, effective AI feature (image intake). 

Moving to the multi-agent version transforms it into a fully **functional AI product**. While it introduces slight latency and API costs, the quality, intelligence, and personalization of the app will increase dramatically, aligning perfectly with your hackathon judging criteria.
