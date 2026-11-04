import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ObservationSession, OrderLog, QueueSnapshot, ResourceLog, InterviewItem } from '../types';
import { db } from './db';
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from '../config/supabase';

const STORAGE_KEY_URL = 'supabase_project_url';
const STORAGE_KEY_KEY = 'supabase_anon_key';

export function getStoredSupabaseConfig() {
  const url =
    DEFAULT_SUPABASE_URL ||
    (import.meta as any).env?.VITE_SUPABASE_URL ||
    localStorage.getItem(STORAGE_KEY_URL) ||
    '';
  const key =
    DEFAULT_SUPABASE_ANON_KEY ||
    (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
    (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
    localStorage.getItem(STORAGE_KEY_KEY) ||
    '';
  return { url: url.trim(), key: key.trim() };
}

export function saveSupabaseConfig(url: string, key: string) {
  localStorage.setItem(STORAGE_KEY_URL, url.trim());
  localStorage.setItem(STORAGE_KEY_KEY, key.trim());
}

export function clearSupabaseConfig() {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_KEY);
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key } = getStoredSupabaseConfig();
  if (!url || !key) return null;
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, key);
    } catch {
      supabaseInstance = null;
    }
  }
  return supabaseInstance;
}

export function isSupabaseActive(): boolean {
  const { url, key } = getStoredSupabaseConfig();
  return Boolean(url && key);
}

export async function testSupabaseConnection(
  url?: string,
  key?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const config = getStoredSupabaseConfig();
    const finalUrl = (url || config.url).trim();
    const finalKey = (key || config.key).trim();
    if (!finalUrl || !finalKey) {
      return { success: false, message: 'URL atau Anon Key Supabase belum diisi.' };
    }

    const client = createClient(finalUrl, finalKey);
    const { error } = await client.from('observation_sessions').select('id').limit(1);
    if (error) {
      if (
        error.code === 'PGRST116' ||
        error.message.includes('relation "observation_sessions" does not exist')
      ) {
        return {
          success: false,
          message:
            'Terkoneksi ke Supabase, namun tabel belum dibuat! Jalankan skrip SQL di SQL Editor Supabase terlebih dahulu.'
        };
      }
      return { success: false, message: 'Gagal terkoneksi: ' + error.message };
    }
    return { success: true, message: 'Koneksi ke Supabase berhasil dan tabel terverifikasi!' };
  } catch (err: any) {
    return {
      success: false,
      message: 'Koneksi gagal: ' + (err.message || 'URL atau Anon Key tidak valid')
    };
  }
}

/**
 * Otomatis simpan / upsert satu pesanan ke Supabase di background
 */
export async function pushOrderToSupabase(order: OrderLog): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const row = {
      id: order.id,
      session_id: order.sessionId,
      id_pesanan: order.idPesanan,
      waktu_datang: order.waktuDatang,
      mulai_pesan: order.mulaiPesan,
      selesai_pesan: order.selesaiPesan,
      mulai_goreng: order.mulaiGoreng,
      selesai_goreng: order.selesaiGoreng,
      mulai_geprek: order.mulaiGeprek,
      selesai_geprek: order.selesaiGeprek,
      mulai_kemas: order.mulaiKemas,
      pesanan_siap: order.pesananSiap,
      jenis_pesanan: order.jenisPesanan,
      jumlah_porsi: order.jumlahPorsi,
      jenis_layanan: order.jenisLayanan,
      catatan: order.catatan,
      durasi_pesan_bayar: order.durasiPesanBayar,
      durasi_goreng: order.durasiGoreng,
      durasi_geprek: order.durasiGeprek,
      durasi_kemas: order.durasiKemas,
      total_waktu_sistem: order.totalWaktuSistem
    };
    const { error } = await client.from('order_logs').upsert(row);
    if (error) {
      console.error('Supabase order upsert failed:', error.message, error);
    }
  } catch (err) {
    console.warn('Background sync order to Supabase failed:', err);
  }
}

/**
 * Otomatis hapus pesanan dari Supabase di background
 */
