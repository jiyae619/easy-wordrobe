import React from 'react';
import { Check } from 'lucide-react';

interface WearToastProps {
    isPending: boolean;
    logged: boolean;
    onUndo: () => void;
}

/** "Logging in 4s · Undo" while a wear is pending, then a short "logged" confirmation. */
export const WearToast: React.FC<WearToastProps> = ({ isPending, logged, onUndo }) => {
    if (!isPending && !logged) return null;
    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up" role="status" aria-live="polite">
            <div className="flex items-center gap-3 px-4 py-3 bg-ink text-paper rounded-full shadow-lg text-sm font-semibold border-2 border-lime">
                {isPending ? (
                    <>
                        Saving this look in 4s
                        <button
                            type="button"
                            onClick={onUndo}
                            className="px-3 py-1 rounded-full bg-lime text-ink text-xs font-extrabold"
                        >
                            Undo
                        </button>
                    </>
                ) : (
                    <>
                        <Check className="w-4 h-4 text-lime" />
                        Saved. Looking good!
                    </>
                )}
            </div>
        </div>
    );
};
