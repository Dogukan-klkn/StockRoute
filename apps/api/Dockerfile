# StockRoute API — NestJS (REST + WebSocket) container imajı (plan §13.2).
#
# Build context MONOREPO KÖKÜDÜR (docker build -f apps/api/Dockerfile .):
# api, workspace paketi `@stockroute/shared-types`'a bağımlıdır ve pnpm
# workspace çözümlemesi için lockfile ile birlikte tüm kökün bulunması gerekir.
#
# Çok aşamalı yapı: `builder` derlemeyi yapar, `runner` yalnızca çalıştırır.
# Derleme araçlarının (nest CLI, TypeScript) son imajda taşınmasını önler.

# ---------------------------------------------------------------------------
# Aşama 1 — builder: bağımlılıklar, Prisma Client ve TypeScript derlemesi
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

# pnpm sürümü kök package.json'daki `packageManager` alanıyla birebir aynıdır;
# sürüm kayması lockfile'ın reddedilmesine yol açabilir.
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

# Önce yalnızca manifest'ler kopyalanır: kaynak kod değiştiğinde bağımlılık
# katmanı yeniden kurulmaz (Docker katman önbelleği).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/ui-tokens/package.json ./packages/ui-tokens/
COPY packages/config/package.json ./packages/config/

# `--frozen-lockfile`: lockfile ile package.json çelişirse build başarısız olur
# (sessizce farklı sürüm kurulmasını engeller).
#
# `--filter @stockroute/api...` (sondaki üç nokta önemlidir) yalnızca api'yi ve
# BAĞIMLI OLDUĞU workspace paketlerini kurar. Web'e özgü ağır bağımlılıklar
# (MUI, Vite, Playwright — ölçülen ~165 MB) API imajına hiç girmez.
RUN pnpm install --frozen-lockfile --filter @stockroute/api...

# Kaynak kod. Mobil uygulama .dockerignore ile zaten dışarıda.
COPY . .

# Prisma Client üretimi: `build` script'inin parçası DEĞİLDİR, açıkça çağrılır.
# schema.prisma'daki binaryTargets sayesinde Alpine (musl) motoru da üretilir.
RUN pnpm --filter @stockroute/api exec prisma generate

# Derleme sırası açıkça yazılır: shared-types `dist/index.js` üretmelidir,
# çünkü api onu derlenmiş CJS olarak tüketir (package.json → main).
# Turbo yerine doğrudan çağrı: turbo kök devDependency'sidir ve filtreli
# kurulumda imaja girmez; ayrıca burada tek bir bağımlılık zinciri var.
RUN pnpm --filter @stockroute/shared-types run build \
 && pnpm --filter @stockroute/api run build

# ---------------------------------------------------------------------------
# Aşama 2 — runner: yalnızca çalışma zamanı
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

ENV NODE_ENV=production

# NOT (bilinçli tercih): Bağımlılıklar `--prod` ile budanmıyor ve /app bütün
# olarak kopyalanıyor. İki nedeni var:
#  1. Seed `ts-node prisma/seed.ts` ile çalışır; `ts-node` ve `typescript`
#     devDependency'dir. Budarsak konteyner ilk açılışta demo verisini
#     yükleyemez (bkz. CMD).
#  2. pnpm bağımlılıkları `node_modules/.pnpm` altında sembolik bağlarla
#     çözer; seçmeli kopyalama bu bağları kolayca kırar.
# Bedeli daha büyük bir imajdır; teslim senaryosunda "tek komutla dolu demo"
# bu bedele değer. Boyut optimizasyonu ayrı bir iş olarak ele alınabilir.
COPY --from=builder /app ./

# Prisma engine'i Alpine'de OpenSSL'e ihtiyaç duyar.
RUN apk add --no-cache openssl

EXPOSE 3000

# Çalışma sırası: şema göçleri → demo verisi → sunucu.
# `migrate deploy` yalnızca bekleyen migration'ları uygular (üretim güvenli,
# `migrate dev`in aksine şema sıfırlamaz). Seed idempotent `upsert` kullandığı
# için her yeniden başlatmada güvenle çalışır. Bu adımlar BUILD sırasında değil,
# konteyner ayağa kalkarken (veritabanı erişilebilirken) çalışır.
CMD ["sh", "-c", "pnpm --filter @stockroute/api exec prisma migrate deploy && pnpm --filter @stockroute/api exec prisma db seed && node apps/api/dist/main.js"]
