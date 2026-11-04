import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  UtensilsCrossed,
  HelpCircle,
  BarChart3,
  FileSpreadsheet,
  Building2,
  CheckCircle2,
  Clock,
  Calendar
} from 'lucide-react';
import { ObservationSession } from '../../types';

export type NavTab =
  | 'dashboard'
  | 'identity'
  | 'orders'
  | 'queue'
  | 'resources'
  | 'interview'
  | 'analysis'
  | 'excel';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeSession: ObservationSession | null;
  ordersCount: number;
  snapshotsCount: number;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  activeSession,
  ordersCount,
  snapshotsCount,
  isOpen,
  onCloseMobile
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'identity' as NavTab,
      label: 'Identitas Observasi',
      icon: Building2,
      badge: null
    },
    {
      id: 'orders' as NavTab,
      label: 'Log Pesanan',
      icon: ClipboardList,
      badge: ordersCount > 0 ? ordersCount : null
    },
    {
      id: 'queue' as NavTab,
      label: 'Antrean',
      icon: Users,
      badge: snapshotsCount > 0 ? snapshotsCount : null
    },
    {
      id: 'resources' as NavTab,
      label: 'Sumber Daya',
      icon: UtensilsCrossed,
      badge: null
    },
    {
      id: 'interview' as NavTab,
      label: 'Wawancara',
      icon: HelpCircle,
      badge: null
    },
    {
      id: 'analysis' as NavTab,
      label: 'Ringkasan Analisis',
      icon: BarChart3,
      badge: null
    },
    {
      id: 'excel' as NavTab,
      label: 'Ekspor/Impor Excel',
      icon: FileSpreadsheet,
      badge: null
    }
  ];

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Navigation links */}
        <div className="p-4 space-y-1 overflow-y-auto">
          <p className="px-3 py-1.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
            Menu Navigasi
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition group ${
                    isActive
                      ? 'bg-blue-800 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon
                      className={`w-4 h-4 transition ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-700'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== null && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-mono font-medium ${
                        isActive
                          ? 'bg-blue-700 text-blue-100'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-800'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom card: Active session metadata */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-md">
                Sesi Aktif
              </span>
              <span className="flex items-center text-[11px] text-slate-500 font-mono">
                <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                {activeSession?.tanggal || '-'}
              </span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 truncate" title={activeSession?.namaUsaha}>
                {activeSession?.namaUsaha || 'Nama Usaha'}
              </p>
              <p className="text-[11px] text-slate-500 truncate" title={activeSession?.sessionName}>
                {activeSession?.sessionName || 'Nama Sesi'}
              </p>
            </div>
            <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 flex items-center justify-between">
              <span>Pengamat: {activeSession?.pengamat1?.split(' ')[0] || '-'}</span>
              <span className="text-emerald-700 font-medium flex items-center">
                <CheckCircle2 className="w-3 h-3 mr-0.5" /> Siap Catat
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

