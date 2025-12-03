# AA Turret Simulator

## 1. Penjelasan Proyek
AA Turret Simulator adalah sebuah simulasi 3D interaktif yang memungkinkan pengguna untuk mengendalikan sebuah menara anti-pesawat (Anti-Aircraft Turret) untuk menembak jatuh target pesawat yang terbang di sekitar area. Proyek ini menggabungkan visualisasi grafis 3D berbasis web dengan kontrol fisik menggunakan perangkat keras Arduino.

Fitur utama dari simulator ini meliputi:
- **Dual Viewports**:
  - **External View**: Tampilan orang ketiga yang memperlihatkan menara dan lingkungan sekitar secara keseluruhan.
  - **Scope View**: Tampilan orang pertama dari sudut pandang meriam, lengkap dengan *crosshair* untuk membidik target.
- **Sistem Kontrol Hibrida**: Mendukung input dari keyboard komputer maupun kontroler fisik berbasis Arduino.
- **Mekanika Gameplay**:
  - Sistem penembakan proyektil.
  - Deteksi tabrakan (collision detection) antara proyektil dan pesawat.
  - Fitur *Auto-Targeting* dengan prediksi pergerakan target.
  - Efek suara untuk tembakan dan ledakan.
  - Penghitung amunisi dan skor (hits).

## 2. Penjelasan Teknologi
Proyek ini dibangun menggunakan kombinasi teknologi web modern untuk antarmuka dan logika simulasi, serta C++ untuk pemrograman mikrokontroler.

- **Three.js**: Pustaka JavaScript 3D yang digunakan untuk merender grafis, menangani kamera, pencahayaan, dan objek 3D (menara, pesawat, lingkungan) di dalam browser.
- **Web Serial API**: Teknologi browser yang memungkinkan komunikasi langsung antara halaman web (JavaScript) dan perangkat keras eksternal (Arduino) melalui port serial (USB).
- **Arduino Platform**: Digunakan untuk membuat antarmuka kontrol fisik, membaca input analog dari potensiometer dan input digital dari tombol, lalu mengirimkan data tersebut ke browser.

## 3. Penjelasan Stack
Berikut adalah rincian *tech stack* dan alat yang digunakan dalam proyek ini:

### Frontend (Web Simulation)
- **HTML5**: Struktur dasar halaman web dan kontainer untuk kanvas 3D.
- **CSS3**: Styling untuk tata letak *viewport*, overlay antarmuka (HUD), dan panel status.
- **JavaScript (Vanilla)**: Bahasa pemrograman utama untuk logika permainan, inisialisasi Three.js, dan penanganan input.
- **Library**: `Three.js` (v0.152.0) dimuat melalui CDN.

### Hardware (Controller)
- **Bahasa**: C++ (Arduino Sketch).
- **Perangkat Keras**:
  - Papan Arduino (Uno/Nano/dll).
  - 2x Potensiometer (untuk kontrol Pitch dan Yaw).
  - 1x Push Button (untuk tombol Fire).
- **Komunikasi**: Serial Communication (Baud Rate: 9600).

### Struktur File
- `index.html`: File utama aplikasi web.
- `script.js`: Berisi seluruh logika simulasi, rendering 3D, dan komunikasi serial.
- `style.css`: File gaya untuk mempercantik tampilan antarmuka.
- `arduino/controller.ino`: Kode program (firmware) untuk mikrokontroler Arduino.

## 4. Konfigurasi Hardware (Arduino)
Jika ingin menggunakan kontroler fisik, rangkai komponen dengan konfigurasi pin berikut (sesuai `controller.ino`):

| Komponen | Pin Arduino | Fungsi |
|----------|-------------|--------|
| Potentiometer 1 | A0 | Kontrol Pitch (Naik/Turun) |
| Potentiometer 2 | A1 | Kontrol Yaw (Kiri/Kanan) |
| Push Button | D2 | Tombol Tembak (Fire) |

*Catatan: Tombol menggunakan mode INPUT_PULLUP, sehingga harus terhubung ke Ground saat ditekan.*
