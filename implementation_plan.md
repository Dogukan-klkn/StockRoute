# Implementation Plan — InvenFlow

### Çok Kiracılı (Multi-Tenant) Kurumsal Envanter & Kaynak Yönetim Sistemi

> **Proje Kod Adı:** InvenFlow
> **Stajyer:** Doğukan
> **Süre:** 20 iş günü (4 hafta)
> **Repo Modeli:** Monorepo (backend + web + mobile + shared packages tek repoda)
> **Doküman Sürümü:** v2.0 (Revize — "anayasa" seviyesi tam detay)
> **Doküman Türü:** Implementation Plan / Tek Doğruluk Kaynağı (Single Source of Truth)

> **Bu dokümanın amacı:** Projenin tamamını gri nokta bırakmadan tanımlamaktır. Dizin yapısı, veri modeli, API sözleşmesi, real-time olaylar, tasarım sistemi ve ekran mockup'ları burada nettir; geliştirme (insan veya AI) bu plana birebir uyarak ilerler. Plandan sapma gerekirse önce bu doküman güncellenir, sonra kod yazılır.

---

## İçindekiler

1. Yönetici Özeti
2. Problem Tanımı ve Hedefler
3. Kapsam
4. Teknoloji Yığını
5. Monorepo Yapısı ve Dizin Ağacı
6. Mimari Tasarım
7. Veri Modeli (Tam Prisma Şeması)
8. RBAC — Rol/Yetki Matrisi
9. API Sözleşmesi (Tüm Endpoint'ler)
10. Gerçek Zamanlı Olay Kataloğu
11. Tasarım Sistemi & Marka (Renk / Logo / Tipografi / Asset)
12. Ekran Envanteri & Mockup'lar
13. Ortam Değişkenleri (.env)
14. Kodlama Standartları & Hata Yönetimi
15. Test Stratejisi
16. 20 İş Günlük Yol Haritası
17. Haftalık Sprint Özeti
18. Git Workflow & PR Süreci
19. GitHub Projects Board & Issue Yönetimi
20. Daily Standup
21. Risk Yönetimi
22. Definition of Done
23. Teslim Edilecekler

---

## 1. Yönetici Özeti

InvenFlow; birden fazla firmanın (tenant), her biri kendi şubelerine sahip olacak şekilde **envanter ve şubeler arası kaynak hareketlerini** tek bir platformdan yönettiği, **gerçek zamanlı** bir kurumsal yönetim sistemidir.

Üç temel direk:

1. **Multi-Tenancy:** Her firmanın verisi mantıksal olarak izole edilir; bir firma başka bir firmanın verisini hiçbir koşulda göremez.
2. **RBAC:** Aynı firma içinde kullanıcılar rollerine göre (Firma Admini, Şube Yöneticisi, Depo Sorumlusu, Saha Personeli) farklı yetkilere sahiptir.
3. **Gerçek Zamanlılık:** Bir şubedeki stok değişimi veya transfer, ilgili kullanıcıların ekranına anlık yansır.

Çıktı tek bir **monorepo** içinde: **Backend API (NestJS)**, **Web Yönetim Paneli (React)** ve **Mobil Saha Uygulaması (React Native)**. Paylaşılan tipler ve yapılandırma ortak paketlerde toplanır.

---

## 2. Problem Tanımı ve Hedefler

### 2.1 Çözülen Problem
Çok şubeli firmalarda envanter genelde her şubede ayrı ve kontrolsüz tutulur; şubeler arası transfer telefon/Excel ile yürür, stok tutarsızlıkları oluşur ve merkezi görünürlük yoktur. InvenFlow bu süreci dijitalleştirir, firma bazında izole eder ve anlık görünür kılar.

### 2.2 Başarı Kriterleri (Definition of Success)
- [ ] Firma kaydı, otomatik olarak izole bir tenant alanı ve ilk Firma Admini oluşturur.
- [ ] Farklı firmaların kullanıcıları API üzerinden bile birbirinin verisine erişemez.
- [ ] Roller, yapılabilecek işlemleri kısıtlar (örn. Saha Personeli transfer onaylayamaz).
- [ ] Şubeler arası transfer uçtan uca çalışır: talep → onay → sevk → teslim.
- [ ] Web'de yapılan değişiklik, mobil ve diğer web istemcilerine anlık yansır.
- [ ] Mobilde barkod okutularak ürün/stok sorgulanabilir ve transfer teslim alınabilir.

---

## 3. Kapsam

### 3.1 Kapsam İçi (20 günde teslim edilecek)
- Monorepo altyapısı (apps + packages) ve paylaşılan tip katmanı
- Tasarım sistemi, marka asset'leri ve tüm ekranların mockup'ları
- Firma (tenant) onboarding + veri izolasyonu
- JWT kimlik doğrulama + RBAC yetkilendirme
- Şube, Ürün, Envanter (şube bazlı stok) yönetimi
- Şubeler arası stok transfer iş akışı (durum makinesi)
- Socket.io ile gerçek zamanlı stok/transfer güncellemeleri
- Web Yönetim Paneli (dashboard, yönetim ekranları, transfer ekranı)
- Mobil saha uygulaması (stok görüntüleme, barkod okuma, transfer teslim alma)

### 3.2 Kapsam Dışı (gelecek faz)
- Ödeme/faturalandırma entegrasyonu
- Detaylı raporlama/BI motoru
- Çoklu dil (i18n) — sadece TR
- Production ölçeğinde yük testi / tam CI-CD pipeline
- Database-per-tenant fiziksel izolasyon (mantıksal izolasyon kullanılacak — bkz. 6.1)

---

## 4. Teknoloji Yığını

Tüm yığın **script (JavaScript/TypeScript) ailesindendir.** Tek dil sayesinde backend, web ve mobil arasında bağlam değiştirme maliyeti minimumdur ve tipler paylaşılır.

| Katman | Teknoloji | Gerekçe |
|---|---|---|
| **Monorepo yönetimi** | pnpm workspaces + Turborepo | Hızlı kurulum, paylaşılan paketler, tek `install` |
| **Backend** | NestJS (Node.js + TypeScript) | Modüler/katmanlı yapı; Guard & Interceptor ile RBAC + tenant izolasyonu nettir |
| **ORM / Veritabanı** | Prisma ORM + PostgreSQL | Client Extension ile otomatik tenant filtreleme + güçlü migration |
| **Kimlik & Yetki** | Passport.js + JWT + NestJS Guards | RBAC için Guard + `@Roles` decorator |
| **Gerçek Zamanlı** | Socket.io (NestJS WebSocket Gateway) | Tenant bazlı "room" desteği |
| **Web** | React + TypeScript + Vite + Material UI (MUI) | Hızlı geliştirme, tip güvenliği, hazır bileşenler |
| **Web state/data** | TanStack Query + Zustand | Sunucu durumu + hafif istemci durumu |
| **Mobil** | React Native (Expo) + Expo Router | Web ile aynı dil; `expo-camera` ile barkod okuma |
| **Paylaşılan tipler** | TypeScript (packages/shared-types) | DTO, enum ve sözleşmeler tek yerde |
| **Validation** | class-validator + class-transformer (API), Zod (form) | Sunucu ve istemci doğrulaması |
| **API Dokümantasyon** | Swagger / OpenAPI (`@nestjs/swagger`) | Otomatik doküman + test arayüzü |
| **Test** | Jest (API), Vitest + React Testing Library (web) | Birim/entegrasyon testleri |
| **Kod kalitesi** | ESLint + Prettier (packages/config) | Tek standart, tüm projede ortak |

---

## 5. Monorepo Yapısı ve Dizin Ağacı

### 5.1 Üst Seviye Yapı

```
invenflow/
├── apps/
│   ├── api/                  # NestJS backend (REST + WebSocket)
│   ├── web/                  # React + Vite yönetim paneli
│   └── mobile/               # React Native (Expo) saha uygulaması
├── packages/
│   ├── shared-types/         # Ortak TS tipleri, DTO, enum, API sözleşmeleri
│   ├── config/               # Ortak eslint / prettier / tsconfig
│   └── ui-tokens/            # Tasarım token'ları (renk, spacing, tipografi)
├── assets/
│   ├── brand/                # Logo, favicon, renk paleti referansı
│   ├── mockups/              # Ekran mockup/wireframe görselleri
│   └── README.md
├── docs/
│   ├── implementation_plan.md   # BU DOSYA (tek doğruluk kaynağı)
│   ├── api.md                   # API ek notları
│   └── decisions/               # Mimari karar kayıtları (ADR)
├── .github/
│   ├── pull_request_template.md
│   └── ISSUE_TEMPLATE/
├── .env.example
├── .gitignore
├── package.json              # workspace kökü
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

> Not: `implementation_plan.md`'in kökte mi yoksa `docs/` altında mı duracağı staj rehberine göredir. Rehber "ana dizinde" dediği için kökte tutulur; `docs/` altındaki kopya semboliktir veya ek notlar içindir. **Kökteki dosya esas alınır.**

### 5.2 `apps/api` — Backend (NestJS, Clean Architecture)

```
apps/api/
├── prisma/
│   ├── schema.prisma         # Veri modeli (Bölüm 7)
│   ├── migrations/
│   └── seed.ts               # Demo tenant + kullanıcı + ürün seed'i
├── src/
│   ├── domain/               # İş kuralları çekirdeği (framework'ten bağımsız)
│   │   ├── entities/         # Zengin model davranışları (gerekirse)
│   │   └── enums/            # UserRole, MovementStatus, ProductUnit
│   ├── application/          # Use-case'ler, servis arayüzleri, DTO
│   │   ├── dto/
│   │   └── interfaces/       # ITenantContext, IRepository sözleşmeleri
│   ├── infrastructure/
│   │   ├── prisma/
│   │   │   ├── prisma.service.ts
│   │   │   └── tenant.extension.ts   # Otomatik tenant filtreleme
│   │   ├── auth/             # Passport stratejileri, JWT servis
│   │   └── tenant/           # TenantContextService (AsyncLocalStorage)
│   ├── api/                  # Sunum katmanı
│   │   ├── controllers/      # auth, branches, users, products, inventory, movements
│   │   ├── guards/           # JwtAuthGuard, RolesGuard
│   │   ├── decorators/       # @Roles, @CurrentUser, @CurrentTenant
│   │   ├── middleware/       # TenantResolverMiddleware
│   │   └── gateways/         # InventoryGateway (Socket.io)
│   ├── modules/              # NestJS modülleri (her domain için)
│   │   ├── auth/
│   │   ├── tenants/
│   │   ├── branches/
│   │   ├── users/
│   │   ├── products/
│   │   ├── inventory/
│   │   └── movements/
│   ├── common/               # filters (exception), interceptors, pipes, utils
│   ├── app.module.ts
│   └── main.ts               # bootstrap, Swagger, global pipes/filters
├── test/                     # e2e testleri
├── .env.example
├── nest-cli.json
├── package.json
└── tsconfig.json
```

### 5.3 `apps/web` — Web Panel (React + Vite)

```
apps/web/
├── public/                   # favicon, statik asset
├── src/
│   ├── app/
│   │   ├── router.tsx        # rota tanımları + korumalı rotalar
│   │   └── providers.tsx     # Query, Theme, Auth provider
│   ├── features/             # özellik bazlı klasörleme
│   │   ├── auth/             # login sayfası + hook
│   │   ├── dashboard/
│   │   ├── branches/
│   │   ├── products/
│   │   ├── inventory/
│   │   ├── movements/        # transfer talep/onay ekranları
│   │   └── users/
│   ├── components/           # paylaşılan UI bileşenleri (Layout, Sidebar, Table)
│   ├── lib/
│   │   ├── api-client.ts     # axios + JWT interceptor
│   │   ├── socket.ts         # socket.io-client bağlantısı
│   │   └── auth-store.ts     # Zustand auth state
│   ├── hooks/
│   ├── theme/                # MUI tema (ui-tokens'tan beslenir)
│   ├── types/                # shared-types re-export
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── vite.config.ts
├── package.json
└── tsconfig.json
```

### 5.4 `apps/mobile` — Mobil (React Native / Expo)

```
apps/mobile/
├── app/                      # Expo Router (dosya bazlı navigasyon)
│   ├── (auth)/login.tsx
│   ├── (tabs)/
│   │   ├── index.tsx         # ana ekran / şube stok
│   │   ├── scan.tsx          # barkod tarama
│   │   └── transfers.tsx     # gelen transferler
│   └── _layout.tsx
├── src/
│   ├── components/
│   ├── lib/
│   │   ├── api-client.ts
│   │   ├── socket.ts
│   │   └── auth-store.ts
│   ├── hooks/
│   └── theme/
├── assets/                   # uygulama ikonu, splash
├── app.json                  # Expo yapılandırma
├── package.json
└── tsconfig.json
```

### 5.5 `packages/shared-types`

```
packages/shared-types/
├── src/
│   ├── enums.ts              # UserRole, MovementStatus, ProductUnit
│   ├── dto/                  # CreateBranchDto, CreateMovementDto, ...
│   ├── entities.ts           # Tenant, Branch, Product, Inventory, StockMovement tipleri
│   ├── api-contracts.ts      # istek/yanıt tipleri
│   └── socket-events.ts      # real-time olay adları ve payload tipleri
├── package.json
└── tsconfig.json
```

> `api`, `web` ve `mobile` bu paketi import eder; böylece tip uyuşmazlığı derleme zamanında yakalanır.

---

## 6. Mimari Tasarım

### 6.1 Multi-Tenancy Stratejisi

| Yaklaşım | İzolasyon | Maliyet | 20 günde uygunluk |
|---|---|---|---|
| Database-per-tenant | En yüksek | Yüksek | ❌ Aşırı |
| Schema-per-tenant | Yüksek | Orta | ⚠️ Karmaşık |
| **Shared DB + Discriminator (tenantId)** | Mantıksal | Düşük | ✅ **Seçilen** |

**Seçilen yaklaşım:** Tüm tablolar ortak veritabanında durur; her kayıt `tenantId` taşır. İzolasyon iki katmanla zorlanır:

1. **Tenant çözümleme:** Login'de JWT içine `tenantId` claim'i gömülür. Her istekte request-scoped `TenantContextService` (AsyncLocalStorage) bu değeri okuyup istek boyunca taşır. WebSocket bağlantısında token doğrulanır ve istemci `tenant_{id}` room'una alınır.
2. **Prisma Client Extension:** Tüm sorgulara otomatik `where: { tenantId }` eklenir; `create`/`update`'te `tenantId` otomatik atanır. Geliştirici unutsa bile veri sızması engellenir.

```
İstek → [JWT'den tenantId] → TenantContextService → Prisma Client Extension
                                                   → Sadece o tenant'ın verisi döner
```

### 6.2 Katmanlı Backend (Clean Architecture)

```
┌───────────────────────────────────────────────┐
│ API (Presentation)                             │ Controllers, Gateways, Guards, Middleware
├───────────────────────────────────────────────┤
│ Application                                    │ Use-case, DTO, Validation, arayüzler
├───────────────────────────────────────────────┤
│ Domain                                         │ Entity/enum, iş kuralları çekirdeği
├───────────────────────────────────────────────┤
│ Infrastructure                                 │ Prisma, Auth, Tenant extension, dış servis
└───────────────────────────────────────────────┘
```

**Bağımlılık yönü:** Dıştan içe (API → Application → Domain). Domain hiçbir katmana bağımlı değildir.

### 6.3 Gerçek Zamanlı Mimari (özet)

```
Stok/transfer değişti → Application servisi → DB güncellenir
                                            → InventoryGateway → tenant_{id} room'una emit
                                               → Web ve Mobil anlık güncellenir
```

---

## 7. Veri Modeli (Tam Prisma Şeması)

`apps/api/prisma/schema.prisma` içeriği aşağıdaki gibidir. Tüm modeller `tenantId` taşır (Tenant hariç).

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  SUPER_ADMIN
  FIRM_ADMIN
  BRANCH_MANAGER
  WAREHOUSE_STAFF
  FIELD_STAFF
}

enum MovementStatus {
  PENDING      // talep oluşturuldu
  APPROVED     // yetkili onayladı
  IN_TRANSIT   // sevk edildi (kaynaktan düşüldü)
  RECEIVED     // teslim alındı (hedefe eklendi)
  REJECTED     // reddedildi
  CANCELLED    // talep eden iptal etti
}

enum ProductUnit {
  PIECE
  KG
  LITER
  BOX
  PACK
}

model Tenant {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users       User[]
  branches    Branch[]
  products    Product[]
  inventories Inventory[]
  movements   StockMovement[]
}

model User {
  id           String   @id @default(cuid())
  tenantId     String
  email        String
  passwordHash String
  fullName     String
  role         UserRole @default(FIELD_STAFF)
  branchId     String?
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  tenant Tenant  @relation(fields: [tenantId], references: [id])
  branch Branch? @relation(fields: [branchId], references: [id])

  requestedMovements StockMovement[] @relation("RequestedBy")
  approvedMovements  StockMovement[] @relation("ApprovedBy")

  @@unique([tenantId, email])
  @@index([tenantId])
}

model Branch {
  id        String   @id @default(cuid())
  tenantId  String
  name      String
  code      String
  address   String?
  city      String?
  phone     String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant      Tenant          @relation(fields: [tenantId], references: [id])
  users       User[]
  inventories Inventory[]
  outgoing    StockMovement[] @relation("SourceBranch")
  incoming    StockMovement[] @relation("DestinationBranch")

  @@unique([tenantId, code])
  @@index([tenantId])
}

model Product {
  id          String      @id @default(cuid())
  tenantId    String
  name        String
  sku         String
  barcode     String?
  unit        ProductUnit @default(PIECE)
  category    String?
  description String?
  isActive    Boolean     @default(true)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  tenant      Tenant          @relation(fields: [tenantId], references: [id])
  inventories Inventory[]
  movements   StockMovement[]

  @@unique([tenantId, sku])
  @@index([tenantId, barcode])
}

model Inventory {
  id           String   @id @default(cuid())
  tenantId     String
  branchId     String
  productId    String
  quantity     Int      @default(0)
  minThreshold Int      @default(0)   // düşük stok eşiği
  updatedAt    DateTime @updatedAt

  tenant  Tenant  @relation(fields: [tenantId], references: [id])
  branch  Branch  @relation(fields: [branchId], references: [id])
  product Product @relation(fields: [productId], references: [id])

  @@unique([branchId, productId])
  @@index([tenantId])
}

model StockMovement {
  id                  String         @id @default(cuid())
  tenantId            String
  sourceBranchId      String
  destinationBranchId String
  productId           String
  quantity            Int
  status              MovementStatus @default(PENDING)
  note                String?
  requestedById       String
  approvedById        String?
  createdAt           DateTime       @default(now())
  approvedAt          DateTime?
  shippedAt           DateTime?
  receivedAt          DateTime?
  updatedAt           DateTime       @updatedAt

  tenant            Tenant  @relation(fields: [tenantId], references: [id])
  sourceBranch      Branch  @relation("SourceBranch", fields: [sourceBranchId], references: [id])
  destinationBranch Branch  @relation("DestinationBranch", fields: [destinationBranchId], references: [id])
  product           Product @relation(fields: [productId], references: [id])
  requestedBy       User    @relation("RequestedBy", fields: [requestedById], references: [id])
  approvedBy        User?   @relation("ApprovedBy", fields: [approvedById], references: [id])

  @@index([tenantId, status])
}
```

### 7.1 Transfer Durum Makinesi

```
PENDING ──approve──▶ APPROVED ──ship──▶ IN_TRANSIT ──receive──▶ RECEIVED
   │                    │
   ├──reject──▶ REJECTED │
   └──cancel──▶ CANCELLED┘
```

İş kuralları:
- **approve:** Sadece yetkili rol; stok henüz hareket etmez.
- **ship (IN_TRANSIT):** Kaynak şubeden miktar düşülür (negatif stok engeli; yetersizse hata).
- **receive (RECEIVED):** Hedef şubeye miktar eklenir; `inventory:updated` yayılır.
- **reject / cancel:** Stok değişmez; hareket sonlanır.

---

## 8. RBAC — Rol/Yetki Matrisi

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
| Stok **görüntüle** | ✅ (tümü) | ✅ (firma) | (kendi şubesi) | (kendi şubesi) | (kendi şubesi) |

> `SUPER_ADMIN` platform sahibidir (tenant üstü, demo/yönetim amaçlı). Diğer roller tek bir tenant'a bağlıdır. Yetki, `RolesGuard` + `@Roles(...)` decorator ile her endpoint'te zorunlu kılınır. Şube bazlı kısıt, servis katmanında `branchId` ile uygulanır.

---

## 9. API Sözleşmesi (Tüm Endpoint'ler)

Tüm yanıtlar JSON'dur. Korumalı endpoint'ler `Authorization: Bearer <token>` ister. Hata formatı için bkz. Bölüm 14.

### 9.1 Auth
| Method | Path | Erişim | Açıklama |
|---|---|---|---|
| POST | `/auth/register-tenant` | Public | Firma + ilk FIRM_ADMIN oluşturur `{ firmName, slug, adminEmail, adminPassword, adminFullName }` |
| POST | `/auth/login` | Public | `{ email, password, tenantSlug }` → `{ accessToken, user }` |
| GET | `/auth/me` | Auth | Mevcut kullanıcı bilgisi |

### 9.2 Branches
| Method | Path | Erişim |
|---|---|---|
| GET | `/branches` | FIRM_ADMIN, BRANCH_MANAGER |
| POST | `/branches` | FIRM_ADMIN |
| GET | `/branches/:id` | FIRM_ADMIN, BRANCH_MANAGER |
| PATCH | `/branches/:id` | FIRM_ADMIN |
| DELETE | `/branches/:id` | FIRM_ADMIN |
| GET | `/branches/:id/inventory` | tüm roller (kendi şubesiyle sınırlı) |

### 9.3 Users
| Method | Path | Erişim |
|---|---|---|
| GET | `/users` | FIRM_ADMIN |
| POST | `/users` | FIRM_ADMIN `{ email, password, fullName, role, branchId? }` |
| PATCH | `/users/:id` | FIRM_ADMIN |
| DELETE | `/users/:id` | FIRM_ADMIN |

### 9.4 Products
| Method | Path | Erişim |
|---|---|---|
| GET | `/products?search=&category=` | FIRM_ADMIN, BRANCH_MANAGER, WAREHOUSE_STAFF |
| POST | `/products` | FIRM_ADMIN, BRANCH_MANAGER |
| GET | `/products/:id` | yetkili roller |
| PATCH | `/products/:id` | FIRM_ADMIN, BRANCH_MANAGER |
| DELETE | `/products/:id` | FIRM_ADMIN |
| GET | `/products/barcode/:barcode` | tüm roller (mobil tarama) |

### 9.5 Inventory
| Method | Path | Erişim |
|---|---|---|
| GET | `/inventory?branchId=&lowStock=` | yetkili roller |
| POST | `/inventory/adjust` | BRANCH_MANAGER, WAREHOUSE_STAFF `{ branchId, productId, quantity, reason }` |

### 9.6 Stock Movements (Transfer)
| Method | Path | Erişim | Etki |
|---|---|---|---|
| POST | `/movements` | tüm roller | PENDING talep oluşturur |
| GET | `/movements?status=&branchId=` | yetkili roller | Liste |
| GET | `/movements/:id` | yetkili roller | Detay |
| POST | `/movements/:id/approve` | FIRM_ADMIN, BRANCH_MANAGER | → APPROVED |
| POST | `/movements/:id/reject` | FIRM_ADMIN, BRANCH_MANAGER | → REJECTED |
| POST | `/movements/:id/ship` | yetkili roller | → IN_TRANSIT, kaynaktan düş |
| POST | `/movements/:id/receive` | tüm roller (hedef şube) | → RECEIVED, hedefe ekle |
| POST | `/movements/:id/cancel` | talep eden / FIRM_ADMIN | → CANCELLED |

---

## 10. Gerçek Zamanlı Olay Kataloğu (Socket.io)

**Bağlantı:** İstemci `auth: { token }` ile bağlanır; sunucu token'ı doğrular ve istemciyi `tenant_{tenantId}` room'una ekler.

**Sunucu → İstemci olayları** (`packages/shared-types/socket-events.ts`):

| Olay | Payload | Ne zaman |
|---|---|---|
| `inventory:updated` | `{ branchId, productId, quantity }` | Stok düzeltme / transfer teslim |
| `movement:created` | `{ movement }` | Yeni transfer talebi |
| `movement:statusChanged` | `{ movementId, status, branchIds }` | Onay/sevk/teslim/red |
| `notification` | `{ type, title, message, level }` | Genel bilgilendirme (örn. düşük stok) |

**Room stratejisi:** Birincil izolasyon `tenant_{id}`. İleride opsiyonel `branch_{id}` room'u ile şube bazlı hedefleme yapılabilir (kapsam dışı, not olarak bırakıldı).

---

## 11. Tasarım Sistemi & Marka

> Bu bölüm, web ve mobilin **tek bir görsel dile** uymasını sağlar. Token'lar `packages/ui-tokens` içinde tanımlanır; MUI teması ve RN teması buradan beslenir. Asset'ler `assets/brand` altında tutulur.

### 11.1 Renk Paleti

| Rol | İsim | HEX | Kullanım |
|---|---|---|---|
| Primary | Blue 600 | `#2563EB` | Ana aksiyon, vurgular, marka |
| Primary Dark | Blue 800 | `#1E40AF` | Hover, başlık |
| Success | Green 600 | `#16A34A` | Stok girişi, teslim alındı |
| Warning | Amber 500 | `#F59E0B` | Beklemede / yolda |
| Danger | Red 600 | `#DC2626` | Reddedildi / düşük stok |
| Background | Slate 50 | `#F8FAFC` | Sayfa arka planı |
| Surface | White | `#FFFFFF` | Kart, tablo |
| Border | Slate 200 | `#E2E8F0` | Çizgi, kenarlık |
| Text Primary | Slate 900 | `#0F172A` | Ana metin |
| Text Secondary | Slate 500 | `#64748B` | İkincil metin |

**Durum renkleri (transfer):** PENDING → Amber, APPROVED → Blue, IN_TRANSIT → Mavi-mor, RECEIVED → Green, REJECTED/CANCELLED → Red/Gri.

### 11.2 Tipografi
- **Ana font:** Inter (web + mobil). Başlıklar 600/700, gövde 400/500.
- **Kod/SKU/barkod:** monospace (örn. `Roboto Mono`).
- **Ölçek:** 12 / 14 / 16 / 20 / 24 / 32 px.

### 11.3 Spacing & Şekil
- Spacing skalası: 4 / 8 / 12 / 16 / 24 / 32.
- Köşe yarıçapı: 8px (kart/buton), 4px (chip/input).
- Gölge: hafif (`0 1px 3px rgba(0,0,0,0.08)`).

### 11.4 Logo
**Konsept:** İki kutu (şube) arasında akan bir ok — "envanter akışı"nı temsil eder. Wordmark: **Inven**(koyu) + **Flow**(primary mavi). `assets/brand/invenflow-logo.svg` olarak kaydedilecek referans SVG:

```svg
<svg width="220" height="48" viewBox="0 0 220 48" xmlns="http://www.w3.org/2000/svg">
  <rect x="4" y="14" width="20" height="20" rx="4" fill="#1E40AF"/>
  <path d="M28 24 H44 M44 24 l-6 -5 M44 24 l-6 5" stroke="#2563EB" stroke-width="3"
        fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="48" y="14" width="20" height="20" rx="4" fill="#2563EB"/>
  <text x="78" y="31" font-family="Inter, sans-serif" font-size="22" font-weight="700">
    <tspan fill="#0F172A">Inven</tspan><tspan fill="#2563EB">Flow</tspan>
  </text>
</svg>
```

### 11.5 Asset Listesi (`assets/`)
- `brand/invenflow-logo.svg` (yatay), `brand/invenflow-mark.svg` (sadece ikon)
- `brand/favicon.png`, mobil `icon.png` + `splash.png`
- `brand/palette.png` (renk referansı)
- `mockups/web-*.png` ve `mockups/mobile-*.png` (Bölüm 12'deki ekranların görselleri)

---

## 12. Ekran Envanteri & Mockup'lar

> Aşağıdaki düşük çözünürlüklü wireframe'ler, AI/geliştiricinin ekran düzenini birebir anlaması içindir. Yüksek çözünürlüklü mockup görselleri `assets/mockups/` altına konur.

### 12.1 Web Ekranları

**Login**
```
┌────────────────────────────────────┐
│            [InvenFlow logo]         │
│   ┌──────────────────────────────┐  │
│   │ Firma Kodu (slug)            │  │
│   │ E-posta                      │  │
│   │ Şifre                        │  │
│   │        [ Giriş Yap ]         │  │
│   └──────────────────────────────┘  │
└────────────────────────────────────┘
```

**Ana Layout (tüm iç sayfalar)**
```
┌──────────┬───────────────────────────────────┐
│ Sidebar  │  Topbar: firma adı · kullanıcı ▼   │
│ • Dashboard                                    │
│ • Şubeler │  ┌─────────────────────────────┐  │
│ • Ürünler │  │     Sayfa içeriği            │  │
│ • Envanter│  │                             │  │
│ • Transfer│  └─────────────────────────────┘  │
│ • Kullanıcı                                    │
└──────────┴───────────────────────────────────┘
```

**Dashboard:** Üstte özet kartlar (Toplam şube, Toplam ürün, Bekleyen transfer, Düşük stok), altta "Son transferler" tablosu ve "Düşük stok" listesi. Real-time geldikçe kartlar güncellenir.

**Şubeler:** Tablo (Ad, Kod, Şehir, Durum, Aksiyon) + "Yeni Şube" butonu → modal form.

**Ürünler:** Tablo (Ad, SKU, Barkod, Birim, Kategori) + arama + "Yeni Ürün" modal.

**Envanter:** Şube seçici + ürün/stok tablosu (Ürün, Mevcut, Min eşik). Düşük stok satırı kırmızı vurgu. "Stok Düzelt" aksiyonu.

**Transferler (liste):** Durum filtreli tablo (Ürün, Kaynak→Hedef, Miktar, Durum chip'i, Tarih, Aksiyon). Yetkiye göre [Onayla]/[Reddet]/[Sevk Et]/[Teslim Al] butonları.

**Transfer Oluştur (modal):** Kaynak şube, Hedef şube, Ürün (arama), Miktar, Not → [Talep Oluştur].

**Kullanıcılar:** Tablo (Ad, E-posta, Rol, Şube) + "Yeni Kullanıcı" modal (rol & şube atama).

### 12.2 Mobil Ekranları

**Login**
```
┌───────────────────┐
│   [InvenFlow]      │
│ Firma kodu         │
│ E-posta            │
│ Şifre              │
│   [ Giriş Yap ]    │
└───────────────────┘
```

**Ana / Şube Stok**
```
┌───────────────────┐
│ Şube: Merkez ▼     │
│ 🔍 Ürün ara        │
│ ───────────────── │
│ Çay 1kg     | 120  │
│ Şeker 1kg   |  8 🔴 │  (düşük stok)
│ ...                │
│ [ 📷 Barkod Tara ] │
└───────────────────┘
   [Stok] [Tara] [Transferler]
```

**Barkod Tara:** Kamera görünümü; barkod okununca `GET /products/barcode/:barcode` → ürün kartı (ad, SKU, bu şubedeki miktar) açılır.

**Gelen Transferler:** IN_TRANSIT durumundaki, hedefi bu şube olan transferler listesi; her birinde [Teslim Al] butonu → onay → stok artar, real-time yayılır.

---

## 13. Ortam Değişkenleri (.env)

Kök `.env.example` (her uygulamanın kendi `.env`'i için referans):

```
# --- API (apps/api) ---
DATABASE_URL=postgresql://invenflow:password@localhost:5432/invenflow
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

> `.env` dosyaları `.gitignore`'dadır; repoya yalnızca `.env.example` girer.

---

## 14. Kodlama Standartları & Hata Yönetimi

- **Dil:** Her yerde TypeScript `strict` modu açık.
- **Lint/format:** ESLint + Prettier `packages/config`'ten paylaşılır; commit öncesi otomatik çalışır.
- **İsimlendirme:** Dosyalar `kebab-case`, sınıflar `PascalCase`, değişkenler `camelCase`, enum değerleri `UPPER_SNAKE`.
- **Katman disiplini:** Controller iş kuralı içermez; iş kuralı Application/servis katmanındadır.
- **DTO doğrulama:** API girişleri `class-validator` ile doğrulanır; geçersizse 400 döner.
- **Standart hata yanıtı:**
```json
{ "statusCode": 400, "message": "Yetersiz stok", "error": "BadRequest", "path": "/movements/:id/ship" }
```
- **Global exception filter** tüm hataları bu formata çevirir. Tenant/RBAC ihlali → 403; bulunamayan kayıt → 404.

---

## 15. Test Stratejisi

- **Birim test (Jest):** Transfer durum makinesi, stok düşme/ekleme, RBAC guard mantığı.
- **Entegrasyon/e2e (Jest + supertest):** Auth akışı, tenant izolasyonu (iki tenant ile çapraz erişim 403 döner), transfer uçtan uca.
- **Web (Vitest + RTL):** Kritik bileşenler (transfer formu, korumalı rota).
- **Kabul kriteri:** Çekirdek iş mantığı (transfer + izolasyon) testsiz merge edilmez.

---

## 16. 20 İş Günlük Yol Haritası

> **Çalışma Disiplini:** Her iş günü en az bir anlamlı commit (commit yoksa o gün "çalışılmamış" sayılır → staj defteri). Her gün **daily standup**. Commit'ler **Conventional Commits** + monorepo scope (`feat(api):`, `feat(web):`, `feat(mobile):`, `chore:`, `design:`, `docs:`, `test:`). Her görev **feature branch + PR** ile gelir (bkz. Bölüm 18).

### 🟦 Faz 0 — Monorepo, Tasarım & Altyapı (Gün 1–4)

**Gün 1 — Monorepo & Tooling**
- pnpm workspaces + Turborepo kurulumu; `apps/api`, `apps/web`, `apps/mobile` iskeletleri
- `packages/config` (ESLint/Prettier/tsconfig), `packages/shared-types` iskeleti
- `.env.example`, `.gitignore`, kök README, `/health` endpoint'i
- 📦 `chore: scaffold monorepo with apps and shared packages`

**Gün 2 — Tasarım Sistemi & Mockup'lar**
- Renk paleti, tipografi, spacing token'ları → `packages/ui-tokens`
- Logo + favicon + mobil ikon → `assets/brand`
- Tüm ekranların mockup'ları → `assets/mockups`
- 📦 `design: add brand assets, design tokens and screen mockups`

**Gün 3 — Veritabanı Tasarımı**
- Prisma şeması (Bölüm 7), enum'lar, ilişkiler, indeksler; ilk migration; seed iskeleti
- 📦 `feat(api): add prisma schema and initial migration`

**Gün 4 — Multi-Tenancy Altyapısı**
- `TenantContextService` (AsyncLocalStorage) + tenant resolver middleware
- Prisma Client Extension ile otomatik tenant filtreleme + yazmada `tenantId` atama
- 📦 `feat(api): implement tenant isolation with prisma extension`

### 🟩 Faz 1 — Kimlik & Yetkilendirme (Gün 5–7)

**Gün 5 — Authentication**
- Passport + JWT; register-tenant & login; token'a `tenantId` + `role` claim'i
- 📦 `feat(api): add jwt authentication with passport`

**Gün 6 — RBAC**
- `RolesGuard` + `@Roles` decorator + `@CurrentUser`/`@CurrentTenant`
- 📦 `feat(api): implement role-based authorization guards`

**Gün 7 — Tenant Onboarding & Seed**
- Firma kaydı → tenant + ilk FIRM_ADMIN; demo seed; çapraz tenant izolasyon e2e testi
- 📦 `feat(api): add tenant onboarding flow and seed data`

### 🟨 Faz 2 — Çekirdek Domain (Gün 8–12)

**Gün 8 — Şube Modülü** → 📦 `feat(api): add branch management module`
**Gün 9 — Ürün Modülü** (SKU + barkod sorgu) → 📦 `feat(api): add product catalog module`
**Gün 10 — Envanter Modülü** (şube stok + düzeltme) → 📦 `feat(api): add branch-level inventory management`
**Gün 11 — Transfer İş Akışı** (durum makinesi, sevk/teslimde stok hareketi, negatif stok engeli) → 📦 `feat(api): add inter-branch stock transfer workflow`
**Gün 12 — Transfer Onayı + Testler** (RBAC zorlaması + Jest unit/e2e) → 📦 `test(api): cover transfer workflow and authorization`

### 🟧 Faz 3 — Real-time + Web Panel (Gün 13–17)

**Gün 13 — Socket.io Gateway** (tenant room, olay yayını) → 📦 `feat(api): add real-time inventory gateway with socket.io`
**Gün 14 — Web İskelet & Auth** (Vite, layout, router, korumalı rota, login) → 📦 `feat(web): scaffold admin panel with auth flow`
**Gün 15 — Web Yönetim Ekranları** (şube/ürün/kullanıcı) → 📦 `feat(web): add branch, product and user screens`
**Gün 16 — Web Envanter & Transfer UI** (rol bazlı buton görünürlüğü) → 📦 `feat(web): add inventory and transfer management ui`
**Gün 17 — Web Real-time + Dashboard** (socket client, canlı kartlar, bildirim) → 📦 `feat(web): integrate real-time updates and dashboard`

### 🟥 Faz 4 — Mobil & Teslim (Gün 18–20)

**Gün 18 — Mobil İskelet & Auth** (Expo Router, login, api-client) → 📦 `feat(mobile): scaffold app with auth and navigation`
**Gün 19 — Mobil Stok & Barkod** (şube stok listesi, `expo-camera` barkod → ürün sorgu) → 📦 `feat(mobile): add stock list and barcode scanning`
**Gün 20 — Mobil Transfer + E2E + Teslim** (gelen transfer teslim alma + real-time sync; uçtan uca test, bug fix, README/Swagger/demo) → 📦 `feat(mobile): add transfer handling and finalize docs`

---

## 17. Haftalık Sprint Özeti

| Hafta | Günler | Hedef | Çıktı |
|---|---|---|---|
| **1** | 1–5 | Monorepo + tasarım + DB + tenancy + auth | İzolasyonlu, markalı, güvenli iskelet |
| **2** | 6–11 | RBAC + onboarding + çekirdek domain | Çalışan transfer iş akışı |
| **3** | 12–17 | Testler + real-time + web panel | Canlı güncellenen yönetim paneli |
| **4** | 18–20 | Mobil + teslim | Saha uygulaması + dokümante teslim |

---

## 18. Git Workflow & PR Süreci

> Staj yetkilisinin (Ümit Bey) beklentisi: doğrudan `main`'e push yok; her özellik kendi branch'inde, PR ile incelenir.

### 18.1 Branch Stratejisi
- `main` → her zaman çalışır, korumalı; sadece PR ile merge.
- `feature/<modül>` → her görev kendi dalında (örn. `feature/stock-transfer`, `feature/web-dashboard`).

### 18.2 Akış (her görev için)
```
git checkout main && git pull
git checkout -b feature/<modül>
# ... çalış, mantıksal commit'ler ...
git push -u origin feature/<modül>
# GitHub'da PR aç → Reviewers: Ümit Bey + Berkay Bey → onay → Merge → branch sil
git checkout main && git pull
```

### 18.3 Commit Standardı (Conventional Commits + scope)
| Önek | Örnek |
|---|---|
| `feat(scope):` | `feat(api): add login validation` |
| `fix(scope):` | `fix(api): prevent negative stock on transfer` |
| `docs:` | `docs: update implementation plan` |
| `design:` | `design: add screen mockups` |
| `refactor:` | `refactor(web): extract table component` |
| `test:` | `test(api): cover transfer approval` |
| `chore:` | `chore: configure turborepo` |

### 18.4 PR Kuralları
- PR başlığı Conventional Commit formatında.
- Açıklamada: ne yapıldı (madde madde), kapsam dışı, ilgili issue (`Closes #N`).
- En az 1 onay alınmadan merge edilmez.

---

## 19. GitHub Projects Board & Issue Yönetimi

- Repo → **Projects** → Board: kolonlar **To Do / In Progress / Review / Done**.
- Plandaki her gün/modül bir **Issue** olur (örn. "Gün 11 — Transfer iş akışı").
- İşe başlayınca kart → *In Progress*; PR açılınca → *Review*; merge olunca → *Done*.
- PR açıklamasına `Closes #N` yazılır; merge'de issue otomatik kapanır.
- Collaborator olarak Ümit Bey ve Berkay Bey eklenir (Settings → Collaborators).

---

## 20. Daily Standup

Her iş günü başında üç soru:
1. **Dün ne yaptım?**
2. **Bugün ne yapacağım?**
3. **Engelim var mı?**

> Standup özetleri o günkü commit'lerle tutarlı tutulur; plan, commit geçmişi ve staj defteri birbirini doğrular.

---

## 21. Risk Yönetimi

| Risk | Olasılık | Etki | Önlem |
|---|---|---|---|
| Tenant izolasyonu sızması | Orta | Yüksek | Prisma extension + çapraz tenant e2e testi (Gün 7) |
| Monorepo kurulum karmaşası | Düşük | Orta | pnpm + Turborepo standart şablonu, Gün 1'de izole |
| 20 güne sığmama | Orta | Orta | "Must-have"e odak; raporlama/BI kapsam dışı |
| Real-time karmaşıklığı | Orta | Orta | Socket.io native room; minimal olay seti |
| Mobil barkod sorunu | Düşük | Düşük | Expo hazır kamera modülü |
| Kapsam kayması | Orta | Orta | Bölüm 3 kapsam dışı listesine sadakat |

---

## 22. Definition of Done

Bir görev şu koşullarda biter:
- [ ] Kod yazıldı, derleniyor/çalışıyor; lint temiz.
- [ ] Tenant izolasyonu + RBAC uygulandı.
- [ ] Kritik iş mantığı için test yazıldı (uygunsa).
- [ ] Tasarım, ilgili mockup'a ve token'lara uygun.
- [ ] Feature branch + PR ile sunuldu, en az 1 onay alındı, merge edildi.
- [ ] Board kartı *Done*'a taşındı; standup'ta raporlandı.

---

## 23. Teslim Edilecekler

1. **Monorepo** — apps (api/web/mobile) + packages, tek `pnpm install` ile ayağa kalkar.
2. **Backend API** — katmanlı, multi-tenant, RBAC'li, Swagger dokümanlı.
3. **Web Yönetim Paneli** — gerçek zamanlı, rol bazlı, tasarım sistemine uygun.
4. **Mobil Saha Uygulaması** — stok takibi + barkod + transfer teslim.
5. **Tasarım asset'leri** — logo, token'lar, ekran mockup'ları.
6. **Dokümantasyon** — bu plan, README'ler, kurulum talimatı, API dokümanı.
7. **Git geçmişi & board** — düzenli PR'lar, günlük commit'ler, dolu staj defteri.

---

*Bu plan tek doğruluk kaynağıdır (single source of truth). Geliştirme ona göre yürür; sapma gerekirse önce bu doküman güncellenir (`docs:` commit), sonra kod yazılır.*
