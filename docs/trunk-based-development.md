# Trunk-Based Development (TBD) & CI/CD Deployment Guide

Dokumen ini menjelaskan strategi percabangan (*branching strategy*) **Trunk-Based Development (TBD)** dan alur otomatisasi **CI/CD Pipeline** yang diterapkan pada repositori monorepo e-commerce ini (`apps/web`, `services/*`, `packages/*`).

---

## 🎯 1. Apa itu Trunk-Based Development?

**Trunk-Based Development (TBD)** adalah strategi pengelolaan kode sumber di mana semua pengembang mengintegrasikan perubahan kecil secara sering ke dalam satu cabang utama (*single trunk*). 

Pada repositori ini:
- **Trunk Utama:** Branch **`production`** berfungsi sebagai satu-satunya *source of truth*.
- **Short-Lived Feature Branches:** Setiap perubahan dibuat melalui cabang berumur pendek (beberapa jam hingga 1-2 hari), kemudian digabungkan (*merge*) kembali ke `production` melalui Pull Request setelah lolos uji otomatisasi CI.

### Mengapa TBD untuk Monorepo Microservices?
1. **Mencegah "Merge Hell":** Menghindari konflik penggabungan kode besar antar-layanan.
2. **Fast Feedback Loop:** Menguji kompatibilitas antar-microservice secara dini.
3. **Continuous Delivery Siap Pakai:** Setiap commit di `production` selalu berstatus siap rilis (*production-ready*).
4. **Otomatisasi Watchtower di VPS:** Commit yang mendarat di `production` langsung memicu pembuatan image Docker baru di GHCR, yang kemudian otomatis ditarik oleh Watchtower ke VPS.

---

## 🌿 2. Konvensi Penamaan Branch

Cabang fitur dibuat dengan format terstruktur agar mudah diidentifikasi oleh tim dan path-filter CI:

| Format Branch | Contoh | Tujuan |
| :--- | :--- | :--- |
| `feat/<service>/<nama-fitur>` | `feat/auth/add-clerk-sso` | Menambah fitur baru pada service tertentu |
| `fix/<service>/<deskripsi-bug>` | `fix/product/btree-index-timeout` | Memperbaiki bug atau regresi performa |
| `perf/<service>/<optimasi>` | `perf/order/pg-connection-pooling` | Optimasi latensi atau pemakaian resource |
| `chore/<scope>/<tugas>` | `chore/ci/add-e2e-tester-army` | Pembaruan dependensi, CI/CD, atau tooling |
| `docs/<topik>` | `docs/trunk-based-development` | Penulisan atau revisi dokumentasi |

---

## 🔄 3. Alur Kerja Pengembang (Developer Workflow)

```text
[ Branch: production ] 
       │
       ├─────────► 1. Buat Short-Lived Branch: git checkout -b feat/order/add-discount
       │              │
       │           2. Kembangkan kode secara lokal & uji (make test / bun test)
       │              │
       │           3. Push branch ke GitHub & Buka Pull Request (PR)
       │              │
       │           4. CI Terpicu Otomatis (Selective Path Testing & E2E)
       │              ├── Gagal ──► Perbaiki di branch yang sama
       │              └── Lulus  ──► Review & Approval (Centang Hijau ✔)
       │              │
       ◄──────────────┴─ 5. Squash and Merge ke `production`
       │
       ├─► 6. CI Pasca-Merge Jalan Ulang (Verifikasi Integrasi Nyata)
       │
       └─► 7. CD Jalan Otomatis (Build Docker Image → Push GHCR)
              │
              ▼
       8. Watchtower di VPS mendeteksi image baru (Poll 60s) → Auto-Restart Container
```

### Langkah-Langkah Praktis:

#### Langkah 1: Sinkronkan Branch Utama
Pastikan branch `production` lokal Anda adalah yang paling mutakhir:
```bash
git checkout production
git pull origin production
```

#### Langkah 2: Buat Cabang Baru
```bash
git checkout -b feat/product/add-bulk-export
```

#### Langkah 3: Lakukan Perubahan & Uji Secara Lokal
Jalankan pengujian unit sesuai service yang Anda ubah:
```bash
# Contoh untuk Go service:
go test -v ./services/product-service/...

# Contoh untuk NestJS order-service:
bun run --cwd services/order-service test

# Contoh untuk Frontend Next.js:
bun test --cwd apps/web
```

#### Langkah 4: Commit dan Push
Gunakan format Conventional Commits:
```bash
git add .
git commit -m "feat(product): add bulk CSV export endpoint"
git push -u origin feat/product/add-bulk-export
```

