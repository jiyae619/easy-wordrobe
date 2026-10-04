import { useSyncExternalStore } from 'react';

/** Phones with little vertical room (iPhone SE / mini, landscape-ish windows). */
const QUERY = '(max-height: 760px)';

function subscribe(cb: () => void) {
    const mql = window.matchMedia?.(QUERY);
    mql?.addEventListener?.('change', cb);
    return () => mql?.removeEventListener?.('change', cb);
}

const read = () => Boolean(window.matchMedia?.(QUERY).matches);

/** True on short viewports, so dense screens can switch to a compact layout. */
export function useShortScreen(): boolean {
    return useSyncExternalStore(subscribe, read, () => false);
}
