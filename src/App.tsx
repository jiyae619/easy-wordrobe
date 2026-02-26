import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home as HomeIcon, Shirt, Camera, Sparkles, BarChart2 } from 'lucide-react';
import { WardrobeProvider } from './context/WardrobeContext';
import { AuthProvider } from './context/AuthContext';
import { useState, useEffect } from 'react';
// Import pages
import Home from './pages/Home';
import Wardrobe from './pages/Wardrobe';
import Suggest from './pages/Suggest';
import Insights from './pages/Insights';
import Login from './pages/Login';
import { CameraScannerOverlay } from './components/upload/CameraScannerOverlay';
import ProtectedRoute from './components/common/ProtectedRoute';
import UserMenu from './components/common/UserMenu';

const Layout = () => {
  console.log("App Layout Loaded - Production Version");
  const location = useLocation();
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

  const NavItem = ({ to, icon: Icon, label, mobile = false }: { to: string, icon: any, label: string, mobile?: boolean }) => {
    const active = isActive(to);

    if (mobile) {
      return (
        <Link to={to} className="relative flex flex-col items-center justify-center w-full py-2 group">
          <div className={`
            flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-300
            ${active
              ? 'bg-primary text-white shadow-md'
              : 'text-gray-400 group-hover:text-secondary group-hover:bg-olive-100'
            }
          `}>
            <Icon className="w-5 h-5" />
          </div>
          <span className={`text-[10px] font-medium mt-1 transition-colors ${active ? 'text-primary' : 'text-gray-400'}`}>
            {label}
          </span>
        </Link>
      );
    }

    return (
      <Link
        to={to}
        className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 ${active
          ? 'bg-primary text-white shadow-sm'
          : 'text-gray-500 hover:text-primary hover:bg-olive-100'
          }`}
      >
        <Icon className={`w-4 h-4 mr-2`} />
        {label}
      </Link>
    );
  };

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
      <div className="w-full max-w-[480px] min-h-screen bg-surface flex flex-col relative shadow-2xl">

        {/* User Menu - Fixed top right */}
        <div className="absolute top-4 right-4 z-40">
          <UserMenu />
        </div>

        {/* Main Content Area */}
        <div className="flex-grow overflow-y-auto scrollbar-hide">
          <main className="px-4 py-6 pb-24">
            <Routes>
              <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/wardrobe" element={<ProtectedRoute><Wardrobe /></ProtectedRoute>} />
              <Route path="/suggest" element={<ProtectedRoute><Suggest /></ProtectedRoute>} />
              <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
            </Routes>
          </main>
        </div>

        {/* Mobile Navigation - Always Visible */}
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
          {/* Constrain nav width to match container */}
          <div className="w-full max-w-[480px] bg-white/90 backdrop-blur-lg border-t border-muted pointer-events-auto"
            style={{ paddingBottom: safeAreaBottom }}>
            <div className="flex justify-around items-center h-[72px] px-2">
              <NavItem to="/" icon={HomeIcon} label="Home" mobile />
              <NavItem to="/wardrobe" icon={Shirt} label="Wardrobe" mobile />
              {/* Camera Button — same style as other NavItems */}
              <button
                onClick={() => setShowScanner(true)}
                className="relative flex flex-col items-center justify-center w-full py-2 group"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-300 text-gray-400 group-hover:text-secondary group-hover:bg-olive-100">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium mt-1 text-gray-400">Scan</span>
              </button>
              <NavItem to="/suggest" icon={Sparkles} label="Suggest" mobile />
              <NavItem to="/insights" icon={BarChart2} label="Insights" mobile />
            </div>
          </div>
        </div>

        {/* Camera Scanner Overlay */}
        <CameraScannerOverlay isOpen={showScanner} onClose={() => setShowScanner(false)} />

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
