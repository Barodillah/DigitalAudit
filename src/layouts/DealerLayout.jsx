import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Home, FolderKanban, Settings, Loader2, Users, Menu, X } from 'lucide-react';
import logoImg from '../assets/logo.png';

const API_BASE = 'https://audit.csdwindo.com/api';

export default function DealerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Tutup menu mobile ketika navigasi berubah
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

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
    <div className="h-[100dvh] overflow-hidden bg-slate-50 dark:bg-slate-950 flex flex-col font-sans selection:bg-blue-500/30 relative">
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 p-4 px-4 md:px-6 flex justify-between items-center z-40 w-full shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <button 
            type="button"
            className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg dark:hover:bg-slate-800 shrink-0"
            onClick={(e) => {
              e.preventDefault();
              setIsMobileMenuOpen(!isMobileMenuOpen);
            }}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          
          <div className="flex items-center gap-2 min-w-0">
            <img src={logoImg} alt="AuditDigital" className="w-8 h-8 object-contain shrink-0 drop-shadow-sm" />
            <div className="font-bold text-lg md:text-xl text-slate-900 dark:text-white tracking-tight flex items-center truncate">
              Audit<span className="text-blue-600 dark:text-blue-400">Digital</span> 
              <span className="hidden sm:inline text-sm font-normal text-slate-500 dark:text-slate-400 ml-2 border-l border-slate-300 dark:border-slate-700 pl-2 shrink-0">
                Portal Dealer
              </span>
            </div>
          </div>
        </div>
        
        <button onClick={handleLogout} className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 flex items-center transition-colors px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0 ml-2">
          <LogOut className="w-4 h-4 sm:mr-2 shrink-0" />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </header>
      
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-20 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed md:relative top-[73px] md:top-0 left-0 h-[calc(100vh-73px)] 
          w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 
          flex flex-col shrink-0 z-30 transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="flex flex-col h-full overflow-hidden">
            <div className="p-6 pb-6 shrink-0 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0">
                  <span className="text-slate-700 dark:text-slate-300 font-bold text-sm">{user?.name?.substring(0, 2).toUpperCase() || 'U'}</span>
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.name || 'User'}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email || '-'}</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 pt-6">
              <nav className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">Menu Utama</p>
                <Link to="/dealer" className={navLinkClass('/dealer')}>
                  <Home className="w-5 h-5 mr-3 shrink-0" /> Dashboard Utama
                </Link>
                <Link to="/dealer/workspace" className={navLinkClass('/dealer/workspace')}>
                  <FolderKanban className="w-5 h-5 mr-3 shrink-0" /> Audit Workspace
                </Link>
                
                {(user?.role === 'super_admin' || user?.role === 'admin') && (
                  <Link to="/dealer/users" className={navLinkClass('/dealer/users')}>
                    <Users className="w-5 h-5 mr-3 shrink-0" /> Manajemen User
                  </Link>
                )}

                {user?.role === 'super_admin' && (
                  <Link to="/dealer/settings" className={navLinkClass('/dealer/settings')}>
                    <Settings className="w-5 h-5 mr-3 shrink-0" /> Pengaturan Sistem
                  </Link>
                )}
              </nav>
            </div>
          </div>
        </aside>
        
        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-12 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