export async function deleteOrderFromSupabase(orderId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('order_logs').delete().eq('id', orderId);
  } catch (err) {
    console.warn('Background delete order from Supabase failed:', err);
  }
}

/**
 * Otomatis simpan / upsert snapshot antrean ke Supabase di background
 */
export async function pushSnapshotToSupabase(snapshot: QueueSnapshot): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const row = {
      id: snapshot.id,
      session_id: snapshot.sessionId,
      waktu_pengamatan: snapshot.waktuPengamatan,
      jumlah_menunggu: snapshot.jumlahMenunggu,
      jumlah_dilayani: snapshot.jumlahDilayani,
      jumlah_meja_terisi: snapshot.jumlahMejaTerisi,
      kondisi: snapshot.kondisi
    };
    const { error } = await client.from('queue_snapshots').upsert(row);
    if (error) {
      console.error('Supabase snapshot upsert failed:', error.message, error);
    }
  } catch (err) {
    console.warn('Background sync snapshot to Supabase failed:', err);
  }
}

/**
 * Otomatis simpan / upsert sesi observasi ke Supabase di background
 */
export async function pushSessionToSupabase(session: ObservationSession): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const row = {
      id: session.id,
      session_name: session.sessionName,
      nama_usaha: session.namaUsaha,
      alamat: session.alamat,
      tanggal: session.tanggal,
      hari: session.hari,
      jam_mulai: session.jamMulai,
      jam_selesai: session.jamSelesai,
      pengamat1: session.pengamat1,
      pengamat2: session.pengamat2,
      pengamat3: session.pengamat3,
      cuaca_khusus: session.cuacaKhusus,
      catatan_izin: session.catatanIzin
    };
    const { error } = await client.from('observation_sessions').upsert(row);
    if (error) {
      console.error('Supabase session upsert failed:', error.message, error);
    }
  } catch (err) {
    console.warn('Background sync session to Supabase failed:', err);
  }
}

/**
 * Pasang Realtime Listener: Otomatis sinkron saat perangkat lain menambah / mengedit data
 */
