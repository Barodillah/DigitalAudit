import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, Loader2, Calendar, UserCircle2, ChevronRight, Folder, FileText, UploadCloud, Image as ImageIcon, Link, Trash2, X, CheckCircle, XCircle, MinusCircle, Save, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE = 'https://csdwindo.com/audit/api';

export default function AuditorView() {
  const { uuid, token } = useParams();
  const activeId = uuid || token;
  const navigate = useNavigate();

  const [sessionInfo, setSessionInfo] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedItem, setSelectedItem] = useState(null);
  const [evidences, setEvidences] = useState([]);
  const [previewModal, setPreviewModal] = useState({ isOpen: false, currentIndex: 0 });
  const [searchQuery, setSearchQuery] = useState('');

  // Evaluation states
  const [itemResult, setItemResult] = useState({ status: 'pending', notes: '' });
  const [isSavingResult, setIsSavingResult] = useState(false);
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    if (activeId) fetchSessionInfo();
  }, [activeId]);

  const fetchSessionInfo = async () => {
    const authToken = localStorage.getItem('auth_token');
    if (!authToken) {
      toast.error('Sesi tidak ditemukan. Silakan login dengan PIN.');
      navigate('/');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/audit_executor?uuid=${activeId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();

      if (data.success) {
        setSessionInfo(data.data);
        fetchAuditItems(data.data.audit_id, authToken);
      } else {
        toast.error(data.error?.message || 'Link tidak valid');
        navigate('/');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan jaringan');
      navigate('/');
    }
  };

  const fetchAuditItems = async (auditId, authToken) => {
    try {
      const res = await fetch(`${API_BASE}/audit_items?audit_id=${auditId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setCategories(data.data || []);
      }
    } catch (err) {
      toast.error('Gagal memuat struktur audit');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Evidences & Results when an item is selected
  useEffect(() => {
    if (selectedItem && sessionInfo?.audit_id) {
      fetchItemDetails();
    }
  }, [selectedItem, sessionInfo?.audit_id]);

  const fetchItemDetails = async () => {
    const token = localStorage.getItem('auth_token');
    try {
      // Fetch Evidence
      const resEv = await fetch(`${API_BASE}/audit_evidences?audit_id=${sessionInfo.audit_id}&item_id=${selectedItem.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataEv = await resEv.json();
      if (dataEv.success) setEvidences(dataEv.data);

      // Fetch Result
      const resRes = await fetch(`${API_BASE}/audit_item_results?audit_id=${sessionInfo.audit_id}&item_id=${selectedItem.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataRes = await resRes.json();
      if (dataRes.success) {
        setItemResult(dataRes.data);
      }
    } catch (err) {
      console.error('Gagal memuat detail item');
    }
  };

  const saveResult = async (status, notes) => {
    setIsSavingResult(true);
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch(`${API_BASE}/audit_item_results`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audit_id: sessionInfo.audit_id,
          item_id: selectedItem.id,
          status: status,
          notes: notes
        })
      });
      const data = await res.json();
      if (data.success) {
        // success silently
      }
    } catch (err) {
      toast.error('Gagal menyimpan hasil');
    } finally {
      setIsSavingResult(false);
    }
  };

  const handleStatusChange = (newStatus) => {
    setItemResult(prev => ({ ...prev, status: newStatus }));
    saveResult(newStatus, itemResult.notes);
  };

  const handleNotesChange = (e) => {
    const val = e.target.value;
    setItemResult(prev => ({ ...prev, notes: val }));

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveResult(itemResult.status, val);
    }, 1000);
  };

  const toggleCategory = (id) => {
    const toggleNodes = (nodes) => nodes.map(node => {
      if (node.id === id) return { ...node, isOpen: !node.isOpen };
      if (node.children) return { ...node, children: toggleNodes(node.children) };
      return node;
    });
    setCategories(toggleNodes(categories));
  };

  const getFilteredCategories = () => {
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.toLowerCase();

    const filterNodes = (nodes) => {
      return nodes.map(node => {
        const filteredItems = node.items ? node.items.filter(item => item.name.toLowerCase().includes(query)) : [];
        const filteredChildren = node.children ? filterNodes(node.children) : [];
        const nameMatches = node.name.toLowerCase().includes(query);
        
        if (nameMatches || filteredItems.length > 0 || filteredChildren.length > 0) {
          return {
            ...node,
            isOpen: true, // Force open when searching
            items: filteredItems.length > 0 ? filteredItems : (nameMatches ? node.items : []),
            children: filteredChildren.length > 0 ? filteredChildren : (nameMatches ? node.children : [])
          };
        }
        return null;
      }).filter(Boolean);
    };

    return filterNodes(categories);
  };

  const getAllItems = () => {
    let itemsList = [];
    const traverse = (nodes, parentPrefix = '', depth = 0) => {
      nodes.forEach((node, index) => {
        let currentPrefix = depth === 0 ? String.fromCharCode(65 + index) : `${parentPrefix}.${index + 1}`;
        if (node.children) traverse(node.children, currentPrefix, depth + 1);
        if (node.items) {
          node.items.forEach((item, i) => {
            itemsList.push({ ...item, code: `${currentPrefix}.${i + 1}` });
          });
        }
      });
    };
    traverse(categories);
    return itemsList;
  };

  const goToNextItem = () => {
    if (!selectedItem) return;
    const allItems = getAllItems();
    const currentIndex = allItems.findIndex(i => i.id === selectedItem.id);
    if (currentIndex >= 0 && currentIndex < allItems.length - 1) {
      setSelectedItem(allItems[currentIndex + 1]);
    } else {
      toast.success("Anda telah mencapai item terakhir.");
    }
  };

  const renderTree = (nodes, parentPrefix = '', depth = 0) => {
    return nodes.map((node, index) => {
      let currentPrefix = depth === 0 ? String.fromCharCode(65 + index) : `${parentPrefix}.${index + 1}`;

      return (
        <div key={node.id} className="mt-1">
          <div
            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm group transition-colors ${node.isOpen ? 'bg-slate-100 dark:bg-slate-800/80 font-semibold text-slate-900 dark:text-white' : 'hover:bg-white dark:hover:bg-slate-800 font-medium text-slate-700 dark:text-slate-300'}`}
            onClick={() => toggleCategory(node.id)}
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${node.isOpen ? 'rotate-90' : ''}`} />
            <Folder className={`w-4 h-4 ${node.isOpen ? 'text-blue-500' : 'text-slate-400'}`} />
            <span className="font-mono text-xs font-bold text-slate-400">{currentPrefix}</span>
            <span>{node.name}</span>
          </div>

          {node.isOpen && (
            <div className="ml-4 mt-1 border-l-2 border-slate-200 dark:border-slate-800 pl-2 space-y-1">
              {node.children && renderTree(node.children, currentPrefix, depth + 1)}

              {node.items && node.items.map((item, i) => {
                const itemCode = `${currentPrefix}.${i + 1}`;
                const isSelected = selectedItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem({ ...item, code: itemCode })}
                    className={`flex items-center justify-between p-2 rounded-lg text-sm cursor-pointer border transition-all ${isSelected ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 text-blue-700 dark:text-blue-400 font-medium' : 'hover:bg-white dark:hover:bg-slate-800 border-transparent hover:border-slate-200 text-slate-600 dark:text-slate-400'}`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className={`w-4 h-4 ${isSelected ? 'text-blue-500' : 'text-slate-400'}`} />
                      <span className="font-mono text-xs bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-bold">{itemCode}</span>
                      <span>{item.name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <header className="flex flex-col md:flex-row justify-between md:items-center px-6 py-4 border-b bg-white dark:bg-slate-900 shadow-sm gap-4 shrink-0">
        <div className="flex items-center">
          <ShieldCheck className="w-8 h-8 text-purple-600 mr-3 shrink-0" />
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate max-w-[300px] md:max-w-md">
              {sessionInfo?.audit_title}
            </h1>
            <p className="text-sm text-slate-500 flex items-center gap-4 mt-0.5">
              <span className="flex items-center gap-1"><UserCircle2 className="w-4 h-4" /> {sessionInfo?.reviewer_name}</span>
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Exp: {new Date(sessionInfo?.expired_at).toLocaleDateString()}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-bold tracking-wide uppercase">
            Guest Reviewer
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Tree */}
        <div className="w-80 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <h2 className="font-bold text-slate-800 dark:text-white mb-3">Parameter Audit</h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari parameter..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none text-slate-900 dark:text-white transition-all"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {categories.length > 0 ? (
              getFilteredCategories().length > 0 ? renderTree(getFilteredCategories()) : (
                <p className="text-sm text-slate-500 text-center mt-10">Pencarian tidak ditemukan.</p>
              )
            ) : (
              <p className="text-sm text-slate-500 text-center mt-10">Struktur audit belum tersedia.</p>
            )}
          </div>
        </div>

        {/* Right Panel - Evaluation */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 overflow-hidden relative">
          {selectedItem ? (
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-4xl mx-auto space-y-8">

                {/* Header Info */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                  <span className="text-sm font-bold text-purple-600 dark:text-purple-400 mb-2 block tracking-wider uppercase">Item Evaluasi • {selectedItem.code}</span>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-snug">{selectedItem.name}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column: Evidence */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg flex items-center gap-2"><ImageIcon className="w-5 h-5 text-slate-400" /> Evidence</h3>

                    <div className="space-y-2">
                      {evidences.length === 0 ? (
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 text-center text-sm text-slate-500">
                          Belum ada bukti yang dilampirkan pada item ini.
                        </div>
                      ) : (
                        evidences.map((ev, idx) => (
                          <div
                            key={ev.id}
                            onClick={() => setPreviewModal({ isOpen: true, currentIndex: idx })}
                            className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors group"
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                                {ev.file_type.includes('pdf') ? <FileText className="w-5 h-5 text-red-500" /> : <ImageIcon className="w-5 h-5 text-blue-500" />}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{ev.original_name}</p>
                                <p className="text-xs text-slate-500">{(ev.file_size / 1024).toFixed(1)} KB</p>
                              </div>
                            </div>
                            <div className="p-2 text-slate-400 group-hover:text-blue-600 rounded-lg transition-colors shrink-0">
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right Column: Rating */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-bold text-lg mb-4">Hasil Evaluasi</h3>
                      <div className="flex flex-col gap-3">
                        <button
                          onClick={() => handleStatusChange('pass')}
                          className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${itemResult.status === 'pass' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-200 bg-white dark:bg-slate-900'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${itemResult.status === 'pass' ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                              <CheckCircle className="w-5 h-5" />
                            </div>
                            <span className={`font-bold transition-colors ${itemResult.status === 'pass' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>PASS (Lulus)</span>
                          </div>
                          {itemResult.status === 'pass' && <div className="w-3 h-3 bg-emerald-500 rounded-full" />}
                        </button>

                        <button
                          onClick={() => handleStatusChange('fail')}
                          className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${itemResult.status === 'fail' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-red-200 bg-white dark:bg-slate-900'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${itemResult.status === 'fail' ? 'bg-red-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                              <XCircle className="w-5 h-5" />
                            </div>
                            <span className={`font-bold transition-colors ${itemResult.status === 'fail' ? 'text-red-700 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>FAIL (Gagal)</span>
                          </div>
                          {itemResult.status === 'fail' && <div className="w-3 h-3 bg-red-500 rounded-full" />}
                        </button>

                        <button
                          onClick={() => handleStatusChange('na')}
                          className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${itemResult.status === 'na' ? 'border-slate-500 bg-slate-100 dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-900'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${itemResult.status === 'na' ? 'bg-slate-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                              <MinusCircle className="w-5 h-5" />
                            </div>
                            <span className={`font-bold transition-colors ${itemResult.status === 'na' ? 'text-slate-700 dark:text-slate-300' : 'text-slate-600 dark:text-slate-400'}`}>N/A (Tidak Berlaku)</span>
                          </div>
                          {itemResult.status === 'na' && <div className="w-3 h-3 bg-slate-500 rounded-full" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="font-bold text-sm text-slate-700 dark:text-slate-300">Catatan Temuan</label>
                        {isSavingResult && <span className="text-xs text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Menyimpan...</span>}
                      </div>
                      <textarea
                        value={itemResult.notes}
                        onChange={handleNotesChange}
                        placeholder="Tuliskan catatan observasi atau detail temuan di sini..."
                        className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 dark:bg-slate-950/50">
              <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/20 text-purple-500 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Pilih Item Evaluasi</h2>
              <p className="text-slate-500 max-w-md">Silakan pilih parameter di panel sebelah kiri untuk mulai melihat panduan, mengunggah bukti lapangan, dan mengisi hasil audit.</p>
            </div>
          )}
        </div>
      </div>

      {/* Preview Evidence Modal */}
      {previewModal.isOpen && evidences.length > 0 && (
        <div className="fixed inset-0 z-[60] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate pr-4">
                {evidences[previewModal.currentIndex]?.original_name}
              </h3>
              <div className="flex items-center gap-2">
                <a
                  href={evidences[previewModal.currentIndex]?.file_url}
                  download={evidences[previewModal.currentIndex]?.original_name}
                  className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
                  title="Unduh File"
                >
                  <UploadCloud className="w-5 h-5 rotate-180" />
                  <span className="hidden sm:inline">Download</span>
                </a>
                <a
                  href={evidences[previewModal.currentIndex]?.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="Buka di Tab Baru"
                >
                  <Link className="w-5 h-5" />
                </a>
                <button
                  onClick={() => setPreviewModal({ isOpen: false, currentIndex: 0 })}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-950 flex items-center justify-center relative min-h-[300px]">
              {evidences.length > 1 && (
                <button onClick={() => setPreviewModal(prev => ({ ...prev, currentIndex: prev.currentIndex === 0 ? evidences.length - 1 : prev.currentIndex - 1 }))} className="absolute left-4 z-10 p-3 bg-white/80 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-800 rounded-full shadow-xl backdrop-blur transition-all"><ChevronRight className="w-6 h-6 rotate-180" /></button>
              )}

              {evidences[previewModal.currentIndex]?.file_type.includes('pdf') ? (
                <iframe src={evidences[previewModal.currentIndex].file_url} className="w-full h-full min-h-[70vh]" title="PDF Preview" />
              ) : (
                <img src={evidences[previewModal.currentIndex]?.file_url} alt="Preview" className="max-w-full max-h-[80vh] object-contain p-4" />
              )}

              {evidences.length > 1 && (
                <button onClick={() => setPreviewModal(prev => ({ ...prev, currentIndex: prev.currentIndex === evidences.length - 1 ? 0 : prev.currentIndex + 1 }))} className="absolute right-4 z-10 p-3 bg-white/80 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-800 rounded-full shadow-xl backdrop-blur transition-all"><ChevronRight className="w-6 h-6" /></button>
              )}
            </div>

            {evidences.length > 1 && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-center text-sm font-medium text-slate-500 bg-slate-50 dark:bg-slate-900">
                Menampilkan bukti {previewModal.currentIndex + 1} dari {evidences.length}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Next Item Button */}
      {selectedItem && (
        <div className="fixed right-6 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col gap-2">
          <button 
            onClick={goToNextItem}
            title="Lanjut ke Parameter Berikutnya"
            className="w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(147,51,234,0.4)] transition-all hover:scale-110 border-4 border-white dark:border-slate-950"
          >
            <ChevronRight className="w-7 h-7 ml-1" />
          </button>
        </div>
      )}
    </div>
  );
}
