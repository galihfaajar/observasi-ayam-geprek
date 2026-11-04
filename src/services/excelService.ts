import * as XLSX from 'xlsx';
import { ObservationSession, OrderLog, QueueSnapshot, ResourceLog, InterviewItem } from '../types';
import { db } from './db';
import { calculateDurationMinutes } from '../utils/timeUtils';

/**
 * Convert Excel date/time number or raw value to string HH:MM:SS or string
 */
function formatExcelTime(val: any): string {
  if (val === undefined || val === null || val === '') return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number') {
    // Excel time is fraction of a day: 0.5 = 12:00:00
    // If it's a fractional number < 1 (time of day)
    const totalSeconds = Math.round((val % 1) * 86400);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return String(val);
}

export async function exportToExcel(session: ObservationSession, allSessions = false): Promise<void> {
  const wb = XLSX.utils.book_new();

  // 1. SHEET PETUNJUK
  const petunjukData = [
    ['TEMPLATE PENGAMATAN SISTEM PELAYANAN AYAM GEPREK'],
    ['Bagian', 'Cara menggunakan'],
    ['Tujuan', 'Mencatat alur kedatangan, antrean, waktu pelayanan, sumber daya, dan kendala untuk pemodelan/simulasi sistem.'],
    ['Sebelum observasi', 'Isi identitas lokasi dan tanggal pada sheet Identitas. Minta izin pemilik/karyawan sebelum mencatat.'],
    ['Log Pesanan', 'Satu baris untuk satu pesanan. Gunakan ID unik (P001, P002, dst.). Catat waktu dalam format jam:menit:detik bila memungkinkan.'],
    ['Kolom waktu', 'Isi waktu aktual pada setiap tahap. Kolom durasi dihitung otomatis dalam menit jika waktu mulai dan selesai tersedia.'],
    ['Jika tahap tidak ada', 'Biarkan kolom waktu tahap tersebut kosong. Jangan mengisi dengan perkiraan tanpa memberi catatan.'],
    ['Snapshot Antrean', 'Catat jumlah pelanggan yang menunggu pada interval tetap, misalnya setiap 5 atau 10 menit. Catat waktu dan jumlah antrean yang terlihat.'],
    ['Sumber Daya', 'Catat jumlah karyawan dan fasilitas yang benar-benar aktif selama periode observasi, bukan hanya jumlah total yang dimiliki.'],
    ['Wawancara', 'Catat jawaban pemilik/karyawan secara ringkas. Bedakan informasi hasil wawancara dari hasil pengamatan langsung.'],
    ['Catatan', 'Data diekspor otomatis dari Sistem Observasi Ayam Geprek.']
  ];
  const wsPetunjuk = XLSX.utils.aoa_to_sheet(petunjukData);
  XLSX.utils.book_append_sheet(wb, wsPetunjuk, 'Petunjuk');

  // Load data for session(s)
  let orders: OrderLog[];
  let snapshots: QueueSnapshot[];
  let resources: ResourceLog[];
  let interviews: InterviewItem[];

  if (allSessions) {
    orders = await db.orders.toArray();
    snapshots = await db.snapshots.toArray();
    resources = await db.resources.toArray();
    interviews = await db.interviews.toArray();
  } else {
    orders = await db.orders.where('sessionId').equals(session.id).toArray();
    snapshots = await db.snapshots.where('sessionId').equals(session.id).toArray();
    resources = await db.resources.where('sessionId').equals(session.id).toArray();
    interviews = await db.interviews.where('sessionId').equals(session.id).toArray();
  }

  // 2. SHEET IDENTITAS
  const identitasData = [
    ['IDENTITAS OBSERVASI SISTEM PELAYANAN AYAM GEPREK'],
    ['Parameter', 'Informasi'],
    ['Nama Usaha', session.namaUsaha],
    ['Alamat / Lokasi', session.alamat],
    ['Tanggal Observasi', session.tanggal],
    ['Hari', session.hari],
    ['Jam Mulai Observasi', session.jamMulai],
    ['Jam Selesai Observasi', session.jamSelesai],
    ['Nama Pengamat 1', session.pengamat1],
    ['Nama Pengamat 2', session.pengamat2],
    ['Nama Pengamat 3', session.pengamat3],
    ['Kondisi Cuaca / Catatan Khusus', session.cuacaKhusus],
    ['Catatan Izin & Dokumentasi', session.catatanIzin],
    ['ID Sesi', session.id]
  ];
  const wsIdentitas = XLSX.utils.aoa_to_sheet(identitasData);
  XLSX.utils.book_append_sheet(wb, wsIdentitas, 'Identitas');

  // 3. SHEET LOG PESANAN
  const logHeader = [
    'ID Pesanan',
    'Waktu Datang',
    'Mulai Pesan',
    'Selesai Pesan/Bayar',
    'Mulai Persiapan/Goreng',
    'Selesai Goreng',
    'Mulai Geprek/Sajikan',
    'Selesai Geprek/Sajikan',
    'Mulai Pengemasan',
    'Pesanan Siap/Diterima',
    'Jenis Pesanan',
    'Jumlah Porsi',
    'Dine-in/Takeaway',
    'Durasi Pesan+Bayar (menit)',
    'Durasi Goreng (menit)',
    'Durasi Geprek/Sajikan (menit)',
    'Durasi Kemas (menit)',
    'Total Waktu dalam Sistem (menit)',
    'Catatan/Kendala'
  ];

  const logRows = orders.map((o) => [
    o.idPesanan,
    o.waktuDatang,
    o.mulaiPesan,
    o.selesaiPesan,
    o.mulaiGoreng,
    o.selesaiGoreng,
    o.mulaiGeprek,
    o.selesaiGeprek,
    o.mulaiKemas,
    o.pesananSiap,
    o.jenisPesanan,
    o.jumlahPorsi,
    o.jenisLayanan,
    o.durasiPesanBayar !== null && o.durasiPesanBayar !== undefined ? o.durasiPesanBayar : '',
    o.durasiGoreng !== null && o.durasiGoreng !== undefined ? o.durasiGoreng : '',
    o.durasiGeprek !== null && o.durasiGeprek !== undefined ? o.durasiGeprek : '',
    o.durasiKemas !== null && o.durasiKemas !== undefined ? o.durasiKemas : '',
    o.totalWaktuSistem !== null && o.totalWaktuSistem !== undefined ? o.totalWaktuSistem : '',
    o.catatan
  ]);

  const wsLog = XLSX.utils.aoa_to_sheet([logHeader, ...logRows]);
  XLSX.utils.book_append_sheet(wb, wsLog, 'Log Pesanan');

  // 4. SHEET SNAPSHOT ANTREAN
  const snapshotHeader = [
    'Waktu Pengamatan',
    'Jumlah Pelanggan Menunggu',
    'Jumlah Sedang Dilayani',
    'Jumlah Meja Terisi (opsional)',
    'Kondisi/Keterangan'
  ];
  const snapshotRows = snapshots.map((s) => [
    s.waktuPengamatan,
    s.jumlahMenunggu,
    s.jumlahDilayani,
    s.jumlahMejaTerisi !== null && s.jumlahMejaTerisi !== undefined ? s.jumlahMejaTerisi : '',
    s.kondisi
  ]);
  const wsSnapshot = XLSX.utils.aoa_to_sheet([snapshotHeader, ...snapshotRows]);
  XLSX.utils.book_append_sheet(wb, wsSnapshot, 'Snapshot Antrean');

  // 5. SHEET SUMBER DAYA
  const resHeader = [
    'Waktu/Periode',
    'Jumlah Kasir Aktif',
    'Jumlah Koki Aktif',
    'Jumlah Pegawai Lain',
    'Jumlah Kompor Aktif',
    'Jumlah Wajan/Penggorengan Aktif',
    'Kapasitas Penggorengan (potong ayam)',
    'Fasilitas/Alat Lainnya',
    'Pembagian Tugas dan Catatan'
  ];
  const resRows = resources.map((r) => [
    r.waktuPeriode,
    r.jumlahKasir,
    r.jumlahKoki,
    r.jumlahPegawaiLain,
    r.jumlahKompor,
    r.jumlahWajan,
    r.kapasitasGoreng || '',
    r.fasilitasLain || '',
    r.pembagianTugas || ''
  ]);
  const wsRes = XLSX.utils.aoa_to_sheet([resHeader, ...resRows]);
  XLSX.utils.book_append_sheet(wb, wsRes, 'Sumber Daya');

  // 6. SHEET WAWANCARA
  const interviewHeader = ['No', 'Pertanyaan Wawancara', 'Jawaban / Catatan', 'Sumber Informasi', 'Keterangan'];
  const interviewRows = interviews.map((item, idx) => [
    idx + 1,
    item.pertanyaan,
    item.jawaban,
    item.sumber,
    item.keterangan
  ]);
  const wsInterview = XLSX.utils.aoa_to_sheet([interviewHeader, ...interviewRows]);
  XLSX.utils.book_append_sheet(wb, wsInterview, 'Wawancara');

  // 7. SHEET RINGKASAN
  const validTotalTimes = orders.map((o) => o.totalWaktuSistem).filter((v): v is number => typeof v === 'number');
  const validPesanBayar = orders.map((o) => o.durasiPesanBayar).filter((v): v is number => typeof v === 'number');
  const validGoreng = orders.map((o) => o.durasiGoreng).filter((v): v is number => typeof v === 'number');
  const validGeprek = orders.map((o) => o.durasiGeprek).filter((v): v is number => typeof v === 'number');
  const validKemas = orders.map((o) => o.durasiKemas).filter((v): v is number => typeof v === 'number');
  const avg = (arr: number[]) => (arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : '-');
  const max = (arr: number[]) => (arr.length > 0 ? Math.max(...arr).toFixed(1) : '-');

  const waitingCounts = snapshots.map((s) => s.jumlahMenunggu);
  const avgWaiting = waitingCounts.length > 0 ? (waitingCounts.reduce((a, b) => a + b, 0) / waitingCounts.length).toFixed(1) : '-';
  const maxWaiting = waitingCounts.length > 0 ? Math.max(...waitingCounts) : '-';
  const totalPorsi = orders.reduce((sum, o) => sum + (o.jumlahPorsi || 1), 0);

  const ringkasanData = [
    ['RINGKASAN HASIL PENGAMATAN', 'NILAI', 'KETERANGAN'],
    ['Jumlah pesanan tercatat', orders.length, 'pesanan'],
    ['Total porsi tercatat', totalPorsi, 'porsi'],
    ['Rata-rata waktu dalam sistem (menit)', avg(validTotalTimes), 'menit'],
    ['Waktu dalam sistem terlama (menit)', max(validTotalTimes), 'menit'],
    ['Rata-rata durasi pesan+bayar (menit)', avg(validPesanBayar), 'menit'],
    ['Rata-rata durasi goreng (menit)', avg(validGoreng), 'menit'],
    ['Rata-rata durasi geprek/sajikan (menit)', avg(validGeprek), 'menit'],
    ['Rata-rata durasi kemas (menit)', avg(validKemas), 'menit'],
    ['Rata-rata pelanggan menunggu per snapshot', avgWaiting, 'orang'],
    ['Antrean maksimum tercatat', maxWaiting, 'orang']
  ];
  const wsRingkasan = XLSX.utils.aoa_to_sheet(ringkasanData);
  XLSX.utils.book_append_sheet(wb, wsRingkasan, 'Ringkasan');

  // Trigger browser download
  const dateStr = session.tanggal || 'observasi';
  const fileName = allSessions
    ? `Data_Observasi_Ayam_Geprek_Semua_Sesi_${dateStr}.xlsx`
    : `Data_Observasi_Ayam_Geprek_${session.namaUsaha.replace(/\s+/g, '_')}_${dateStr}.xlsx`;

  XLSX.writeFile(wb, fileName);
}

