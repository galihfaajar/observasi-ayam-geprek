export interface ObservationSession {
  id: string;
  sessionName: string;
  namaUsaha: string;
  alamat: string;
  tanggal: string; // YYYY-MM-DD
  hari: string;
  jamMulai: string; // HH:MM:SS or HH:MM
  jamSelesai: string;
  pengamat1: string;
  pengamat2: string;
  pengamat3: string;
  cuacaKhusus: string;
  catatanIzin: string;
  createdAt: string;
}

export interface OrderLog {
  id: string;
  sessionId: string;
  idPesanan: string; // P001, P002, etc.
  waktuDatang: string; // HH:MM:SS or HH:MM
  mulaiPesan: string;
  selesaiPesan: string;
  mulaiGoreng: string;
  selesaiGoreng: string;
  mulaiGeprek: string;
  selesaiGeprek: string;
  mulaiKemas: string;
  pesananSiap: string;
  jenisPesanan: string;
  jumlahPorsi: number;
  jenisLayanan: 'Dine-in' | 'Takeaway';
  catatan: string;
  
  // Perhitungan otomatis (menit)
  durasiPesanBayar?: number | null;
  durasiGoreng?: number | null;
  durasiGeprek?: number | null;
  durasiKemas?: number | null;
  totalWaktuSistem?: number | null;
}

export interface QueueSnapshot {
  id: string;
  sessionId: string;
  waktuPengamatan: string; // HH:MM:SS or HH:MM
  jumlahMenunggu: number;
  jumlahDilayani: number;
  jumlahMejaTerisi?: number | null;
  kondisi: string;
}

export interface ResourceLog {
  id: string;
  sessionId: string;
  waktuPeriode: string; // e.g., "11:00 - 13:00"
  jumlahKasir: number;
  jumlahKoki: number;
  jumlahPegawaiLain: number;
  jumlahKompor: number;
  jumlahWajan: number;
  kapasitasGoreng?: number;
  fasilitasLain?: string;
  pembagianTugas?: string;
}

export interface InterviewItem {
  id: string;
  sessionId: string;
  pertanyaan: string;
  jawaban: string;
  sumber: string; // Pemilik, Karyawan, Manajer, Kepala Dapur, Lainnya
  keterangan: string;
}

export interface NotificationState {
  show: boolean;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

