import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ReportDownloader from './pages/ReportDownloader';
import SqlExtractor from './pages/SqlExtractor';
import JsonEditor from './pages/JsonEditor';
import ActivityLog from './pages/ActivityLog';
import Repository from './pages/Repository';
import Documentation from './pages/Documentation';
import LoginPage from './pages/LoginPage';
import AdminPanel from './pages/AdminPanel';
import IntroAnimation from './components/IntroAnimation';
import { GlobalStateProvider, useGlobalState } from './context/GlobalStateContext';
import Compare from './pages/Compare';

const AppContent: React.FC = () => {
  const { user } = useGlobalState();

  React.useEffect(() => {
    // Force redirect to home when authenticated
    if (user && window.location.hash !== '#/' && window.location.hash !== '') {
      window.location.hash = '#/';
    }
  }, [user]);

  if (!user) {
    return <LoginPage />;
  }

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/download" element={<ReportDownloader />} />
          <Route path="/extract" element={<SqlExtractor />} />
          <Route path="/editor" element={<JsonEditor />} />
          <Route path="/repository" element={<Repository />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/activity" element={<ActivityLog />} />
          <Route path="/documentation" element={<Documentation />} />
          {user.role === 'admin' && <Route path="/admin" element={<AdminPanel />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

const App: React.FC = () => {
  return (
    <GlobalStateProvider>
      <IntroAnimation />
      <AppContent />
    </GlobalStateProvider>
  );
};

export default App;