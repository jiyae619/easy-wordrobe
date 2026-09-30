export const DEMO_USER = {
    uid: 'demo-jiyae',
    email: 'jiyae@example.com',
    displayName: 'Jiyae',
    photoURL: null as string | null,
    getIdToken: async () => 'demo-token',
};
export function demoDelay(kind: 'ai' | 'intake' | 'data' = 'ai'): Promise<void> {
    const cfg = (window as any).__DEMO__ ?? {};
    const ms = kind === 'intake' ? (cfg.intakeDelay ?? 2200) : kind === 'data' ? (cfg.dataDelay ?? 120) : (cfg.aiDelay ?? 1200);
    return new Promise((r) => setTimeout(r, ms));
}
