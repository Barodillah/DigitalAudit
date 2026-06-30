import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, MoreVertical, FileText, CheckCircle2, Clock, X, Building2, Loader2, Edit2, Trash2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';

const API_BASE = 'https://audit.csdwindo.com/api';

export default function AuditWorkspace() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [audits, setAudits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const [activeActionId, setActiveActionId] = useState(null);
  const [editModal, setEditModal] = useState({ isOpen: false, audit: null, title: '' });
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, audit: null });

  const navigate = useNavigate();

  useEffect(() => {
    fetchAudits();
  }, []);

  const fetchAudits = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/audits`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAudits(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch audits', err);
    } finally {
      setIsLoading(false);
    }
  };

  const createAudit = async (e) => {
    e.preventDefault();
    setIsCreating(true);

    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());
    const token = localStorage.getItem('auth_token');

    try {
      const res = await fetch(`${API_BASE}/audits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setIsModalOpen(false);
        navigate(`/dealer/workspace/${data.data.id}`);
      } else {
        toast.error(data.error?.message || 'Gagal membuat audit');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setIsCreating(false);
    }
  };

  const handleChangeStatus = async (audit, e) => {
    e.stopPropagation();
    const newStatus = audit.status === 'draft' ? 'published' : 'draft';
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/audits`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: audit.id, status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Status diubah menjadi ${newStatus}`);
        setAudits(audits.map(a => a.id === audit.id ? { ...a, status: newStatus } : a));
        setActiveActionId(null);
      } else {
        toast.error(data.error?.message || 'Gagal mengubah status');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan jaringan');
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.audit) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/audits`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteDialog.audit.id })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Audit berhasil dihapus');
        setAudits(audits.filter(a => a.id !== deleteDialog.audit.id));
      } else {
        toast.error(data.error?.message || 'Gagal menghapus audit');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan jaringan');
    }
  };

  const handleEditTitle = async (e) => {
    e.preventDefault();
    if (!editModal.title.trim()) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/audits`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editModal.audit.id, title: editModal.title })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Judul audit berhasil diubah');
        setAudits(audits.map(a => a.id === editModal.audit.id ? { ...a, title: editModal.title } : a));
        setEditModal({ isOpen: false, audit: null, title: '' });
      } else {
        toast.error(data.error?.message || 'Gagal mengubah judul');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan jaringan');
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'ongoing': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'draft': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'archived': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 mr-1.5" />;
      case 'ongoing': return <Clock className="w-4 h-4 mr-1.5" />;
      default: return <FileText className="w-4 h-4 mr-1.5" />;
    }
  };

  const authUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
  const isStaff = authUser?.role === 'staff';

  const filteredAudits = audits.filter(a => {
    if (isStaff && a.status !== 'ongoing') return false;
    
    return a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.auditor_name && a.auditor_name.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Audit Workspace</h1>
          <p className="text-slate-500 mt-1">Kelola dan pantau semua instrumen audit di satu tempat.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-md shadow-blue-500/20"
        >
          <Plus className="w-5 h-5 mr-2" />
          Buat Audit Baru
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl leading-5 bg-white dark:bg-slate-800 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow shadow-sm"
            placeholder="Cari ID audit, judul, atau nama auditor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="inline-flex items-center px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
          <Filter className="w-5 h-5 mr-2 text-slate-400" />
          Filter
        </button>
      </div>

      {/* Audit List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Audit Info</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Author</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Progress</th>
                  <th scope="col" className="relative px-6 py-4"><span className="sr-only">Aksi</span></th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                {filteredAudits.map((audit) => (
                  <tr
                    key={audit.id}
                    onClick={() => navigate(`/dealer/workspace/${audit.id}`)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors cursor-pointer">
                          {audit.title}
                        </span>
                        <span className="text-sm text-slate-500 mt-0.5">AUD-{audit.id.toString().padStart(4, '0')} • {audit.audit_date}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs mr-3">
                          {audit.auditor_name ? audit.auditor_name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <span className="text-sm text-slate-700 dark:text-slate-300">{audit.auditor_name || 'Belum diassign'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${getStatusStyle(audit.status)}`}>
                        {getStatusIcon(audit.status)}
                        {audit.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full max-w-[120px]">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{audit.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${audit.progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{ width: `${audit.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative" onClick={(e) => e.stopPropagation()}>
                      {(JSON.parse(localStorage.getItem('auth_user') || '{}')?.role === 'super_admin' || JSON.parse(localStorage.getItem('auth_user') || '{}')?.role === 'admin') && (
                        activeActionId === audit.id ? (
                          <div className="flex items-center justify-end gap-1 animate-in slide-in-from-right-4 duration-200">
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditModal({ isOpen: true, audit, title: audit.title }); setActiveActionId(null); }}
                              className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title="Edit Judul"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleChangeStatus(audit, e)}
                              className="p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                              title="Ubah Status (Draft ↔ Published)"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteDialog({ isOpen: true, audit }); setActiveActionId(null); }}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Hapus Audit"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setActiveActionId(null); }}
                              className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors ml-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setActiveActionId(audit.id); }}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
                {filteredAudits.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-slate-500">
                      Tidak ada audit yang ditemukan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Audit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Buat Audit Baru</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={createAudit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Judul Audit</label>
                <input
                  type="text"
                  name="title"
                  required
                  autoFocus
                  placeholder="Cth: Inspeksi Standar Layanan Q4"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Template Referensi</label>
                <select name="template_id" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
                  <option value="none">-- Buat dari Kosong (Custom Hierarki) --</option>
                  {/* For now, just mock templates, they can be fetched dynamically later */}
                  <option value="1">Template: K3 & Keamanan Fasilitas (Mock)</option>
                  <option value="2">Template: Pelayanan Konsumen (Mock)</option>
                </select>
                <p className="text-xs text-slate-500 mt-2">Jika Anda memilih "Buat dari Kosong", Anda akan diminta menentukan struktur kategori dan sub-kategori di halaman selanjutnya.</p>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2.5 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-colors disabled:opacity-70 flex items-center gap-2"
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buat Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Title Modal */}
      {editModal.isOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="font-bold text-slate-900 dark:text-white">Ubah Judul Audit</h2>
              <button onClick={() => setEditModal({ isOpen: false, audit: null, title: '' })} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditTitle} className="p-4">
              <input
                type="text"
                required
                value={editModal.title}
                onChange={(e) => setEditModal(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none mb-6 text-slate-900 dark:text-white"
                placeholder="Judul Audit"
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setEditModal({ isOpen: false, audit: null, title: '' })} className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Batal</button>
                <button type="submit" className="px-4 py-2 font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Hapus Audit"
        message="Apakah Anda yakin ingin menghapus audit ini? Semua data, termasuk struktur, parameter, dan bukti akan terhapus secara permanen."
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, audit: null })}
      />
    </div>
  );
}
