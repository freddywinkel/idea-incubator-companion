import React, { useEffect } from 'react';
import { HashRouter, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { AppDataProvider } from './hooks/useAppData';
import { ToastProvider, useToast } from './hooks/useToast';
import { ToastContainer } from './components/ToastContainer';
import { TodayPage } from './pages/TodayPage';
import { CapturePage } from './pages/CapturePage';
import { LibraryPage } from './pages/LibraryPage';
import { ExportPage } from './pages/ExportPage';
import { BottomNav } from './components/BottomNav';
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt';

const AppContent: React.FC = () => {
  const location = useLocation();
  const { toasts, removeToast } = useToast();
  const showNav = ['/', '/today', '/capture', '/library', '/export'].includes(location.pathname);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <main className="app-main" style={{ paddingBottom: showNav ? 'var(--content-pb)' : undefined }}>
        <PwaUpdatePrompt />
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/today" element={<TodayPage />} />
          <Route path="/capture" element={<CapturePage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/export" element={<ExportPage />} />
          <Route path="*" element={<Navigate to="/today" replace />} />
        </Routes>
      </main>
      {showNav && <BottomNav />}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export const App: React.FC = () => (
  <HashRouter>
    <AppDataProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AppDataProvider>
  </HashRouter>
);