export interface ImportResult {
  success: boolean;
  message: string;
  ordersImported: number;
  snapshotsImported: number;
  resourcesImported: number;
  interviewsImported: number;
  errors: string[];
}

export async function importFromExcel(file: File, targetSessionId: string): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    message: '',
    ordersImported: 0,
    snapshotsImported: 0,
    resourcesImported: 0,
    interviewsImported: 0,
    errors: []
  };

  try {
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });

    // Validate sheets
    const sheetNames = wb.SheetNames;
    let foundLogSheet = sheetNames.find((s) => s.toLowerCase().includes('log') || s.toLowerCase().includes('pesan'));
    let foundSnapshotSheet = sheetNames.find((s) => s.toLowerCase().includes('snapshot') || s.toLowerCase().includes('antre'));
    let foundResourceSheet = sheetNames.find((s) => s.toLowerCase().includes('sumber') || s.toLowerCase().includes('daya'));
    let foundInterviewSheet = sheetNames.find((s) => s.toLowerCase().includes('wawancara'));

    if (!foundLogSheet && !foundSnapshotSheet && !foundResourceSheet && !foundInterviewSheet) {
      result.errors.push('File Excel tidak memiliki sheet yang sesuai (Log Pesanan, Snapshot Antrean, Sumber Daya, Wawancara).');
      return result;
    }

    // 1. Process Log Pesanan
    if (foundLogSheet) {
      const ws = wb.Sheets[foundLogSheet];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (rows.length > 1) {
        const header = rows[0].map((h) => String(h).trim().toLowerCase());

        // Find index helpers
        const findCol = (terms: string[]) =>
          header.findIndex((h) => terms.some((t) => h.includes(t)));

        const colId = findCol(['id pesanan', 'id_pesanan', 'id']);
        const colDatang = findCol(['waktu datang', 'datang']);
        const colMulaiPesan = findCol(['mulai pesan']);
        const colSelesaiPesan = findCol(['selesai pesan', 'pesan/bayar', 'bayar']);
        const colMulaiGoreng = findCol(['mulai persiapan', 'mulai goreng', 'persiapan/goreng']);
        const colSelesaiGoreng = findCol(['selesai goreng']);
        const colMulaiGeprek = findCol(['mulai geprek', 'mulai geprek/sajikan']);
        const colSelesaiGeprek = findCol(['selesai geprek', 'selesai geprek/sajikan']);
        const colMulaiKemas = findCol(['mulai kemas', 'pengemasan']);
        const colSiap = findCol(['pesanan siap', 'siap/diterima', 'diterima']);
        const colJenis = findCol(['jenis pesanan', 'menu']);
        const colPorsi = findCol(['jumlah porsi', 'porsi']);
        const colLayanan = findCol(['dine-in', 'layanan', 'takeaway']);
        const colCatatan = findCol(['catatan', 'kendala']);

        const newOrders: OrderLog[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.every((c) => c === '' || c === null || c === undefined)) continue;

          let idPesanan = colId !== -1 ? String(row[colId]).trim() : '';
          if (!idPesanan) {
            idPesanan = `P${(result.ordersImported + newOrders.length + 1).toString().padStart(3, '0')}`;
          }

          const waktuDatang = colDatang !== -1 ? formatExcelTime(row[colDatang]) : '';
          const mulaiPesan = colMulaiPesan !== -1 ? formatExcelTime(row[colMulaiPesan]) : '';
          const selesaiPesan = colSelesaiPesan !== -1 ? formatExcelTime(row[colSelesaiPesan]) : '';
          const mulaiGoreng = colMulaiGoreng !== -1 ? formatExcelTime(row[colMulaiGoreng]) : '';
          const selesaiGoreng = colSelesaiGoreng !== -1 ? formatExcelTime(row[colSelesaiGoreng]) : '';
          const mulaiGeprek = colMulaiGeprek !== -1 ? formatExcelTime(row[colMulaiGeprek]) : '';
          const selesaiGeprek = colSelesaiGeprek !== -1 ? formatExcelTime(row[colSelesaiGeprek]) : '';
          const mulaiKemas = colMulaiKemas !== -1 ? formatExcelTime(row[colMulaiKemas]) : '';
          const pesananSiap = colSiap !== -1 ? formatExcelTime(row[colSiap]) : '';

          const jenisPesanan = colJenis !== -1 && row[colJenis] ? String(row[colJenis]).trim() : 'Paket Geprek Original';
          const jumlahPorsi = colPorsi !== -1 && !isNaN(Number(row[colPorsi])) && Number(row[colPorsi]) > 0 ? Number(row[colPorsi]) : 1;
          
          let jenisLayanan: 'Dine-in' | 'Takeaway' = 'Dine-in';
          if (colLayanan !== -1 && row[colLayanan]) {
            const rawLayanan = String(row[colLayanan]).toLowerCase();
            if (rawLayanan.includes('take') || rawLayanan.includes('bungkus') || rawLayanan.includes('bawa')) {
              jenisLayanan = 'Takeaway';
            }
          }

          const catatan = colCatatan !== -1 && row[colCatatan] ? String(row[colCatatan]).trim() : '';

          // Compute durations
          const durasiPesanBayar = calculateDurationMinutes(mulaiPesan, selesaiPesan);
          const durasiGoreng = calculateDurationMinutes(mulaiGoreng, selesaiGoreng);
          const durasiGeprek = calculateDurationMinutes(mulaiGeprek, selesaiGeprek);
          const packingStart = mulaiKemas || selesaiGeprek;
          const durasiKemas = calculateDurationMinutes(packingStart, pesananSiap);
          const totalWaktuSistem = calculateDurationMinutes(waktuDatang, pesananSiap);

          const orderItem: OrderLog = {
            id: `${targetSessionId}-ORD-${Date.now()}-${i}`,
            sessionId: targetSessionId,
            idPesanan,
            waktuDatang,
            mulaiPesan,
            selesaiPesan,
            mulaiGoreng,
            selesaiGoreng,
            mulaiGeprek,
            selesaiGeprek,
            mulaiKemas,
            pesananSiap,
            jenisPesanan,
            jumlahPorsi,
            jenisLayanan,
            catatan,
            durasiPesanBayar,
            durasiGoreng,
            durasiGeprek,
            durasiKemas,
            totalWaktuSistem
          };

          newOrders.push(orderItem);
        }

        if (newOrders.length > 0) {
          await db.orders.bulkPut(newOrders);
          result.ordersImported = newOrders.length;
        }
      }
    }

    // 2. Process Snapshot Antrean
    if (foundSnapshotSheet) {
      const ws = wb.Sheets[foundSnapshotSheet];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (rows.length > 1) {
        const header = rows[0].map((h) => String(h).trim().toLowerCase());
        const colWaktu = header.findIndex((h) => h.includes('waktu'));
        const colMenunggu = header.findIndex((h) => h.includes('menunggu'));
        const colDilayani = header.findIndex((h) => h.includes('dilayani'));
        const colMeja = header.findIndex((h) => h.includes('meja'));
        const colKondisi = header.findIndex((h) => h.includes('kondisi') || h.includes('keterangan'));

        const newSnapshots: QueueSnapshot[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.every((c) => c === '' || c === null || c === undefined)) continue;

          const waktuPengamatan = colWaktu !== -1 ? formatExcelTime(row[colWaktu]) : '';
          const jumlahMenunggu = colMenunggu !== -1 && !isNaN(Number(row[colMenunggu])) ? Number(row[colMenunggu]) : 0;
          const jumlahDilayani = colDilayani !== -1 && !isNaN(Number(row[colDilayani])) ? Number(row[colDilayani]) : 0;
          const jumlahMejaTerisi = colMeja !== -1 && !isNaN(Number(row[colMeja])) && row[colMeja] !== '' ? Number(row[colMeja]) : null;
          const kondisi = colKondisi !== -1 ? String(row[colKondisi]).trim() : '';

          if (waktuPengamatan || jumlahMenunggu > 0 || jumlahDilayani > 0) {
            newSnapshots.push({
              id: `${targetSessionId}-SNAP-${Date.now()}-${i}`,
              sessionId: targetSessionId,
              waktuPengamatan,
              jumlahMenunggu,
              jumlahDilayani,
              jumlahMejaTerisi,
              kondisi
            });
          }
        }

        if (newSnapshots.length > 0) {
          await db.snapshots.bulkPut(newSnapshots);
          result.snapshotsImported = newSnapshots.length;
        }
      }
    }

    // 3. Process Sumber Daya
    if (foundResourceSheet) {
      const ws = wb.Sheets[foundResourceSheet];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (rows.length > 1) {
        const header = rows[0].map((h) => String(h).trim().toLowerCase());
        const colPeriode = header.findIndex((h) => h.includes('waktu') || h.includes('periode'));
        const colKasir = header.findIndex((h) => h.includes('kasir'));
        const colKoki = header.findIndex((h) => h.includes('koki'));
        const colPegawai = header.findIndex((h) => h.includes('lain') || h.includes('pegawai'));
        const colKompor = header.findIndex((h) => h.includes('kompor'));
        const colWajan = header.findIndex((h) => h.includes('wajan') || h.includes('gorengan'));

        const newResources: ResourceLog[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.every((c) => c === '' || c === null || c === undefined)) continue;

          newResources.push({
            id: `${targetSessionId}-RES-${Date.now()}-${i}`,
            sessionId: targetSessionId,
            waktuPeriode: colPeriode !== -1 ? String(row[colPeriode]).trim() : 'Periode Observasi',
            jumlahKasir: colKasir !== -1 && !isNaN(Number(row[colKasir])) ? Number(row[colKasir]) : 1,
            jumlahKoki: colKoki !== -1 && !isNaN(Number(row[colKoki])) ? Number(row[colKoki]) : 1,
            jumlahPegawaiLain: colPegawai !== -1 && !isNaN(Number(row[colPegawai])) ? Number(row[colPegawai]) : 0,
            jumlahKompor: colKompor !== -1 && !isNaN(Number(row[colKompor])) ? Number(row[colKompor]) : 1,
            jumlahWajan: colWajan !== -1 && !isNaN(Number(row[colWajan])) ? Number(row[colWajan]) : 1,
            kapasitasGoreng: 16,
            fasilitasLain: '',
            pembagianTugas: ''
          });
        }

        if (newResources.length > 0) {
          await db.resources.bulkPut(newResources);
          result.resourcesImported = newResources.length;
        }
      }
    }

    result.success = true;
    result.message = `Impor berhasil: ${result.ordersImported} pesanan, ${result.snapshotsImported} snapshot antrean, ${result.resourcesImported} data sumber daya berhasil dimuat ke sesi aktif.`;
    return result;
  } catch (err: any) {
    result.success = false;
    result.errors.push(err.message || 'Gagal membaca file Excel.');
    result.message = 'Terjadi kesalahan saat memproses file Excel.';
    return result;
  }
}

