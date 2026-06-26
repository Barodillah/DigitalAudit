import { useState, useEffect } from 'react';
import { Link, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Home, FolderKanban, Settings, Loader2, Users } from 'lucide-react';
import AuditWorkspace from './AuditWorkspace';
import AuditDetail from './AuditDetail';
import SystemSettings from './SystemSettings';
import UserManagement from './UserManagement';

const API_BASE = 'https://csdwindo.com/audit/api';

function DashboardHome() {
  return (
    <div className="animate-in fade-in zoom-in-95 duration-500">
      <h1 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white tracking-tight">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-slate-500 dark:text-slate-400 font-medium text-sm uppercase tracking-wider">Total Audit Aktif</h3>
          <div className="flex items-end mt-4">
            <p className="text-4xl font-extrabold text-blue-600 dark:text-blue-400">12</p>
            <span className="text-sm font-medium text-slate-500 ml-2 mb-1">audit</span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-slate-500 dark:text-slate-400 font-medium text-sm uppercase tracking-wider">Selesai Bulan Ini</h3>
          <div className="flex items-end mt-4">
            <p className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">4</p>
            <span className="text-sm font-medium text-slate-500 ml-2 mb-1">audit</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DealerDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/', { replace: true });
      return;
    }
    // Validasi session ke server
    fetch(`${API_BASE}/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUser(data.data.user);
        } else {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          navigate('/', { replace: true });
        }
      })
      .catch(() => {
        // Jika server down, gunakan data cache dari localStorage
        const cached = localStorage.getItem('auth_user');
        if (cached) setUser(JSON.parse(cached));
      })
      .finally(() => setIsChecking(false));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    navigate('/', { replace: true });
  };

  const isActive = (path) => {
    if (path === '/dealer') {
      return location.pathname === '/dealer' || location.pathname === '/dealer/';
    }
    return location.pathname.startsWith(path);
  };

  const navLinkClass = (path) => 
    `flex items-center px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
      isActive(path) 
        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm' 
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
    }`;

  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans selection:bg-blue-500/30">
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 p-4 px-6 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-md">
            D
          </div>
          <div className="font-bold text-xl text-slate-900 dark:text-white tracking-tight">
            Audit<span className="text-blue-600 dark:text-blue-400">Digital</span> <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-2 border-l border-slate-300 dark:border-slate-700 pl-2">Portal Dealer</span>
          </div>
        </div>
        <button onClick={handleLogout} className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 flex items-center transition-colors px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
          <LogOut className="w-4 h-4 mr-2" />
          Keluar
        </button>
      </header>
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden md:flex flex-col h-[calc(100vh-73px)] sticky top-[73px]">
          <div className="p-6">
            <div className="flex items-center gap-3 px-2 mb-8">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                <span className="text-slate-700 dark:text-slate-300 font-bold text-sm">{user?.name?.substring(0, 2).toUpperCase() || 'U'}</span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email || '-'}</p>
              </div>
            </div>
            
            <nav className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">Menu Utama</p>
              <Link to="/dealer" className={navLinkClass('/dealer')}>
                <Home className="w-5 h-5 mr-3" /> Dashboard Utama
              </Link>
              <Link to="/dealer/workspace" className={navLinkClass('/dealer/workspace')}>
                <FolderKanban className="w-5 h-5 mr-3" /> Audit Workspace
              </Link>
              
              {(user?.role === 'super_admin' || user?.role === 'admin') && (
                <Link to="/dealer/users" className={navLinkClass('/dealer/users')}>
                  <Users className="w-5 h-5 mr-3" /> Manajemen User
                </Link>
              )}

              {user?.role === 'super_admin' && (
                <Link to="/dealer/settings" className={navLinkClass('/dealer/settings')}>
                  <Settings className="w-5 h-5 mr-3" /> Pengaturan Sistem
                </Link>
              )}
            </nav>
          </div>
        </aside>
        
        {/* Main Content Area */}
        <main className="flex-1 p-8 lg:p-12 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50">
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/workspace" element={<AuditWorkspace />} />
            <Route path="/workspace/:id" element={<AuditDetail />} />
            <Route path="/settings" element={<SystemSettings />} />
            <Route path="/users" element={<UserManagement />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