export function subscribeToRealtimeChanges(onDataChanged: () => void): (() => void) | null {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const channel = client
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_logs' },
        async () => {
          await syncSupabaseToLocal();
          onDataChanged();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_snapshots' },
        async () => {
          await syncSupabaseToLocal();
          onDataChanged();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'observation_sessions' },
        async () => {
          await syncSupabaseToLocal();
          onDataChanged();
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime subscription error:', err);
    return null;
  }
}

/**
 * Upload all local IndexedDB records to Supabase
 */
export async function syncLocalToSupabase(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'Konfigurasi Supabase belum diatur.' };

  try {
    const sessions = await db.sessions.toArray();
    const orders = await db.orders.toArray();
    const snapshots = await db.snapshots.toArray();
    const resources = await db.resources.toArray();
    const interviews = await db.interviews.toArray();

    // 1. Sessions
    if (sessions.length > 0) {
      const rows = sessions.map((s) => ({
        id: s.id,
        session_name: s.sessionName,
        nama_usaha: s.namaUsaha,
        alamat: s.alamat,
        tanggal: s.tanggal,
        hari: s.hari,
        jam_mulai: s.jamMulai,
        jam_selesai: s.jamSelesai,
        pengamat1: s.pengamat1,
        pengamat2: s.pengamat2,
        pengamat3: s.pengamat3,
        cuaca_khusus: s.cuacaKhusus,
        catatan_izin: s.catatanIzin
      }));
      const { error } = await client.from('observation_sessions').upsert(rows);
      if (error) throw error;
    }

    // 2. Orders
    if (orders.length > 0) {
      const rows = orders.map((o) => ({
        id: o.id,
        session_id: o.sessionId,
        id_pesanan: o.idPesanan,
        waktu_datang: o.waktuDatang,
        mulai_pesan: o.mulaiPesan,
        selesai_pesan: o.selesaiPesan,
        mulai_goreng: o.mulaiGoreng,
        selesai_goreng: o.selesaiGoreng,
        mulai_geprek: o.mulaiGeprek,
        selesai_geprek: o.selesaiGeprek,
        mulai_kemas: o.mulaiKemas,
        pesanan_siap: o.pesananSiap,
        jenis_pesanan: o.jenisPesanan,
        jumlah_porsi: o.jumlahPorsi,
        jenis_layanan: o.jenisLayanan,
        catatan: o.catatan,
        durasi_pesan_bayar: o.durasiPesanBayar,
        durasi_goreng: o.durasiGoreng,
        durasi_geprek: o.durasiGeprek,
        durasi_kemas: o.durasiKemas,
        total_waktu_sistem: o.totalWaktuSistem
      }));
      const { error } = await client.from('order_logs').upsert(rows);
      if (error) throw error;
    }

    // 3. Snapshots
    if (snapshots.length > 0) {
      const rows = snapshots.map((s) => ({
        id: s.id,
        session_id: s.sessionId,
        waktu_pengamatan: s.waktuPengamatan,
        jumlah_menunggu: s.jumlahMenunggu,
        jumlah_dilayani: s.jumlahDilayani,
        jumlah_meja_terisi: s.jumlahMejaTerisi,
        kondisi: s.kondisi
      }));
      const { error } = await client.from('queue_snapshots').upsert(rows);
      if (error) throw error;
    }

    // 4. Resources
    if (resources.length > 0) {
      const rows = resources.map((r) => ({
        id: r.id,
        session_id: r.sessionId,
        waktu_periode: r.waktuPeriode,
        jumlah_kasir: r.jumlahKasir,
        jumlah_koki: r.jumlahKoki,
        jumlah_pegawai_lain: r.jumlahPegawaiLain,
        jumlah_kompor: r.jumlahKompor,
        jumlah_wajan: r.jumlahWajan,
        kapasitas_goreng: r.kapasitasGoreng,
        fasilitas_lain: r.fasilitasLain,
        pembagian_tugas: r.pembagianTugas
      }));
      const { error } = await client.from('resource_logs').upsert(rows);
      if (error) throw error;
    }

    // 5. Interviews
    if (interviews.length > 0) {
      const rows = interviews.map((i) => ({
        id: i.id,
        session_id: i.sessionId,
        pertanyaan: i.pertanyaan,
        jawaban: i.jawaban,
        sumber: i.sumber,
        keterangan: i.keterangan
      }));
      const { error } = await client.from('interview_items').upsert(rows);
      if (error) throw error;
    }

    return {
      success: true,
      message: `Berhasil upload: ${sessions.length} sesi, ${orders.length} pesanan, ${snapshots.length} snapshot antrean ke Supabase!`
    };
  } catch (err: any) {
    return { success: false, message: 'Gagal upload: ' + err.message };
  }
}

/**
 * Pull all data from Supabase down to IndexedDB
 */
