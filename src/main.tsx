import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import MissingFirebaseConfig from './components/common/MissingFirebaseConfig';
import { getFirebaseEnvMissingKeys } from './services/firebaseEnvCheck';

const missing = getFirebaseEnvMissingKeys();
if (missing.length > 0) {
    createRoot(document.getElementById('root')!).render(
        <StrictMode>
            <MissingFirebaseConfig missingKeys={missing} />
        </StrictMode>,
    );
} else {
    void import('./entryWithFirebase');
}
