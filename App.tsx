
import React from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import Auth from './views/Auth';
import Home from './views/Home';
import Editor from './views/Editor';
import ShoppingMode from './views/ShoppingMode';
import Summary from './views/Summary';
import History from './views/History';
import Analytics from './views/Analytics';
import Share from './views/Share';
import Profile from './views/Profile';
import Navbar from './components/Navbar';
import AuthGuard from './components/AuthGuard';

const AppContent: React.FC = () => {
  const location = useLocation();
  const hideNavbarPaths = ['/', '/editor', '/shopping', '/summary', '/share'];
  const showNavbar = !hideNavbarPaths.some(path => location.pathname === path || (path !== '/' && location.pathname.startsWith(path)));

  return (
    <div className="flex h-full min-h-screen w-full max-w-md mx-auto flex-col overflow-hidden bg-background-light dark:bg-background-dark shadow-2xl relative">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route element={<AuthGuard />}>
            <Route path="/home" element={<Home />} />
            <Route path="/editor/:id?" element={<Editor />} />
            <Route path="/shopping/:id" element={<ShoppingMode />} />
            <Route path="/summary/:id" element={<Summary />} />
            <Route path="/history" element={<History />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/share/:id" element={<Share />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Routes>
      </div>
      {showNavbar && <Navbar />}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
};

export default App;
