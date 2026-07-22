# Docker uçtan uca doğrulama

Tarih: 2026-07-22 15:54

## Sıfırdan kalkış (docker compose down -v && build --no-cache && up)
```
cache'siz build : 156 sn
kalkış          : 53 sn (db healthy -> api -> web)
```

## Servis durumu
```
api  running  Up About a minute
db  running  Up About a minute (healthy)
web  running  Up About a minute
```

## İmaj boyutları
```
truncgil_staj-api  956MB
truncgil_staj-web  94.4MB
```

## Migration + seed (container ilk açılışta)
```
Applying migration `20260701121008_refine_inventory_architecture`
All migrations have been successfully applied.
  ✓ Acme Lojistik A.Ş. (slug: acme-lojistik) — admin: admin@demo.test
  ✓ Globex Tedarik Ltd. (slug: globex-tedarik) — admin: admin@demo.test
Seed tamamlandı.
```

## Tarayıcı testi (scripts/e2e/docker-verify.mjs)
```
7/7 gecti - giris, dashboard, WebSocket 101, konsol temiz
```
