import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Home as HomeIcon, Shirt, Smile, Sparkles, BarChart2 } from 'lucide-react';
import Home from './pages/Home';
import Wardrobe from './pages/Wardrobe';
import Mood from './pages/Mood';
import Suggest from './pages/Suggest';
import Insights from './pages/Insights';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-gray-900 font-sans">
        <nav className="bg-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <span className="text-xl font-bold text-primary">Wardrobe AI</span>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  <Link to="/" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 border-b-2 border-transparent hover:border-secondary">
                    <HomeIcon className="w-4 h-4 mr-2" />
                    Home
                  </Link>
                  <Link to="/wardrobe" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                    <Shirt className="w-4 h-4 mr-2" />
                    Wardrobe
                  </Link>
                  <Link to="/mood" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                    <Smile className="w-4 h-4 mr-2" />
                    Mood
                  </Link>
                  <Link to="/suggest" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Suggest
                  </Link>
                  <Link to="/insights" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                    <BarChart2 className="w-4 h-4 mr-2" />
                    Insights
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <div className="py-10">
          <main>
            <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/wardrobe" element={<Wardrobe />} />
                <Route path="/mood" element={<Mood />} />
                <Route path="/suggest" element={<Suggest />} />
                <Route path="/insights" element={<Insights />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
