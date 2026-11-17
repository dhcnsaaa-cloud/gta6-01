# Visual Audit — HALCYON BAY v6 HUD pass (gta6-01)
Tanggal: 2026-11-18 (sesudah 5 perbaikan HUD v6). Penilai: Pakdhe Joko (self-review).
Rubrik: 1–10 per dimensi. Gate: cover < 7 di dimensi apa pun = JANGAN SUBMIT.
Shot 1–3 di-retake segar 18 Nov dari build v6 final, 0 JS error di semua shot.
Shot 4 TIDAK di-retake: title screen, HUD tersembunyi — tidak ada yang berubah di frame itu.

| Shot | Kesan pertama | Aksi hidup | Artefak/glitch | Komposisi | Terlihat jadi | Rata-rata |
|---|---|---|---|---|---|---|
| 1-chase.jpg (cover) | 9 | 9 | 9 | 9 | 9 | **9,0** |
| 2-foot.jpg (garage) | 8 | 7 | 9 | 8 | 8 | **8,0** |
| 3-drive.jpg | 8 | 8 | 8 | 8 | 8 | **8,0** |
| 4-start.jpg (v5, tidak retake) | 9 | 7 | 10 | 9 | 9 | **8,8** |

## Cover (1-chase.jpg) — 9,0, TETAP (v5 juga 9,0) — kini 5 sistem HUD baru terbaca
- Kejar-kejaran 4 bintang, 3 mobil polisi + glow lampu, cone spotlight heli menyapu jalan + pool cahaya di Meridian kuning, heli kuning/hitam BESAR di tengah-kanan atas, pejalan kaki panik, 123 mph.
- **Baru di v6, semua terbaca di cover:** `PISTOL · 24 ammo` (kotak kiri bawah, dulu disembunyikan saat nyetir); panel `🚔 BAY PD RESPONSE` di bawah minimap — PELICAN 1 · R. Doyle · 20m · PURSUING, HELI 2-7 · AIR · 27m · OVERHEAD, KESTREL 2 · T. Marsh · 31m · PURSUING; jarak objektif `◉ Collect crate 1/3 at the Harbor — 211s left · 149m`; chip `REP · SMALL-TIME · 2/12 JOBS` di bawah chip hari; `NEXT ▸ 4 · THE BIG SCORE — Old Sal` di bawah strip misi.
- HUD lengkap lama tetap: MISSION 3/12 — HARBOR RUN · Mara Solis ⏱ 211s, DAY 2 · 18:07, MERIDIAN · 82%, DOWNTOWN HEAT 62, ticker dispatch heli, minimap + marker heli oranye.
- Nit: satu mobil polisi terpotong di tepi atas; label tanah "DOWNTOWN" sebagian tertutup strip misi. Bukan glitch — framing (sama seperti v5).
- Skor tidak naik dari 9,0 meski sistem bertambah: band atas kini padat (4 baris teks tengah + kolom kanan penuh). Semuanya masih di jalurnya masing-masing dan terbaca — tapi tidak ada ruang lagi; HUD baru apa pun harus masuk kotak yang sudah ada, bukan baris baru.

## 2-foot.jpg — RICO'S GARAGE — 8,0, TETAP
- Panel MY CARS: 3 mobil (Comet/Meridian/Stallion + level Engine/Armour + HP), 3 upgrade + harga, wallet $1,480, tombol Close (B).
- HUD belakang ikut membuktikan perbaikan v6: `PISTOL · 24 ammo`, `REP · SMALL-TIME · 1/12 JOBS`, `◉ Next job: 2 · GETAWAY DRIVER — go to the gold marker · 106m`.
- Nit: label tanah "OLD TOWN" sebagian tertutup panel (panel yang jadi subjek — wajar).

## 3-drive.jpg — 8,0, TETAP
- Comet kuning di tengah jalan, 121 mph, MISSION 8/12 — THREE STOPS, ONE NIGHT · Old Sal ⏱ 118s, DAY 2 · 20:15, ticker Mara, traffic di sekitar.
- **Baru di v6:** `PISTOL · 24 ammo`, `REP · KNOWN WHEELMAN · 7/12 JOBS`, jarak objektif `· 40m`, `NEXT ▸ 9 · THE CHASE — Old Sal · DAY 3`, panel `BAY PD RESPONSE — PELICAN 1 · R. Doyle · 76m · EN ROUTE` (1 bintang, 1 unit).
- Nit: mobil traffic biru menempel bumper Comet kuning di tengah frame — itu traffic yang sedang menyalip, bukan glitch; label tanah "PALM H…" terpotong tepi frame (cropping kamera, bukan tabrakan).

## 4-start.jpg — 8,8 (v5, tidak retake)
- Blurb sistem (12 misi / 3 hari / garasi / heli / city remembers), poster WANTED + reputasi (NOBODY · 0/12 jobs), kontrol B/N terbaca.

## Verdict
**LULUS — semua shot ≥ 7 di semua dimensi, cover 9,0 (target 9 TERCAPAI, dipertahankan).** Boleh lanjut ke bundle + tunjukin ke kink.

## Yang berubah di v6 (konteks audit)
- 5 perbaikan HUD, semua terverifikasi di browser headless (25/25 cek dinamis lolos, 0 JS error): senjata tampil saat nyetir; panel unit polisi bernama + jarak + status; jarak ke objektif (meter, 1 unit ≈ 0,1 m); chip reputasi; preview misi berikutnya.
- **Tabrakan baru yang ketemu + diperbaiki saat retake:** garis distrik `NAMA — catatan` (~360 px di PALM HILLS / SUNSET STRIP / MARINA BEACH) menabrak chip REP di bawah chip hari — ekor catatannya hilang di balik chip. Perbaikan: garis distrik kini nama saja (`PALM HILLS`, `DOWNTOWN`) — catatan tetap ada di label tanah dunia. Cover + 3-drive di-retake ulang sesudah perbaikan; tabrakan hilang.
- **Staging drive shot digeser:** mobil di-stage di x=2300 (bukan 2450) — cruise 10 frame sebelum freeze bisa menempuh ~180 unit dan melewati tepi timur PALM HILLS (x=2600) ke celah tanpa distrik, sehingga HUD sempat membaca HALCYON BAY. Sesudah geser, freeze tetap di PALM HILLS.
- Capture: kit capture-shots.py --only per shot (fresh browser tiap shot), 0 error JS di semua shot.
