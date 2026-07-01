# StockRoute — Renk Paleti

> Kaynak: `implementation_plan.md` §11.1. Bu belge tek doğruluk kaynağı değildir; plandan
> sapma gerekirse önce plan güncellenir. Token karşılıkları için bkz.
> [`packages/ui-tokens/src/index.ts`](../../packages/ui-tokens/src/index.ts).

Palet, web (MUI teması) ve mobil (RN teması) için ortak görsel dili tanımlar. Tüm renkler
`@stockroute/ui-tokens` paketindeki `colors` nesnesinden tüketilmelidir; bileşenlerde
sabit (hardcoded) HEX değeri kullanılmaz.

## Ana Palet

| Rol | İsim | HEX | Token | Kullanım |
|---|---|---|---|---|
| Primary | Blue 600 | `#2563EB` | `colors.primary` | Ana aksiyon, vurgular, marka |
| Primary Dark | Blue 800 | `#1E40AF` | `colors.primaryDark` | Hover, başlık |
| Success | Green 600 | `#16A34A` | `colors.success` | Stok girişi, teslim alındı |
| Warning | Amber 500 | `#F59E0B` | `colors.warning` | Beklemede / yolda |
| Danger | Red 600 | `#DC2626` | `colors.danger` | Reddedildi / düşük stok |
| Background | Slate 50 | `#F8FAFC` | `colors.background` | Sayfa arka planı |
| Surface | White | `#FFFFFF` | `colors.surface` | Kart, tablo |
| Border | Slate 200 | `#E2E8F0` | `colors.border` | Çizgi, kenarlık |
| Text Primary | Slate 900 | `#0F172A` | `colors.textPrimary` | Ana metin |
| Text Secondary | Slate 500 | `#64748B` | `colors.textSecondary` | İkincil metin |

## Kullanım Kuralları

- **Primary (`#2563EB`)** yalnızca birincil aksiyonlarda (ör. "Giriş Yap", "Talep Oluştur"),
  aktif navigasyon öğelerinde ve marka vurgularında kullanılır. Bir ekranda birden fazla
  birincil aksiyon bulundurmaktan kaçınılır.
- **Primary Dark (`#1E40AF`)** hover/pressed durumları ve koyu başlık vurguları içindir;
  bağımsız bir aksiyon rengi olarak kullanılmaz.
- **Success / Warning / Danger** durum geri bildirimi içindir (toast, chip, satır vurgusu);
  dekoratif amaçla kullanılmaz. Düşük stok satırları `danger` ile vurgulanır.
- **Background** sayfa zemini, **Surface** ise kart/tablo/modal yüzeyleri içindir; ikisi
  üst üste bindiğinde derinlik `border` + hafif gölge (bkz. design-system) ile verilir.
- **Text Primary** gövde ve başlık metni, **Text Secondary** yardımcı/açıklama metni içindir.
  Erişilebilirlik için metin `surface`/`background` üzerinde yeterli kontrastı korumalıdır.

## Transfer Durum Renkleri

Transfer (StockMovement) durum rozetleri (chip) aşağıdaki eşlemeyi kullanır. Token karşılığı
`@stockroute/ui-tokens` içindeki `statusColors` nesnesidir.

| Durum | Renk | Token |
|---|---|---|
| `PENDING` (Beklemede) | Amber `#F59E0B` | `statusColors.PENDING` |
| `APPROVED` (Onaylandı) | Blue `#2563EB` | `statusColors.APPROVED` |
| `IN_TRANSIT` (Yolda) | Mavi-mor `#6366F1` | `statusColors.IN_TRANSIT` |
| `RECEIVED` (Teslim alındı) | Green `#16A34A` | `statusColors.RECEIVED` |
| `REJECTED` (Reddedildi) | Red `#DC2626` | `statusColors.REJECTED` |
| `CANCELLED` (İptal) | Gri `#64748B` | `statusColors.CANCELLED` |

> Not: Plan §11.1 durum renklerini "PENDING → Amber, APPROVED → Blue, IN_TRANSIT → Mavi-mor,
> RECEIVED → Green, REJECTED/CANCELLED → Red/Gri" olarak tanımlar. `IN_TRANSIT` için mavi-mor
> tonu (`#6366F1`, Indigo 500) ve `CANCELLED` için gri (`textSecondary`) seçilmiştir.
