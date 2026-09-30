export const AI_PROXY_URL = 'demo://ai-proxy';
export function isProxyConfigured(): boolean { return true; }
export async function getProxyIdToken(): Promise<string> { return 'demo-token'; }
