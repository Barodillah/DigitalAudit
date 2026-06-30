import { useState, useEffect } from 'react';
import { Users, Plus, Mail, ShieldAlert, X, Loader2, Trash2, Pencil, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE = 'https://audit.csdwindo.com/api';

export default function UserManagement() {
  const [staff, setStaff] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [modal, setModal] = useState({ isOpen: false, data: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, data: null });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const promises = [fetch(`${API_BASE}/staff`, { headers })];
      if (isSuperAdmin) {
        promises.push(fetch(`${API_BASE}/dealers`, { headers }));
      }

      const responses = await Promise.all(promises);
      const dataStaff = await responses[0].json();
      
      if (dataStaff.success) setStaff(dataStaff.data);

      if (isSuperAdmin) {
        const dataDealers = await responses[1].json();
        if (dataDealers.success) setDealers(dataDealers.data);
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveStaff = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const token = localStorage.getItem('auth_token');
    
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());

    if (!isSuperAdmin) {
      payload.dealer_id = user.dealer_id;
    }

    const isEdit = !!modal.data;
    const url = isEdit ? `${API_BASE}/staff?id=${modal.data.id}` : `${API_BASE}/staff`;
    
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
        setModal({ isOpen: false, data: null });
        fetchData();
      } else {
        toast.error(data.error?.message || 'Gagal menyimpan staff');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal.data) return;
    
    setIsDeleting(true);
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch(`${API_BASE}/staff?id=${deleteModal.data.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDeleteModal({ isOpen: false, data: null });
        fetchData();
      } else {
        toast.error(data.error?.message || 'Gagal menghapus staff');
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Manajemen User (Staff)</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola akun staff auditor dan reviewer {isSuperAdmin ? 'untuk semua dealer' : 'untuk dealer ini'}</p>
        </div>
        <button 
          onClick={() => setModal({ isOpen: true, data: null })}
          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-600/20 font-medium"
        >
          <Plus className="w-5 h-5 mr-2" /> Tambah Staff Baru
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[600px]">
        <div className="p-0 flex-1 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 font-medium">Nama Staff</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Divisi</th>
                <th className="px-6 py-4 font-medium">Role</th>
                {isSuperAdmin && <th className="px-6 py-4 font-medium">Dealer</th>}
                <th className="px-6 py-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {staff.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${s.role === 'reviewer' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                        {s.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-900 dark:text-white">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-slate-400" /> {s.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {s.division || '-'}
                  </td>
                  <td className="px-6 py-4">
                    {s.role === 'reviewer' ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">Reviewer</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">Staff (Auditor)</span>
                    )}
                  </td>
                  {isSuperAdmin && (
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {s.dealer_name || '-'}
                    </td>
                  )}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setModal({ isOpen: true, data: s })} 
                        className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                        title="Edit Staff"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setDeleteModal({ isOpen: true, data: s })} 
                        className="p-2 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                        title="Hapus Staff"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr><td colSpan={isSuperAdmin ? "6" : "5"} className="px-6 py-10 text-center text-slate-500">Belum ada data staff</td></tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-amber-50 dark:bg-amber-900/10 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-400">
            <strong>Catatan:</strong> Staff lapangan yang diundang secara langsung melalui PIN akses sementara (Unified Login) tidak akan muncul di sini. Daftar ini khusus untuk akun permanen (Staff/Reviewer) yang memiliki akses dashboard terbatas.
          </p>
        </div>
      </div>

      {/* Modal Tambah/Edit Staff */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                {modal.data ? 'Edit Data Staff' : 'Tambah Staff Baru'}
              </h3>
              <button onClick={() => setModal({ isOpen: false, data: null })} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveStaff} className="p-6 space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nama Lengkap <span className="text-red-500">*</span></label>
                  <input type="text" name="name" required defaultValue={modal.data?.name} placeholder="Misal: Andi Saputra" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email Login <span className="text-red-500">*</span></label>
                  <input type="email" name="email" required defaultValue={modal.data?.email} placeholder="andi@dealer.com" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Divisi</label>
                  <input type="text" name="division" defaultValue={modal.data?.division} placeholder="Misal: IT / HRD" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" />
                </div>
                <div>
                  <label className="flex justify-between text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    <span>Password {!modal.data && <span className="text-red-500">*</span>}</span>
                    {modal.data && <span className="text-slate-400 text-xs font-medium italic">(Kosongkan jika tak diubah)</span>}
                  </label>
                  <input type="password" name="password" required={!modal.data} placeholder="••••••••" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Role / Jabatan <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select name="role" required defaultValue={modal.data?.role || 'staff'} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none appearance-none">
                      <option value="staff">Staff (Auditor Internal)</option>
                      <option value="reviewer">Reviewer</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
                {isSuperAdmin && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Asal Dealer <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <select name="dealer_id" required defaultValue={modal.data?.dealer_id || ''} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none appearance-none">
                        <option value="">-- Pilih Dealer --</option>
                        {dealers.map(d => (
                          <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setModal({ isOpen: false, data: null })} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl transition-colors">Batal</button>
                <button type="submit" disabled={isSaving} className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm shadow-blue-600/20 disabled:opacity-70 flex items-center gap-2">
                  {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : 'Simpan Staff'}
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
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Hapus Staff?</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Anda yakin ingin menghapus <strong>{deleteModal.data?.name}</strong>? Data yang dihapus tidak dapat dikembalikan.
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex gap-3 justify-center border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setDeleteModal({ isOpen: false, data: null })} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors flex-1">
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
