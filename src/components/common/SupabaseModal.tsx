import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import {
  getStoredSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
  syncLocalToSupabase,
  syncSupabaseToLocal
} from '../../services/supabaseClient';
import {
  Cloud,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  DownloadCloud,
  Key,
  Globe,
  Copy,
  Trash2,
  Zap,
  Code
} from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataSynced: () => void;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const SUPABASE_SQL_SCRIPT = `-- 1. Tabel Sesi Observasi
create table if not exists observation_sessions (
  id text primary key,
  session_name text not null,
  nama_usaha text not null,
  alamat text,
  tanggal text not null,
  hari text,
  jam_mulai text,
  jam_selesai text,
  pengamat1 text,
  pengamat2 text,
  pengamat3 text,
  cuaca_khusus text,
  catatan_izin text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Tabel Log Pesanan
create table if not exists order_logs (
  id text primary key,
  session_id text references observation_sessions(id) on delete cascade,
  id_pesanan text not null,
  waktu_datang text,
  mulai_pesan text,
  selesai_pesan text,
  mulai_goreng text,
  selesai_goreng text,
  mulai_geprek text,
  selesai_geprek text,
  mulai_kemas text,
  pesanan_siap text,
  jenis_pesanan text,
  jumlah_porsi integer default 1,
  jenis_layanan text default 'Dine-in',
  catatan text,
  durasi_pesan_bayar numeric,
  durasi_goreng numeric,
  durasi_geprek numeric,
  durasi_kemas numeric,
  total_waktu_sistem numeric,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Tabel Snapshot Antrean
create table if not exists queue_snapshots (
  id text primary key,
  session_id text references observation_sessions(id) on delete cascade,
  waktu_pengamatan text not null,
  jumlah_menunggu integer default 0,
  jumlah_dilayani integer default 0,
  jumlah_meja_terisi integer,
  kondisi text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Tabel Sumber Daya
create table if not exists resource_logs (
  id text primary key,
  session_id text references observation_sessions(id) on delete cascade,
  waktu_periode text not null,
  jumlah_kasir integer default 1,
  jumlah_koki integer default 1,
  jumlah_pegawai_lain integer default 0,
  jumlah_kompor integer default 1,
  jumlah_wajan integer default 1,
  kapasitas_goreng integer default 16,
  fasilitas_lain text,
  pembagian_tugas text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. Tabel Wawancara
create table if not exists interview_items (
  id text primary key,
  session_id text references observation_sessions(id) on delete cascade,
  pertanyaan text not null,
  jawaban text,
  sumber text,
  keterangan text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Aktifkan Realtime
alter publication supabase_realtime add table observation_sessions, order_logs, queue_snapshots;`;

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  onDataSynced,
  showNotification
}) => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testStatus, setTestStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [showSql, setShowSql] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = getStoredSupabaseConfig();
      setUrl(cfg.url);
      setKey(cfg.key);
      setTestStatus(null);
    }
  }, [isOpen]);

  const handleSaveConfig = () => {
    if (!url.trim() || !key.trim()) {
      showNotification('error', 'URL Proyek dan Anon Key tidak boleh kosong.');
      return;
    }
    saveSupabaseConfig(url, key);
    showNotification('success', 'Konfigurasi Supabase berhasil disimpan di browser ini.');
  };

  const handleTestConnection = async () => {
    if (!url.trim() || !key.trim()) {
      showNotification('error', 'Masukkan URL dan Anon Key terlebih dahulu.');
      return;
    }
    setIsTesting(true);
    setTestStatus(null);
    const res = await testSupabaseConnection(url, key);
    setTestStatus(res);
    setIsTesting(false);
    if (res.success) {
      saveSupabaseConfig(url, key);
      showNotification('success', res.message);
    } else {
      showNotification('error', res.message);
    }
  };

  const handleUploadLocal = async () => {
    setIsSyncing(true);
    const res = await syncLocalToSupabase();
    setIsSyncing(false);
    if (res.success) {
      showNotification('success', res.message);
      onDataSynced();
    } else {
      showNotification('error', res.message);
    }
  };

  const handleDownloadCloud = async () => {
    setIsSyncing(true);
    const res = await syncSupabaseToLocal();
    setIsSyncing(false);
    if (res.success) {
      showNotification('success', res.message);
      onDataSynced();
    } else {
      showNotification('error', res.message);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
    showNotification('info', 'Skrip SQL berhasil disalin ke clipboard!');
  };

  const handleClear = () => {
    clearSupabaseConfig();
    setUrl('');
    setKey('');
    setTestStatus(null);
    showNotification('info', 'Konfigurasi Supabase telah direset.');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Integrasi Database Cloud (Supabase)" maxWidth="max-w-2xl">
      <div className="space-y-5">
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-blue-950 p-4 rounded-xl text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
              <Cloud className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold">Sinkronisasi Realtime Multi-Device</h4>
              <p className="text-xs text-slate-300">
                Memungkinkan 3 anggota mencatat bersamaan dari HP masing-masing
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSql(!showSql)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1 border border-slate-700"
          >
            <Code className="w-3.5 h-3.5 text-emerald-400" />
            <span>{showSql ? 'Tutup SQL' : 'Skrip SQL'}</span>
          </button>
        </div>

        {/* SQL Script Viewer */}
        {showSql && (
          <div className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs font-mono border border-slate-800 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-[11px] text-emerald-400 font-bold">
                Jalankan di Supabase Dashboard → SQL Editor:
              </span>
              <button
                type="button"
                onClick={handleCopySql}
                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold flex items-center space-x-1"
              >
                <Copy className="w-3 h-3" />
                <span>Salin SQL</span>
              </button>
            </div>
            <pre className="max-h-48 overflow-y-auto text-[10px] text-slate-300 leading-relaxed whitespace-pre-wrap">
              {SUPABASE_SQL_SCRIPT}
            </pre>
          </div>
        )}

        {/* Input credentials */}
        <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              <span>Supabase Project URL</span>
            </label>
            <input
              type="text"
              placeholder="https://xyzcompany.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-600" />
              <span>Supabase Anon Public API Key</span>
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-rose-600 hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Hapus Kredensial</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleSaveConfig}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold"
              >
                Simpan Konfigurasi
              </button>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-4 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>{isTesting ? 'Menguji...' : 'Tes Koneksi'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Connection status feedback */}
        {testStatus && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
              testStatus.success
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {testStatus.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{testStatus.message}</span>
          </div>
        )}

        {/* Action Sync Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={handleUploadLocal}
            disabled={isSyncing}
            className="p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-left transition space-y-1 group disabled:opacity-50"
          >
            <div className="flex items-center space-x-2 text-blue-900 font-bold text-xs">
              <UploadCloud className="w-4 h-4 text-blue-600 group-hover:scale-110 transition" />
              <span>Upload Lokal ke Cloud</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Kirim data pesanan dari perangkat ini ke database Supabase
            </p>
          </button>

          <button
            type="button"
            onClick={handleDownloadCloud}
            disabled={isSyncing}
            className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-left transition space-y-1 group disabled:opacity-50"
          >
            <div className="flex items-center space-x-2 text-emerald-900 font-bold text-xs">
              <DownloadCloud className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition" />
              <span>Tarik Data Terbaru dari Cloud</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Ambil data yang dicatat oleh teman kelompok lain ke layar ini
            </p>
          </button>
        </div>
      </div>
    </Modal>
  );
};

