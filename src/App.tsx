import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Sparkles, Shirt, Plus, BarChart2 } from 'lucide-react';
import { WardrobeProvider } from './context/WardrobeContext';
import { AuthProvider } from './context/AuthContext';
import { useState, useEffect, type ComponentType } from 'react';
// Import pages
import Today from './pages/Today';
import Wardrobe from './pages/Wardrobe';
import Insights from './pages/Insights';
import Login from './pages/Login';
import DevModelTest from './pages/DevModelTest';
import { CameraScannerOverlay } from './components/upload/CameraScannerOverlay';
import { BulkUploadOverlay } from './components/upload/BulkUploadOverlay';
import { StarterPickerOverlay } from './components/onboarding/StarterPickerOverlay';
import ProtectedRoute from './components/common/ProtectedRoute';
import UserMenu from './components/common/UserMenu';
import { useWardrobe } from './context/WardrobeContext';
import { AlertCircle, X } from 'lucide-react';

const NavItem = ({ to, icon: Icon, label, active }: { to: string, icon: ComponentType<{ className?: string }>, label: string, active: boolean }) => (
  <Link
    to={to}
    aria-current={active ? 'page' : undefined}
    className={`flex flex-col items-center justify-center gap-1 w-full py-2 text-[11px] transition-colors ${active ? 'font-extrabold text-ink' : 'font-semibold text-ink/45 hover:text-ink'}`}
  >
    <Icon className="w-6 h-6" />
    {label}
  </Link>
);

const Layout = () => {
  const location = useLocation();
  const { error, clearError } = useWardrobe();
  const [showScanner, setShowScanner] = useState(false);
  const isActive = (path: string) => location.pathname === path;
  const isLoginPage = location.pathname === '/login';

  // Allow child pages to open the camera scanner via a custom event
  useEffect(() => {
    const handler = () => setShowScanner(true);
    window.addEventListener('open-scanner', handler);
    return () => window.removeEventListener('open-scanner', handler);
  }, []);

  // Add safe-area-inset support for mobile devices
  const safeAreaBottom = 'env(safe-area-inset-bottom, 0px)';

  // Login page has its own full-screen layout
  if (isLoginPage) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center font-sans">
      {/* Mobile Container Simulator */}
      <div className="w-full max-w-[480px] h-[100dvh] bg-surface flex flex-col relative shadow-2xl overflow-hidden">

        {/* Main Content Area */}
        <div className="flex-grow overflow-y-auto scrollbar-hide">
          {error && (
            <div className="sticky top-0 z-30 flex items-start gap-3 px-4 py-3 bg-red-50 border-b border-red-200 text-red-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="flex-1 text-sm">{error}</p>
              <button onClick={clearError} className="p-1 rounded hover:bg-red-100" aria-label="Dismiss">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <main className="px-4 py-6 pb-24 relative">
            <Routes>
              <Route path="/" element={<ProtectedRoute><Today /></ProtectedRoute>} />
              <Route path="/wardrobe" element={<ProtectedRoute><Wardrobe /></ProtectedRoute>} />
              {/* Picks merged into Today; keep old links working */}
              <Route path="/suggest" element={<Navigate to={{ pathname: '/', search: location.search }} replace />} />
              <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
              {import.meta.env.DEV && <Route path="/dev/model-test" element={<DevModelTest />} />}
            </Routes>
          </main>
        </div>

        {/* Mobile Navigation - Always Visible */}
        {!showScanner && (
          <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
            {/* Constrain nav width to match container */}
            <div className="w-full max-w-[480px] bg-paper/95 backdrop-blur-lg border-t-[1.5px] border-ink pointer-events-auto"
              style={{ paddingBottom: safeAreaBottom }}>
              <div className="flex justify-around items-center h-[72px] px-2">
                <NavItem to="/" icon={Sparkles} label="Today" active={isActive('/')} />
                <NavItem to="/wardrobe" icon={Shirt} label="Closet" active={isActive('/wardrobe')} />
                {/* Scan — the one raised action */}
                <button
                  onClick={() => setShowScanner(true)}
                  aria-label="Scan a new piece"
                  className="relative flex items-center justify-center w-full py-2"
                >
                  <span className="flex items-center justify-center w-14 h-14 -mt-7 rounded-[18px] border-2 border-ink bg-lime text-ink -rotate-6 shadow-[0_6px_14px_rgba(21,26,20,0.18)] active:scale-95 transition-transform">
                    <Plus className="w-6 h-6" />
                  </span>
                </button>
                <NavItem to="/insights" icon={BarChart2} label="Style Log" active={isActive('/insights')} />
                {/* Account: profile, settings, sign out (opens upward) */}
                <UserMenu variant="nav" />
              </div>
            </div>
          </div>
        )}

        {/* Camera Scanner Overlay */}
        <CameraScannerOverlay isOpen={showScanner} onClose={() => setShowScanner(false)} />

        {/* Bulk gallery intake (listens for the `open-bulk-upload` event) */}
        <BulkUploadOverlay />

        {/* Starter closet picker (listens for the `open-starter-picker` event) */}
        <StarterPickerOverlay />

      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <WardrobeProvider>
        <Router>
          <Layout />
        </Router>
      </WardrobeProvider>
    </AuthProvider>
  );
}

export default App;
