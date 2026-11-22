# 📘 Panduan Instalasi — Student Assessment **PRO v2.0.0**

Versi PRO adalah instalasi utama. Dibanding v1, ada lima tambahan:

| Tambahan | Isinya |
|---|---|
| 🔐 **Rahasia aman** | Token Fonnte, kunci sesi, dan kunci hash hanya disimpan di **Script Properties**. Tidak ada di kode, Sheets, atau browser. Sandi staf memakai hash iteratif. |
| ⚡ **Turbo** | Cache berlapis, antrean notifikasi (tombol tetap instan), pemanasan server 3 lapis, beberapa permintaan digabung jadi satu, dan polling yang menyesuaikan aktivitas. |
| 💬 **WhatsApp & Notifikasi** | Fonnte + Email dengan saklar utama per kanal dan matriks per kejadian. Blast per batch 10/20/50 dan cek nomor WhatsApp. |
| 📇 **CRM Kontak** | Siswa, orang tua/wali, staf, dan peserta uji coba dalam satu daftar (Nama · Email · WhatsApp). Ada tag, opt-out, catatan interaksi, import, dan ekspor Excel. |
| 🗃️ **Migrasi Data** | Import dari spreadsheet app lama yang aman diulang: dry-run, delta sync, tanpa data ganda. |
| 📱 **PWA** | Aplikasi bisa dipasang di layar utama HP dan terbuka instan. Ada tawaran "Perbarui" saat versi baru rilis. |

| Bagian | Tempat | Berkas |
|---|---|---|
| **Backend** | Google Apps Script + Google Sheets | 8 berkas `.gs` + `appsscript.json` (folder `backend/`) |
| **Frontend** | GitHub Pages | folder `student-assessment/` (index.html, css, js, icons, manifest.json, sw.js) |

---

## A. BACKEND — Google Apps Script

### A1. Buat proyek
1. Buka **https://script.google.com** dengan akun Google sekolah, lalu klik **Proyek baru**.
2. Ganti judul menjadi **Student Assessment**.

### A2. Masukkan 8 berkas kode
1. Ganti nama berkas `Code.gs` bawaan menjadi **Kode**, lalu tempel isi **Kode.gs**.
2. Klik **＋ → Skrip** untuk setiap berkas berikut: **Konten**, **Skoring**, **Layanan**, **Notifikasi**, **CRM**, **Migrasi**, **Setup**. Tempel isi berkas yang sesuai. Ketik nama tanpa ".gs".
3. Buka ⚙️ **Setelan proyek**, lalu centang **"Tampilkan file manifes appsscript.json"**. Buka `appsscript.json` di editor, ganti seluruh isinya, lalu 💾 **Simpan**.
   > Manifes PRO menambah izin **`script.external_request`**, yang dibutuhkan untuk menghubungi Fonnte.

### A3. Jalankan setup
1. Pilih fungsi **`setupAppEnvironment`**, lalu klik ▶ **Jalankan**. Berikan izin: **Tinjau izin → Lanjutan → Buka … (tidak aman) → Izinkan**.
2. Buka **Log eksekusi** dan catat **EMAIL & KATA SANDI ADMIN**. Sandi hanya tampil sekali, jadi ganti setelah login pertama.
3. *(Opsional)* Jalankan **`isiDataDemo`** untuk membuat data contoh (lihat Bagian H).

> ✅ **Aman dijalankan berulang.** Setup PRO tidak menimpa data maupun rahasia. Menjalankannya lagi akan:
> - melengkapi sheet atau kolom yang belum ada,
> - menambah pengaturan baru,
> - memasang ulang trigger.
>
> Jalankan lagi setiap kali Anda memperbarui kode backend.

**Trigger yang dipasang otomatis:**

| Trigger | Jadwal | Tugas |
|---|---|---|
| `pekerjaMenit` | tiap 1 menit | mengirim antrean WA/email, cek nomor WA baru, sinkron CRM, pemanasan cache, tulis log |
| `pekerjaHarian` | 01.00 | membuka/menutup periode, pengingat periode, membersihkan data uji coba lama |
| `ringkasanMingguan` | Senin 07.00 | ringkasan progres ke Guru BK & Pimpinan |

### A4. Deploy Web App
**Terapkan → Deployment baru → Aplikasi web**, lalu isi:
- **Jalankan sebagai:** Saya
- **Akses:** Siapa saja

Klik **Terapkan**, lalu salin URL berakhiran **`/exec`**.

Cek: buka `URL/exec?w=pub`. Jika muncul `{"success":true,…,"warm":"pengaturan,konten,kelas,publik"}`, backend sudah aktif dan cache-nya sudah dipanaskan ✅

---

## B. FRONTEND — GitHub Pages (+ PWA)

