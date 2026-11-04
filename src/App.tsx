import React, { useState, useEffect, useCallback } from 'react';
import {
  ObservationSession,
  OrderLog,
  QueueSnapshot,
  ResourceLog,
  InterviewItem,
  NotificationState
} from './types';
import { db, initializeDatabase, clearAllDatabaseData } from './services/db';
import {
  isSupabaseActive,
  syncSupabaseToLocal,
  subscribeToRealtimeChanges
} from './services/supabaseClient';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { NotificationToast } from './components/layout/NotificationToast';
import { DashboardPage } from './pages/DashboardPage';
import { IdentityPage } from './pages/IdentityPage';
import { OrdersPage } from './pages/OrdersPage';
import { QueuePage } from './pages/QueuePage';
import { ResourcesPage } from './pages/ResourcesPage';
import { InterviewPage } from './pages/InterviewPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { ExcelPage } from './pages/ExcelPage';
import { SupabaseModal } from './components/common/SupabaseModal';
import { PlusCircle, Users, ShoppingBag } from 'lucide-react';

export const App: React.FC = () => {
  const [sessions, setSessions] = useState<ObservationSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // Active Session Data
  const [orders, setOrders] = useState<OrderLog[]>([]);
  const [snapshots, setSnapshots] = useState<QueueSnapshot[]>([]);
  const [resources, setResources] = useState<ResourceLog[]>([]);
  const [interviews, setInterviews] = useState<InterviewItem[]>([]);

  // Notification State
  const [notification, setNotification] = useState<NotificationState>({
    show: false,
    type: 'info',
    message: ''
  });

  const showNotification = useCallback(
    (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
      setNotification({ show: true, type, message });
      setTimeout(() => {
        setNotification((prev) => (prev.message === message ? { ...prev, show: false } : prev));
      }, 4000);
    },
    []
  );

  // Load Sessions
  const loadSessions = useCallback(async () => {
    const allSessions = await db.sessions.toArray();
    setSessions(allSessions);
  }, []);

  // Load Session Data
  const loadSessionData = useCallback(async (sessionId: string) => {
    if (!sessionId) return;
    const sessionOrders = await db.orders.where('sessionId').equals(sessionId).toArray();
    const sessionSnapshots = await db.snapshots.where('sessionId').equals(sessionId).toArray();
    const sessionResources = await db.resources.where('sessionId').equals(sessionId).toArray();
    const sessionInterviews = await db.interviews.where('sessionId').equals(sessionId).toArray();

    setOrders(sessionOrders);
    setSnapshots(sessionSnapshots);
    setResources(sessionResources);
    setInterviews(sessionInterviews);
  }, []);

  // Init DB on mount
  useEffect(() => {
    let unsubscribeRealtime: (() => void) | null = null;

    const init = async () => {
      // Jika Supabase aktif (kredensial tertanam di kode / env), tarik data cloud terbaru
      if (isSupabaseActive()) {
        try {
          await syncSupabaseToLocal();
        } catch (e) {
          console.warn('Auto sync cloud on mount:', e);
        }
      }

      const activeId = await initializeDatabase();
      await loadSessions();
      setActiveSessionId(activeId);
      await loadSessionData(activeId);

      // Pasang Realtime Listener untuk sinkron otomatis multi-device
      if (isSupabaseActive()) {
        unsubscribeRealtime = subscribeToRealtimeChanges(() => {
          loadSessions();
          const current = localStorage.getItem('active_session_id') || activeId;
          loadSessionData(current);
        });
      }
    };
    init();

    return () => {
      if (unsubscribeRealtime) unsubscribeRealtime();
    };
  }, [loadSessions, loadSessionData]);

  // When active session changes
  const handleSelectSession = async (id: string) => {
    setActiveSessionId(id);
    localStorage.setItem('active_session_id', id);
    await loadSessionData(id);
    showNotification('info', 'Sesi observasi aktif dialihkan.');
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        sessions={sessions}
        activeSession={activeSession}
        onSelectSession={handleSelectSession}
        onNewSession={() => setActiveTab('identity')}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
      />

      {/* Main Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar Nav */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          activeSession={activeSession}
          ordersCount={orders.length}
          snapshotsCount={snapshots.length}
          isOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Content Area */}
        <main className="flex-1 lg:pl-64 min-w-0 p-4 sm:p-6 lg:p-8">
          {activeTab === 'dashboard' && (
            <DashboardPage
              session={activeSession}
              orders={orders}
              snapshots={snapshots}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'identity' && (
            <IdentityPage
              session={activeSession}
              sessions={sessions}
              onSessionUpdated={(updated) => {
                setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
              }}
              onSessionCreated={(created) => {
                setSessions((prev) => [...prev, created]);
                handleSelectSession(created.id);
              }}
              onSessionDeleted={async (deletedId) => {
                await loadSessions();
                const remaining = sessions.filter((s) => s.id !== deletedId);
                if (remaining.length > 0) {
                  handleSelectSession(remaining[0].id);
                }
              }}
              onSelectSession={handleSelectSession}
              onResetAllData={async () => {
                if (window.confirm('PERINGATAN: Apakah Anda yakin ingin mengosongkan SELURUH data observasi (identitas, pesanan, antrean, wawancara, sumber daya)? Data akan dibersihkan total menjadi kosong.')) {
                  const newActiveId = await clearAllDatabaseData();
                  await loadSessions();
                  setActiveSessionId(newActiveId);
                  await loadSessionData(newActiveId);
                  showNotification('success', 'Seluruh data berhasil dikosongkan total.');
                }
              }}
              showNotification={showNotification}
            />
          )}

          {activeTab === 'orders' && (
            <OrdersPage
              session={activeSession}
              orders={orders}
              onRefreshOrders={() => loadSessionData(activeSessionId)}
              showNotification={showNotification}
            />
          )}

          {activeTab === 'queue' && (
            <QueuePage
              session={activeSession}
              snapshots={snapshots}
              onRefreshSnapshots={() => loadSessionData(activeSessionId)}
              showNotification={showNotification}
            />
          )}

          {activeTab === 'resources' && (
            <ResourcesPage
              session={activeSession}
              resources={resources}
              onRefreshResources={() => loadSessionData(activeSessionId)}
              showNotification={showNotification}
            />
          )}

          {activeTab === 'interview' && (
            <InterviewPage
              session={activeSession}
              interviews={interviews}
              onRefreshInterviews={() => loadSessionData(activeSessionId)}
              showNotification={showNotification}
            />
          )}

          {activeTab === 'analysis' && (
            <AnalysisPage
              session={activeSession}
              orders={orders}
              snapshots={snapshots}
              resources={resources}
            />
          )}

          {activeTab === 'excel' && (
            <ExcelPage
              session={activeSession}
              sessions={sessions}
              onDataImported={() => loadSessionData(activeSessionId)}
              showNotification={showNotification}
            />
          )}
        </main>
      </div>

      {/* Floating Action Buttons for quick field recording on Mobile */}
      <div className="fixed bottom-4 left-4 lg:hidden z-30 flex items-center space-x-2">
        <button
          onClick={() => setActiveTab('orders')}
          className="px-3.5 py-2.5 bg-blue-700 text-white rounded-full shadow-xl flex items-center space-x-1.5 text-xs font-bold border border-blue-600"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Pesanan</span>
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className="px-3.5 py-2.5 bg-rose-600 text-white rounded-full shadow-xl flex items-center space-x-1.5 text-xs font-bold border border-rose-500"
        >
          <Users className="w-4 h-4" />
          <span>Antrean</span>
        </button>
      </div>

      {/* Supabase Cloud Sync Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onDataSynced={() => loadSessionData(activeSessionId)}
        showNotification={showNotification}
      />

      {/* Notification Toast */}
      <NotificationToast
        notification={notification}
        onClose={() => setNotification((prev) => ({ ...prev, show: false }))}
      />
    </div>
  );
};

export default App;

