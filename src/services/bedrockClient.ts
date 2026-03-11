export const NOVA_MODEL_ID = "us.amazon.nova-2-lite-v1:0";
export const AWS_REGION = import.meta.env.VITE_AWS_REGION || "us-east-2";
export const BEDROCK_API_KEY = import.meta.env.VITE_BEDROCK_API_KEY || "";
export const BEDROCK_URL = `https://bedrock-runtime.${AWS_REGION}.amazonaws.com/model/${encodeURIComponent(NOVA_MODEL_ID)}/converse`;

/**
 * Shared helper to call the Bedrock Converse API with a given payload.
 */
export async function callBedrockConverseAPI(payload: any) {
    if (!BEDROCK_API_KEY) {
        throw new Error("Missing VITE_BEDROCK_API_KEY in environment variables.");
    }

    const response = await fetch(BEDROCK_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${BEDROCK_API_KEY}`,
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bedrock API error ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    const outputText = result?.output?.message?.content?.[0]?.text || "";

    // Parse the JSON from the response (handle possible markdown wrapping)
    let jsonStr = outputText.trim();
    if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    return jsonStr;
}