1. Ekstrak **student-assessment.zip**. Foldernya **`student-assessment/`** langsung berisi `index.html`, `manifest.json`, `sw.js`, `css/`, `js/`, dan `icons/`.
2. Buka `js/config.js` dan ganti `https://script.google.com/macros/s/XXXX/exec` dengan URL dari A4. **Hanya URL ini** yang ada di frontend; tidak ada token atau kunci lain.
3. Upload lewat terminal dari folder `student-assessment` (langkah sama seperti v1):
   ```
   git init
   git add .
   git commit -m "Student Assessment PRO v2.0.0"
   git branch -M main
   git remote add origin https://github.com/USERNAME/student-assessment.git
   git push -u origin main
   ```
   Saat diminta password, tempel **Personal Access Token** (`ghp_…`). Jangan upload lewat web GitHub, karena folder bisa rusak.
4. Buka **Settings → Pages → Deploy from a branch → main / (root) → Save**. Situs tayang di `https://USERNAME.github.io/student-assessment/`.

### B1. Pasang di HP (PWA)
- **Android (Chrome):** buka situs. Akan muncul kartu **"Pasang Student Assessment"** — ketuk **Pasang**, atau lewat menu ⋮ → **Instal aplikasi**.
- **iPhone (Safari):** ketuk ikon **Bagikan** → **Tambahkan ke Layar Utama**.
- Saat Anda merilis versi baru, pengguna melihat **"Versi baru tersedia → Perbarui"**. Siswa yang sedang mengerjakan tes tidak akan dipaksa memuat ulang.
- PWA hanya aktif di **https** (GitHub Pages otomatis https).

---

## C. Langkah awal Admin

1. **Pengaturan**: isi nama sekolah, logo, tahun ajaran, dan tema.
2. **Import Siswa**: unduh templat baru. Kolom kontak bersifat opsional: **No WA Siswa, Email Siswa, Nama Wali, No WA Wali, Email Wali**.
   > Jika siswa sudah ada, centang **"Perbarui kontak & tanggal lahir siswa yang sudah ada"** untuk melengkapi nomor WA tanpa membuat data ganda.
3. **Kelola Staf**: isi **WhatsApp** guru, lalu tetapkan **Wali kelas dari**. Wali kelas menerima WA/email saat kelasnya tuntas.
4. **Kelola Periode**: sesuaikan tanggal.
5. **WhatsApp & Notifikasi**: lihat Bagian D.

---

## D. WhatsApp (Fonnte) & Email

### D1. Siapkan Fonnte
1. Daftar di **https://fonnte.com**, tambahkan perangkat, lalu scan QR dengan WhatsApp sekolah.
2. Salin **Token** perangkat dari dashboard Fonnte.

### D2. Isi token di aplikasi
**Menu WhatsApp & Notifikasi → Pengaturan → Token Fonnte**:
1. Tempel token, lalu klik **Simpan**. Token dikirim ke server dan disimpan di **Script Properties**. Setelah itu yang tampil hanya versi tersamar (`Toke••••••345`).
2. Klik **Cek Perangkat**. Status harus **terhubung**.
3. Nyalakan saklar **WhatsApp (Fonnte)**, isi **URL aplikasi** (klik "Pakai alamat ini"), lalu klik **Simpan Pengaturan**.
4. Uji dengan **Tes WA** ke nomor Anda dan **Tes Email ke saya**.

### D3. Matriks notifikasi (default sesuai keputusan sekolah)

| Kejadian | Penerima | WA | Email |
|---|---|:-:|:-:|
| **Kelas tuntas** | Wali kelas | ✅ | ✅ |
| Ringkasan hasil siswa | Orang tua/wali | ⬜ | ⬜ |
| Periode tes dibuka | Siswa | ⬜ | ⬜ |
| Pengingat 3 hari sebelum ditutup | Siswa yang belum tuntas | ⬜ | ⬜ |
| Akun staf dibuat / sandi direset | Staf (sandi **tidak** ikut dikirim) | ⬜ | ⬜ |
| Kode lanjut uji coba | Peserta | ⬜ | ✅ |
| Ringkasan mingguan | BK & Pimpinan | ⬜ | ✅ |

- Nyalakan atau matikan per kejadian. Klik ✏️ untuk mengubah isi pesan; pratinjau WhatsApp tampil langsung.
- Mematikan **saklar utama** menghentikan semua pesan otomatis di kanal itu.
- Pesan tidak dikirim saat tombol diklik. Pesan masuk antrean dan terkirim dalam hitungan detik (lewat browser) atau paling lambat ±1 menit (lewat trigger).