export async function syncSupabaseToLocal(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'Konfigurasi Supabase belum diatur.' };

  try {
    const [resSessions, resOrders, resSnapshots, resResources, resInterviews] = await Promise.all([
      client.from('observation_sessions').select('*'),
      client.from('order_logs').select('*'),
      client.from('queue_snapshots').select('*'),
      client.from('resource_logs').select('*'),
      client.from('interview_items').select('*')
    ]);

    if (resSessions.error) throw resSessions.error;
    if (resOrders.error) throw resOrders.error;
    if (resSnapshots.error) throw resSnapshots.error;
    if (resResources.error) throw resResources.error;
    if (resInterviews.error) throw resInterviews.error;

    if (resSessions.data && resSessions.data.length > 0) {
      const sessions: ObservationSession[] = resSessions.data.map((row: any) => ({
        id: row.id,
        sessionName: row.session_name,
        namaUsaha: row.nama_usaha,
        alamat: row.alamat || '',
        tanggal: row.tanggal,
        hari: row.hari || '',
        jamMulai: row.jam_mulai || '',
        jamSelesai: row.jam_selesai || '',
        pengamat1: row.pengamat1 || '',
        pengamat2: row.pengamat2 || '',
        pengamat3: row.pengamat3 || '',
        cuacaKhusus: row.cuaca_khusus || '',
        catatanIzin: row.catatan_izin || '',
        createdAt: row.created_at || new Date().toISOString()
      }));
      await db.sessions.bulkPut(sessions);
    }

    if (resOrders.data && resOrders.data.length > 0) {
      const orders: OrderLog[] = resOrders.data.map((row: any) => ({
        id: row.id,
        sessionId: row.session_id,
        idPesanan: row.id_pesanan,
        waktuDatang: row.waktu_datang || '',
        mulaiPesan: row.mulai_pesan || '',
        selesaiPesan: row.selesai_pesan || '',
        mulaiGoreng: row.mulai_goreng || '',
        selesaiGoreng: row.selesai_goreng || '',
        mulaiGeprek: row.mulai_geprek || '',
        selesaiGeprek: row.selesai_geprek || '',
        mulaiKemas: row.mulai_kemas || '',
        pesananSiap: row.pesanan_siap || '',
        jenisPesanan: row.jenis_pesanan || 'Paket Geprek Original',
        jumlahPorsi: row.jumlah_porsi || 1,
        jenisLayanan: row.jenis_layanan || 'Dine-in',
        catatan: row.catatan || '',
        durasiPesanBayar: row.durasi_pesan_bayar !== null ? Number(row.durasi_pesan_bayar) : null,
        durasiGoreng: row.durasi_goreng !== null ? Number(row.durasi_goreng) : null,
        durasiGeprek: row.durasi_geprek !== null ? Number(row.durasi_geprek) : null,
        durasiKemas: row.durasi_kemas !== null ? Number(row.durasi_kemas) : null,
        totalWaktuSistem: row.total_waktu_sistem !== null ? Number(row.total_waktu_sistem) : null
      }));
      await db.orders.bulkPut(orders);
    }

    if (resSnapshots.data && resSnapshots.data.length > 0) {
      const snapshots: QueueSnapshot[] = resSnapshots.data.map((row: any) => ({
        id: row.id,
        sessionId: row.session_id,
        waktuPengamatan: row.waktu_pengamatan,
        jumlahMenunggu: row.jumlah_menunggu || 0,
        jumlahDilayani: row.jumlah_dilayani || 0,
        jumlahMejaTerisi: row.jumlah_meja_terisi !== null ? Number(row.jumlah_meja_terisi) : null,
        kondisi: row.kondisi || ''
      }));
      await db.snapshots.bulkPut(snapshots);
    }

    if (resResources.data && resResources.data.length > 0) {
      const resources: ResourceLog[] = resResources.data.map((row: any) => ({
        id: row.id,
        sessionId: row.session_id,
        waktuPeriode: row.waktu_periode,
        jumlahKasir: row.jumlah_kasir || 1,
        jumlahKoki: row.jumlah_koki || 1,
        jumlahPegawaiLain: row.jumlah_pegawai_lain || 0,
        jumlahKompor: row.jumlah_kompor || 1,
        jumlahWajan: row.jumlah_wajan || 1,
        kapasitasGoreng: row.kapasitas_goreng || 16,
        fasilitasLain: row.fasilitas_lain || '',
        pembagianTugas: row.pembagian_tugas || ''
      }));
      await db.resources.bulkPut(resources);
    }

    if (resInterviews.data && resInterviews.data.length > 0) {
      const interviews: InterviewItem[] = resInterviews.data.map((row: any) => ({
        id: row.id,
        sessionId: row.session_id,
        pertanyaan: row.pertanyaan,
        jawaban: row.jawaban || '',
        sumber: row.sumber || 'Karyawan',
        keterangan: row.keterangan || ''
      }));
      await db.interviews.bulkPut(interviews);
    }

    return {
      success: true,
      message: `Sinkronisasi berhasil! Data terbaru dari Supabase telah dimuat ke perangkat Anda.`
    };
  } catch (err: any) {
    return { success: false, message: 'Gagal mengunduh: ' + err.message };
  }
}
