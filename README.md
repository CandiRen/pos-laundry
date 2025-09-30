# LaundryPOS

Aplikasi Point of Sale (POS) laundry berbasis web yang berjalan sepenuhnya di browser. LaundryPOS membantu kasir mencatat pesanan, pelanggan, outlet, layanan, metode pembayaran, kasir, dan pengeluaran sekaligus menyediakan fitur lanjutan seperti pencetakan nota, ekspor laporan Excel, serta berbagi status pesanan melalui tautan dan QR code.

## Cara Menjalankan

1. Buka file `index.html` di browser modern (disarankan Chrome atau Edge versi terbaru).
2. Semua data tersimpan otomatis di browser melalui `localStorage`. Gunakan tombol **Backup Data** untuk mengunduh cadangan dalam format JSON dan **Import Data** untuk memuat ulang cadangan tersebut.

## Fitur Utama

- **Kelola Pesanan**: Form kasir untuk membuat pesanan dengan dukungan multi-layanan, diskon, biaya tambahan, dan perhitungan otomatis.
- **Kelola Pelanggan**: Simpan profil pelanggan, lihat riwayat pesanan, dan buka detail lewat modal.
- **Kelola Outlet/Cabang**: Daftar outlet tak terbatas yang bisa dipakai pada pesanan atau pengeluaran.
- **Kelola Layanan/Produk**: Atur layanan beserta harga dan satuan (kg/pcs/dll) secara fleksibel.
- **Kelola Metode Pembayaran**: Konfigurasi metode pembayaran seperti tunai, transfer bank, atau e-wallet.
- **Kelola Kasir**: Catat akun kasir dengan role/PIN untuk kebutuhan pembatasan akses manual.
- **Kelola Pengeluaran**: Catat biaya operasional per outlet, filter per bulan, dan hapus jika perlu.
- **Cetak Nota & Kustomisasi Tampilan**: Atur identitas bisnis, alamat, footer nota, lalu cetak melalui jendela pop-up siap print.
- **WhatsApp & QR Code**: Kirim pesan status otomatis via WhatsApp dan hasilkan QR code untuk tautan status.
- **Status Pesanan Real-time**: Tautan `?order=...` menampilkan halaman status yang diperbarui begitu kasir mengganti status di aplikasi (pastikan aplikasi di-host pada domain yang sama untuk pelanggan).
- **Laporan Excel (.xls)**: Ekspor data pesanan, pendapatan, pengeluaran, atau laba-rugi ke format Excel 97+ (HTML table) yang mudah dianalisis di Excel/LibreOffice.
- **Backup & Restore**: Simpan seluruh data ke file JSON dan pulihkan kapan saja.

## Alur Penggunaan Singkat

1. **Konfigurasi Awal**: Atur outlet, layanan, metode pembayaran, kasir, dan preferensi nota melalui menu masing-masing.
2. **Mencatat Pesanan**: Buka menu *Kelola Pesanan*, pilih pelanggan (atau tambahkan baru), tentukan layanan, isi diskon/biaya tambahan bila ada, lalu simpan.
3. **Memperbarui Status**: Gunakan tombol ⏱️ untuk maju ke status berikutnya (Diterima → Dicuci → ... → Selesai). Tautan status dan QR otomatis menampilkan kemajuan kepada pelanggan.
4. **Cetak / Kirim Nota**: Gunakan tombol 🖨️ untuk pratinjau cetak atau 💬 untuk membuka WhatsApp dengan pesan siap kirim.
5. **Laporan & Backup**: Export laporan Excel sesuai periode, serta rutin lakukan backup JSON.

## Catatan Teknis

- **Penyimpanan**: Seluruh data berada di `localStorage`. Bersihkan browser akan menghapus data, jadi lakukan backup terlebih dahulu.
- **Status Publik**: Pelanggan hanya dapat membuka tautan status ketika aplikasi di-host pada domain/URL yang sama (contoh: di-deploy ke Netlify/Vercel atau server internal). Jika hanya dibuka lokal, tautan hanya berfungsi di perangkat yang sama.
- **QR Code & Ekspor Excel**: Menggunakan generator QR bawaan (`qr.js`) dan ekspor HTML-table ke `.xls` sehingga tidak membutuhkan pustaka eksternal ataupun koneksi internet.
- **Kompatibilitas**: Optimalkan untuk layar desktop/tablet. Mode responsif dasar tersedia, tetapi pemasangan di kasir tablet lebih disarankan.

## Struktur Proyek

```
.
├── index.html      # Halaman utama aplikasi
├── styles.css      # Gaya tampilan (layout, tabel, tombol, dsb)
├── app.js          # Logika aplikasi dan manajemen state
├── qr.js           # Library QR code mandiri
└── README.md       # Dokumentasi ini
```

## Pengembangan Lanjutan

- Tambahkan autentikasi kasir dan kontrol akses berbasis role.
- Integrasikan dengan backend/API untuk sinkronisasi multi-perangkat secara real time.
- Tambahkan perhitungan otomatis pajak/PPN atau paket berlangganan.
- Integrasikan printer Bluetooth secara native (misal melalui Web Bluetooth atau aplikasi pendamping).

Selamat menggunakan LaundryPOS! Jika menemukan bug atau ingin menambah fitur, cukup edit file HTML/CSS/JS di atas dan refresh browser.