### D4. Blast WhatsApp
**Blast WA → pilih penerima** (dari CRM berdasarkan segmen/kelas/tag/status WA, dari **pilihan CRM**, atau **daftar manual** khusus admin):
1. Klik **Muat Penerima**, lalu *(disarankan)* **Cek nomor ke WhatsApp**.
2. Tulis pesan. Placeholder yang tersedia: `{nama}`, `{sekolah}`, `{link}`. Format: `*tebal*`, `_miring_`.
3. Pilih **10/20/50 pesan per batch** dan jeda (mis. `3-8` detik acak), lalu klik **Buat Blast**.
4. Lihat **Riwayat Blast** untuk progres. Tombol **Kirim batch berikutnya** memproses seketika. **Hentikan** membatalkan pesan yang belum terkirim.

Nomor ganda dan kontak **opt-out** otomatis dilewati. Guru BK hanya bisa mengirim ke siswa dan wali di unitnya.

**Kuota:** Gmail biasa ±100 email/hari, Google Workspace ±1.500/hari (sisa kuota terlihat di Pengaturan). Kuota WA mengikuti paket Fonnte.

---

## E. CRM Kontak
- Kontak terisi otomatis dari Siswa, Wali, Staf, dan Peserta Uji Coba. Sinkron berjalan tiap ±30 menit dan saat data sumber berubah, atau manual lewat tombol **Sinkron**.
- Pencarian dan filter berjalan instan di perangkat. Klik baris untuk melihat detail: tag, catatan, opt-out, catatan interaksi (telepon/tatap muka/WA), dan riwayat pesan.
- Aksi massal: **Kirim WA**, **Tag/Hapus tag**, **Opt-out/Opt-in**. Admin juga bisa **Gabung** kontak ganda dan menghapus kontak manual.
- **Import** kontak luar (Nama, WhatsApp, Email, Tag) aman diulang. **Excel** mengekspor daftar sesuai hak akses.
- Hak akses: **Admin & Pimpinan** melihat semua kontak. **Guru BK** hanya siswa dan wali di unit binaannya. Pimpinan hanya bisa melihat dan mengekspor.

---

## F. Migrasi dari App Lama (v1) & Cutover

> App lama **tidak diubah**, hanya dibaca. Pasang app PRO di **akun Google yang sama** dengan app lama.

1. Ambil **kunci hash lama**: buka proyek Apps Script lama → ⚙️ **Setelan proyek → Properti skrip**, lalu salin nilai **`HASH_PEPPER`**.
2. Di app PRO buka **Migrasi Data**:
   - tempel URL spreadsheet database lama,
   - tempel kunci hash lama,
   - pilih data yang ingin dipindahkan,
   - klik **Pindai (Dry-run)**. Tabel menampilkan jumlah yang *akan* ditambah atau diperbarui tanpa menulis apa pun.
3. Klik **Jalankan Import**.
   - Siswa dan staf lama tetap masuk dengan **tanggal lahir/sandi yang sama**. Hash diperbarui otomatis saat mereka login.
   - Akun staf yang emailnya sudah ada di app baru (mis. admin hasil setup) **tidak ditimpa**.
   - Jawaban yang sudah *selesai* di app baru tidak disentuh. Draf diperbarui jika versi lama lebih baru.
4. Periksa data. Uji masuk dengan 1 akun siswa lama dan 1 akun guru lama.
5. **Tepat sebelum pindah**, jalankan import sekali lagi (*delta sync*). Hanya data baru yang ditambahkan.
6. Umumkan alamat baru (Blast WA), lalu arsipkan deployment app lama.

Batasan: sesi login lama tidak ikut pindah, jadi pengguna cukup masuk ulang sekali. Untuk data sangat besar (>20 ribu baris per sheet), import per kelompok sheet. Prosesnya aman diulang.

---

## G. Keamanan & Perawatan

### G1. Daftar rahasia (semuanya di Script Properties)

| Kunci | Diisi oleh | Keterangan |
|---|---|---|
| `TOKEN_SECRET` | setup (otomatis) | menandatangani sesi login. Rotasi: jalankan `rotasiSecretSesi` (semua pengguna keluar) |
| `HASH_PEPPER` | setup (otomatis) | kunci hash tanggal lahir & sandi. **Jangan dihapus**, karena semua login akan gagal |
| `HASH_PEPPER_LAMA` | menu Migrasi | kunci hash app lama (opsional) |
| `FONNTE_TOKEN` | menu WhatsApp & Notifikasi | hanya lewat dashboard admin, tampil tersamar |
| `SPREADSHEET_ID`, `ROOT_FOLDER_ID`, `ARSIP_FOLDER_ID` | setup | ID database & folder |

Siapa pun yang punya akses **edit** proyek Apps Script bisa melihat Script Properties. Batasi editor proyek hanya untuk orang tepercaya.

### G2. Fungsi editor yang berguna

