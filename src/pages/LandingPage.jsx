import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, FileSearch, Building2, ChevronDown, CheckCircle2, KeyRound, X, Loader2 } from 'lucide-react';
import logoImg from '../assets/logo.png';
import toast from 'react-hot-toast';

const API_BASE = 'https://audit.csdwindo.com/api';

export default function LandingPage() {
  const [activeRole, setActiveRole] = useState(null); // 'dealer' or 'auditor'
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);
  const navigate = useNavigate();

  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (activeRole === 'auditor') {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [activeRole]);

  const handleFocus = (index) => {
    // Membaca dari DOM langsung karena state 'pin' mungkin belum ter-update (stale) saat onFocus terpicu otomatis
    const currentValues = inputRefs.current.map(ref => ref?.value || '');
    const firstEmptyIndex = currentValues.findIndex(p => p === '');
    if (firstEmptyIndex !== -1 && index > firstEmptyIndex) {
      inputRefs.current[firstEmptyIndex]?.focus();
    }
  };

  const handlePinChange = (index, value) => {
    // Hanya boleh angka
    if (value && !/^\d+$/.test(value)) return;

    // Ambil karakter terakhir jika diketik/paste banyak
    const digit = value.slice(-1);

    const newPin = [...pin];
    newPin[index] = digit;
    setPin(newPin);

    // Auto-focus ke input berikutnya
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit jika semua terisi
    if (digit && index === 5 && newPin.slice(0, 5).every(p => p !== '')) {
      setTimeout(async () => {
        setIsLoading(true);
        const pinCode = newPin.join('');
        try {
          const res = await fetch(`${API_BASE}/verify_pin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: pinCode }),
          });
          const data = await res.json();
          if (data.success) {
            localStorage.setItem('auth_token', data.data.token);
            localStorage.setItem('auth_user', JSON.stringify(data.data.user));
            navigate(`/audit-executor/${data.data.uuid}`);
          } else {
            toast.error(data.error?.message || 'PIN tidak valid');
          }
        } catch (err) {
          toast.error('Terjadi kesalahan jaringan');
        } finally {
          setIsLoading(false);
        }
      }, 300);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-blue-500/30">
      {/* Navbar */}
      <header className="absolute top-0 w-full p-6 flex justify-between items-center z-50">
        <div className="flex items-center gap-2">
          <img src={logoImg} alt="AuditDigital" className="w-8 h-8 object-contain drop-shadow-sm" />
          <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">AuditDigital</span>
        </div>
        <div className="text-sm font-medium px-3 py-1 rounded-full bg-white/50 dark:bg-slate-900/50 backdrop-blur border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 shadow-sm">
          v2.0 Enterprise
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-4 pt-20 overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[30rem] h-[30rem] bg-blue-500/10 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-lighten animate-pulse"></div>
          <div className="absolute top-1/3 right-1/4 w-[30rem] h-[30rem] bg-indigo-500/10 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-lighten animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute -bottom-32 left-1/3 w-[30rem] h-[30rem] bg-slate-500/10 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-lighten animate-pulse" style={{ animationDelay: '4s' }}></div>

          {/* Subtle Grid Pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMCwwLDAsMC4wNSkiLz48L3N2Zz4=')] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)]"></div>
        </div>

        <div className="z-10 max-w-5xl mx-auto flex flex-col items-center text-center space-y-8 mt-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Sistem Audit Generasi Baru
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1]">
            <span className="block">Standarisasi</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Audit Profesional
            </span>
          </h1>

          <p className="text-lg md:text-2xl text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed font-light">
            Platform korporasi modern untuk manajemen, eksekusi, dan evaluasi proses audit dealer secara terpusat, transparan, dan terdigitalisasi penuh.
          </p>

          {/* Dynamic Content Area: Cards or PIN Form */}
          <div className="w-full max-w-4xl mt-16 relative min-h-[300px] flex justify-center">
            {!activeRole ? (
              <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 text-left animate-in fade-in zoom-in duration-500">
                {/* Dealer/Admin Card */}
                <div className="group relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none hover:shadow-2xl hover:shadow-blue-500/10 dark:hover:border-blue-500/30 transition-all duration-500 overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500 pointer-events-none">
                    <Building2 className="w-40 h-40" />
                  </div>
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30 text-white transform group-hover:-translate-y-1 transition-transform duration-300">
                      <Building2 className="w-7 h-7" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Portal Dealer</h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed flex-grow">
                      Pusat kendali admin dan staf untuk mengelola instrumen audit, menyusun evidence terstruktur, dan memantau progres kepatuhan.
                    </p>
                    <button
                      onClick={() => {
                        const token = localStorage.getItem('auth_token');
                        try {
                          const userRaw = localStorage.getItem('auth_user');
                          const user = userRaw ? JSON.parse(userRaw) : null;
                          if (token && user && ['super_admin', 'admin', 'staff'].includes(user.role)) {
                            navigate('/dealer');
                            return;
                          }
                        } catch (e) { }
                        setActiveRole('dealer');
                      }}
                      className="inline-flex items-center justify-between w-full px-6 py-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors group/btn shadow-md"
                    >
                      Masuk Sistem
                      <ArrowRight className="w-5 h-5 transform group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>

                {/* Auditor Card */}
                <div className="group relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none hover:shadow-2xl hover:shadow-indigo-500/10 dark:hover:border-indigo-500/30 transition-all duration-500 overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500 pointer-events-none">
                    <ShieldCheck className="w-40 h-40" />
                  </div>
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-6 text-slate-700 dark:text-slate-300 transform group-hover:-translate-y-1 transition-transform duration-300">
                      <ShieldCheck className="w-7 h-7" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Akses Auditor</h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed flex-grow">
                      Lingkungan review khusus untuk auditor mengevaluasi evidence, memberikan justifikasi, dan finalisasi skor dengan PIN atau secure link.
                    </p>
                    <button
                      onClick={() => setActiveRole('auditor')}
                      className="inline-flex items-center justify-between w-full px-6 py-4 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group/btn shadow-sm"
                    >
                      Masuk Akses
                      <KeyRound className="w-5 h-5 transform group-hover/btn:rotate-12 transition-transform text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* PIN Form */
              <div className={`w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-8 rounded-[2rem] shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-500 relative ${activeRole === 'dealer' ? 'shadow-blue-500/10' : 'shadow-indigo-500/10'}`}>
                <div className="flex justify-between items-center mb-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${activeRole === 'dealer' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'}`}>
                    {activeRole === 'dealer' ? <Building2 className="w-6 h-6" /> : <KeyRound className="w-6 h-6" />}
                  </div>
                  <button
                    onClick={() => {
                      setActiveRole(null);
                      setPin(['', '', '', '', '', '']);
                    }}
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                    aria-label="Tutup form"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  {activeRole === 'dealer' ? 'Login Dealer' : 'Masukkan PIN'}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-8 text-sm">
                  {activeRole === 'dealer'
                    ? 'Masukkan email dan kata sandi Anda untuk mengakses dashboard manajemen audit.'
                    : 'Masukkan 6 digit PIN akses auditor Anda untuk mulai meninjau evidence.'}
                </p>

                {activeRole === 'dealer' ? (
                  /* Form Email & Password untuk Dealer */
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setLoginError('');
                    setIsLoading(true);
                    try {
                      const res = await fetch(`${API_BASE}/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password }),
                      });
                      const data = await res.json();
                      if (!data.success) {
                        setLoginError(data.error?.message || 'Login gagal');
                        setIsLoading(false);
                        return;
                      }
                      // Simpan session ke localStorage
                      localStorage.setItem('auth_token', data.data.token);
                      localStorage.setItem('auth_user', JSON.stringify(data.data.user));
                      navigate('/dealer');
                    } catch (err) {
                      setLoginError('Tidak dapat terhubung ke server');
                      setIsLoading(false);
                    }
                  }} className="space-y-4 text-left">

                    {loginError && (
                      <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm font-medium text-center">
                        {loginError}
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                        <input
                          type="email"
                          required
                          autoFocus
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="admin@dealer.com"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-4 mt-6 rounded-xl text-white font-semibold transition-colors shadow-md flex items-center justify-center group bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Memproses...</>
                      ) : (
                        <>Masuk Sistem <ArrowRight className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" /></>
                      )}
                    </button>
                  </form>
                ) : (
                  /* Form PIN untuk Auditor */
                  <>
                    <div className="flex gap-2 justify-between mb-8">
                      {pin.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => (inputRefs.current[idx] = el)}
                          type="password"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handlePinChange(idx, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(idx, e)}
                          onFocus={() => handleFocus(idx)}
                          onClick={() => handleFocus(idx)}
                          className="w-12 h-14 md:w-14 md:h-16 text-center text-2xl font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all shadow-sm"
                        />
                      ))}
                    </div>

                    <div className="space-y-4">
                      <button
                        className="w-full py-4 rounded-xl text-white font-semibold transition-colors shadow-md flex items-center justify-center group bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={isLoading}
                        onClick={async () => {
                          if (pin.every(p => p !== '')) {
                            setIsLoading(true);
                            const pinCode = pin.join('');
                            try {
                              const res = await fetch(`${API_BASE}/verify_pin`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ pin: pinCode }),
                              });
                              const data = await res.json();
                              if (data.success) {
                                localStorage.setItem('auth_token', data.data.token);
                                localStorage.setItem('auth_user', JSON.stringify(data.data.user));
                                navigate(`/audit-executor/${data.data.uuid}`);
                              } else {
                                toast.error(data.error?.message || 'PIN tidak valid');
                              }
                            } catch (err) {
                              toast.error('Terjadi kesalahan jaringan');
                            } finally {
                              setIsLoading(false);
                            }
                          } else {
                            toast.error("Harap masukkan 6 digit PIN secara lengkap.");
                          }
                        }}
                      >
                        {isLoading ? (
                          <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Memverifikasi...</>
                        ) : (
                          <>Verifikasi Akses <ArrowRight className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" /></>
                        )}
                      </button>
                    </div>
                  </>
                )}

                <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6">
                  {activeRole === 'dealer' ? 'Lupa password Anda? ' : 'Belum memiliki akses? '}
                  <button className={`${activeRole === 'dealer' ? 'text-blue-600 dark:text-blue-400' : 'text-indigo-600 dark:text-indigo-400'} hover:underline font-medium`}>
                    {activeRole === 'dealer' ? 'Hubungi IT Support' : 'Hubungi Admin Dealer'}
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce flex flex-col items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
          <span className="text-xs font-medium tracking-widest uppercase mb-2">Eksplorasi</span>
          <ChevronDown className="w-5 h-5" />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 px-4 bg-white dark:bg-slate-950 relative border-t border-slate-100 dark:border-slate-900/50 z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">Arsitektur Audit Generasi Baru</h2>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto font-light">
              Meninggalkan proses manual. Kami menghadirkan ekosistem evaluasi berkinerja tinggi dengan integritas data absolut.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: FileSearch,
                title: "Hierarki Dinamis",
                desc: "Manajemen struktur audit yang fleksibel. Kustomisasi kategori, parameter, dan kriteria penilaian tanpa batasan kaku."
              },
              {
                icon: CheckCircle2,
                title: "Validasi Evidence",
                desc: "Lampirkan bukti dukung resolusi tinggi dengan metadata tersimpan. Mendukung multi-format dari foto hingga dokumen PDF."
              },
              {
                icon: ShieldCheck,
                title: "Otorisasi Link-Based",
                desc: "Protokol akses tamu menggunakan secure link. Memudahkan auditor eksternal melakukan tinjauan tanpa friksi registrasi."
              }
            ].map((feature, i) => (
              <div key={i} className="group p-8 rounded-[2rem] bg-slate-50 hover:bg-white dark:bg-slate-900/50 dark:hover:bg-slate-900 border border-slate-100 dark:border-slate-800 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/30 dark:hover:shadow-none hover:-translate-y-2">
                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white tracking-tight">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900 text-center relative z-10">
        <div className="flex items-center justify-center gap-2 mb-4 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer">
          <img src={logoImg} alt="AuditDigital" className="w-6 h-6 object-contain" />
          <span className="font-bold text-slate-900 dark:text-white tracking-tight">AuditDigital</span>
        </div>
        <p className="text-slate-500 dark:text-slate-500 text-sm font-medium">
          &copy; 2026 <a href="https://csdwindo.com" target="_blank" rel="noopener noreferrer">CS Dwindo</a>. Membangun Kepatuhan Masa Depan.
        </p>
      </footer>
    </div>
  );
}
