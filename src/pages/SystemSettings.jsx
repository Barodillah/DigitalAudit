import { useState, useEffect } from 'react';
import { Building2, Search, Plus, UserCircle2, Mail, MoreVertical, X, Pencil, Trash2, KeyRound, Loader2, AlertTriangle, UserCog } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE = 'https://audit.csdwindo.com/api';

const Toggle = ({ name, defaultChecked }) => {
  const [checked, setChecked] = useState(defaultChecked);
  
  useEffect(() => {
    setChecked(defaultChecked);
  }, [defaultChecked]);

  return (
    <label className="relative cursor-pointer" style={{ width: '48px', height: '28px', display: 'inline-block' }}>
      <input 
        type="checkbox" 
        name={name} 
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        className="sr-only" 
      />
      {/* Track */}
      <div 
        className="absolute inset-0 rounded-full transition-colors duration-300 ease-in-out"
        style={{ backgroundColor: checked ? '#2563eb' : '#cbd5e1' }}
      ></div>
      {/* Thumb */}
      <div 
        className="absolute bg-white rounded-full shadow-md transition-transform duration-300 ease-in-out flex items-center justify-center"
        style={{ 
          width: '24px', 
          height: '24px', 
          top: '2px', 
          left: '2px',
          transform: checked ? 'translateX(20px)' : 'translateX(0)'
        }}
      ></div>
    </label>
  );
};