| Fungsi | Kegunaan |
|---|---|
| `cekPerforma` | laporan status cache, antrean, trigger, dan ukuran Script Properties |
| `resetSandiAdmin` | sandi admin hilang → sandi baru tampil sekali di log |
| `matikanKeepWarm` / `nyalakanKeepWarm` | menghemat kuota trigger (antrean & CRM tetap jalan) |
| `rotasiSecretSesi` | keluarkan semua sesi (mis. bila perangkat admin hilang) |

**Kuota trigger:** akun @gmail ±90 menit/hari, Workspace ±6 jam/hari. `pekerjaMenit` langsung berhenti jika tidak ada pekerjaan (±10–20 menit/hari). Menu **Sistem & Performa** menampilkan status trigger, cache, kuota email, dan kecepatan di perangkat. Di console browser, ketik `Perf.summary()` untuk melihat rata-rata waktu per aksi.

### G3. Memperbarui
- **Backend:**
  1. Tempel kode baru, lalu Simpan.
  2. Jalankan `setupAppEnvironment`.
  3. Pilih **Terapkan → Kelola deployment → ✏️ Edit → Versi baru → Terapkan**. Jangan "Deployment baru", karena URL `/exec` akan berubah.
- **Frontend:** naikkan `VERSI` di `sw.js` dan `?v=` di `index.html`, lalu `git add . && git commit -m "Pembaruan" && git push`. Pengguna PWA akan ditawari tombol **Perbarui**.

### G4. Rollback ke versi sebelumnya
1. Jalankan `matikanKeepWarm`.
2. Pastikan menu **Antrean & Log** kosong (klik **Proses sekarang**).
3. Tempel kode lama, lalu deploy **Versi baru** (bukan deployment baru).

Data tetap aman karena kolom baru hanya ditambahkan di akhir sheet. Trigger menjalankan kode yang *tersimpan*, bukan versi deployment.

---

## H. Akun demo (`isiDataDemo`)

| Peran | Email | Sandi |
|---|---|---|
| Guru | guru@demo.sch.id | demo12345 |
| Guru BK SMA / SMP | bk.sma@demo.sch.id / bk.smp@demo.sch.id | demo12345 |
| Pimpinan | kepsek@demo.sch.id | demo12345 |
| Siswa | pilih nama di 7A / 8B / 10 IPA 1 / 11 IPS 1 | tanggal lahir **15-01-2010** |

Nonaktifkan akun demo sebelum dipakai resmi.

---

## I. Pemecahan masalah

| Gejala | Solusi |
|---|---|
| "GAS_URL belum diisi" | isi `js/config.js`, lalu push ulang |
| WA tidak terkirim | **Cek Perangkat** harus *terhubung*; saklar WA nyala; kejadian dicentang WA di matriks; nomor penerima valid (08…). Lihat alasan gagal di **Antrean & Log** → **Ulangi yang gagal** |
| "Isi token Fonnte dulu" | simpan token di tab Pengaturan sebelum menyalakan saklar WA |
| Cek nomor WA gagal | paket Fonnte belum mendukung fitur *validate*; blast tetap bisa tanpa filter |
| Email tidak terkirim | kuota Gmail habis (lihat sisa kuota); coba lagi besok |
| Antrean tidak jalan saat aplikasi ditutup | trigger `pekerjaMenit` belum terpasang → jalankan `setupAppEnvironment` |
| Tombol "Pasang" tidak muncul | buka lewat **Chrome** dan **https**; di iPhone pakai menu Bagikan |
| Siswa lama tidak bisa login setelah migrasi | kunci hash lama belum diisi → isi di Migrasi Data, lalu Jalankan lagi |
| Data diubah langsung di Sheets belum tampil | tunggu ≤10 menit atau klik **Segarkan** di menu terkait |
| Nomor WA kehilangan angka 0 di Sheets | sudah ditangani otomatis (kolom teks + normalisasi 08…) |

---

## J. Hasil uji sebelum diserahkan (simulator GAS + Chromium)
- **Backend PRO: 76/76 lulus**, mencakup:
  - setup idempoten,
  - allowlist & penyamaran token,
  - antrean tanpa UrlFetch/email saat lock dipegang,
  - kelas tuntas → WA + email ke wali kelas,
  - CRM & lingkup BK,
  - cek nomor WA, blast per batch + fallback, opt-out,
  - migrasi v1 → PRO (dry-run, idempoten, delta sync, login tanggal lahir lama),
  - audit kebocoran rahasia,
  - cache admin & pemanasan.
- **Regresi v1: semua skenario lama lulus**: siswa, guru, BK, pimpinan, admin, PDF, dan uji coba.
- **Uji browser PRO: 36/36 lulus**, termasuk PWA (service worker & manifest), pindah 6 menu ±0,9 detik tanpa menunggu server, drain antrean otomatis, dan 0 error JavaScript.
