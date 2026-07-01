# StockRoute — Tasarım Sistemi

> Kaynak: `implementation_plan.md` §11.2 (Tipografi) ve §11.3 (Spacing & Şekil).
> Renk paleti ayrı belgede: [`docs/brand/palette.md`](../brand/palette.md).
> Tüm token'ların kod karşılığı: [`packages/ui-tokens/src/index.ts`](../../packages/ui-tokens/src/index.ts).

Bu belge, web (MUI) ve mobil (React Native) istemcilerinin uyacağı **tipografi, spacing,
köşe yarıçapı ve gölge** kurallarının referansıdır. Token'lar `@stockroute/ui-tokens`
paketinden tüketilir; bileşenlerde sabit (hardcoded) değer kullanılmaz.

---

## 1. Tipografi (§11.2)

### Font Aileleri

| Kullanım | Font | Token |
|---|---|---|
| Ana font (web + mobil) | **Inter** | `typography.fontFamily.base` |
| Kod / SKU / barkod | **Roboto Mono** (monospace) | `typography.fontFamily.mono` |

- **Inter** başlıklar ve gövde metni dahil tüm arayüz metni için kullanılır.
- Ürün **SKU**, **barkod** ve teknik kod gösterimleri monospace (`Roboto Mono`) ile
  hizalanır — böylece rakam/harf genişlikleri sabit kalır.

### Font Ağırlıkları

| Ağırlık | Değer | Token | Kullanım |
|---|---|---|---|
| Regular | 400 | `typography.fontWeight.regular` | Gövde metni |
| Medium | 500 | `typography.fontWeight.medium` | Vurgulu gövde, etiketler |
| Semibold | 600 | `typography.fontWeight.semibold` | Başlıklar |
| Bold | 700 | `typography.fontWeight.bold` | Ana başlıklar, marka wordmark |

> Plan kuralı: **Başlıklar 600/700, gövde 400/500.**

### Boyut Ölçeği

Ölçek: **12 / 14 / 16 / 20 / 24 / 32 px**.

| Token | px | Tipik kullanım |
|---|---|---|
| `typography.fontSize.xs` | 12 | Yardımcı metin, chip, tablo alt bilgisi |
| `typography.fontSize.sm` | 14 | İkincil metin, form etiketi |
| `typography.fontSize.md` | 16 | Gövde metni (temel) |
| `typography.fontSize.lg` | 20 | Alt başlık |
| `typography.fontSize.xl` | 24 | Sayfa başlığı |
| `typography.fontSize.xxl` | 32 | Ekran/marka başlığı |

---

## 2. Spacing (§11.3)

Spacing skalası: **4 / 8 / 12 / 16 / 24 / 32 (px)**. Tüm iç/dış boşluklar (padding, margin,
gap) bu skalaya oturur; ara değer kullanılmaz.

| Token | px | Tipik kullanım |
|---|---|---|
| `spacing.xs` | 4 | İkon-metin arası, ince boşluk |
| `spacing.sm` | 8 | Bileşen içi küçük boşluk |
| `spacing.md` | 12 | Form alanları arası |
| `spacing.lg` | 16 | Kart iç padding'i, bölüm boşluğu |
| `spacing.xl` | 24 | Kartlar/bloklar arası |
| `spacing.xxl` | 32 | Sayfa kenar boşluğu, büyük ayrımlar |

---

## 3. Köşe Yarıçapı (§11.3)

| Token | px | Kullanım |
|---|---|---|
| `radius.sm` | 4 | Chip, input |
| `radius.md` | 8 | Kart, buton |
| `radius.appIcon` | 22 | Uygulama ikonu (1:1) |

- **Kart ve butonlar** 8px yuvarlatma kullanır.
- **Chip ve input** alanları 4px ile daha keskindir.
- **1:1 app icon** 22px yarıçapla üretilir (bkz. `docs/brand` — marka assetleri).

---

## 4. Gölge (§11.3)

Tek seviye, **hafif** gölge kullanılır:

| Token | Değer | Kullanım |
|---|---|---|
| `shadows.sm` | `0 1px 3px rgba(0,0,0,0.08)` | Kart, modal, açılır menü yüzey derinliği |

- Derinlik öncelikle `border` (Slate 200) + bu hafif gölge ile verilir; ağır/çok katmanlı
  gölgelerden kaçınılır.

---

## 5. Token Kullanımı

```ts
import { colors, typography, spacing, radius, shadows } from '@stockroute/ui-tokens';

// Örnek: bir kart stili
const cardStyle = {
  backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.md,      // 8px
  padding: spacing.lg,          // 16px
  boxShadow: shadows.sm,
  color: colors.textPrimary,
  fontFamily: typography.fontFamily.base,
  fontSize: typography.fontSize.md, // 16px
};
```

- **Web (MUI):** `createTheme` çağrısı bu token'lardan beslenir (`palette`, `typography`,
  `shape.borderRadius`, `spacing`).
- **Mobil (RN):** tema nesnesi aynı token'ları RN `StyleSheet` değerlerine map'ler.

> İlke: Tasarım değeri tek bir yerde (`@stockroute/ui-tokens`) tanımlanır; iki istemci de
> aynı kaynağı tüketir. Görsel dilde değişiklik gerektiğinde önce token güncellenir.
