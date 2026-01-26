🐟 SMIKOLE
Smart Monitoring & Intelligent Control for Lele Farming

SMIKOLE adalah aplikasi monitoring dan kontrol budidaya ikan lele berbasis IoT dan Artificial Intelligence.
Aplikasi ini membantu pembudidaya memantau kualitas air kolam, mengendalikan perangkat pendukung, dan mengambil keputusan berbasis data. Semua tanpa harus berdiri di pinggir kolam seharian.
Proyek ini dikembangkan sebagai bagian dari Capstone / Tugas Akhir Teknik Komputer Universitas Diponegoro.
________________________________________
🎯 Tujuan Sistem

•	Memantau kualitas air kolam secara real-time
•	Menjaga kondisi lingkungan kolam tetap optimal
•	Memberikan peringatan dini saat kondisi berisiko
•	Membantu pengambilan keputusan budidaya berbasis AI
Singkatnya: mengurangi tebak-tebakan, menekan risiko kematian ikan.
________________________________________
🚀 Fitur Utama
•	Monitoring Kualitas Air
-	Suhu
-	pH
-	Dissolved Oxygen (DO)

•	Dashboard Berbasis Web (PWA)
-	Visualisasi data sensor
-	Status perangkat & aktuator
-	Notifikasi anomali

•	Kontrol Aktuator
-	Water heater (manual & otomatis)

•	Analisis Berbasis Artificial Intelligence
-	Deteksi anomali kualitas air (LSTM)
-	Rekomendasi kondisi kolam
-	Prediksi Feed Conversion Ratio (FCR)

•	Notifikasi
- Push notification saat kondisi kolam tidak normal
-	Pencatatan aktivitas budidaya
________________________________________
🧠 Gambaran Sistem

SMIKOLE mengintegrasikan sensor kualitas air dengan mikrokontroler ESP32 untuk mengirimkan data ke cloud secara aman. Data tersebut dianalisis menggunakan model AI untuk mendeteksi anomali dan menghasilkan rekomendasi. Seluruh informasi ditampilkan melalui dashboard web yang dapat diakses dari mana saja.
Pengguna juga dapat mengendalikan aktuator secara langsung melalui dashboard apabila diperlukan.
Tidak ada sulap. Semua berbasis data.
________________________________________
🛠️ Teknologi yang Digunakan

Perangkat Keras
•	ESP32
•	Sensor Suhu (DS18B20)
•	Sensor pH
•	Sensor Dissolved Oxygen
•	Relay & Water Heater

Perangkat Lunak
•	Frontend: React (Progressive Web App)
•	Backend: Cloud Function
•	Database: Firebase Firestore

•	AI / Machine Learning:
-	LSTM (Deteksi anomali kualitas air)
-	Random Forest (Prediksi FCR)
  
•	Komunikasi: HTTPS & REST API

•	Cloud: Google Cloud Platform (GCP)
________________________________________
📌 Catatan Penggunaan

•	Sistem membutuhkan koneksi internet untuk pengiriman data
•	Saat koneksi terputus, data tidak akan tampil real-time
•	Pengujian dilakukan pada kolam skala kecil
•	Hasil tidak langsung merepresentasikan skala industri besar
Realistis lebih penting daripada overclaim.
________________________________________
👥 Tim Pengembang

•	Christenta Tirta Pradieva
Software Engineer
•	Lucky Barga Aretama
Hardware Engineer
•	Nicolaus Evan Widyatna
Machine Learning Engineer
________________________________________
📄 Lisensi

Proyek ini dikembangkan untuk kepentingan akademik.
Penggunaan dan penyebaran mengikuti kebijakan Departemen Teknik Komputer Universitas Diponegoro.

