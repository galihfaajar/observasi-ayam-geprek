import React, { useState } from 'react';
import { ObservationSession } from '../types';
import { exportToExcel, importFromExcel, ImportResult } from '../services/excelService';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  Layers,
  ArrowRight
} from 'lucide-react';

interface ExcelPageProps {
  session: ObservationSession | null;
  sessions: ObservationSession[];
  onDataImported: () => void;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const ExcelPage: React.FC<ExcelPageProps> = ({
  session,
  sessions,
  onDataImported,
  showNotification
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleExport = async (allSessions: boolean) => {
    if (!session) {
      showNotification('error', 'Pilih sesi observasi terlebih dahulu.');
      return;
    }
    try {
      setIsExporting(true);
      await exportToExcel(session, allSessions);
      showNotification(
        'success',
        allSessions
          ? 'File Excel untuk seluruh sesi berhasil diunduh.'
          : `File Excel sesi "${session.sessionName}" berhasil diunduh.`
      );
    } catch (err: any) {
      showNotification('error', 'Gagal mengekspor file: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      showNotification('error', 'Format file harus berupa Microsoft Excel (.xlsx / .xls).');
      return;
    }

    try {
      setIsImporting(true);
      setImportResult(null);
      const res = await importFromExcel(file, session.id);
      setImportResult(res);
      if (res.success) {
        showNotification('success', res.message);
        onDataImported();
      } else {
        showNotification('error', res.message || 'Gagal memproses file.');
      }
    } catch (err: any) {
      showNotification('error', 'Gagal membaca file: ' + err.message);
    } finally {
      setIsImporting(false);
      // Reset input value so user can upload again
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          <span>Integrasi Ekspor & Impor Excel (.xlsx)</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Sesuai dan kompatibel 100% dengan Template Pengamatan Ayam Geprek mata kuliah Pemodelan & Simulasi Sistem
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Ekspor Excel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <Download className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">Ekspor Data ke Excel</h3>
                <p className="text-xs text-slate-500">
                  Unduh seluruh sheet: Petunjuk, Identitas, Log Pesanan, Snapshot, Sumber Daya, Wawancara, & Ringkasan
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1.5">
              <p className="font-semibold text-slate-800">Sheet yang disertakan dalam file:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li><code className="text-emerald-700 font-mono">Petunjuk</code>: Panduan pengisian lapangan</li>
                <li><code className="text-emerald-700 font-mono">Identitas</code>: Info lokasi, pengamat & izin</li>
                <li><code className="text-emerald-700 font-mono">Log Pesanan</code>: Waktu aktual & durasi otomatis</li>
                <li><code className="text-emerald-700 font-mono">Snapshot Antrean</code>: Riwayat panjang antrean</li>
                <li><code className="text-emerald-700 font-mono">Sumber Daya</code>: Kasir, koki, alat penggorengan</li>
                <li><code className="text-emerald-700 font-mono">Wawancara</code>: 10 pertanyaan narasumber</li>
                <li><code className="text-emerald-700 font-mono">Ringkasan</code>: Formula rerata parameter antrean</li>
              </ul>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => handleExport(false)}
              disabled={isExporting}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition shadow-md disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>
                {isExporting ? 'Membuat File...' : `Unduh Sesi Ini (${session?.sessionName})`}
              </span>
            </button>

            {sessions.length > 1 && (
              <button
                onClick={() => handleExport(true)}
                disabled={isExporting}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center space-x-2 transition"
              >
                <Layers className="w-4 h-4 text-slate-500" />
                <span>Unduh Seluruh Sesi ({sessions.length} Sesi Sekaligus)</span>
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Impor Excel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Upload className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">Impor Data dari Excel</h3>
                <p className="text-xs text-slate-500">
                  Muat data dari file Excel template ke dalam sesi aktif saat ini
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-2">
              <p className="font-semibold text-slate-800">Target Sesi Impor:</p>
              <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border border-slate-200">
                <Layers className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-slate-800">{session?.sessionName}</span>
                <span className="text-slate-400">({session?.tanggal})</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Data pesanan dan snapshot yang ada dalam Excel akan otomatis dikonversi dan dihitung durasinya.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="relative flex flex-col items-center justify-center border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-xl p-5 bg-blue-50/30 hover:bg-blue-50/60 cursor-pointer transition">
              <Upload className="w-8 h-8 text-blue-600 mb-2" />
              <span className="text-xs sm:text-sm font-bold text-blue-900">
                {isImporting ? 'Sedang Memproses Excel...' : 'Pilih File .xlsx untuk Diimpor'}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">
                Mendukung file Template_Pengamatan_Ayam_Geprek.xlsx
              </span>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                disabled={isImporting}
                className="hidden"
              />
            </label>

            {/* Import Status Feedback */}
            {importResult && (
              <div
                className={`p-3.5 rounded-xl text-xs space-y-1 ${
                  importResult.success
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-bold">
                  {importResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{importResult.message}</span>
                </div>
                {importResult.errors.length > 0 && (
                  <ul className="list-disc list-inside text-[11px] text-rose-700 pt-1">
                    {importResult.errors.map((e, idx) => (
                      <li key={idx}>{e}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

