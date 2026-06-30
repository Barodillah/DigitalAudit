import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE = 'https://audit.csdwindo.com/api';

export default function DealerDashboard() {
  const [stats, setStats] = useState({
    ongoing_audits: 0,
    my_tasks: { total: 0, completed: 0, pending: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${API_BASE}/dashboard`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setStats(data.data);
        } else {
          toast.error(data.error?.message || 'Gagal mengambil data dashboard');
        }
      } catch (err) {
        toast.error('Terjadi kesalahan jaringan');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboard();
  }, []);

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500">
      <h1 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white tracking-tight">Dashboard</h1>
      
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-slate-500 dark:text-slate-400 font-medium text-sm uppercase tracking-wider">Audit Berjalan</h3>
          <div className="flex items-end mt-4">
            <p className="text-4xl font-extrabold text-blue-600 dark:text-blue-400">{stats.ongoing_audits}</p>
            <span className="text-sm font-medium text-slate-500 ml-2 mb-1">audit aktif</span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <h3 className="text-slate-500 dark:text-slate-400 font-medium text-sm uppercase tracking-wider">Tugas Saya (Audit Aktif)</h3>
            <div className="flex items-end mt-4 gap-4">
              <div>
                <p className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">{stats.my_tasks.pending}</p>
                <span className="text-sm font-medium text-slate-500">Belum Selesai</span>
              </div>
              <div className="border-l border-slate-200 dark:border-slate-700 h-10"></div>
              <div>
                <p className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.my_tasks.completed}</p>
                <span className="text-sm font-medium text-slate-500">Selesai (Ada Bukti)</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-sm">
            <span className="text-slate-500">Total: {stats.my_tasks.total} item ditugaskan</span>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
