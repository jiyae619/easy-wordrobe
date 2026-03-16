/**
 * Production diagnostics for capturing network/console failure signatures.
 * Used to reproduce and isolate production symptoms per the root-cause analysis plan.
 *
 * Enable by setting VITE_DEBUG_PROD=true or by running in production.
 * Collected events are available at window.__WARDROBE_DIAG__ for the smoke test script.
 */

export type DiagStep =
  | 'auth_state'
  | 'load_user_data_start'
  | 'load_user_data_migration'
  | 'load_user_data_firestore'
  | 'load_user_data_stale_demo'
  | 'load_user_data_end'
  | 'load_user_data_error'
  | 'storage_upload_start'
  | 'storage_upload_end'
  | 'storage_upload_error'
  | 'firestore_write_start'
  | 'firestore_write_end'
  | 'firestore_write_error'
  | 'camera_start'
  | 'camera_error'
  | 'camera_origin_check'
  | 'scanner_analyze_start'
  | 'scanner_analyze_end'
  | 'scanner_analyze_error'
  | 'scanner_save_start'
  | 'scanner_save_end'
  | 'scanner_save_error';

export interface DiagEvent {
  step: DiagStep;
  ts: number;
  /** Human-readable step name */
  label: string;
  /** Error code (e.g. firebase auth/storage/firestore code) */
  code?: string;
  /** Error message */
  message?: string;
  /** Additional context (e.g. origin, uid) */
  meta?: Record<string, unknown>;
}

const ENABLED =
  import.meta.env.VITE_DEBUG_PROD === 'true' ||
  (import.meta.env.PROD && typeof window !== 'undefined');

const events: DiagEvent[] = [];

function emit(ev: Omit<DiagEvent, 'ts'>) {
  const full: DiagEvent = { ...ev, ts: Date.now() };
  events.push(full);
  if (ENABLED) {
    console.log(`[WardrobeDiag] ${ev.label}`, ev.code ?? '', ev.message ?? '', ev.meta ?? '');
  }
  return full;
}

