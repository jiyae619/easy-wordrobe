import { geminiProvider } from "./geminiProvider";
import { novaProvider } from "./novaProvider";
import type { VisionProvider } from "./VisionProvider";

/**
 * Single source of truth for which vision adapters exist in the app.
 * Add a new model: build the adapter, then append it here.
 */
const PROVIDERS: VisionProvider[] = [novaProvider, geminiProvider];

const DEFAULT_ID =
    (import.meta.env.VITE_VISION_PROVIDER as string | undefined) ?? "nova-2-lite";

/** Return all registered providers (regardless of configuration). Used by the dev UI. */
export function listProviders(): VisionProvider[] {
    return [...PROVIDERS];
}

/** Return only providers with credentials present. */
export function listConfiguredProviders(): VisionProvider[] {
    return PROVIDERS.filter((p) => p.isConfigured());
}

/** Look up a provider by ID; throws if unknown. */
export function getProviderById(id: string): VisionProvider {
    const provider = PROVIDERS.find((p) => p.id === id);
    if (!provider) {
        throw new Error(`Unknown vision provider id: ${id}. Known: ${PROVIDERS.map((p) => p.id).join(", ")}`);
    }
    return provider;
}

/**
 * The provider the IntakeAgent uses by default in production code paths.
 * Controlled via `VITE_VISION_PROVIDER`; falls back to Nova.
 * If the configured default lacks credentials, falls back to the first configured one
 * to avoid breaking dev environments that only set one key.
 */
export function getActiveProvider(): VisionProvider {
    try {
        const preferred = getProviderById(DEFAULT_ID);
        if (preferred.isConfigured()) return preferred;
    } catch {
        // fall through to first-configured logic
    }
    const fallback = listConfiguredProviders()[0];
    if (!fallback) {
        // Return the preferred provider anyway; it will throw a clear "missing key"
        // error at call time, which is more informative than failing here.
        return getProviderById(DEFAULT_ID);
    }
    return fallback;
}
