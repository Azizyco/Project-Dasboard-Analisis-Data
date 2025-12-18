# Sales Dashboard - Analytics Platform

Dashboard penjualan lengkap dengan analytics menggunakan **Vanilla JavaScript**, **Supabase**, dan **Chart.js**.

## 📋 Daftar Isi

- [Fitur](#-fitur)
- [Teknologi](#-teknologi)
- [Struktur Folder](#-struktur-folder)


---

## ✨ Fitur

### 🔐 Authentication
- Login & Register menggunakan Supabase Auth
- Role-based access control (Admin / Viewer)
- Auto-redirect jika belum login

### 📊 Dashboard Analytics
- **Statistik Real-time:**
  - Total penjualan
  - Produk terlaris
  - Wilayah dengan permintaan tertinggi
  - Average Order Value (AOV)

- **Visualisasi Data:**
  - Top 10 penjualan per produk (Bar Chart)
  - Penjualan per wilayah (Bar Chart)
  - Tren penjualan bulanan (Line Chart)
  - Tren per produk (Line Chart dengan filter)
  - AOV per wilayah (Bar Chart)
  - Distribusi rating (Doughnut Chart)

- **Filter Data:**
  - Filter berdasarkan tanggal (range)
  - Filter berdasarkan produk
  - Filter berdasarkan wilayah

### 👨‍💼 Admin Panel
- Upload data CSV dengan drag & drop
- Data validation & cleaning otomatis:
  - Trim whitespace
  - Validasi format tanggal
  - Validasi quantity & unit_price (harus >= 0)
  - Auto-calculate total
  - Skip baris invalid dengan pesan error
- Preview data sebelum upload
- Batch insert (200 rows per request) untuk performa optimal
- Progress indicator saat upload

---

## 🛠 Teknologi

| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| **HTML5** | - | Struktur halaman |
| **CSS3** | - | Styling (responsive, modern UI) |
| **JavaScript** | ES6+ | Logic aplikasi (Vanilla JS, no framework) |
| **Supabase** | 2.x | Backend (Postgres DB + Auth + RLS) |
| **Chart.js** | 4.4.0 | Visualisasi data |
| **Live Server** | - | Development server (optional) |

---

## 📁 Struktur Folder

```
Nama Project ku
│
├── css/
│   └── styles.css              # Semua styling aplikasi
│
├── js/
│   ├── supabaseClient.js       # Konfigurasi Supabase client
│   ├── auth.js                 # Helper functions untuk authentication
│   ├── utils.js                # Utility functions (format, validate, dll)
│   ├── dashboard.js            # Logic untuk dashboard page
│   └── admin.js                # Logic untuk admin page
│
├── login.html                  # Halaman login/register
├── dashboard.html              # Halaman dashboard analytics
├── admin.html                  # Halaman admin (upload CSV)
│
└── README.md                   # Dokumentasi ini
```

---


