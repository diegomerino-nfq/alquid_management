import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ReportDownloader from './pages/ReportDownloader';
import SqlExtractor from './pages/SqlExtractor';
import JsonEditor from './pages/JsonEditor';
import ActivityLog from './pages/ActivityLog';
import Repository from './pages/Repository';
import Documentation from './pages/Documentation';
import IntroAnimation from './components/IntroAnimation';
import { GlobalStateProvider } from './context/GlobalStateContext';

const App: React.FC = () => {
  return (
    <GlobalStateProvider>
      <IntroAnimation />
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/download" element={<ReportDownloader />} />
            <Route path="/extract" element={<SqlExtractor />} />
            <Route path="/editor" element={<JsonEditor />} />
            <Route path="/repository" element={<Repository />} />
            <Route path="/activity" element={<ActivityLog />} />
            <Route path="/documentation" element={<Documentation />} />
          </Routes>
        </Layout>
      </HashRouter>
    </GlobalStateProvider>
  );
};

export default App;