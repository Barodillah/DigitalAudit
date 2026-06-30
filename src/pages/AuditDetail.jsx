import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Settings, ChevronRight, Folder, FileText, CheckCircle2, ListTree, X, Loader2, PlayCircle, UploadCloud, Image as ImageIcon, Search, Edit2, Trash2, FileSpreadsheet, Download, Link, Copy, Users } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';

const API_BASE = 'https://audit.csdwindo.com/api';

export default function AuditDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const authUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
  const isAdminUser = authUser?.role === 'super_admin' || authUser?.role === 'admin';

  const [audit, setAudit] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Phase 1: Setup Hierarchy
  const [evidences, setEvidences] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isHierarchyConfigured, setIsHierarchyConfigured] = useState(false);
  const [showHierarchyModal, setShowHierarchyModal] = useState(false);
  const [hierarchyConfig, setHierarchyConfig] = useState({ levels: 2, naming: 'numeric' });
  const [levels, setLevels] = useState([]);

  // Excel Upload Modal State
  const [showExcelModal, setShowExcelModal] = useState(false);

  // Preview Modal State
  const [previewModal, setPreviewModal] = useState({ isOpen: false, currentIndex: 0 });

  // Assignment Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [availableStaff, setAvailableStaff] = useState([]);
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [massAssignData, setMassAssignData] = useState(null);

  // Filter State
  const [taskFilter, setTaskFilter] = useState('semua');
  const [myAssignedItemIds, setMyAssignedItemIds] = useState([]);

  // Link Modal State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [reviewers, setReviewers] = useState([]);
  const [auditLinks, setAuditLinks] = useState([]);
  const [linkForm, setLinkForm] = useState({ reviewer_id: '', duration_days: 1 });
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  // Phase 2 & 3: Tree State
  const [categories, setCategories] = useState([]);
  const [addingCategoryTo, setAddingCategoryTo] = useState(null);
  const [addingItemTo, setAddingItemTo] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const [editingCaptionId, setEditingCaptionId] = useState(null);
  const [tempCaption, setTempCaption] = useState('');

  const confirmAction = useCallback((title, message, onConfirm) => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm });
  }, []);

  // Action Modal State (Rename/Delete on Double Click)
  const [actionModal, setActionModal] = useState({ isOpen: false, node: null, type: null, newName: '' });

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Ya',
    cancelText: 'Batal',
    onConfirm: null
  });

  // Autosave Flag
  const isInitialLoad = useRef(true);
  const saveTimeoutRef = useRef(null);
  const [lastSaved, setLastSaved] = useState(null);

  // Phase 3: Selection for Evidence Upload
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    if (selectedItem && audit?.id) {
      fetchEvidences();
    }
  }, [selectedItem, audit?.id]);

  const fetchEvidences = async () => {
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch(`${API_BASE}/audit_evidences?audit_id=${audit.id}&item_id=${selectedItem.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setEvidences(data.data);
    } catch (err) {
      console.error('Gagal memuat evidence');
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/') || file.size <= 1024 * 1024) {
        return resolve(file);
      }
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const MAX_DIMENSION = 1920;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
          width = width * ratio;
          height = height * ratio;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        // We output as JPEG at 0.7 quality to reduce file size
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.7);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };
      img.src = objectUrl;
    });
  };

  const handleFileUpload = async (e) => {
    let file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && file.size > 10 * 1024 * 1024) {
      return toast.error('Ukuran maksimal foto adalah 10MB');
    }

    setIsUploading(true);

    if (file.type.startsWith('image/')) {
      file = await compressImage(file);
    }
    const formData = new FormData();
    formData.append('audit_id', audit.id);
    formData.append('item_id', selectedItem.id);
    formData.append('file', file);

    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch(`${API_BASE}/upload_evidence`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        toast.success('File berhasil diunggah');
        setEvidences([data.data, ...evidences]);
      } else {
        toast.error(data.error?.message || 'Gagal mengunggah file');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setIsUploading(false);
      e.target.value = null;
    }
  };

  const handleDeleteEvidence = (evidenceId) => {
    confirmAction('Hapus Bukti', 'Apakah Anda yakin ingin menghapus bukti ini?', async () => {
      const token = localStorage.getItem('auth_token');
      try {
        const res = await fetch(`${API_BASE}/audit_evidences`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: evidenceId })
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Bukti berhasil dihapus');
          setEvidences(prevEvidences => {
            const newEvidences = prevEvidences.filter(e => e.id !== evidenceId);
            if (newEvidences.length === 0) {
              setPreviewModal({ isOpen: false, currentIndex: 0 });
            } else {
              setPreviewModal(prev => ({
                ...prev,
                currentIndex: prev.currentIndex >= newEvidences.length ? newEvidences.length - 1 : prev.currentIndex
              }));
            }
            return newEvidences;
          });
        } else {
          toast.error(data.error?.message || 'Gagal menghapus bukti');
        }
      } catch (err) {
        toast.error('Terjadi kesalahan jaringan');
      }
    });
  };

  const handleSaveCaption = async (evidenceId) => {
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch(`${API_BASE}/audit_evidences`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: evidenceId, caption: tempCaption })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Caption berhasil disimpan');
        setEvidences(prev => prev.map(e => e.id === evidenceId ? { ...e, caption: tempCaption } : e));
        setEditingCaptionId(null);
      } else {
        toast.error(data.error?.message || 'Gagal menyimpan caption');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan jaringan');
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, [id]);

  useEffect(() => {
    if (isInitialLoad.current) return;
    if (audit?.status !== 'draft') return;

    // Clear existing timeout
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    // Autosave after 1 second of no changes
    saveTimeoutRef.current = setTimeout(() => {
      saveStructure(categories);
    }, 1000);

    return () => clearTimeout(saveTimeoutRef.current);
  }, [categories]);

  const fetchAuditData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const resAudit = await fetch(`${API_BASE}/audits?id=${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resAudit.json();

      if (data.success) {
        setAudit(data.data);
        fetchStaffList(data.data.dealer_id);
        if (data.data.status === 'ongoing') {
          fetchMyItemIds();
        }
      } else {
        toast.error('Audit tidak ditemukan');
        navigate('/dealer/workspace');
        return;
      }

      // 2. Fetch Hierarchy Levels
      const resLevels = await fetch(`${API_BASE}/audit_levels?audit_id=${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataLevels = await resLevels.json();

      if (dataLevels.success && dataLevels.data.length > 0) {
        setIsHierarchyConfigured(true);
        setLevels(dataLevels.data.map(l => ({ id: Date.now() + Math.random(), label: l.label })));
      } else {
        setIsHierarchyConfigured(false);
        setShowHierarchyModal(true);
        setLevels([
          { id: Date.now() + 1, label: 'Kategori' },
          { id: Date.now() + 2, label: 'Sub-Kategori' },
          { id: Date.now() + 3, label: 'Parameter' }
        ]);
      }

      // 3. Fetch Tree Items Structure
      const resItems = await fetch(`${API_BASE}/audit_items?audit_id=${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataItems = await resItems.json();
      if (dataItems.success) {
        setCategories(dataItems.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan saat memuat data');
    } finally {
      setIsLoading(false);
      setTimeout(() => { isInitialLoad.current = false; }, 500); // Allow render to finish before enabling autosave
    }
  };

  const saveHierarchy = async () => {
    setIsSaving(true);
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch(`${API_BASE}/audit_levels`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audit_id: id,
          levels: levels.map(l => ({ label: l.label }))
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsHierarchyConfigured(true);
        setShowHierarchyModal(false);
      } else {
        toast.error(data.error?.message || 'Gagal menyimpan konfigurasi');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setIsSaving(false);
    }
  };

  const saveStructure = async (treeToSave) => {
    setIsSaving(true);

    // Inject codes into the tree before sending
    const computeCodes = (nodes, depth = 0, parentPrefix = '') => {
      return nodes.map((node, index) => {
        let currentPrefix = '';
        if (depth === 0) {
          currentPrefix = String.fromCharCode(65 + index);
        } else {
          currentPrefix = `${parentPrefix}.${index + 1}`;
        }

        const newNode = { ...node };

        if (newNode.children) {
          newNode.children = computeCodes(newNode.children, depth + 1, currentPrefix);
        }

        if (newNode.items) {
          newNode.items = newNode.items.map((item, i) => ({
            ...item,
            code: `${currentPrefix}.${i + 1}`
          }));
        }

        return newNode;
      });
    };

    const treeWithCodes = computeCodes(treeToSave);

    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch(`${API_BASE}/audit_items`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audit_id: id,
          tree: treeWithCodes
        })
      });
      const data = await res.json();
      if (data.success) {
        setLastSaved(new Date());
      } else {
        console.error(data.error?.message || 'Gagal autosave struktur');
      }
    } catch (err) {
      console.error('Terjadi kesalahan jaringan saat autosave');
    } finally {
      setIsSaving(false);
    }
  };

  const requestStartAudit = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Mulai Audit',
      message: 'Apakah Anda yakin ingin memulai audit ini? Struktur tidak bisa diubah lagi setelah audit berjalan.',
      confirmText: 'Mulai Sekarang',
      cancelText: 'Batal',
      onConfirm: startAudit
    });
  };

  const startAudit = async () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    setIsStarting(true);
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch(`${API_BASE}/audits`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: id,
          status: 'ongoing'
        })
      });
      const data = await res.json();
      if (data.success) {
        setAudit(prev => ({ ...prev, status: 'ongoing' }));
      } else {
        toast.error(data.error?.message || 'Gagal memulai audit');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setIsStarting(false);
    }
  };

  // Tree Handlers
  const toggleCategory = (catId) => {
    const updateTree = (nodes) => nodes.map(node => {
      if (node.id === catId) return { ...node, isOpen: !node.isOpen };
      if (node.children) return { ...node, children: updateTree(node.children) };
      return node;
    });
    setCategories(updateTree(categories));
  };

  const addCategory = (parentId, name) => {
    if (!name.trim()) return;
    const newCat = { id: `TEMP-${Date.now()}`, name: name.trim(), isOpen: true, children: [] };
    if (parentId === 'root') {
      setCategories([...categories, newCat]);
    } else {
      const updateTree = (nodes) => nodes.map(node => {
        if (node.id === parentId) return { ...node, isOpen: true, children: [...node.children, newCat] };
        if (node.children) return { ...node, children: updateTree(node.children) };
        return node;
      });
      setCategories(updateTree(categories));
    }
  };

  const addItem = (categoryId, name) => {
    if (!name.trim()) return;
    const updateTree = (nodes) => nodes.map(node => {
      if (node.id === categoryId) {
        return { ...node, items: [...(node.items || []), { id: `TEMP-${Date.now()}`, name: name.trim() }] };
      }
      if (node.children) return { ...node, children: updateTree(node.children) };
      return node;
    });
    setCategories(updateTree(categories));
  };

  // Node Action Handlers
  const openActionModal = (node, type) => {
    if (audit?.status !== 'draft') return;
    setActionModal({ isOpen: true, node, type, newName: node.name });
  };

  const handleActionRename = () => {
    if (!actionModal.newName.trim()) return;
    const updateTree = (nodes) => nodes.map(node => {
      if (node.id === actionModal.node.id && actionModal.type === 'category') {
        return { ...node, name: actionModal.newName.trim() };
      }
      if (node.items && actionModal.type === 'item') {
        return { ...node, items: node.items.map(i => i.id === actionModal.node.id ? { ...i, name: actionModal.newName.trim() } : i) };
      }
      if (node.children) return { ...node, children: updateTree(node.children) };
      return node;
    });
    setCategories(updateTree(categories));
    setActionModal({ isOpen: false, node: null, type: null, newName: '' });
  };

  const requestDeleteAction = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Konfirmasi Hapus',
      message: `Hapus ${actionModal.type === 'category' ? 'Kategori' : 'Item'} ini?`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      onConfirm: executeActionDelete
    });
  };

  const executeActionDelete = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    if (actionModal.type === 'category') {
      const deleteFromTree = (nodes) => {
        return nodes.filter(n => n.id !== actionModal.node.id).map(node => {
          if (node.children) return { ...node, children: deleteFromTree(node.children) };
          return node;
        });
      };
      setCategories(deleteFromTree(categories));
    } else if (actionModal.type === 'item') {
      const deleteItem = (nodes) => nodes.map(node => {
        if (node.items) {
          return { ...node, items: node.items.filter(i => i.id !== actionModal.node.id) };
        }
        if (node.children) return { ...node, children: deleteItem(node.children) };
        return node;
      });
      setCategories(deleteItem(categories));
    }
    setActionModal({ isOpen: false, node: null, type: null, newName: '' });
  };

  const downloadExcelTemplate = () => {
    // Generate headers based on levels
    const headers = levels.map(l => l.label);
    headers.push('Nama Item / Pertanyaan');

    // Create dummy row
    const dummyRow = levels.map((_, i) => `Contoh ${levels[i].label}`);
    dummyRow.push('Contoh Nama Pertanyaan / Item');

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([headers, dummyRow]);

    // Adjust column widths automatically
    const wscols = headers.map(h => ({ wch: Math.max(h.length, 25) }));
    worksheet['!cols'] = wscols;

    // Create workbook and append sheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Audit");

    // Export to Excel file
    XLSX.writeFile(workbook, `Template_Audit_${id}.xlsx`);
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws);

        const headerKeys = levels.map(l => l.label);
        const itemKey = 'Nama Item / Pertanyaan';

        let newCategories = [];

        rows.forEach((row) => {
          let currentLevel = newCategories;

          for (let i = 0; i < headerKeys.length; i++) {
            const levelName = row[headerKeys[i]];
            if (!levelName) continue;

            let existingNode = currentLevel.find(c => c.name === String(levelName).trim());
            if (!existingNode) {
              existingNode = {
                id: `EXCEL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: String(levelName).trim(),
                isOpen: true,
                ...(i === headerKeys.length - 1 ? { items: [] } : { children: [] })
              };
              currentLevel.push(existingNode);
            }

            if (i === headerKeys.length - 1) {
              const itemName = row[itemKey];
              if (itemName) {
                if (!existingNode.items) existingNode.items = [];
                const cleanItemName = String(itemName).trim();
                if (!existingNode.items.find(item => item.name === cleanItemName)) {
                  existingNode.items.push({
                    id: `EXCEL-ITEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name: cleanItemName
                  });
                }
              }
            } else {
              if (!existingNode.children) existingNode.children = [];
              currentLevel = existingNode.children;
            }
          }
        });

        setCategories(newCategories);
        setShowExcelModal(false);
        toast.success('Struktur berhasil diimport dari Excel');
      } catch (error) {
        console.error(error);
        toast.error('Gagal membaca file Excel. Pastikan format sesuai template.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = null;
  };

  const handleOpenLinkModal = () => {
    setShowLinkModal(true);
    fetchReviewersAndLinks();
    if (audit?.reviewer_id) {
      setLinkForm(prev => ({ ...prev, reviewer_id: audit.reviewer_id }));
    }
  };

  const fetchReviewersAndLinks = async () => {
    const token = localStorage.getItem('auth_token');
    try {
      if (audit?.dealer_id) {
        const resRev = await fetch(`${API_BASE}/reviewers?dealer_id=${audit.dealer_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const dataRev = await resRev.json();
        if (dataRev.success) setReviewers(dataRev.data);
      }

      const resLinks = await fetch(`${API_BASE}/audit_links?audit_id=${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataLinks = await resLinks.json();
      if (dataLinks.success) setAuditLinks(dataLinks.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateLink = async () => {
    if (!linkForm.reviewer_id) return toast.error('Pilih reviewer terlebih dahulu');
    setIsGeneratingLink(true);
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch(`${API_BASE}/audit_links`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audit_id: id,
          reviewer_id: linkForm.reviewer_id,
          duration_days: linkForm.duration_days
        })
      });
      const data = await res.json();
      if (data.success) {
        setAuditLinks([data.data, ...auditLinks]);
        setAudit(prev => ({ ...prev, reviewer_id: linkForm.reviewer_id }));
      } else {
        toast.error(data.error?.message || 'Gagal membuat link');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const isDraft = audit?.status === 'draft';
  const isOngoing = audit?.status === 'ongoing';

  const getFilteredCategories = () => {
    if (!searchQuery && taskFilter === 'semua') return categories;

    const query = searchQuery.toLowerCase();

    const filterNodes = (nodes) => {
      return nodes.map(node => {
        let filteredItems = [];
        if (node.items) {
          filteredItems = node.items.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(query);
            const matchesTask = taskFilter === 'semua' || myAssignedItemIds.includes(item.id);
            return matchesSearch && matchesTask;
          });
        }

        const filteredChildren = node.children ? filterNodes(node.children) : [];
        const nameMatchesSearch = node.name.toLowerCase().includes(query);
        // A folder is included if its name matches search OR it has filtered items/children.
        // For task filter, we only show folders that have matched items/children.
        const shouldIncludeFolder = (nameMatchesSearch && taskFilter === 'semua') || filteredItems.length > 0 || filteredChildren.length > 0;

        if (shouldIncludeFolder) {
          return {
            ...node,
            isOpen: true, // Force open when filtering
            items: filteredItems,
            children: filteredChildren
          };
        }
        return null;
      }).filter(Boolean);
    };

    return filterNodes(categories);
  };

  const renderCategory = (category, depth, index, parentPrefix = '') => {
    const isLeafCategory = depth === levels.length - 1;

    let currentPrefix = '';
    if (depth === 0) {
      currentPrefix = String.fromCharCode(65 + index); // A, B, C...
    } else {
      currentPrefix = `${parentPrefix}.${index + 1}`;
    }

    return (
      <div key={category.id} className="mt-1">
        <div
          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-sm group transition-colors ${category.isOpen ? 'bg-slate-100 dark:bg-slate-800/80 text-blue-700 dark:text-blue-400 font-semibold' : 'hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium'
            }`}
          onClick={() => toggleCategory(category.id)}
          onDoubleClick={() => {
            if (audit?.status === 'draft') {
              openActionModal(category, 'category');
            } else if (audit?.status === 'ongoing' && isAdminUser) {
              handleMassAssign(category);
            }
          }}
        >
          <div className="flex items-center gap-2">
            <ChevronRight className={`w-4 h-4 transition-transform ${category.isOpen ? 'rotate-90' : ''}`} />
            <Folder className={`w-4 h-4 ${category.isOpen ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-600'}`} />
            <span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500 mr-1">{currentPrefix}</span>
            <span>{category.name}</span>
          </div>
          {!isLeafCategory && isDraft && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!category.isOpen) toggleCategory(category.id);
                setAddingCategoryTo(category.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-slate-600 transition-all"
              title={`Tambah ${levels[depth + 1]?.label || 'Sub'}`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {category.isOpen && (
          <div className="ml-4 mt-1 border-l-2 border-slate-200 dark:border-slate-800 pl-2 space-y-1">
            {category.children && category.children.map((child, i) => renderCategory(child, depth + 1, i, currentPrefix))}

            {/* Input Add Sub-Category (Draft Only) */}
            {!isLeafCategory && addingCategoryTo === category.id && isDraft && (
              <div className="flex items-center gap-2 p-1 mt-1">
                <div className="flex-1 bg-white dark:bg-slate-900 border border-blue-500 rounded-lg flex items-center px-3 py-2 shadow-sm ring-2 ring-blue-500/20">
                  <Folder className="w-4 h-4 text-blue-400 mr-2 shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    className="flex-1 bg-transparent border-none focus:outline-none text-sm text-slate-900 dark:text-white"
                    placeholder={`Nama ${levels[depth + 1]?.label || 'Sub'}... (Enter)`}
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addCategory(category.id, newCategoryName);
                        setAddingCategoryTo(null);
                        setNewCategoryName('');
                      } else if (e.key === 'Escape') {
                        setAddingCategoryTo(null);
                        setNewCategoryName('');
                      }
                    }}
                  />
                </div>
                <button onClick={() => { addCategory(category.id, newCategoryName); setAddingCategoryTo(null); setNewCategoryName(''); }} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <CheckCircle2 className="w-4 h-4" />
                </button>
                <button onClick={() => { setAddingCategoryTo(null); setNewCategoryName(''); }} className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Leaf Items */}
            {isLeafCategory && (
              <div className="ml-2 mt-1 space-y-1">
                {category.items && category.items.map((item, idx) => {
                  const itemCode = `${currentPrefix}.${idx + 1}`;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelectItem({ ...item, code: itemCode })}
                      onDoubleClick={() => openActionModal(item, 'item')}
                      className={`flex items-center justify-between p-2 rounded-lg text-sm group border transition-all ${isOngoing || isDraft ? 'cursor-pointer' : ''
                        } ${selectedItem?.id === item.id
                          ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                          : 'hover:bg-white dark:hover:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className={`w-4 h-4 shrink-0 ${selectedItem?.id === item.id ? 'text-blue-500' : 'text-slate-400'}`} />
                        <span className="font-mono text-xs bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-bold">{itemCode}</span>
                        <span>{item.name}</span>
                      </div>
                      {isOngoing && selectedItem?.id !== item.id && (
                        <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100" />
                      )}
                    </div>
                  );
                })}

                {/* Add Item Form (Draft Only) */}
                {addingItemTo === category.id && isDraft ? (
                  <div className="flex items-center gap-2 p-1 mt-1">
                    <div className="flex-1 bg-white dark:bg-slate-900 border border-blue-500 rounded-lg flex items-center px-3 py-2 shadow-sm ring-2 ring-blue-500/20">
                      <FileText className="w-4 h-4 text-blue-400 mr-2 shrink-0" />
                      <input
                        autoFocus
                        type="text"
                        className="flex-1 bg-transparent border-none focus:outline-none text-sm text-slate-900 dark:text-white"
                        placeholder="Nama item evaluasi... (Enter)"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addItem(category.id, newItemName);
                            setAddingItemTo(null);
                            setNewItemName('');
                          } else if (e.key === 'Escape') {
                            setAddingItemTo(null);
                            setNewItemName('');
                          }
                        }}
                      />
                    </div>
                    <button onClick={() => { addItem(category.id, newItemName); setAddingItemTo(null); setNewItemName(''); }} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setAddingItemTo(null); setNewItemName(''); }} className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : isDraft && (
                  <button
                    onClick={() => setAddingItemTo(category.id)}
                    className="flex items-center gap-2 p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors text-sm w-full font-medium border border-dashed border-transparent hover:border-blue-200 mt-2"
                  >
                    <Plus className="w-4 h-4" /> Tambah Item Evaluasi
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const fetchStaffList = useCallback(async (dealerId) => {
    if (!dealerId) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/item_assignments?action=get_staff&dealer_id=${dealerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAvailableStaff(data.data);
      } else {
        console.error('API Error fetching staff:', data.error);
      }
    } catch (err) {
      console.error('Failed to fetch staff list', err);
    }
  }, []);

  const fetchMyItemIds = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/item_assignments?action=get_my_item_ids&audit_id=${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMyAssignedItemIds(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch my items', err);
    }
  };

  // Save Assignments
  const fetchItemAssignments = async (itemId) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/item_assignments?action=get_assignments&audit_id=${id}&item_id=${itemId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAssignedUsers(data.data);
        setSelectedStaffIds(data.data.map(u => u.user_id));
      }
    } catch (err) {
      console.error('Failed to fetch assignments', err);
    }
  };

  const handleSelectItem = (item) => {
    if (!audit) return;
    setSelectedItem(item);
    fetchEvidences(item.id);
    fetchItemAssignments(item.id);
  };

  const getAllItemIds = (node) => {
    let ids = [];
    if (node.items) {
      ids.push(...node.items.map(i => i.id));
    }
    if (node.children) {
      node.children.forEach(child => {
        ids.push(...getAllItemIds(child));
      });
    }
    return ids;
  };

  const handleMassAssign = (category) => {
    const allItemIds = getAllItemIds(category);
    if (allItemIds.length === 0) {
      toast.error('Tidak ada item pertanyaan di dalam folder ini');
      return;
    }
    setMassAssignData({
      name: `Semua Item di Folder ${category.name} (${allItemIds.length} Item)`,
      ids: allItemIds
    });
    setAssignedUsers([]);
    setSelectedStaffIds([]);
    setShowAssignModal(true);
  };

  const handleSaveAssignments = async () => {
    const targetItemIds = massAssignData ? massAssignData.ids : (selectedItem ? [selectedItem.id] : null);
    if (!targetItemIds || targetItemIds.length === 0) return;

    setIsSavingAssignment(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/item_assignments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audit_id: id,
          item_id: targetItemIds,
          user_ids: selectedStaffIds
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(massAssignData ? 'Penugasan massal berhasil disimpan' : data.message);
        if (!massAssignData && selectedItem) fetchItemAssignments(selectedItem.id);
        setShowAssignModal(false);
        setMassAssignData(null);
      } else {
        toast.error(data.error?.message || 'Gagal menyimpan penugasan');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const handleStaffCheckbox = (staffId) => {
    setSelectedStaffIds(prev =>
      prev.includes(staffId) ? prev.filter(id => id !== staffId) : [...prev, staffId]
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!audit) return null;

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 pb-20">

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dealer/workspace')}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              {audit.title}
              {isDraft && (
                <span className="flex items-center text-xs font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 px-2.5 py-1 rounded-full">
                  {isSaving ? <><Loader2 className="w-3 h-3 animate-spin mr-1.5" /> Autosaving...</> : <><CheckCircle2 className="w-3 h-3 mr-1.5 text-green-500" /> Tersimpan (Cloud)</>}
                </span>
              )}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              ID: AUD-{audit.id.toString().padStart(4, '0')} • Status:
              <span className={`font-semibold capitalize ml-1 ${isOngoing ? 'text-blue-600' : 'text-amber-600'}`}>
                {audit.status}
              </span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {isHierarchyConfigured && (
          <div className="flex items-center gap-3">
            {isDraft && (
              <>
                <button
                  onClick={() => setShowExcelModal(true)}
                  className="px-5 py-2.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Upload Excel
                </button>
                <button
                  onClick={requestStartAudit}
                  disabled={isStarting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm shadow-blue-500/20 flex items-center gap-2 disabled:opacity-70"
                >
                  {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                  {isStarting ? 'Memulai...' : 'Mulai Audit'}
                </button>
              </>
            )}
            {isOngoing && (
              <button
                onClick={handleOpenLinkModal}
                className="px-5 py-2.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center gap-2"
              >
                <Link className="w-4 h-4" />
                Create Link
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {!isHierarchyConfigured || showHierarchyModal ? (
        // Phase 1: Setup Konfigurasi Hierarki
        <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mt-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-xl">Konfigurasi Hierarki Level</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Atur struktur dasar sebelum menyusun item audit.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl">
              <p className="text-sm text-amber-800 dark:text-amber-400">
                <strong>Catatan:</strong> Konfigurasi ini hanya dilakukan <strong>satu kali</strong> di awal. Pastikan Anda menentukan level yang tepat (misal: Area &rarr; Kategori &rarr; Parameter).
              </p>
            </div>

            <div className="space-y-3">
              {levels.map((lvl, index) => (
                <div key={lvl.id} className="flex items-center gap-3 relative group">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold flex items-center justify-center text-sm border border-slate-200 dark:border-slate-700">
                    L{index + 1}
                  </div>
                  <input
                    type="text"
                    value={lvl.label}
                    onChange={(e) => {
                      const newLevels = [...levels];
                      newLevels[index].label = e.target.value;
                      setLevels(newLevels);
                    }}
                    placeholder={`Nama level ${index + 1}`}
                    className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  />
                  {index === levels.length - 1 && levels.length > 1 && (
                    <button
                      onClick={() => setLevels(levels.filter(l => l.id !== lvl.id))}
                      className="absolute right-3 p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {levels.length < 4 && (
              <button
                onClick={() => setLevels([...levels, { id: Date.now(), label: `Level ${levels.length + 1}` }])}
                className="flex items-center justify-center w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-slate-800/50 rounded-xl transition-all text-sm font-medium"
              >
                <Plus className="w-5 h-5 mr-2" /> Tambah Level Baru
              </button>
            )}

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={saveHierarchy}
                disabled={isSaving || levels.length === 0}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                Simpan & Lanjutkan
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Phase 2 & 3: Tree Editor & Split View
        <div className={`grid gap-6 ${isOngoing ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 w-full'}`}>

          {/* Kolom Kiri: Pohon Parameter */}
          <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex-col h-[calc(100vh-140px)] min-h-[500px] ${(isOngoing && selectedItem) ? 'hidden lg:flex' : 'flex'}`}>
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListTree className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    Pohon Parameter Audit
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  {isDraft && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 italic hidden sm:block">Double-click untuk Rename/Hapus</span>
                  )}
                  {isOngoing ? (
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                      <button
                        onClick={() => setTaskFilter('tugas_saya')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${taskFilter === 'tugas_saya' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Tugas Saya
                      </button>
                      <button
                        onClick={() => setTaskFilter('semua')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${taskFilter === 'semua' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Semua
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs px-2.5 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full font-medium">
                      {levels.length} Level
                    </span>
                  )}
                </div>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari parameter atau item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="p-6 flex-1 min-h-0 overflow-y-auto overscroll-contain">
              {categories.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-700">
                    <Folder className="w-8 h-8 text-slate-400" />
                  </div>
                  <h4 className="text-slate-900 dark:text-white font-semibold mb-2">Belum Ada Struktur</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mb-6">Mulai dengan menambahkan {levels[0]?.label || 'Kategori'} utama untuk audit ini.</p>

                  {isDraft && addingCategoryTo !== 'root' ? (
                    <button
                      onClick={() => setAddingCategoryTo('root')}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-sm shadow-blue-500/20 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Tambah {levels[0]?.label || 'Kategori'} Pertama
                    </button>
                  ) : isDraft && (
                    <div className="w-full max-w-sm flex items-center gap-2">
                      <div className="flex-1 bg-white dark:bg-slate-900 border border-blue-500 rounded-xl flex items-center px-4 py-2.5 shadow-sm ring-2 ring-blue-500/20">
                        <Folder className="w-4 h-4 text-blue-400 mr-2 shrink-0" />
                        <input
                          autoFocus
                          type="text"
                          className="flex-1 bg-transparent border-none focus:outline-none text-sm text-slate-900 dark:text-white"
                          placeholder={`Nama ${levels[0]?.label || 'Kategori'}...`}
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              addCategory('root', newCategoryName);
                              setAddingCategoryTo(null);
                              setNewCategoryName('');
                            } else if (e.key === 'Escape') {
                              setAddingCategoryTo(null);
                              setNewCategoryName('');
                            }
                          }}
                        />
                      </div>
                      <button onClick={() => { addCategory('root', newCategoryName); setAddingCategoryTo(null); setNewCategoryName(''); }} className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-sm">
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => { setAddingCategoryTo(null); setNewCategoryName(''); }} className="p-2.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {getFilteredCategories().length > 0 ? (
                    getFilteredCategories().map((category, idx) => renderCategory(category, 0, idx))
                  ) : (
                    <p className="text-sm text-slate-500 text-center mt-6 mb-4">Pencarian tidak ditemukan.</p>
                  )}

                  {isDraft && addingCategoryTo === 'root' ? (
                    <div className="flex items-center gap-2 p-2 mt-2">
                      <div className="flex-1 bg-white dark:bg-slate-900 border border-blue-500 rounded-lg flex items-center px-3 py-2 shadow-sm ring-2 ring-blue-500/20">
                        <Folder className="w-4 h-4 text-blue-400 mr-2 shrink-0" />
                        <input
                          autoFocus
                          type="text"
                          className="flex-1 bg-transparent border-none focus:outline-none text-sm text-slate-900 dark:text-white"
                          placeholder={`Nama ${levels[0]?.label || 'Kategori'}... (Enter)`}
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              addCategory('root', newCategoryName);
                              setAddingCategoryTo(null);
                              setNewCategoryName('');
                            } else if (e.key === 'Escape') {
                              setAddingCategoryTo(null);
                              setNewCategoryName('');
                            }
                          }}
                        />
                      </div>
                      <button onClick={() => { addCategory('root', newCategoryName); setAddingCategoryTo(null); setNewCategoryName(''); }} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setAddingCategoryTo(null); setNewCategoryName(''); }} className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : isDraft && (
                    <button
                      onClick={() => setAddingCategoryTo('root')}
                      className="flex items-center gap-2 p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium w-full mt-2"
                    >
                      <Plus className="w-4 h-4" /> Tambah {levels[0]?.label || 'Kategori'} Utama
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Kolom Kanan: Evidence Upload (Hanya tampil jika Ongoing) */}
          {isOngoing && (
            <div className={`bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden flex-col animate-in fade-in slide-in-from-right-8 duration-500 ${!selectedItem ? 'hidden lg:flex' : 'flex'
              } fixed inset-0 z-50 rounded-none lg:relative lg:inset-auto lg:z-auto lg:rounded-2xl lg:border lg:shadow-sm lg:h-[calc(100vh-140px)] lg:min-h-[500px]`}>
              {selectedItem ? (
                <>
                  {/* Sticky Mobile Back Button */}
                  <div className="lg:hidden sticky top-0 z-10 p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                    <button onClick={() => setSelectedItem(null)} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-medium bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-sm w-fit transition-colors">
                      <ArrowLeft className="w-4 h-4" /> Kembali
                    </button>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain lg:pb-6 pb-24 flex flex-col">
                    {/* Item Details Header */}
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 shrink-0">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                          <FileText className="w-5 h-5 shrink-0" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {selectedItem.code && <span className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1 block">{selectedItem.code}</span>}
                          <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-snug">{selectedItem.name}</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Silakan unggah foto atau dokumen bukti temuan di lapangan untuk item ini.</p>

                          {/* Assigned Users Tags */}
                          <div className="flex flex-wrap gap-2 mt-3">
                            {assignedUsers.length === 0 && (
                              <span className="text-xs text-slate-400 italic">Belum ada staff ditugaskan</span>
                            )}
                            {assignedUsers.map((user, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-sm">
                                <Users className="w-3.5 h-3.5 text-blue-500" /> {user.name}
                              </span>
                            ))}
                          </div>
                        </div>
                        {isAdminUser && (
                          <button
                            onClick={() => setShowAssignModal(true)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors shrink-0"
                            title="Atur Staff untuk Item Ini"
                          >
                            <Users className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-6 space-y-6 flex-1">
                      {/* Area Drop Upload */}
                      <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={handleFileUpload}
                          disabled={isUploading}
                        />
                        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          {isUploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <UploadCloud className="w-8 h-8" />}
                        </div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
                          {isUploading ? 'Mengunggah...' : 'Pilih File atau Tarik ke Sini'}
                        </h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                          Format: JPG, PNG (Maks 10MB), PDF (Tanpa Batas). <br />
                          <span className="text-xs text-amber-600 dark:text-amber-500">*Foto akan dikompres otomatis ~1MB</span>
                        </p>
                        <button
                          disabled={isUploading}
                          className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium rounded-xl text-sm shadow-sm disabled:opacity-50"
                        >
                          Browse Files
                        </button>
                      </div>

                      {/* Daftar Evidence */}
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-slate-400" /> Evidence Terunggah ({evidences.length})
                        </h4>

                        {evidences.length === 0 ? (
                          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 text-center text-sm text-slate-500">
                            Belum ada bukti yang diunggah untuk item ini.
                          </div>
                        ) : (
                          <div className="space-y-3 mb-10">
                            {evidences.map((ev, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                                    {ev.file_type.includes('pdf') ? <FileText className="w-5 h-5 shrink-0" /> : <ImageIcon className="w-5 h-5 shrink-0" />}
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm text-slate-900 dark:text-white truncate max-w-[200px]">{ev.original_name}</p>
                                    <p className="text-xs text-slate-500">{(ev.file_size / 1024).toFixed(1)} KB • {new Date(ev.uploaded_at).toLocaleDateString()}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => setPreviewModal({ isOpen: true, currentIndex: idx })}
                                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full shadow-sm flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-700">
                    <Search className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                  </div>
                  <h4 className="text-slate-900 dark:text-white font-semibold text-lg mb-2">Pilih Item Evaluasi</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs">
                    Klik salah satu item di pohon parameter sebelah kiri untuk melihat detail dan mengunggah evidence.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action Modal (Rename / Delete) */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white">Aksi Node</h3>
              <button
                onClick={() => setActionModal({ isOpen: false, node: null, type: null, newName: '' })}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ubah Nama</label>
                <input
                  type="text"
                  value={actionModal.newName}
                  onChange={(e) => setActionModal({ ...actionModal, newName: e.target.value })}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleActionRename}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" /> Rename
                </button>
                <button
                  onClick={requestDeleteAction}
                  className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-xl text-sm flex items-center justify-center gap-2 border border-red-200"
                >
                  <Trash2 className="w-4 h-4" /> Hapus
                </button>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-500 text-center">
              *Tindakan untuk menambah relasi user/tag akan menyusul di masa depan.
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-2">{confirmModal.title}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl text-sm transition-colors"
              >
                {confirmModal.cancelText}
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm shadow-sm shadow-blue-500/20 transition-all"
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Upload Modal */}
      {showExcelModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
                <FileSpreadsheet className="w-5 h-5" /> Import Struktur via Excel
              </div>
              <button
                onClick={() => setShowExcelModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-xl flex items-start gap-3">
                <Download className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">Download Template</h4>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mb-3">
                    Template ini disesuaikan secara otomatis dengan struktur hierarki ({levels.length} Level) yang telah Anda konfigurasi sebelumnya.
                  </p>
                  <button
                    onClick={downloadExcelTemplate}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs shadow-sm flex items-center gap-2 transition-colors"
                  >
                    Download Template (.xlsx)
                  </button>
                </div>
              </div>

              <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group bg-slate-50/50 dark:bg-slate-900/50">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleExcelUpload}
                />
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">Pilih File Excel Anda</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Mendukung format .xlsx atau .csv</p>
                <button className="px-5 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold rounded-xl text-sm shadow-sm hover:opacity-90 pointer-events-none">
                  Browse File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 shrink-0">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold">
                <Link className="w-5 h-5" /> Akses Eksekutor Lapangan
              </div>
              <button
                onClick={() => setShowLinkModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto overscroll-contain flex-1 space-y-8">
              {/* Form Create New Link */}
              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900 dark:text-white">Buat Link Baru</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Pilih Reviewer (PIC)</label>
                    <select
                      value={linkForm.reviewer_id}
                      onChange={(e) => setLinkForm({ ...linkForm, reviewer_id: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                    >
                      <option value="">-- Pilih Reviewer --</option>
                      {reviewers.map(r => (
                        <option key={r.id} value={r.id}>{r.name} ({r.email})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Durasi Validitas</label>
                    <select
                      value={linkForm.duration_days}
                      onChange={(e) => setLinkForm({ ...linkForm, duration_days: parseInt(e.target.value) })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                    >
                      <option value={1}>1 Hari</option>
                      <option value={3}>3 Hari</option>
                      <option value={7}>7 Hari</option>
                      <option value={14}>14 Hari</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleGenerateLink}
                  disabled={isGeneratingLink || !linkForm.reviewer_id}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm shadow-sm transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isGeneratingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Generate Link
                </button>
              </div>

              {/* List Existing Links */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  Daftar Link Aktif <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full text-xs">{auditLinks.length}</span>
                </h4>

                {auditLinks.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-500">Belum ada link yang dibuat.</div>
                ) : (
                  <div className="space-y-3">
                    {auditLinks.map(link => {
                      const baseUrl = import.meta.env.BASE_URL === '/' ? '/' : import.meta.env.BASE_URL;
                      const linkUrl = `${window.location.origin}${baseUrl}audit-executor/${link.uuid}`;
                      const isExpired = link.status === 'expired';

                      return (
                        <div key={link.id} className={`p-4 rounded-xl border ${isExpired ? 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800 opacity-60' : 'bg-white border-indigo-100 dark:bg-slate-900 dark:border-indigo-900/30 shadow-sm'}`}>
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mb-1 ${isExpired ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                                {isExpired ? 'Kedaluwarsa' : 'Aktif'}
                              </span>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Kedaluwarsa: {new Date(link.expired_at).toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">PIN Akses</p>
                              <p className="font-mono text-lg font-bold tracking-widest text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{link.pin}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              readOnly
                              value={linkUrl}
                              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400"
                            />
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`Link Audit: ${linkUrl}\nPIN: ${link.pin}`);
                                toast.success('Link dan PIN berhasil disalin!');
                              }}
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-lg transition-colors flex shrink-0 items-center justify-center"
                              title="Copy URL & PIN"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Preview Evidence Modal */}
      {previewModal.isOpen && evidences.length > 0 && (
        <div className="fixed inset-0 z-[60] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center sm:p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-none sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full sm:h-auto max-h-[100dvh] sm:max-h-[90vh]">
            <div className="flex flex-col sm:flex-row justify-between sm:items-start p-4 border-b border-slate-200 dark:border-slate-800 gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate">
                  {evidences[previewModal.currentIndex].original_name}
                </h3>
                {editingCaptionId === evidences[previewModal.currentIndex].id ? (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                      value={tempCaption}
                      onChange={(e) => setTempCaption(e.target.value)}
                      placeholder="Masukkan caption gambar..."
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveCaption(evidences[previewModal.currentIndex].id);
                        if (e.key === 'Escape') setEditingCaptionId(null);
                      }}
                    />
                    <button onClick={() => handleSaveCaption(evidences[previewModal.currentIndex].id)} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors">
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => setEditingCaptionId(null)} className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1 group">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {evidences[previewModal.currentIndex].caption || 'Tidak ada caption'}
                    </p>
                    <button
                      onClick={() => {
                        setEditingCaptionId(evidences[previewModal.currentIndex].id);
                        setTempCaption(evidences[previewModal.currentIndex].caption || '');
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-opacity"
                      title="Edit Caption"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <button
                  onClick={() => handleDeleteEvidence(evidences[previewModal.currentIndex].id)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Hapus Bukti"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <a
                  href={evidences[previewModal.currentIndex].file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="Buka di Tab Baru"
                >
                  <Link className="w-5 h-5" />
                </a>
                <button onClick={() => setPreviewModal({ isOpen: false, currentIndex: 0 })} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-950 flex items-center justify-center relative min-h-[300px]">
              {evidences.length > 1 && (
                <button
                  onClick={() => setPreviewModal(prev => ({ ...prev, currentIndex: prev.currentIndex === 0 ? evidences.length - 1 : prev.currentIndex - 1 }))}
                  className="absolute left-4 z-10 p-2 bg-white/70 hover:bg-white dark:bg-slate-800/70 dark:hover:bg-slate-800 rounded-full shadow-lg backdrop-blur transition-all"
                >
                  <ChevronRight className="w-6 h-6 rotate-180" />
                </button>
              )}

              {evidences[previewModal.currentIndex].file_type.includes('pdf') ? (
                <iframe
                  src={evidences[previewModal.currentIndex].file_url}
                  className="w-full h-full min-h-[60vh]"
                  title="PDF Preview"
                />
              ) : (
                <img
                  src={evidences[previewModal.currentIndex].file_url}
                  alt="Preview"
                  className="max-w-full max-h-[75vh] object-contain p-4"
                />
              )}

              {evidences.length > 1 && (
                <button
                  onClick={() => setPreviewModal(prev => ({ ...prev, currentIndex: prev.currentIndex === evidences.length - 1 ? 0 : prev.currentIndex + 1 }))}
                  className="absolute right-4 z-10 p-2 bg-white/70 hover:bg-white dark:bg-slate-800/70 dark:hover:bg-slate-800 rounded-full shadow-lg backdrop-blur transition-all"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>

            {evidences.length > 1 && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-center text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900">
                Menampilkan bukti {previewModal.currentIndex + 1} dari {evidences.length}
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
      {/* Modal Penugasan Staff */}
      {showAssignModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" /> Atur Staff Penugasan
              </h3>
              <button onClick={() => { setShowAssignModal(false); setMassAssignData(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Pilih staff yang akan ditugaskan untuk melakukan pemeriksaan pada <strong>{massAssignData ? massAssignData.name : selectedItem?.name}</strong>.
              </p>

              <div className="space-y-3 mb-6 max-h-[250px] overflow-y-auto pr-2">
                {availableStaff.length === 0 ? (
                  <div className="text-center p-4 text-sm text-slate-500">
                    Tidak ada staff tersedia di dealer ini.
                  </div>
                ) : (
                  availableStaff.map(staff => (
                    <label key={staff.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500"
                        checked={selectedStaffIds.includes(staff.id)}
                        onChange={() => handleStaffCheckbox(staff.id)}
                      />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white text-sm">{staff.name}</p>
                        <p className="text-xs text-slate-500 capitalize">{staff.division || 'Tanpa Divisi'}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => { setShowAssignModal(false); setMassAssignData(null); }}
                  disabled={isSavingAssignment}
                  className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveAssignments}
                  disabled={isSavingAssignment}
                  className="px-4 py-2 font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors flex items-center disabled:opacity-50"
                >
                  {isSavingAssignment ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Simpan Pengaturan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
