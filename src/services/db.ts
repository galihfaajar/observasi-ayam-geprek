import Dexie, { type Table } from 'dexie';
import { ObservationSession, OrderLog, QueueSnapshot, ResourceLog, InterviewItem } from '../types';
import { getTodayDateString, getDayName, computeOrderDurations } from '../utils/timeUtils';
import { pushOrderToSupabase, pushSessionToSupabase } from './supabaseClient';

export const DEFAULT_INTERVIEW_QUESTIONS = [
  'Rata-rata berapa pelanggan/pesanan yang datang dalam sehari?',
  'Pada jam berapa biasanya kondisi paling ramai dan paling sepi?',
  'Berapa jumlah karyawan dan bagaimana pembagian tugasnya?',
  'Apakah satu orang menangani lebih dari satu tahap pelayanan?',
  'Berapa banyak ayam yang dapat digoreng dalam satu waktu?',
  'Apakah pesanan dikerjakan satu per satu atau beberapa pesanan sekaligus?',
  'Apakah ada perbedaan alur/waktu untuk dine-in dan takeaway?',
  'Faktor apa yang paling sering menyebabkan pesanan terlambat?',
  'Bagaimana penanganan jika terjadi kesalahan pesanan atau ayam perlu digoreng ulang?',
  'Apakah ada proses lain yang belum tercantum dalam alur pengamatan?'
];

export class AyamGeprekDatabase extends Dexie {
  sessions!: Table<ObservationSession, string>;
  orders!: Table<OrderLog, string>;
  snapshots!: Table<QueueSnapshot, string>;
  resources!: Table<ResourceLog, string>;
  interviews!: Table<InterviewItem, string>;

  constructor() {
    super('AyamGeprekObsDB');
    this.version(1).stores({
      sessions: 'id, tanggal, sessionName',
      orders: 'id, sessionId, idPesanan, waktuDatang',
      snapshots: 'id, sessionId, waktuPengamatan',
      resources: 'id, sessionId, waktuPeriode',
      interviews: 'id, sessionId'
    });
  }
}

export const db = new AyamGeprekDatabase();

// Default seed if no sessions exist
export async function initializeDatabase(): Promise<string> {
  const count = await db.sessions.count();
  if (count === 0) {
    const today = getTodayDateString();
    const day = getDayName(today);
    const initialSessionId = `SESI-${today.replace(/-/g, '')}-01`;

    const initialSession: ObservationSession = {
      id: initialSessionId,
      sessionName: 'Sesi Observasi 1',
      namaUsaha: '',
      alamat: '',
      tanggal: today,
      hari: day,
      jamMulai: '11:00',
      jamSelesai: '14:00',
      pengamat1: '',
      pengamat2: '',
      pengamat3: '',
      cuacaKhusus: '',
      catatanIzin: '',
      createdAt: new Date().toISOString()
    };

    await db.sessions.add(initialSession);
    // Push initial session to Supabase if active
    pushSessionToSupabase(initialSession);

    // Seed default interview questions for this session (blank answers)
    const interviewItems: InterviewItem[] = DEFAULT_INTERVIEW_QUESTIONS.map((q, idx) => ({
      id: `${initialSessionId}-INT-${idx + 1}`,
      sessionId: initialSessionId,
      pertanyaan: q,
      jawaban: '',
      sumber: 'Karyawan',
      keterangan: ''
    }));
    await db.interviews.bulkAdd(interviewItems);

    localStorage.setItem('active_session_id', initialSessionId);
    return initialSessionId;
  }

  const storedActive = localStorage.getItem('active_session_id');
  if (storedActive) {
    const sessionExists = await db.sessions.get(storedActive);
    if (sessionExists) return storedActive;
  }

  const first = await db.sessions.toCollection().first();
  if (first) {
    localStorage.setItem('active_session_id', first.id);
    return first.id;
  }

  return '';
}

/**
 * Membersihkan seluruh data observasi (lokal dan Supabase) sehingga bersih total
 */
export async function clearAllDatabaseData(): Promise<string> {
  await db.orders.clear();
  await db.snapshots.clear();
  await db.resources.clear();
  await db.interviews.clear();
  await db.sessions.clear();
  localStorage.removeItem('active_session_id');

  // Bersihkan juga di Supabase jika ada client
  const { getSupabaseClient } = await import('./supabaseClient');
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('order_logs').delete().neq('id', '___none___');
      await client.from('queue_snapshots').delete().neq('id', '___none___');
      await client.from('resource_logs').delete().neq('id', '___none___');
      await client.from('interview_items').delete().neq('id', '___none___');
      await client.from('observation_sessions').delete().neq('id', '___none___');
    } catch (e) {
      console.warn('Supabase reset warning:', e);
    }
  }

  // Buat sesi awal baru yang bersih
  return await initializeDatabase();
}
export async function getNextOrderId(sessionId: string): Promise<string> {
  const orders = await db.orders.where('sessionId').equals(sessionId).toArray();
  const maxNum = orders.reduce((max, order) => {
    const match = order.idPesanan.match(/^P(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      return Math.max(max, num);
    }
    return max;
  }, 0);

  const nextNum = maxNum + 1;
  return `P${nextNum.toString().padStart(3, '0')}`;
}

/**
 * Saves or updates an order, computing durations automatically
 */
export async function saveOrder(order: OrderLog): Promise<void> {
  const durations = computeOrderDurations(order);
  const updatedOrder: OrderLog = {
    ...order,
    ...durations
  };
  await db.orders.put(updatedOrder);
  // Auto-sync ke Supabase jika aktif
  pushOrderToSupabase(updatedOrder);
}

