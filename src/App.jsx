import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LandingPage from './pages/LandingPage';
import DealerLayout from './layouts/DealerLayout';
import DealerDashboard from './pages/DealerDashboard';
import AuditWorkspace from './pages/AuditWorkspace';
import AuditDetail from './pages/AuditDetail';
import SystemSettings from './pages/SystemSettings';
import UserManagement from './pages/UserManagement';
import AuditorView from './pages/AuditorView';

function App() {
  return (
    <Router basename="/">
      <div className="min-h-screen bg-background text-foreground font-sans">
        <Toaster position="top-center" />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          
          <Route path="/dealer" element={<DealerLayout />}>
            <Route index element={<DealerDashboard />} />
            <Route path="workspace" element={<AuditWorkspace />} />
            <Route path="workspace/:id" element={<AuditDetail />} />
            <Route path="settings" element={<SystemSettings />} />
            <Route path="users" element={<UserManagement />} />
          </Route>
          
          <Route path="/auditor/:token" element={<AuditorView />} />
          <Route path="/audit-executor/:uuid" element={<AuditorView />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
