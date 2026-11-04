import React, { useState } from 'react';
import { InterviewItem, ObservationSession } from '../types';
import { db } from '../services/db';
import { getSupabaseClient } from '../services/supabaseClient';
import { HelpCircle, Save, CheckCircle2, User, Plus, MessageSquare } from 'lucide-react';

interface InterviewPageProps {
  session: ObservationSession | null;
  interviews: InterviewItem[];
  onRefreshInterviews: () => void;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const InterviewPage: React.FC<InterviewPageProps> = ({
  session,
  interviews,
  onRefreshInterviews,
  showNotification
}) => {
  const [items, setItems] = useState<InterviewItem[]>(interviews);
  const [hasChanges, setHasChanges] = useState(false);

  React.useEffect(() => {
    setItems(interviews);
  }, [interviews]);

  const handleChange = (id: string, field: keyof InterviewItem, value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
    setHasChanges(true);
  };

  const handleSaveAll = async () => {
    if (!session) return;
    try {
      await db.interviews.bulkPut(items);
      const client = getSupabaseClient();
      if (client) {
        const rows = items.map((i) => ({
          id: i.id,
          session_id: i.sessionId,
          pertanyaan: i.pertanyaan,
          jawaban: i.jawaban,
          sumber: i.sumber,
          keterangan: i.keterangan
        }));
        client.from('interview_items').upsert(rows).then(({ error }) => {
          if (error) console.warn('Supabase interview upsert error:', error.message);
        });
      }
      setHasChanges(false);
      onRefreshInterviews();
      showNotification('success', 'Semua jawaban wawancara berhasil disimpan.');
    } catch (err: any) {
      showNotification('error', 'Gagal menyimpan wawancara: ' + err.message);
    }
  };

  const handleAddQuestion = async () => {
    if (!session) return;
    const newId = `${session.id}-INT-${Date.now()}`;
    const newItem: InterviewItem = {
      id: newId,
      sessionId: session.id,
      pertanyaan: 'Pertanyaan Tambahan Lapangan',
      jawaban: '',
      sumber: 'Karyawan',
      keterangan: ''
    };
    await db.interviews.add(newItem);
    const client = getSupabaseClient();
    if (client) {
      client.from('interview_items').upsert({
        id: newItem.id,
        session_id: newItem.sessionId,
        pertanyaan: newItem.pertanyaan,
        jawaban: newItem.jawaban,
        sumber: newItem.sumber,
        keterangan: newItem.keterangan
      }).then(({ error }) => {
        if (error) console.warn('Supabase interview add error:', error.message);
      });
    }
    onRefreshInterviews();
    showNotification('success', 'Pertanyaan baru ditambahkan.');
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-700" />
            <span>Wawancara Pemilik & Karyawan Usaha</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            10 Pertanyaan standar untuk melengkapi pemodelan parameter antrean dan operasional
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleAddQuestion}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Pertanyaan Tambahan</span>
          </button>
          <button
            onClick={handleSaveAll}
            className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-2 transition shadow-md ${
              hasChanges
                ? 'bg-blue-600 hover:bg-blue-500 text-white animate-pulse'
                : 'bg-blue-800 hover:bg-blue-700 text-white'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>Simpan Semua Jawaban</span>
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3.5 hover:border-blue-200 transition"
          >
            {/* Question Title & Number */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start space-x-3">
                <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 leading-snug">
                    {item.pertanyaan}
                  </h4>
                </div>
              </div>

              {/* Sumber Informasi Dropdown */}
              <div className="flex items-center space-x-1.5 shrink-0">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={item.sumber}
                  onChange={(e) => handleChange(item.id, 'sumber', e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="Pemilik">Pemilik Usaha</option>
                  <option value="Karyawan">Karyawan / Koki</option>
                  <option value="Kasir">Kasir</option>
                  <option value="Manajer">Manajer Outlet</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
            </div>

            {/* Answer Input */}
            <div>
              <textarea
                rows={2}
                value={item.jawaban}
                onChange={(e) => handleChange(item.id, 'jawaban', e.target.value)}
                placeholder="Catat jawaban narasumber di sini..."
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent placeholder:text-slate-400"
              />
            </div>

            {/* Keterangan Tambahan */}
            <div>
              <input
                type="text"
                value={item.keterangan}
                onChange={(e) => handleChange(item.id, 'keterangan', e.target.value)}
                placeholder="Keterangan tambahan / konteks (opsional)..."
                className="w-full px-3 py-1.5 text-xs bg-transparent border-b border-dashed border-slate-200 focus:border-blue-500 focus:outline-none placeholder:text-slate-400 text-slate-600"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Floating Save Reminder if changed */}
      {hasChanges && (
        <div className="sticky bottom-6 z-20 flex justify-end">
          <button
            onClick={handleSaveAll}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-xl font-bold text-sm flex items-center space-x-2 animate-bounce"
          >
            <Save className="w-5 h-5" />
            <span>Ada perubahan belum disimpan — Klik untuk Simpan</span>
          </button>
        </div>
      )}
    </div>
  );
};