export default function SystemSettings() {
  const [dealers, setDealers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [dealerModal, setDealerModal] = useState({ isOpen: false, data: null });
  const [adminModal, setAdminModal] = useState({ isOpen: false, data: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, data: null, type: null }); // type: 'dealer' or 'admin'

  // Form states
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [resDealers, resAdmins] = await Promise.all([
        fetch(`${API_BASE}/dealers`, { headers }),
        fetch(`${API_BASE}/admins`, { headers })
      ]);

      const dataDealers = await resDealers.json();
      const dataAdmins = await resAdmins.json();

      if (dataDealers.success) setDealers(dataDealers.data);
      if (dataAdmins.success) setAdmins(dataAdmins.data);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveDealer = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const token = localStorage.getItem('auth_token');

    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());
    payload.is_active = payload.is_active ? 1 : 0;

    const isEdit = !!dealerModal.data;
    const url = isEdit ? `${API_BASE}/dealers?id=${dealerModal.data.id}` : `${API_BASE}/dealers`;

    try {
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setDealerModal({ isOpen: false, data: null });
        fetchData();
      } else {
        toast.error(data.error?.message || 'Gagal menyimpan dealer');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setIsSaving(false);
    }
  };

  const saveAdmin = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const token = localStorage.getItem('auth_token');

    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());

    const isEdit = !!adminModal.data;
    const url = isEdit ? `${API_BASE}/admins?id=${adminModal.data.id}` : `${API_BASE}/admins`;

    try {
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setAdminModal({ isOpen: false, data: null });
        fetchData();
      } else {
        toast.error(data.error?.message || 'Gagal menyimpan admin');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal.data || !deleteModal.type) return;
    
    setIsDeleting(true);
    const token = localStorage.getItem('auth_token');
    const endpoint = deleteModal.type === 'dealer' ? 'dealers' : 'admins';
    
    try {
      const res = await fetch(`${API_BASE}/${endpoint}?id=${deleteModal.data.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDeleteModal({ isOpen: false, data: null, type: null });
        fetchData();
      } else {
        toast.error(data.error?.message || `Gagal menghapus ${deleteModal.type}`);
      }
    } catch (err) {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Pengaturan Sistem</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manajemen Master Data Dealer dan Admin (Khusus Super Admin)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel Manajemen Dealer */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
            <h2 className="font-semibold text-slate-900 dark:text-white flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-blue-600" />
              Daftar Dealer / Cabang
            </h2>
            <button
              onClick={() => setDealerModal({ isOpen: true, data: null })}
              className="flex items-center text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              <Plus className="w-4 h-4 mr-1" /> Tambah Dealer
            </button>
          </div>
          <div className="p-0 flex-1 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 sticky top-0">
                <tr>
                  <th className="px-5 py-3 font-medium">Kode</th>
                  <th className="px-5 py-3 font-medium">Nama Dealer</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {dealers.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">{d.code}</td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{d.name}</td>
                    <td className="px-5 py-4">
                      {d.is_active ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Aktif</span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Nonaktif</span>
                      )}
                    </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setDealerModal({ isOpen: true, data: d })} 
                            className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                            title="Edit Dealer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setDeleteModal({ isOpen: true, data: d, type: 'dealer' })} 
                            className="p-2 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                            title="Hapus Dealer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                  </tr>
                ))}
                {dealers.length === 0 && (
                  <tr><td colSpan="4" className="px-5 py-8 text-center text-slate-500">Belum ada data dealer</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel Manajemen Admin */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
            <h2 className="font-semibold text-slate-900 dark:text-white flex items-center">
              <UserCog className="w-5 h-5 mr-2 text-indigo-600" />
              Daftar Akun Admin
            </h2>
            <button
              onClick={() => setAdminModal({ isOpen: true, data: null })}
              className="flex items-center text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              <Plus className="w-4 h-4 mr-1" /> Tambah Admin
            </button>
          </div>
          <div className="p-0 flex-1 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 sticky top-0">
                <tr>
                  <th className="px-5 py-3 font-medium">Nama / Email</th>
                  <th className="px-5 py-3 font-medium">Dealer</th>
                  <th className="px-5 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {admins.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900 dark:text-white">{a.name}</p>
                      <p className="text-xs text-slate-500">{a.email}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{a.dealer_name || '-'}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setAdminModal({ isOpen: true, data: a })} 
                          className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                          title="Edit Admin"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setDeleteModal({ isOpen: true, data: a, type: 'admin' })} 
                          className="p-2 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                          title="Hapus Admin"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {admins.length === 0 && (
                  <tr><td colSpan="4" className="px-5 py-8 text-center text-slate-500">Belum ada data admin</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Tambah/Edit Dealer */}
      {dealerModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                {dealerModal.data ? 'Edit Data Dealer' : 'Tambah Dealer Baru'}
              </h3>
              <button onClick={() => setDealerModal({ isOpen: false, data: null })} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveDealer} className="p-6 space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Kode Dealer <span className="text-red-500">*</span></label>
                  <input type="text" name="code" required defaultValue={dealerModal.data?.code} placeholder="Misal: DLR-001" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nama Dealer <span className="text-red-500">*</span></label>
                  <input type="text" name="name" required defaultValue={dealerModal.data?.name} placeholder="Nama lengkap dealer" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Alamat Lengkap</label>
                  <textarea name="address" defaultValue={dealerModal.data?.address} placeholder="Alamat fisik cabang..." className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none resize-none" rows="3"></textarea>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Status Dealer</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Dealer nonaktif tidak bisa diakses</p>
                  </div>
                  <Toggle name="is_active" defaultChecked={dealerModal.data ? dealerModal.data.is_active : true} />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setDealerModal({ isOpen: false, data: null })} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl transition-colors">Batal</button>
                <button type="submit" disabled={isSaving} className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm shadow-blue-600/20 disabled:opacity-70 flex items-center gap-2">
                  {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : 'Simpan Dealer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah/Edit Admin */}
      {adminModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <UserCog className="w-5 h-5 text-blue-600" />
                {adminModal.data ? 'Edit Data Admin' : 'Tambah Admin Baru'}
              </h3>
              <button onClick={() => setAdminModal({ isOpen: false, data: null })} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveAdmin} className="p-6 space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nama Lengkap <span className="text-red-500">*</span></label>
                  <input type="text" name="name" required defaultValue={adminModal.data?.name} placeholder="Misal: Budi Santoso" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email Akses <span className="text-red-500">*</span></label>
                  <input type="email" name="email" required defaultValue={adminModal.data?.email} placeholder="budi@dealer.com" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" />
                </div>
                <div>
                  <label className="flex justify-between text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    <span>Password {!adminModal.data && <span className="text-red-500">*</span>}</span>
                    {adminModal.data && <span className="text-slate-400 text-xs font-medium italic">(Kosongkan jika tak diubah)</span>}
                  </label>
                  <input type="password" name="password" required={!adminModal.data} placeholder="••••••••" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Asal Dealer <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select name="dealer_id" required defaultValue={adminModal.data?.dealer_id || ''} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none appearance-none">
                      <option value="">-- Pilih Dealer --</option>
                      {dealers.filter(d => d.is_active).map(d => (
                        <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setAdminModal({ isOpen: false, data: null })} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl transition-colors">Batal</button>
                <button type="submit" disabled={isSaving} className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm shadow-blue-600/20 disabled:opacity-70 flex items-center gap-2">
                  {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : 'Simpan Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Hapus {deleteModal.type === 'dealer' ? 'Dealer' : 'Admin'}?</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Anda yakin ingin menghapus <strong>{deleteModal.type === 'dealer' ? deleteModal.data?.name : deleteModal.data?.name}</strong>? Data yang dihapus tidak dapat dikembalikan.
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex gap-3 justify-center border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setDeleteModal({ isOpen: false, data: null, type: null })} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors flex-1">
                Batal
              </button>
              <button onClick={confirmDelete} disabled={isDeleting} className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-sm shadow-red-600/20 disabled:opacity-70 flex items-center justify-center gap-2 flex-1">
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
