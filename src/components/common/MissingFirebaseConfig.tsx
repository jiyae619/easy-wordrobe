import { AlertCircle, FileText } from 'lucide-react';

type Props = { missingKeys: string[] };

/**
 * Shown when required VITE_FIREBASE_* vars are missing so the app does not crash with a blank screen.
 */
export default function MissingFirebaseConfig({ missingKeys }: Props) {
    return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-md rounded-2xl bg-white border border-muted shadow-lg p-6 space-y-4">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-8 h-8 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden />
                    <div>
                        <h1 className="text-lg font-semibold text-primary">Firebase configuration missing</h1>
                        <p className="text-sm text-gray-600 mt-1">
                            Stylemax needs Firebase environment variables to run. None of your app code loaded yet — this screen replaces a blank page.
                        </p>
                    </div>
                </div>
                <div className="rounded-xl bg-olive-100/80 border border-olive-200 p-4">
                    <p className="text-xs font-semibold text-olive-800 uppercase tracking-wide mb-2">Missing variables</p>
                    <ul className="text-sm text-gray-800 font-mono space-y-1 list-disc list-inside">
                        {missingKeys.map((k) => (
                            <li key={k}>{k}</li>
                        ))}
                    </ul>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-600">
                    <FileText className="w-5 h-5 flex-shrink-0 text-secondary mt-0.5" aria-hidden />
                    <div>
                        <p className="font-medium text-gray-800">What to do</p>
                        <ol className="mt-2 space-y-1 list-decimal list-inside">
                            <li>Copy <code className="text-xs bg-olive-100 px-1 rounded">.env.example</code> to{' '}
                                <code className="text-xs bg-olive-100 px-1 rounded">.env</code> in the project root.
                            </li>
                            <li>Fill in your Firebase web app values from the Firebase console.</li>
                            <li>Restart <code className="text-xs bg-olive-100 px-1 rounded">npm run dev</code> or run{' '}
                                <code className="text-xs bg-olive-100 px-1 rounded">npm run build</code> again before preview.
                            </li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    );
}