#### Langkah 5: Buka Pull Request & Squash Merge
- Buka Pull Request dengan target base branch: **`production`**.
- Tunggu CI Pipeline selesai dan berstatus hijau.
- Lakukan **Squash and Merge** agar riwayat commit di `production` tetap linier dan bersih.

---

## ⚙️ 4. Alur Kerja CI/CD Pipeline (`.github/workflows/ci-cd.yml`)

Pipeline kami memisahkan tanggung jawab antara fase **Integrasi (CI)** dan fase **Deployment (CD)**:

### A. Selective Path Filtering (`dorny/paths-filter@v3`)
Untuk menghemat runner minutes dan mempercepat eksekusi, pipeline mendeteksi direktori mana yang mengalami perubahan:
- Perubahan di `apps/web/**` hanya memicu test frontend & E2E.
- Perubahan di `services/product-service/**` hanya memicu test `product-service`.
- Perubahan di `packages/shared-go/**` memicu test pada seluruh Go microservice.

### B. Matriks Pengujian CI
Setiap microservice memiliki job CI mandiri:
1. `CI: Web Frontend (Lint, Typecheck & Bun Unit Tests)`
2. `CI: E2E Playwright Tests (@e2e-dev/web)`
3. `CI: API Gateway (Vet & Test)`
4. `CI: Auth Service (Vet & Test)`
5. `CI: Product Service (Vet & Test)`
6. `CI: Order Service NestJS (Build & Test)`
7. `CI: Payment Service (Vet & Test)`

### C. Mengapa CI Dijalankan Sebelum DAN Sesudah Merge?
| Kondisi | Event GitHub | Yang Dijalankan | Tujuan |
| :--- | :--- | :--- | :--- |
| **Sebelum Merge** | `pull_request` | **Hanya CI (Test & Lint)** | Sebagai **Quality Gate** untuk mencegah kode yang rusak masuk ke `production`. CD dimatikan agar tidak membuat image dari branch yang belum tentu di-merge. |
| **Setelah Merge** | `push` ke `production` | **CI Ulang + CD (Build Image)** | Memverifikasi bahwa hasil penggabungan (*actual merged state*) benar-benar hijau di trunk. CD memiliki dependensi `needs: [test-...]`, sehingga Docker image **hanya dibuat jika CI di trunk berhasil 100%**. |

---

## 🚢 5. Siklus Otomatisasi CD & Watchtower di VPS

1. **Build Multi-Platform & Push ke GHCR:**
   Ketika commit mendarat di `production`, pipeline membangun image Docker production menggunakan cache GitHub Actions (`type=gha`) dan mempublikasikannya ke GitHub Container Registry:
   - `ghcr.io/<owner>/ecommerce-web:latest`
   - `ghcr.io/<owner>/ecommerce-api-gateway:latest`
   - `ghcr.io/<owner>/ecommerce-auth-service:latest`
   - `ghcr.io/<owner>/ecommerce-product-service:latest`
   - `ghcr.io/<owner>/ecommerce-order-service:latest`
   - `ghcr.io/<owner>/ecommerce-payment-service:latest`

2. **Watchtower Auto-Deployment di VPS:**
   Container `ecommerce-watchtower` di VPS memantau GHCR setiap 60 detik (`WATCHTOWER_POLL_INTERVAL=60`):
   - Jika terdapat digest image baru dengan label `com.centurylinklabs.watchtower.enable=true`, Watchtower otomatis melakukan `docker pull`.
   - Melakukan *graceful stop* pada container lama dan menyalakan container baru dengan konfigurasi volume dan network yang sama.
   - Menghapus image lama secara otomatis (`WATCHTOWER_CLEANUP=true`) untuk mencegah kapasitas disk VPS penuh.

---

## 🛡️ 6. Aturan Kunci (Golden Rules)

1. **Trunk Harus Selalu Hijau (*Keep the Trunk Green*):**
   Jika terjadi kegagalan build di branch `production`, perbaikan regresi menjadi prioritas utama tim sebelum menambahkan fitur lain.
2. **Jangan Biarkan Branch Berumur Panjang:**
   Pecah fitur besar menjadi bagian-bagian kecil (*small batches*) yang dapat di-merge dalam waktu kurang dari 2 hari. Gunakan *feature flag* jika fitur belum siap dirilis ke pengguna publik.
3. **Squash and Merge:**
   Gunakan tombol *Squash and merge* di GitHub agar riwayat git di `production` mewakili satu commit yang bermakna (*meaningful atomic commit*).
