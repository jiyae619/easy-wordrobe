import { demoDelay } from './demoUser';
export interface BedrockConversePayload { messages: any[]; inferenceConfig?: any; [k: string]: any }
export interface BedrockCallOptions { [k: string]: any }
export function extractJsonFromText(outputText: string): string {
    let jsonStr = outputText.trim();
    if (jsonStr.startsWith("```")) jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const firstObject = jsonStr.indexOf("{");
    const firstArray = jsonStr.indexOf("[");
    const starts = [firstObject, firstArray].filter((idx) => idx >= 0);
    if (starts.length === 0) return jsonStr;
    const start = Math.min(...starts);
    const end = Math.max(jsonStr.lastIndexOf("}"), jsonStr.lastIndexOf("]"));
    return end >= start ? jsonStr.slice(start, end + 1).trim() : jsonStr;
}
/** Demo stand-in for the Nova Converse call — only the WeatherAgent cheer line uses this path. */
export async function callBedrockConverseAPI(_payload: BedrockConversePayload, _opts?: BedrockCallOptions): Promise<string> {
    await demoDelay('ai');
    return JSON.stringify({ cheerLine: "Crisp and breezy with sunshine sneaking through, the perfect day to show off a light layer." });
}
