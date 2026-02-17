import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ReportDownloader from './pages/ReportDownloader';
import SqlExtractor from './pages/SqlExtractor';
import JsonEditor from './pages/JsonEditor';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/download" element={<ReportDownloader />} />
          <Route path="/extract" element={<SqlExtractor />} />
          <Route path="/editor" element={<JsonEditor />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
