<p align="center">
  <img src="docs/brand/stockroute-logo.png" alt="StockRoute" width="320" />
</p>

<h1 align="center">StockRoute</h1>

<p align="center">
  <strong>Çok Kiracılı (Multi-Tenant) Kurumsal Envanter &amp; Kaynak Yönetim Sistemi</strong><br/>
  Şubeler arası stok hareketlerini tek platformdan, gerçek zamanlı yönetin.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/React%20Native-Expo%20SDK%2052-000020?logo=expo&logoColor=white" alt="React Native (Expo)" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Socket.io-010101?logo=socketdotio&logoColor=white" alt="Socket.io" />
  <img src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white" alt="pnpm" />
</p>

---

## İçindekiler

- [Proje Hakkında](#proje-hakkında)
- [Ekran Görüntüleri](#ekran-görüntüleri)
- [Temel Özellikler](#temel-özellikler)
- [Teknoloji Yığını](#teknoloji-yığını)
- [Mimari](#mimari)
- [Monorepo Yapısı](#monorepo-yapısı)
- [Hızlı Başlangıç](#hızlı-başlangıç)
- [Uygulama Kullanımı](#uygulama-kullanımı)
- [API Dokümantasyonu (Scalar)](#api-dokümantasyonu-scalar)
- [Veri Modeli](#veri-modeli)
- [RBAC — Rol/Yetki Matrisi](#rbac--rolyetki-matrisi)
- [Gerçek Zamanlı Olaylar](#gerçek-zamanlı-olaylar)
- [Test & Kalite](#test--kalite)
- [Sorun Giderme](#sorun-giderme)
- [Proje Dokümantasyonu](#proje-dokümantasyonu)
- [Git Workflow & Katkı](#git-workflow--katkı)
- [Yol Haritası & Kapsam](#yol-haritası--kapsam)
- [Kapsam Kararları & Gelecek İyileştirmeler](#kapsam-kararları--gelecek-iyileştirmeler)

---

## Proje Hakkında

Çok şubeli firmalarda envanter genellikle her şubede ayrı ve kontrolsüz tutulur; şubeler arası transferler telefon/Excel ile yürütülür, stok tutarsızlıkları oluşur ve merkezi görünürlük yoktur. **StockRoute** bu süreci dijitalleştirir, firma bazında izole eder ve anlık görünür kılar.

Sistem üç temel direk üzerine kuruludur:

1. **Multi-Tenancy** — Her firmanın (tenant) verisi mantıksal olarak izole edilir; bir firma başka bir firmanın verisini hiçbir koşulda göremez.
2. **RBAC** — Aynı firma içinde kullanıcılar rollerine göre (Firma Admini, Şube Yöneticisi, Depo Sorumlusu, Saha Personeli) farklı yetkilere sahiptir.
3. **Gerçek Zamanlılık** — Bir şubedeki stok değişimi veya transfer, ilgili tüm kullanıcıların ekranına anlık yansır.

Çıktı tek bir **monorepo** içinde üç uygulamadan oluşur: **Backend API (NestJS)**, **Web Yönetim Paneli (React)** ve **Mobil Saha Uygulaması (React Native / Expo)**. Web ve API **Docker** ile tek komutla ayağa kalkar; mobil uygulama Expo ile cihaz/emülatörde çalışır.

> 📘 Bu projenin tek doğruluk kaynağı (single source of truth) kökteki [implementation_plan.md](implementation_plan.md) dosyasıdır. Tüm mimari kararlar, veri modeli ve yol haritası orada detaylandırılmıştır.

## Ekran Görüntüleri

Aşağıdaki görseller GenAI ile üretilen **tasarım mockup'larıdır**; uygulanan ekranlar bu mockup'lara sadık kalınarak geliştirilmiştir. Geliştirme sürecinde alınan **gerçek uygulama ekran görüntüleri** `docs/day14-web-outputs/` … `docs/day19-mobile-outputs/` klasörlerindedir.

### Web Yönetim Paneli

| Dashboard | Envanter | Transferler |
|---|---|---|
| <img src="docs/design/mockups/web-dashboard.png" width="260" /> | <img src="docs/design/mockups/web-envanter.png" width="260" /> | <img src="docs/design/mockups/web-transferler.png" width="260" /> |

| Ürünler | Şubeler | Kullanıcılar |
|---|---|---|
| <img src="docs/design/mockups/web_urunler.png" width="260" /> | <img src="docs/design/mockups/web_subeler.png" width="260" /> | <img src="docs/design/mockups/web_kullanicilarr.png" width="260" /> |

### Mobil Saha Uygulaması

| Şube Stoğu | Barkod Tara | Gelen Transferler |
|---|---|---|
| <img src="docs/design/mockups/mobile-stok.png" width="200" /> | <img src="docs/design/mockups/mobile-tara.png" width="200" /> | <img src="docs/design/mockups/mobile-transferler.png" width="200" /> |

## Temel Özellikler

- 🏢 **Firma (tenant) onboarding** — Firma kaydı otomatik olarak izole bir tenant alanı ve ilk Firma Admini oluşturur.
- 🔒 **Katı veri izolasyonu** — JWT `tenantId` claim'i + Prisma Client Extension ile tüm sorgulara otomatik tenant filtresi; geliştirici unutsa bile veri sızması engellenir. E2E testle doğrulanır (çapraz tenant erişimi).
- 👥 **Rol bazlı yetkilendirme (RBAC)** — 5 rol, `RolesGuard` + `@Roles(...)` decorator ile her endpoint'te zorunlu.
- 🏬 **Şube, ürün ve envanter yönetimi** — Şube bazlı stok takibi, düşük stok eşiği (`minThreshold`), manuel stok düzeltme.
- 🔄 **Şubeler arası transfer iş akışı** — Durum makinesi ile uçtan uca: talep → onay → sevk → teslim. Çoklu ürün (header-line) desteği, negatif stok engeli.
- 📝 **Stok izlenebilirliği (audit trail)** — Tüm stok artış/azalışları `InventoryLog` ile kayıt altında; transferlerde sevk/teslim eden kullanıcı takibi (accountability).
- ⚡ **Gerçek zamanlı güncellemeler** — Socket.io ile tenant bazlı room'lar; web panelinde yapılan bir değişiklik mobil dahil tüm istemcilere anlık yansır.
- 📱 **Mobil saha uygulaması** — Şube stok görüntüleme, `expo-camera` ile barkod okuyarak ürün + şube stoğu sorgulama, gelen transferleri teslim alma, canlı güncelleme.
- 🇹🇷 **Uçtan uca Türkçe arayüz** — API doğrulama hataları dahil tüm kullanıcıya dönen mesajlar Türkçedir.
- 🧯 **Tutarlı hata sözleşmesi** — Global exception filter ile tüm hatalar tek ve öngörülebilir JSON formatında döner.
- 📖 **Modern API dokümantasyonu** — OpenAPI şeması + **Scalar** arayüzü (`/docs`), "try it" destekli.
- 🐳 **Dockerize** — `docker compose up` ile db + api + web tek komutla ayağa kalkar (nginx ters vekil ile tek origin).

## Teknoloji Yığını

Tüm yığın **TypeScript** ailesindendir; tek dil sayesinde backend, web ve mobil arasında tipler paylaşılır ve bağlam değiştirme maliyeti minimumdur.

| Katman | Teknoloji |
|---|---|
| Monorepo yönetimi | pnpm workspaces + Turborepo |
| Konteynerizasyon | Docker + Docker Compose (web imajı: nginx, ters vekil) |
| Backend | NestJS (Node.js + TypeScript, Clean Architecture) |
| ORM / Veritabanı | Prisma ORM + PostgreSQL 16 |
| Kimlik & Yetki | Passport.js + JWT + NestJS Guards |
| Gerçek zamanlı | Socket.io (NestJS WebSocket Gateway) |
| API dokümantasyonu | OpenAPI (`@nestjs/swagger`) + Scalar (`@scalar/nestjs-api-reference`) |
| Web | React 18 + TypeScript + Vite + Material UI (MUI) |
| Web state/data | TanStack Query + Zustand |
| Mobil | React Native 0.76 (Expo SDK 52) + Expo Router |
| Mobil kamera/geri bildirim | `expo-camera` (CameraView) + `expo-haptics` |
| Mobil güvenli depolama | `expo-secure-store` (JWT saklama) |
| Mobil gerçek zamanlı | `socket.io-client` (tenant room + TanStack Query invalidate) |
| Paylaşılan tipler | TypeScript (`packages/shared-types`) |
| Tasarım token'ları | `packages/ui-tokens` (web MUI teması + mobil tema tek kaynaktan) |
| Validation | class-validator + class-transformer (API), Zod + react-hook-form (form) |
| Test | Jest + Supertest (API: birim + e2e) |
| Kod kalitesi | ESLint + Prettier (`packages/config`) |

## Mimari

### Multi-Tenancy Stratejisi

**Shared DB + Discriminator (`tenantId`)** yaklaşımı kullanılır: tüm tablolar ortak veritabanında durur, her kayıt `tenantId` taşır. İzolasyon iki katmanla zorlanır:

1. **Tenant çözümleme** — Login'de JWT içine `tenantId` claim'i gömülür. Her istekte `TenantContextService` (AsyncLocalStorage) bu değeri okuyup istek boyunca taşır. WebSocket bağlantısında token doğrulanır ve istemci `tenant_{id}` room'una alınır.
2. **Prisma Client Extension** — Tüm sorgulara otomatik `where: { tenantId }` eklenir; `create`/`update`'te `tenantId` otomatik atanır.

```
İstek → [JWT'den tenantId] → TenantContextService → Prisma Client Extension
                                                  → Sadece o tenant'ın verisi döner
```

> Bu yüzden servis katmanındaki Prisma sorgularına **manuel `tenantId` yazılmaz**; yalın yazılır ve extension ekler. Çapraz tenant erişiminin engellendiği `tenant-isolation.e2e-spec.ts` ile test edilir.

### Katmanlı Backend (Clean Architecture)

```
┌───────────────────────────────────────────────┐
│ API (Presentation)   Controllers, Gateways,    │
│                      Guards, Middleware        │
├───────────────────────────────────────────────┤
│ Application          Use-case, DTO, Validation │
├───────────────────────────────────────────────┤
│ Domain               Entity/enum, iş kuralları │
├───────────────────────────────────────────────┤
│ Infrastructure       Prisma, Auth, Tenant ext. │
└───────────────────────────────────────────────┘
```

**Bağımlılık yönü:** dıştan içe (API → Application → Domain). Domain hiçbir katmana bağımlı değildir. Controller'lar iş kuralı barındırmaz; doğrulama (DTO + global `ValidationPipe`) yapıp servise devreder.

### Dağıtım Topolojisi

```
                ┌───────────────┐
   tarayıcı ───▶│  web (nginx)  │───┐
                └───────────────┘   │  REST + WS
   mobil  ──────────────────────────┼───────────▶ ┌───────────────┐     ┌───────────────┐
   (Expo, local)                    └────────────▶│  api (NestJS) │───▶ │ db (Postgres) │
                                                  └───────────────┘     └───────────────┘
                         docker compose ile birlikte ayağa kalkar
```

## Monorepo Yapısı

```
stockroute/
├── apps/
│   ├── api/                  # NestJS backend (REST + WebSocket)
│   │   ├── prisma/           # schema.prisma, migrations, seed.ts
│   │   ├── src/
│   │   │   ├── api/          # controllers, guards, decorators, gateways
│   │   │   ├── application/  # DTO, interfaces
│   │   │   ├── modules/      # auth, branches, users, products, inventory, movements
│   │   │   └── infrastructure/  # prisma, tenant context/extension
│   │   └── test/             # e2e testleri (jest-e2e.json)
│   ├── web/                  # React + Vite yönetim paneli
│   │   └── src/features/     # auth, dashboard, branches, users, products,
│   │                         #   inventory, movements
│   └── mobile/               # React Native (Expo) saha uygulaması
│       ├── app/              # Expo Router: (auth)/login, (tabs)/index|scan|transfers
│       └── src/              # components, hooks, lib, theme
├── packages/
│   ├── shared-types/         # Ortak TS tipleri, enum, socket olay sözleşmeleri
│   ├── config/               # Ortak eslint / prettier / tsconfig
│   └── ui-tokens/            # Tasarım token'ları (renk, spacing, tipografi)
├── docs/
│   ├── brand/                # Logo, palet ve marka çalışmaları
│   ├── design/               # Tasarım sistemi ve GenAI ekran mockup'ları
│   └── dayNN-*-outputs/      # Günlük doğrulama çıktıları ve ekran görüntüleri
├── docker-compose.yml        # db + api + web servisleri
├── implementation_plan.md    # Tek doğruluk kaynağı (single source of truth)
├── pnpm-workspace.yaml
└── turbo.json
```

## Hızlı Başlangıç

### Ön Koşullar

- [Node.js](https://nodejs.org/) ≥ 20
- [pnpm](https://pnpm.io/) ≥ 9
- [Docker](https://www.docker.com/) + Docker Compose
- (Mobil için) [Expo Go](https://expo.dev/go) yüklü bir cihaz **veya** Android emülatörü / iOS simülatörü

### 1. Depoyu klonlayın ve bağımlılıkları kurun

```bash
git clone https://github.com/Dogukan-klkn/Truncgil_staj.git
cd Truncgil_staj
pnpm install
```

### 2. Ortam değişkenlerini hazırlayın

```bash
cp .env.example .env
```

Başlıca değişkenler:

```env
# --- API (apps/api) ---
# Not: Compose, PostgreSQL'i host'ta 5433'e eşler (yerelde kurulu bir
# PostgreSQL varsa 5432 ile çakışmasın diye). Geliştirme modunda API host'tan
# bağlandığı için port 5433'tür; container içinde bu eşleme geçerli değildir
# ve adres `db:5432` olur (bkz. docker-compose.yml).
DATABASE_URL=postgresql://stockroute:password@localhost:5433/stockroute
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=1d
API_PORT=3000
CORS_ORIGIN=http://localhost:5173

# --- Web (apps/web) ---
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000

# --- Mobile (apps/mobile) ---
# Verilmezse platforma göre akıllı varsayılan kullanılır:
#   Android emülatör → http://10.0.2.2:3000   (emülatörün host aliası)
#   iOS simulator    → http://localhost:3000
# Fiziksel cihazda LAN IP'nizi yazın (örn. http://192.168.1.10:3000).
EXPO_PUBLIC_API_URL=
EXPO_PUBLIC_SOCKET_URL=
```

> `.env` dosyaları `.gitignore`'dadır; repoya yalnızca `.env.example` girer. Production'da `JWT_SECRET` mutlaka değiştirilmelidir.

### 3a. Docker ile tümünü çalıştırın (demo)

Tek komut yeterlidir; veritabanı, API ve web panel birlikte ayağa kalkar:

```bash
docker compose up --build
```

Konteyner ilk açılışta göçleri uygular **ve demo verisini yükler** — ayrıca bir
adım gerekmez. (Seed `upsert` kullandığı için yeniden başlatmalarda güvenlidir.)

| Servis | Adres |
|---|---|
| Web Panel | http://localhost:5173 |
| API | http://localhost:3000 |
| API Dokümantasyonu (Scalar) | http://localhost:3000/docs |
| PostgreSQL | localhost:5433 |

**Demo giriş bilgileri** (seed ile oluşturulur):

| Alan | Değer |
|---|---|
| Firma kodu | `acme-lojistik` (ikinci firma: `globex-tedarik`) |
| E-posta | `admin@demo.test` |
| Parola | `DemoParola123` |

> İki firma, çok kiracılı izolasyonu göstermek için oluşturulur: aynı e-posta
> her iki firmada da geçerlidir, giriş yapılan firmayı **firma kodu** belirler.

Durdurmak için `docker compose down`; veritabanını da sıfırlamak için
`docker compose down -v`.

<details>
<summary>Docker mimarisi — tek origin (ters vekil)</summary>

Tarayıcı yalnızca web servisiyle konuşur (`:5173`). nginx, statik SPA'yı
servis eder ve `/api` ile `/socket.io` isteklerini api konteynerine iletir.
Bu sayede CORS yapılandırmasına gerek kalmaz ve gerçek zamanlı WebSocket
bağlantısı da aynı origin üzerinden yükseltilir.

```
tarayıcı ──▶ web (nginx :5173) ──┬─▶ /            statik SPA
                                 ├─▶ /api/*       api:3000
                                 └─▶ /socket.io/* api:3000 (WebSocket upgrade)
                                            │
                                            └─▶ db:5432 (PostgreSQL)
```

Vite ortam değişkenleri derleme zamanında gömüldüğü için `VITE_API_URL` ve
`VITE_SOCKET_URL` **göreli** verilir (bkz. `docker-compose.yml` → `build.args`);
böylece imaj tek bir host adına bağlanmaz.

</details>

### 3b. Geliştirme modu (önerilen)

Geliştirmede sadece veritabanı container'da çalışır; api ve web local'de hot-reload ile geliştirilir:

```bash
# 1. Veritabanını ayağa kaldır (yalnızca db servisi)
docker compose up db -d

# 2. Migration + seed
pnpm --filter api prisma migrate dev
pnpm --filter api prisma db seed

# 3. API + Web'i başlat (Turborepo)
pnpm dev
```

Bu modda web `:5173`'te Vite dev sunucusuyla çalışır ve API'ye **doğrudan**
`http://localhost:3000` üzerinden gider (ters vekil yoktur) — bu yüzden
`apps/web/.env` dosyasındaki `VITE_API_URL` / `VITE_SOCKET_URL` mutlak adres
olarak kalmalıdır. Göreli değerler yalnızca Docker imajı için kullanılır.

> `DATABASE_URL` içindeki portun **5433** olduğundan emin olun: compose db'yi
> host'ta bu porta eşler.

### 4. Mobil uygulama (Expo)

Mobil uygulama Docker'a alınmaz; cihaz/emülatörde çalışır. **API'nin ayakta olması gerekir** (3a veya 3b).

```bash
cd apps/mobile
pnpm start          # Metro bundler; ardından a (Android) / i (iOS) / QR kod
```

| Senaryo | `EXPO_PUBLIC_API_URL` |
|---|---|
| Android emülatör | boş bırakın → `10.0.2.2:3000` otomatik |
| iOS simulator | boş bırakın → `localhost:3000` otomatik |
| Fiziksel cihaz (Expo Go) | bilgisayarınızın LAN IP'si, örn. `http://192.168.1.10:3000` |

> **Kamera izni:** Barkod tarama ilk açılışta kamera izni ister. Reddedilirse ekran
> "Ayarlar'ı Aç" seçeneği sunar. Expo Go'da ayrıca Expo Go'nun kendi izin sorusu
> çıkar; bu Expo Go'ya özgüdür, standalone build'de görülmez.

## Uygulama Kullanımı

### Web Yönetim Paneli

| Sayfa | İşlev |
|---|---|
| **Dashboard** | Özet istatistikler, düşük stok uyarıları, son transferler |
| **Envanter** | Şube bazlı stok listesi, düşük stok filtresi, manuel stok düzeltme, eşik güncelleme |
| **Ürünler** | Ürün CRUD (ad, SKU, barkod, birim, kategori) |
| **Şubeler** | Şube CRUD |
| **Kullanıcılar** | Kullanıcı davet/rol atama, aktif-pasif yönetimi |
| **Transferler** | Transfer oluşturma (çoklu ürün) ve onay / red / sevk / teslim / iptal aksiyonları |

### Mobil Saha Uygulaması

| Sekme | İşlev |
|---|---|
| **Stok** | Şube stok listesi, ürün arama, düşük stok vurgusu, pull-to-refresh |
| **Tara** | `expo-camera` ile barkod okuma → ürün + **bu şubedeki miktar** kartı |
| **Transferler** | Bu şubeye gelen `IN_TRANSIT` transferler → **Teslim Al** |

**Şube kaynağı rol bazlıdır:** Şube listeleyebilen roller (`SUPER_ADMIN`, `FIRM_ADMIN`, `BRANCH_MANAGER`) şube seçiciden seçer; `WAREHOUSE_STAFF` / `FIELD_STAFF` kendi şubesine sabitlenir. Üç sekme de aynı şube kaynağını paylaşır, böylece "hangi şubeye bakıyorum?" belirsizliği oluşmaz.

> Mobil uygulama saha kullanımına odaklanır: görüntüle, tara, teslim al. Stok düzeltme ve transfer oluşturma/onaylama/sevk etme yönetsel işlemler olarak web panelindedir.

**Canlı güncelleme:** Mobil istemci de Socket.io ile tenant room'una bağlanır. Web panelinden bir transfer sevk edildiğinde **Gelen Transferler** listesi, teslim alındığında da **Stok** sekmesi elle yenileme gerekmeden tazelenir.

### Uçtan uca demo senaryosu

1. Web'de `acme-lojistik` / `admin@demo.test` ile giriş yapın.
2. **Ürünler**'den bir ürüne **barkod** ekleyin (örn. `8690637001239`).
3. **Envanter**'den iki şubeye stok girin.
4. **Transferler**'den A → B transferi oluşturun, **onaylayın** ve **sevk edin**.
5. Mobilde **Transferler** sekmesinde transfer görünür → **Teslim Al**.
6. Mobilde **Stok** sekmesinde hedef şubenin miktarının arttığını görün.
7. Mobilde **Tara** sekmesinden barkodu okutun → ürün ve güncel şube stoğu.

## API Dokümantasyonu (Scalar)

API şeması `@nestjs/swagger` ile **OpenAPI** olarak üretilir ve **Scalar** arayüzüyle sunulur:

> **http://localhost:3000/docs** — modern, aranabilir, "try it" destekli arayüz. Korumalı endpoint'ler için sağ üstteki **Authorize** ile `Bearer <token>` girin.

### Endpoint'ler

| Modül | Endpoint'ler |
|---|---|
| **Auth** | `POST /auth/register-tenant` · `POST /auth/login` · `GET /auth/me` |
| **Branches** | `GET/POST /branches` · `GET /branches/selectable` · `GET/PATCH/DELETE /branches/:id` |
| **Users** | `GET/POST /users` · `GET/PATCH/DELETE /users/:id` |
| **Products** | `GET/POST /products` · `GET /products/barcode/:barcode` · `GET/PATCH/DELETE /products/:id` |
| **Inventory** | `GET /inventory?branchId=&lowStock=` · `POST /inventory/adjust` · `PATCH /inventory/:id/threshold` |
| **Movements** | `GET/POST /movements` · `GET /movements/:id` · `POST /movements/:id/approve\|reject\|ship\|receive\|cancel` |

Tüm yanıtlar JSON'dur; korumalı endpoint'ler `Authorization: Bearer <token>` başlığı ister. Global `ValidationPipe` `whitelist` + `forbidNonWhitelisted` ile çalışır: tanımsız query/body alanı **400** ile reddedilir.

### Hata Sözleşmesi

Tüm hatalar **global exception filter** üzerinden geçer ve tek bir formatta döner; istemciler tek bir şekle göre kodlanır:

```json
{
  "statusCode": 400,
  "message": "Yetersiz stok",
  "error": "Bad Request",
  "path": "/movements/cm5x.../ship",
  "timestamp": "2026-07-25T09:14:22.117Z"
}
```

Doğrulama hatalarında `message` bir **dizi** olur ve mesajlar **Türkçedir**:

```json
{
  "statusCode": 400,
  "message": ["Geçerli bir e-posta adresi giriniz.", "Şifre en az 8 karakter olmalıdır."],
  "error": "Bad Request",
  "path": "/auth/login",
  "timestamp": "2026-07-25T09:14:22.117Z"
}
```

**Başlıca durum kodları:**

| Kod | Anlamı |
|---|---|
| `400` | Doğrulama hatası veya iş kuralı ihlali (örn. yetersiz stok) |
| `401` | Token yok, geçersiz veya kullanıcı pasif |
| `403` | Rol yetkisi yetersiz |
| `404` | Kayıt yok veya aktif tenant kapsamı dışında |
| `409` | Çakışma — benzersizlik ihlali (SKU/e-posta/şube kodu) **veya** başka kayıtlarca kullanılan bir kaydın silinmeye çalışılması |

> Silme işlemlerinde ilişkisel bütünlük korunur: envanter veya transfer kayıtlarında
> kullanılan bir ürün/şube silinmek istendiğinde Prisma'nın foreign-key hatası
> yakalanır ve anlaşılır bir **409** mesajına dönüştürülür
> (*"Bu ürün envanter veya transfer kayıtlarında kullanıldığı için silinemez."*).

## Veri Modeli

Çekirdek modeller: `Tenant` → `User`, `Branch`, `Product`, `Inventory` (şube × ürün stok), `StockMovement` + `StockMovementItem` (çoklu ürünlü transfer) ve `InventoryLog` (audit trail). Tam Prisma şeması için bkz. [implementation_plan.md — Bölüm 7](implementation_plan.md).

```
Tenant ─┬─▶ User ──────────────┐
        ├─▶ Branch ─┬──────────┼─▶ Inventory (branch × product, quantity, minThreshold)
        ├─▶ Product ┘          │
        ├─▶ StockMovement ─────┴─▶ StockMovementItem (movement × product, quantity)
        └─▶ InventoryLog (previousQuantity / newQuantity / quantityChange, type, user)
```

### Transfer Durum Makinesi

```
PENDING ──approve──▶ APPROVED ──ship──▶ IN_TRANSIT ──receive──▶ RECEIVED
   │                    │
   ├──reject──▶ REJECTED │
   └──cancel──▶ CANCELLED┘
```

- **approve** — sadece yetkili rol; stok henüz hareket etmez.
- **ship** — kaynak şubeden miktar düşülür (negatif stok engeli; her satır için ayrı kontrol).
- **receive** — hedef şubeye miktar eklenir (hedefte envanter kaydı yoksa oluşturulur); `inventory:updated` olayı yayılır.
- **reject / cancel** — stok değişmez; hareket sonlanır.

Stok etkileyen tüm geçişler **tek transaction** içinde yürütülür: stok güncellemesi ve `InventoryLog` kaydı ya birlikte yazılır ya da hiç yazılmaz.

Tüm stok hareketleri (`TRANSFER_IN`, `TRANSFER_OUT`, `MANUAL_ADJUSTMENT`, `INITIAL_STOCK`) `InventoryLog` tablosunda `previousQuantity` / `newQuantity` / `quantityChange` ile izlenebilir kalır.

## RBAC — Rol/Yetki Matrisi

Yetkiler `@Roles(...)` decorator'ı + `RolesGuard` ile **endpoint bazında** zorlanır. Aşağıdaki matris koddaki decorator'ları yansıtır:

| İşlem | SUPER_ADMIN | FIRM_ADMIN | BRANCH_MANAGER | WAREHOUSE_STAFF | FIELD_STAFF |
|---|:--:|:--:|:--:|:--:|:--:|
| Şube oluştur/güncelle/sil | — | ✅ | ❌ | ❌ | ❌ |
| Şube listele (yönetsel) | — | ✅ | ✅ | ❌ | ❌ |
| Şube listele (seçici, minimal) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Kullanıcı/rol yönetimi | — | ✅ | ❌ | ❌ | ❌ |
| Ürün oluştur/güncelle | — | ✅ | ✅ | ❌ | ❌ |
| Ürün sil | — | ✅ | ❌ | ❌ | ❌ |
| Ürün listele / barkodla sorgula | — | ✅ | ✅ | ✅ | ✅ |
| Stok görüntüle | — | ✅ | ✅ | ✅ | ✅ |
| Stok düzeltme | — | ✅ | ✅ | ✅ | ❌ |
| Düşük stok eşiği güncelle | — | ✅ | ✅ | ❌ | ❌ |
| Transfer **talep et** | ✅ | ✅ | ✅ | ✅ | ✅ |
| Transfer **onayla/reddet** | ✅ | ✅ | ✅ | ❌ | ❌ |
| Transfer **sevk et** | ✅ | ✅ | ✅ | ✅ | ❌ |
| Transfer **teslim al** | ✅ | ✅ | ✅ | ✅ | ✅ |

Tabloda `—` işareti, o uçta rolün **tanımlı olmadığını** gösterir (bkz. aşağıdaki `SUPER_ADMIN` notu).

### `SUPER_ADMIN` — platform yöneticisi rolü

`SUPER_ADMIN` şemada tanımlıdır ancak **bu sürümde uygulama içi bir rol olarak aktif değildir**. Firma oluşturma/askıya alma ve çapraz firma raporlama gibi **tenant-üstü** operasyonlar için ayrılmıştır.

Bunun mimari bir gerekçesi vardır: mevcut çok kiracılılık modeli, Prisma Client Extension ile **tenant bazlı** izolasyon üzerine kuruludur — her sorgu otomatik olarak aktif tenant'a kısıtlanır. Tenant-üstü bir rolün anlamlı olması için bu izolasyonun bilinçli şekilde delinebildiği **ayrı bir yetkilendirme katmanı** gerekir. Bu katman gelecek sürüm kapsamındadır.

Uygulama içindeki tüm işlemler firma yöneticisi (`FIRM_ADMIN`) ve altındaki rollerle yürütülür; `POST /users` formunda `SUPER_ADMIN` seçeneği bilinçli olarak sunulmaz.

### Yetkilendirme kapsamı

Yetkilendirme iki seviyede tasarlanmıştır:

| Seviye | Durum |
|---|---|
| **Tenant (firma) izolasyonu** | Uygulandı ve e2e testlerle doğrulandı — çapraz firma erişimi mümkün değildir. |
| **Rol bazlı endpoint yetkisi** | Uygulandı — her uçta `@Roles(...)` + `RolesGuard` zorunludur. |
| **Şube seviyesi veri kısıtı** | Bu sürümün kapsamı dışındadır; bkz. [Kapsam Kararları](#kapsam-kararları--gelecek-iyileştirmeler). |

## Gerçek Zamanlı Olaylar

İstemci `auth: { token }` ile bağlanır; sunucu token'ı doğrular ve istemciyi `tenant_{tenantId}` room'una ekler. Payload'lara `tenantId` **konmaz** — izolasyon room yönlendirmesiyle sağlanır.

| Olay | Payload | Ne zaman |
|---|---|---|
| `inventory:updated` | `{ branchId, productId, quantity }` | Stok düzeltme / transfer sevk-teslim |
| `movement:created` | `{ movement }` | Yeni transfer talebi |
| `movement:statusChanged` | `{ movementId, status, branchIds }` | Onay / sevk / teslim / red |
| `notification` | `{ type, title, message, level }` | Genel bilgilendirme (örn. düşük stok) |

Olay adları ve payload tipleri [`packages/shared-types/src/socket-events.ts`](packages/shared-types/src/socket-events.ts) içinde tek yerden yönetilir; hiçbir yerde hardcode string yazılmaz.

**Hem web hem mobil istemci** bu olayları dinler. Strateji, cache'e doğrudan yazmak yerine **TanStack Query invalidate**'tir: ilgili sorgu anahtarı geçersizleştirilir ve ekrandaki veri kendiliğinden tazelenir. Art arda gelen olaylar kısa bir pencerede birleştirilir (coalescing), böylece yoğun trafikte gereksiz istek üretilmez.

Pratikte: web panelinden bir transfer sevk edildiğinde, sahadaki mobil kullanıcının **Gelen Transferler** listesi elle yenileme gerekmeden güncellenir; teslim alındığında da her iki taraftaki stok görünümü anında değişir.

## Test & Kalite

```bash
# Tüm workspace (Turborepo): lint + typecheck + test
pnpm lint
pnpm typecheck
pnpm test

# Sadece API testleri (birim)
pnpm --filter api test

# API e2e testleri
pnpm --filter api test:e2e

# Mobil: tip kontrolü, lint ve production bundle
pnpm --filter mobile typecheck
pnpm --filter mobile lint
cd apps/mobile && npx expo export --platform android
```

**Mevcut test kapsamı:**

| Tür | Kapsam |
|---|---|
| **Birim (Jest)** | `inventory.service` (stok düzeltme, eşik, düşük stok kuralı), `movements.service` (durum makinesi, negatif stok engeli), `inventory.gateway` (olay yayını) |
| **E2E (Jest + Supertest)** | `tenant-isolation` (çapraz tenant erişimi engelleniyor), `movements` (transfer uçtan uca), `realtime` (socket olayları) |

**Test stratejisi:** Otomatik test eforu, hatanın en pahalı olduğu yere — **iş mantığı ve veri izolasyonuna** — yoğunlaştırılmıştır. Stok hareketleri, transfer durum makinesi ve tenant izolasyonu testsiz merge edilmez.

İstemci katmanları (web/mobil) ise **strict TypeScript + ESLint + üretim derlemesi** ile statik olarak, ekran bazlı senaryo doğrulamasıyla da görsel olarak kontrol edilir. Her geliştirme gününün doğrulama çıktıları ve ekran görüntüleri `docs/dayNN-*-outputs/` altında kayıtlıdır; böylece her ekranın hangi senaryolarla (boş durum, hata, yetki, düşük stok vb.) sınandığı izlenebilir.

## Sorun Giderme

| Belirti | Sebep / Çözüm |
|---|---|
| `P1001: Can't reach database server` | Compose db `5433`'e eşlenir. `DATABASE_URL` portunun **5433** olduğundan emin olun (container içinden `db:5432`). |
| Mobilde "Sunucuya ulaşılamadı" | Emülatörde `localhost` cihazın kendisidir. `EXPO_PUBLIC_API_URL`'i boş bırakın (otomatik `10.0.2.2`) veya fiziksel cihazda LAN IP verin. |
| Web build'de `zod/v4/core` bulunamadı | pnpm fallback çözümlemesi kaymış olabilir. Kökte `pnpm install` tekrar çalıştırın; `pnpm.packageExtensions` peer beyanı bunu sabitler. |
| `prisma` tipleri bulunamıyor / test suite açılmıyor | Temiz kurulum sonrası `pnpm --filter api exec prisma generate` çalıştırın (postinstall her zaman tetiklenmez). |
| Expo `Port 8081 is being used` | Önceki Metro süreci açık. Kapatın veya farklı porta izin verin. |
| Türkçe karakterler bozuk kaydediliyor (`�`) | API'ye PowerShell/curl ile veri gönderirken gövde ANSI'ye düşebilir. Gövdeyi UTF-8 dosyaya yazıp `curl --data-binary "@dosya"` ile gönderin. |
| Ürün/şube silinemiyor (`409`) | Kayıt envanter veya transfer geçmişinde kullanılıyor. İlişkili kayıtlar temizlenmeli ya da kayıt `isActive: false` ile pasife alınmalıdır. |
| Mobilde liste canlı güncellenmiyor | Socket, API ile **aynı** adrese bağlanır. `EXPO_PUBLIC_SOCKET_URL` verdiyseniz `EXPO_PUBLIC_API_URL` ile aynı host/port olduğundan emin olun. |

## Proje Dokümantasyonu

| Doküman | İçerik |
|---|---|
| [implementation_plan.md](implementation_plan.md) | Tek doğruluk kaynağı — tam plan, veri modeli, API sözleşmesi |
| [docs/brand/](docs/brand/) | Logo, renk paleti ve marka çalışmaları |
| [docs/design/design-system.md](docs/design/design-system.md) | Tasarım sistemi (renk / tipografi / spacing token'ları) |
| [docs/design/mockups/](docs/design/mockups/) | GenAI ile üretilen ekran mockup'ları |
| [docs/docker-outputs/](docs/docker-outputs/) | Dockerize doğrulama çıktıları |
| `docs/day12–13-test-outputs/` | Test fazı çıktıları (birim + e2e) |
| `docs/day14–17-web-outputs/` | Web panel geliştirme çıktıları ve ekran görüntüleri |
| `docs/day18–19-mobile-outputs/` | Mobil uygulama çıktıları ve ekran görüntüleri |

## Git Workflow & Katkı

- `main` korumalıdır; doğrudan push yapılmaz, her değişiklik **feature branch + PR** ile gelir.
- Branch adlandırma: `feature/<modül>` (örn. `feature/mobile-barcode-scanner`).
- Commit mesajları **Conventional Commits** + monorepo scope formatındadır:

| Önek | Örnek |
|---|---|
| `feat(scope):` | `feat(mobile): add barcode product lookup and result card` |
| `fix(scope):` | `fix(api): prevent negative stock on transfer` |
| `refactor(scope):` | `refactor(mobile): read selected branch from the shared store` |
| `test(scope):` | `test(api): cover transfer approval` |
| `docs:` / `design:` / `chore:` | `docs: update implementation plan` |

- PR açıklamasında yapılanlar madde madde listelenir ve ilgili issue `Closes #N` ile bağlanır.
- En az 1 onay alınmadan merge edilmez.

## Yol Haritası & Kapsam

Proje 20 iş günlük (4 hafta) bir sprint planıyla geliştirilmiştir:

| Hafta | Hedef | Durum |
|---|---|:--:|
| **1** | Monorepo + Docker + marka + DB + tenancy + auth | ✅ |
| **2** | RBAC + onboarding + çekirdek domain (transfer iş akışı) | ✅ |
| **3** | Testler (birim + e2e) + real-time + web panel | ✅ |
| **4** | Mobil saha uygulaması + real-time + tam dockerize + teslim | ✅ |

Ürün sınırlarının nerede çizildiği ve gelecek yönelimler için bkz. [Kapsam Kararları & Gelecek İyileştirmeler](#kapsam-kararları--gelecek-iyileştirmeler).

## Kapsam Kararları & Gelecek İyileştirmeler

Bu bölüm, ürünün sınırlarının **nerede ve neden** çizildiğini belgeler. Aşağıdaki maddeler bilinçli mühendislik kararlarıdır; her biri için gerekçe ve gelecek yönelim verilmiştir.

### Yetkilendirme

**Şube seviyesi veri kısıtı.** Yetkilendirme bu sürümde iki seviyede uygulanmıştır: tenant (firma) izolasyonu ve rol bazlı endpoint yetkisi. Üçüncü bir seviye olan "kullanıcı yalnızca kendi şubesinin verisini görebilsin" kısıtı, istemci tarafında (web envanter ekranı ve mobil `useEffectiveBranch`) uygulanır; sunucu tarafında zorlanması gelecek sürüme planlanmıştır.

Gerekçe: bu kısıtın sunucuda zorlanması API, web ve mobil olmak üzere üç katmanın şube çözümleme mantığını birlikte değiştirmeyi gerektirir. Çalışan ve doğrulanmış bir sistemde bu kapsamdaki bir değişiklik, teslim penceresinde taşınabilir bir risk değildir. Kritik olan güvenlik sınırı — **firmalar arası izolasyon** — uygulanmış ve e2e testlerle kanıtlanmıştır.

**`SUPER_ADMIN` rolü.** Tenant-üstü platform yöneticisi olarak ayrılmıştır; bu sürümde uygulama içi rol olarak aktif değildir. Ayrıntılı gerekçe için bkz. [RBAC bölümü](#rbac--rolyetki-matrisi).

### Kullanıcı ve şifre akışı

Kullanıcı hesapları firma yöneticisi tarafından web panelinden oluşturulur; başlangıç şifresi yönetici tarafından belirlenip personele iletilir. Yönetici, `PATCH /users/:id` ile şifreyi sıfırlayabilir (alan boş bırakılırsa şifre değişmez).

Üretim senaryosunda bunun yerine **davet e-postası + ilk girişte şifre değiştirme zorunluluğu** olmalıdır. Bu akış SMTP altyapısı, süreli davet token'ı ve e-posta şablonu gerektirdiğinden bu sürümün kapsamına alınmamıştır; kullanıcı yönetimi, küçük ekiplerde yaygın olan yönetici-tanımlı şifre modeliyle çalışır.

### API tasarımı

- **`GET /inventory` tek ürün filtresi.** Uç, şube bazlı liste döndürecek şekilde tasarlanmıştır; tek ürünün stoğu istemcide eşleştirilir. Mobil tarama akışı, stok ekranıyla **aynı sorgu anahtarını** paylaştığı için bu veri çoğunlukla cache'ten gelir ve ek istek üretmez — ayrıca iki ekranın aynı sayıyı göstermesi garanti edilir. Ürün sayısı yüksek şubelerde `productId` filtresi eklenmesi doğal bir sonraki adımdır.
- **`GET /movements` şube filtresi.** `branchId`, şubenin **kaynak veya hedef** olduğu tüm hareketleri döndürür — bu, "şubenin transfer geçmişi" görünümü için doğru davranıştır. Mobildeki "gelen kutusu" bu kümeyi hedef şubeye göre daraltır.
- **Silme semantiği.** Kayıtlar kalıcı olarak silinir; ilişkisel bütünlük foreign-key kontrolüyle korunur ve kullanımda olan kayıtlar **409** ile reddedilir. Arşivleme davranışı (soft delete) gerektiğinde `isActive` alanı bu amaç için şemada hazırdır.
- **Sayfalama.** Liste uçları sayfalama parametresi almaz. Hedeflenen kullanım ölçeğinde (firma başına şube/ürün/transfer adedi) tam liste dönüşü tercih edilmiştir; veri hacmi arttığında `skip`/`take` eklenmesi planlanmaktadır.

### Mobil kapsam

Mobil uygulama **saha kullanımına** odaklanır: görüntüleme, barkod tarama ve teslim alma. Stok düzeltme, transfer oluşturma/onaylama/sevk etme gibi yönetsel işlemler bilinçli olarak web panelinde tutulmuştur — saha personelinin sorumluluk alanı dışındaki işlemleri cihazda sunmamak, hem yetki modelini hem de arayüzü sadeleştirir.

Mockup'larda görünüp veri karşılığı olmayan öğeler (örn. transfer kartındaki ürün görseli — liste yanıtı ürün ilişkisi döndürmez) uygulanmamış, yerine mevcut veriden türetilen bilgi gösterilmiştir. Arayüzde hiçbir noktada var olmayan veri temsil edilmez.

### Doğrulama ortamı

Barkod tarama akışı Android emülatöründe geliştirilmiş ve doğrulanmıştır. Emülatörün arka kamerası sentetik bir sahne görüntüsü ürettiğinden, **optik okuma** adımı fiziksel cihazda test edilmelidir; okuma sonrası akışın tamamı (ürün sorgusu, sonuç kartı, hata durumları, tekrar-tarama koruması) gerçek API ve veriyle doğrulanmıştır. Aynı şekilde haptik geri bildirim ve kamera feneri emülatörde ilgili donanım bulunmadığından fiziksel cihazda gözlemlenmelidir.

### Ürün yol haritası

Bu sürümün dışında bırakılan başlıklar: ödeme/faturalandırma, detaylı raporlama ve BI, çoklu dil (i18n), push notification, production ölçeğinde CI/CD ve database-per-tenant fiziksel izolasyon.

---

<p align="center">
  Bu proje, <strong>Truncgil</strong> bünyesindeki staj programı kapsamında geliştirilmiştir.<br/>
  <sub>Geliştirici: Doğukan Kalkan · Plan sürümü: v3.1</sub>
</p>
