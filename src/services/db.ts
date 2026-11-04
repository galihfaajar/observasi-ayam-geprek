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
      sessionName: 'Observasi Perdana (Makan Siang)',
      namaUsaha: 'Ayam Geprek Kampus',
      alamat: 'Jl. Merdeka No. 12',
      tanggal: today,
      hari: day,
      jamMulai: '11:00',
      jamSelesai: '14:00',
      pengamat1: 'Ramdhan Ibrahim',
      pengamat2: 'Arifin Basit Adnan',
      pengamat3: 'Nadia Resfia Safitri',
      cuacaKhusus: 'Cerah, ramai pengunjung jam istirahat makan siang',
      catatanIzin: 'Izin diberikan oleh pemilik outlet (Bpk. Hendra)',
      createdAt: new Date().toISOString()
    };

    await db.sessions.add(initialSession);

    // Seed default interview questions for this session
    const interviewItems: InterviewItem[] = DEFAULT_INTERVIEW_QUESTIONS.map((q, idx) => ({
      id: `${initialSessionId}-INT-${idx + 1}`,
      sessionId: initialSessionId,
      pertanyaan: q,
      jawaban: '',
      sumber: 'Karyawan',
      keterangan: ''
    }));
    await db.interviews.bulkAdd(interviewItems);

    // Initial Resource log
    await db.resources.add({
      id: `${initialSessionId}-RES-1`,
      sessionId: initialSessionId,
      waktuPeriode: '11:00 - 14:00',
      jumlahKasir: 1,
      jumlahKoki: 2,
      jumlahPegawaiLain: 1,
      jumlahKompor: 2,
      jumlahWajan: 2,
      kapasitasGoreng: 16,
      fasilitasLain: 'Ulekan kayu & batu, wajan penggorengan deep fryer 2 unit',
      pembagianTugas: '1 kasir merangkap kemas takeaway, 2 koki goreng & ulek geprek'
    });

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
 * Generates next sequential order ID e.g. P001, P002... for a given session
 */
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

