import React, { useState, useEffect } from 'react';
import { ObservationSession } from '../../types';
import { Clock, Plus, Layers, Menu, X, Calendar, MapPin, Cloud } from 'lucide-react';
import { getCurrentTimeString } from '../../utils/timeUtils';

interface NavbarProps {
  sessions: ObservationSession[];
  activeSession: ObservationSession | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onOpenSupabaseModal: () => void;
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  sessions,
  activeSession,
  onSelectSession,
  onNewSession,
  onOpenSupabaseModal,
  isMobileMenuOpen,
  onToggleMobileMenu
}) => {
  const [currentTime, setCurrentTime] = useState(getCurrentTimeString(true));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTimeString(true));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Mobile Toggle */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition"
            aria-label="Toggle navigation"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-500 flex items-center justify-center shadow-inner">
              <span className="font-extrabold text-white text-base tracking-tighter">AG</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight">
                  Sistem Observasi Ayam Geprek
                </h1>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-900/80 text-blue-300 border border-blue-700/50">
                  Pemodelan Sistem
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Pengumpulan Data Lapangan & Simulasi Antrean
              </p>
            </div>
          </div>
        </div>

        {/* Right Section: Session Switcher & Realtime Clock */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Realtime observation clock */}
          <div className="flex items-center space-x-2 bg-slate-800/90 border border-slate-700/80 px-3 py-1.5 rounded-lg text-slate-200">
            <Clock className="w-4 h-4 text-blue-400 animate-pulse" />
            <span className="font-mono text-xs sm:text-sm font-semibold tracking-wider text-slate-100">
              {currentTime}
            </span>
          </div>

          {/* Sesi Observasi Dropdown */}
          <div className="flex items-center space-x-1.5">
            <div className="relative">
              <select
                value={activeSession?.id || ''}
                onChange={(e) => onSelectSession(e.target.value)}
                className="bg-slate-800 text-slate-100 text-xs sm:text-sm rounded-lg border border-slate-700 px-3 py-1.5 pr-8 focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none cursor-pointer max-w-[150px] sm:max-w-[220px] truncate"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.sessionName} ({s.tanggal})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Layers className="w-3.5 h-3.5" />
              </div>
            </div>

            <button
              onClick={onNewSession}
              title="Buat Sesi Observasi Baru"
              className="p-1.5 sm:px-2.5 sm:py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Sesi Baru</span>
            </button>

            <button
              onClick={onOpenSupabaseModal}
              title="Pengaturan Koneksi Cloud Supabase"
              className="p-1.5 sm:px-2.5 sm:py-1.5 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition shadow-sm shrink-0 border border-emerald-600/50"
            >
              <Cloud className="w-4 h-4 text-emerald-300" />
              <span className="hidden sm:inline">Cloud Sync</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

