/**
 * Transfer listesi ve detayının paylaştığı biçimlendirme yardımcıları.
 */

/**
 * Transfer numarası: cuid uzun ve okunaksız olduğu için son 6 karakter büyük
 * harfle gösterilir (mockup'ta kısa bir referans no vardır). Yalnızca görüntü
 * amaçlıdır; API çağrılarında her zaman tam `id` kullanılır.
 */
export function shortMovementId(id: string): string {
  return `#${id.slice(-6).toLocaleUpperCase('tr')}`;
}

/** Tarih biçimi (mockup: "30 Haz 2026, 14:20"). */
export function formatMovementDate(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
