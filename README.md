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
  <img src="https://img.shields.io/badge/React%20Native-Expo-000020?logo=expo&logoColor=white" alt="React Native (Expo)" />
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
- [Temel Özellikler](#temel-özellikler)
- [Teknoloji Yığını](#teknoloji-yığını)
- [Mimari](#mimari)
- [Monorepo Yapısı](#monorepo-yapısı)
- [Hızlı Başlangıç](#hızlı-başlangıç)
- [API Dokümantasyonu (Scalar)](#api-dokümantasyonu-scalar)
- [Veri Modeli](#veri-modeli)
- [RBAC — Rol/Yetki Matrisi](#rbac--rolyetki-matrisi)
- [Gerçek Zamanlı Olaylar](#gerçek-zamanlı-olaylar)
- [Test](#test)
- [Proje Dokümantasyonu](#proje-dokümantasyonu)
- [Git Workflow & Katkı](#git-workflow--katkı)
- [Yol Haritası & Kapsam](#yol-haritası--kapsam)

---

## Proje Hakkında

Çok şubeli firmalarda envanter genellikle her şubede ayrı ve kontrolsüz tutulur; şubeler arası transferler telefon/Excel ile yürütülür, stok tutarsızlıkları oluşur ve merkezi görünürlük yoktur. **StockRoute** bu süreci dijitalleştirir, firma bazında izole eder ve anlık görünür kılar.

Sistem üç temel direk üzerine kuruludur:

1. **Multi-Tenancy** — Her firmanın (tenant) verisi mantıksal olarak izole edilir; bir firma başka bir firmanın verisini hiçbir koşulda göremez.
2. **RBAC** — Aynı firma içinde kullanıcılar rollerine göre (Firma Admini, Şube Yöneticisi, Depo Sorumlusu, Saha Personeli) farklı yetkilere sahiptir.
3. **Gerçek Zamanlılık** — Bir şubedeki stok değişimi veya transfer, ilgili tüm kullanıcıların ekranına anlık yansır.

Çıktı tek bir **monorepo** içinde üç uygulamadan oluşur: **Backend API (NestJS)**, **Web Yönetim Paneli (React)** ve **Mobil Saha Uygulaması (React Native / Expo)**. Tüm sistem **Docker** ile tek komutla ayağa kalkar.

> 📘 Bu projenin tek doğruluk kaynağı (single source of truth) kökteki [implementation_plan.md](implementation_plan.md) dosyasıdır. Tüm mimari kararlar, veri modeli ve yol haritası orada detaylandırılmıştır.

## Temel Özellikler

- 🏢 **Firma (tenant) onboarding** — Firma kaydı otomatik olarak izole bir tenant alanı ve ilk Firma Admini oluşturur.
- 🔒 **Katı veri izolasyonu** — JWT `tenantId` claim'i + Prisma Client Extension ile tüm sorgulara otomatik tenant filtresi; geliştirici unutsa bile veri sızması engellenir.
- 👥 **Rol bazlı yetkilendirme (RBAC)** — 5 rol, `RolesGuard` + `@Roles(...)` decorator ile her endpoint'te zorunlu.
- 🏬 **Şube, ürün ve envanter yönetimi** — Şube bazlı stok takibi, düşük stok eşiği, manuel stok düzeltme.
- 🔄 **Şubeler arası transfer iş akışı** — Durum makinesi ile uçtan uca: talep → onay → sevk → teslim. Çoklu ürün (header-line) desteği, negatif stok engeli.
- 📝 **Stok izlenebilirliği (audit trail)** — Tüm stok artış/azalışları `InventoryLog` ile kayıt altında; transferlerde sevk/teslim eden kullanıcı takibi (accountability).
- ⚡ **Gerçek zamanlı güncellemeler** — Socket.io ile tenant bazlı room'lar; web'de yapılan değişiklik mobil ve diğer istemcilere anlık yansır.
- 📱 **Mobil saha uygulaması** — Şube stok görüntüleme, `expo-camera` ile barkod okuyarak ürün sorgulama, gelen transferleri teslim alma.
- 📖 **Modern API dokümantasyonu** — OpenAPI şeması + **Scalar** arayüzü (`/docs`), "try it" destekli.
- 🐳 **Tam Dockerize** — `docker compose up` ile db + api + web tek komutla ayağa kalkar.

## Teknoloji Yığını

Tüm yığın **TypeScript** ailesindendir; tek dil sayesinde backend, web ve mobil arasında tipler paylaşılır ve bağlam değiştirme maliyeti minimumdur.

| Katman | Teknoloji |
|---|---|
| Monorepo yönetimi | pnpm workspaces + Turborepo |
| Konteynerizasyon | Docker + Docker Compose (web imajı: nginx, ters vekil) |
| Backend | NestJS (Node.js + TypeScript, Clean Architecture) |
| ORM / Veritabanı | Prisma ORM + PostgreSQL |
| Kimlik & Yetki | Passport.js + JWT + NestJS Guards |
| Gerçek zamanlı | Socket.io (NestJS WebSocket Gateway) |
| API dokümantasyonu | OpenAPI (`@nestjs/swagger`) + Scalar (`@scalar/nestjs-api-reference`) |
| Web | React + TypeScript + Vite + Material UI (MUI) |
| Web state/data | TanStack Query + Zustand |
| Mobil | React Native (Expo) + Expo Router |
| Paylaşılan tipler | TypeScript (`packages/shared-types`) |
| Validation | class-validator + class-transformer (API), Zod (form) |
| Test | Jest (API), Vitest + React Testing Library (web) |
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

**Bağımlılık yönü:** dıştan içe (API → Application → Domain). Domain hiçbir katmana bağımlı değildir.

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
│   ├── web/                  # React + Vite yönetim paneli
│   └── mobile/               # React Native (Expo) saha uygulaması
├── packages/
│   ├── shared-types/         # Ortak TS tipleri, DTO, enum, API sözleşmeleri
│   ├── config/               # Ortak eslint / prettier / tsconfig
│   └── ui-tokens/            # Tasarım token'ları (renk, spacing, tipografi)
├── docs/
│   ├── brand/                # Logo, palet ve marka çalışmaları
│   └── design/               # Tasarım sistemi ve GenAI ekran mockup'ları
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
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SOCKET_URL=http://localhost:3000
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

Mobil uygulama Docker'a alınmaz; cihaz/emülatörde çalışır:

```bash
cd apps/mobile
pnpm start
```

> Fiziksel cihazda test ederken `EXPO_PUBLIC_API_URL` değerini bilgisayarınızın yerel IP adresiyle güncelleyin (örn. `http://192.168.1.10:3000`).

## API Dokümantasyonu (Scalar)

API şeması `@nestjs/swagger` ile **OpenAPI** olarak üretilir ve **Scalar** arayüzüyle sunulur:

> **http://localhost:3000/docs** — modern, aranabilir, "try it" destekli arayüz. Korumalı endpoint'ler için sağ üstteki **Authorize** ile `Bearer <token>` girin.

### Başlıca Endpoint'ler

| Modül | Endpoint'ler |
|---|---|
| **Auth** | `POST /auth/register-tenant` · `POST /auth/login` · `GET /auth/me` |
| **Branches** | `GET/POST /branches` · `GET/PATCH/DELETE /branches/:id` · `GET /branches/:id/inventory` |
| **Users** | `GET/POST /users` · `PATCH/DELETE /users/:id` |
| **Products** | `GET/POST /products` · `GET/PATCH/DELETE /products/:id` · `GET /products/barcode/:barcode` |
| **Inventory** | `GET /inventory?branchId=&lowStock=` · `POST /inventory/adjust` |
| **Movements** | `GET/POST /movements` · `POST /movements/:id/approve\|reject\|ship\|receive\|cancel` |

Tüm yanıtlar JSON'dur; korumalı endpoint'ler `Authorization: Bearer <token>` başlığı ister. Standart hata formatı:

```json
{ "statusCode": 400, "message": "Yetersiz stok", "error": "BadRequest", "path": "/movements/:id/ship" }
```

## Veri Modeli

Çekirdek modeller: `Tenant` → `User`, `Branch`, `Product`, `Inventory` (şube × ürün stok), `StockMovement` + `StockMovementItem` (çoklu ürünlü transfer) ve `InventoryLog` (audit trail). Tam Prisma şeması için bkz. [implementation_plan.md — Bölüm 7](implementation_plan.md).

### Transfer Durum Makinesi

```
PENDING ──approve──▶ APPROVED ──ship──▶ IN_TRANSIT ──receive──▶ RECEIVED
   │                    │
   ├──reject──▶ REJECTED │
   └──cancel──▶ CANCELLED┘
```

- **approve** — sadece yetkili rol; stok henüz hareket etmez.
- **ship** — kaynak şubeden miktar düşülür (negatif stok engeli; her satır için ayrı kontrol).
- **receive** — hedef şubeye miktar eklenir; `inventory:updated` olayı yayılır.
- **reject / cancel** — stok değişmez; hareket sonlanır.

Tüm stok hareketleri (`TRANSFER_IN`, `TRANSFER_OUT`, `MANUAL_ADJUSTMENT`, `INITIAL_STOCK`) `InventoryLog` tablosunda `previousQuantity` / `newQuantity` / `quantityChange` ile izlenebilir kalır.

## RBAC — Rol/Yetki Matrisi

| İşlem | SUPER_ADMIN | FIRM_ADMIN | BRANCH_MANAGER | WAREHOUSE_STAFF | FIELD_STAFF |
|---|:--:|:--:|:--:|:--:|:--:|
| Firma (tenant) yönetimi | ✅ | ❌ | ❌ | ❌ | ❌ |
| Şube oluştur/sil | ✅ | ✅ | ❌ | ❌ | ❌ |
| Kullanıcı/rol atama | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ürün tanımlama | ✅ | ✅ | ✅ | ❌ | ❌ |
| Stok girişi/düzeltme | ✅ | ✅ | ✅ | ✅ | ❌ |
| Transfer **talep et** | ✅ | ✅ | ✅ | ✅ | ✅ |
| Transfer **onayla/reddet** | ✅ | ✅ | ✅ | ❌ | ❌ |
| Transfer **sevk et** | ✅ | ✅ | ✅ | ✅ | ❌ |
| Transfer **teslim al** | ✅ | ✅ | ✅ | ✅ | ✅ |
| Stok **görüntüle** | ✅ (tümü) | ✅ (firma) | kendi şubesi | kendi şubesi | kendi şubesi |

> `SUPER_ADMIN` platform sahibidir (tenant üstü); diğer roller tek bir tenant'a bağlıdır.

## Gerçek Zamanlı Olaylar

İstemci `auth: { token }` ile bağlanır; sunucu token'ı doğrular ve istemciyi `tenant_{tenantId}` room'una ekler.

| Olay | Payload | Ne zaman |
|---|---|---|
| `inventory:updated` | `{ branchId, productId, quantity }` | Stok düzeltme / transfer teslim |
| `movement:created` | `{ movement }` | Yeni transfer talebi |
| `movement:statusChanged` | `{ movementId, status, branchIds }` | Onay / sevk / teslim / red |
| `notification` | `{ type, title, message, level }` | Genel bilgilendirme (örn. düşük stok) |

Olay adları ve payload tipleri `packages/shared-types/src/socket-events.ts` içinde tek yerden yönetilir.

## Test

```bash
# Tüm workspace testleri (Turborepo)
pnpm test

# Sadece API testleri
pnpm --filter api test

# API e2e testleri
pnpm --filter api test:e2e
```

- **Birim test (Jest)** — transfer durum makinesi, stok düşme/ekleme, RBAC guard mantığı.
- **Entegrasyon/e2e (Jest + supertest)** — auth akışı, tenant izolasyonu (çapraz tenant erişimi 403 döner), transfer uçtan uca.
- **Web (Vitest + RTL)** — kritik bileşenler (transfer formu, korumalı rota).

> Çekirdek iş mantığı (transfer + izolasyon) testsiz merge edilmez.

## Proje Dokümantasyonu

| Doküman | İçerik |
|---|---|
| [implementation_plan.md](implementation_plan.md) | Tek doğruluk kaynağı — tam plan, veri modeli, API sözleşmesi |
| [docs/brand/](docs/brand/) | Logo, renk paleti ve marka çalışmaları |
| [docs/design/design-system.md](docs/design/design-system.md) | Tasarım sistemi (renk / tipografi / spacing token'ları) |
| [docs/design/mockups/](docs/design/mockups/) | GenAI ile üretilen ekran mockup'ları |

## Git Workflow & Katkı

- `main` korumalıdır; doğrudan push yapılmaz, her değişiklik **feature branch + PR** ile gelir.
- Branch adlandırma: `feature/<modül>` (örn. `feature/stock-transfer`).
- Commit mesajları **Conventional Commits** + monorepo scope formatındadır:

| Önek | Örnek |
|---|---|
| `feat(scope):` | `feat(api): add login validation` |
| `fix(scope):` | `fix(api): prevent negative stock on transfer` |
| `test(scope):` | `test(api): cover transfer approval` |
| `docs:` / `design:` / `chore:` | `docs: update implementation plan` |

- PR açıklamasında yapılanlar madde madde listelenir ve ilgili issue `Closes #N` ile bağlanır.
- En az 1 onay alınmadan merge edilmez.

## Yol Haritası & Kapsam

Proje 20 iş günlük (4 hafta) bir sprint planıyla geliştirilmektedir:

| Hafta | Hedef | Çıktı |
|---|---|---|
| **1** | Monorepo + Docker + marka + DB + tenancy + auth | İzolasyonlu, markalı, dockerize iskelet |
| **2** | RBAC + onboarding + çekirdek domain | Çalışan transfer iş akışı |
| **3** | Testler + real-time + web panel | Canlı güncellenen yönetim paneli |
| **4** | Mobil + tam dockerize + teslim | Saha uygulaması + tek komutla ayağa kalkan sistem |

**Kapsam dışı (gelecek faz):** ödeme/faturalandırma, detaylı raporlama/BI, çoklu dil (i18n), production ölçeğinde CI/CD ve database-per-tenant fiziksel izolasyon.

---

<p align="center">
  Bu proje, <strong>Truncgil</strong> bünyesindeki staj programı kapsamında geliştirilmektedir.<br/>
  <sub>Geliştirici: Doğukan Kalkan · Plan sürümü: v3.0</sub>
</p>