/** Expose collected events for smoke test script */
if (typeof window !== 'undefined') {
  (window as any).__WARDROBE_DIAG__ = {
    events: () => [...events],
    clear: () => events.length = 0,
    getLastError: () => events.filter(e => e.step.endsWith('_error')).pop(),
    getSummary: () => ({
      total: events.length,
      errors: events.filter(e => e.step.endsWith('_error')),
      byStep: events.reduce((acc, e) => {
        acc[e.step] = (acc[e.step] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    }),
  };
}

export const prodDiag = {
  authState: (uid: string | null) =>
    emit({
      step: 'auth_state',
      label: 'Auth state changed',
      meta: { uid: uid ?? 'signed-out' },
    }),

  loadUserDataStart: (uid: string) =>
    emit({
      step: 'load_user_data_start',
      label: 'loadUserData started',
      meta: { uid },
    }),

  loadUserDataMigration: (uid: string, ok: boolean, err?: unknown) =>
    emit({
      step: 'load_user_data_migration',
      label: ok ? 'Migration completed' : 'Migration failed',
      code: err && typeof err === 'object' && 'code' in err ? String((err as any).code) : undefined,
      message: err instanceof Error ? err.message : err ? String(err) : undefined,
      meta: { uid },
    }),

  loadUserDataFirestore: (uid: string, ok: boolean, err?: unknown) =>
    emit({
      step: 'load_user_data_firestore',
      label: ok ? 'Firestore fetch completed' : 'Firestore fetch failed',
      code: err && typeof err === 'object' && 'code' in err ? String((err as any).code) : undefined,
      message: err instanceof Error ? err.message : err ? String(err) : undefined,
      meta: { uid },
    }),

  loadUserDataStaleDemo: (uid: string, ok: boolean, err?: unknown) =>
    emit({
      step: 'load_user_data_stale_demo',
      label: ok ? 'Stale demo migration completed' : 'Stale demo migration failed',
      code: err && typeof err === 'object' && 'code' in err ? String((err as any).code) : undefined,
      message: err instanceof Error ? err.message : err ? String(err) : undefined,
      meta: { uid },
    }),

  loadUserDataEnd: (uid: string, itemCount: number) =>
    emit({
      step: 'load_user_data_end',
      label: 'loadUserData completed',
      meta: { uid, itemCount },
    }),

  loadUserDataError: (uid: string, err: unknown) =>
    emit({
      step: 'load_user_data_error',
      label: 'loadUserData error',
      code: err && typeof err === 'object' && 'code' in err ? String((err as any).code) : undefined,
      message: err instanceof Error ? err.message : String(err),
      meta: { uid },
    }),

  storageUploadStart: (uid: string, itemId: string) =>
    emit({
      step: 'storage_upload_start',
      label: 'Storage upload started',
      meta: { uid, itemId },
    }),

  storageUploadEnd: (uid: string, itemId: string) =>
    emit({
      step: 'storage_upload_end',
      label: 'Storage upload completed',
      meta: { uid, itemId },
    }),

  storageUploadError: (uid: string, itemId: string, err: unknown) =>
    emit({
      step: 'storage_upload_error',
      label: 'Storage upload failed',
      code: err && typeof err === 'object' && 'code' in err ? String((err as any).code) : undefined,
      message: err instanceof Error ? err.message : String(err),
      meta: { uid, itemId },
    }),

  firestoreWriteStart: (uid: string, op: string) =>
    emit({
      step: 'firestore_write_start',
      label: `Firestore ${op} started`,
      meta: { uid, op },
    }),

  firestoreWriteEnd: (uid: string, op: string) =>
    emit({
      step: 'firestore_write_end',
      label: `Firestore ${op} completed`,
      meta: { uid, op },
    }),

  firestoreWriteError: (uid: string, op: string, err: unknown) =>
    emit({
      step: 'firestore_write_error',
      label: `Firestore ${op} failed`,
      code: err && typeof err === 'object' && 'code' in err ? String((err as any).code) : undefined,
      message: err instanceof Error ? err.message : String(err),
      meta: { uid, op },
    }),

  cameraStart: () =>
    emit({
      step: 'camera_start',
      label: 'Camera start requested',
      meta: { origin: location.origin, protocol: location.protocol, hostname: location.hostname },
    }),

  cameraError: (err: unknown) =>
    emit({
      step: 'camera_error',
      label: 'Camera error',
      code: err && typeof err === 'object' && 'name' in err ? String((err as any).name) : undefined,
      message: err instanceof Error ? err.message : String(err),
      meta: { origin: location.origin, protocol: location.protocol },
    }),

  cameraOriginCheck: (allowed: boolean) =>
    emit({
      step: 'camera_origin_check',
      label: allowed ? 'Camera origin OK (HTTPS/localhost)' : 'Camera origin blocked (requires HTTPS or localhost)',
      meta: { origin: location.origin, protocol: location.protocol, allowed },
    }),

  scannerAnalyzeStart: () =>
    emit({ step: 'scanner_analyze_start', label: 'AI analysis started' }),

  scannerAnalyzeEnd: (ok: boolean) =>
    emit({
      step: 'scanner_analyze_end',
      label: ok ? 'AI analysis completed' : 'AI analysis failed',
      meta: { ok },
    }),

  scannerAnalyzeError: (err: unknown) =>
    emit({
      step: 'scanner_analyze_error',
      label: 'AI analysis error',
      message: err instanceof Error ? err.message : String(err),
    }),

  scannerSaveStart: () =>
    emit({ step: 'scanner_save_start', label: 'Add to wardrobe started' }),

  scannerSaveEnd: (ok: boolean) =>
    emit({
      step: 'scanner_save_end',
      label: ok ? 'Add to wardrobe completed' : 'Add to wardrobe failed',
      meta: { ok },
    }),

  scannerSaveError: (err: unknown) =>
    emit({
      step: 'scanner_save_error',
      label: 'Add to wardrobe error',
      code: err && typeof err === 'object' && 'code' in err ? String((err as any).code) : undefined,
      message: err instanceof Error ? err.message : String(err),
    }),
};
