# StockRoute web — React + Vite yönetim paneli container imajı (plan §13.3).
#
# Build context MONOREPO KÖKÜDÜR (docker build -f apps/web/Dockerfile .):
# web, workspace paketlerine (`@stockroute/shared-types`, `@stockroute/ui-tokens`)
# bağımlıdır ve pnpm workspace çözümlemesi kökteki lockfile'ı gerektirir.
#
# Çok aşamalı yapı: `builder` statik dosyaları üretir, `runner` (nginx) yalnızca
# onları servis eder. Node ve tüm derleme bağımlılıkları son imajda yer almaz.

# ---------------------------------------------------------------------------
# Aşama 1 — builder: bağımlılıklar ve Vite üretim derlemesi
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

# pnpm sürümü kök package.json'daki `packageManager` alanıyla birebir aynıdır.
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

# Önce yalnızca manifest'ler: kaynak değişiminde bağımlılık katmanı yeniden
# kurulmaz (Docker katman önbelleği).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/ui-tokens/package.json ./packages/ui-tokens/
COPY packages/config/package.json ./packages/config/

# Yalnızca web ve bağımlı olduğu workspace paketleri kurulur; API'ye özgü ağır
# bağımlılıklar (Prisma, NestJS) web imajına hiç girmez.
RUN pnpm install --frozen-lockfile --filter @stockroute/web...

COPY . .

# --- Vite ortam değişkenleri: DERLEME ZAMANINDA gömülür ---
#
# Bu değerler tarayıcıda çalışan pakete yazılır; konteyner çalışırken
# değiştirilemez. Reverse proxy modeli seçildiği için ikisi de GÖRELİDİR:
#  - VITE_API_URL=/api  → axios istekleri sayfanın origin'ine gider, nginx
#    bunları api container'ına iletir (CORS yok, tek origin).
#  - VITE_SOCKET_URL="" → socket.io boş adresi "sayfanın kendi origin'i"
#    olarak yorumlar ve varsayılan `/socket.io` yolunu kullanır; nginx bu yolu
#    WebSocket yükseltmesiyle birlikte api'ye iletir.
# Mutlak adres verilseydi imaj tek bir host adına çakılırdı.
ARG VITE_API_URL=/api
ARG VITE_SOCKET_URL=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

# `shared-types` önce derlenir. Vite paketlemeyi vite.config.ts'teki alias ile
# doğrudan TS kaynağından yapar, ancak `build` script'i `tsc -b && vite build`
# şeklindedir: `tsc` tip çözümlemesini alias'tan değil package.json'dan
# (`types: dist/index.d.ts`) yapar. Bu dosya üretilmezse tip denetimi
# "Cannot find module '@stockroute/shared-types'" ile başarısız olur.
RUN pnpm --filter @stockroute/shared-types run build \
 && pnpm --filter @stockroute/web run build

# ---------------------------------------------------------------------------
# Aşama 2 — runner: statik dosyaları nginx ile servis et
# ---------------------------------------------------------------------------
FROM nginx:alpine AS runner

# Varsayılan sunucu bloğu kaldırılır; kendi yapılandırmamız gelir (SPA
# yönlendirmesi + /api ve /socket.io ters vekil kuralları).
RUN rm -f /etc/nginx/conf.d/default.conf
COPY apps/web/nginx.conf /etc/nginx/conf.d/stockroute.conf

# Yalnızca derleme çıktısı taşınır — kaynak kod ve node_modules taşınmaz.
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

# nginx'i ön planda çalıştır: arka plana geçerse konteyner hemen sonlanır.
CMD ["nginx", "-g", "daemon off;"]
