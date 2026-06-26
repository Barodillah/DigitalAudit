import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LandingPage from './pages/LandingPage';
import DealerDashboard from './pages/DealerDashboard';
import AuditorView from './pages/AuditorView';

function App() {
  return (
    <Router basename={import.meta.env.MODE === 'production' ? '/audit' : ''}>
      <div className="min-h-screen bg-background text-foreground font-sans">
        <Toaster position="top-center" />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dealer/*" element={<DealerDashboard />} />
          <Route path="/auditor/:token" element={<AuditorView />} />
          <Route path="/audit-executor/:uuid" element={<AuditorView />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
