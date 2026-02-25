import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home as HomeIcon, Shirt, Camera, Sparkles, BarChart2 } from 'lucide-react';
import { WardrobeProvider } from './context/WardrobeContext';
import { useState, useEffect } from 'react';
// Import pages
import Home from './pages/Home';
import Wardrobe from './pages/Wardrobe';
import Suggest from './pages/Suggest';
import Insights from './pages/Insights';
import { CameraScannerOverlay } from './components/upload/CameraScannerOverlay';

const Layout = () => {
  console.log("App Layout Loaded - Production Version");
  const location = useLocation();
  const [showScanner, setShowScanner] = useState(false);
  const isActive = (path: string) => location.pathname === path;

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

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center font-sans">
      {/* Mobile Container Simulator */}
      <div className="w-full max-w-[480px] min-h-screen bg-surface flex flex-col relative shadow-2xl">

        {/* Main Content Area */}
        <div className="flex-grow overflow-y-auto scrollbar-hide">
          <main className="px-4 py-6 pb-24">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/wardrobe" element={<Wardrobe />} />
              <Route path="/suggest" element={<Suggest />} />
              <Route path="/insights" element={<Insights />} />
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
              {/* Camera Button */}
              <button
                onClick={() => setShowScanner(true)}
                className="relative flex flex-col items-center justify-center w-full py-2 group"
              >
                <div className="flex items-center justify-center w-12 h-12 -mt-5 rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition-all duration-300 group-hover:scale-110 group-active:scale-95">
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
    <WardrobeProvider>
      <Router>
        <Layout />
      </Router>
    </WardrobeProvider>
  );
}

export default App;
