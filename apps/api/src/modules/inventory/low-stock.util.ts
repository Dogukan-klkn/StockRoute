/**
 * Düşük stok eşiği geçiş kontrolü (plan §10 — `notification` olayı).
 *
 * Bildirim yalnızca stok eşiğin altına **yeni** düştüğünde yayınlanır. Zaten
 * eşiğin altındayken yapılan her hareket için tekrar uyarmak kullanıcıyı
 * bildirime boğardı; bu yüzden "önce üstündeydi, şimdi altında" geçişi aranır.
 *
 * `minThreshold === 0` eşik belirlenmemiş demektir (varsayılan): bu durumda
 * uyarı üretilmez, aksi halde stoğu biten her ürün için bildirim çıkardı.
 *
 * Not: Eşik karşılaştırması `findAll(lowStock)` filtresiyle aynı olmalıdır;
 * orada düşük stok `quantity <= minThreshold` olarak tanımlıdır.
 *
 * @param previousQuantity Hareket öncesi stok.
 * @param newQuantity      Hareket sonrası stok.
 * @param minThreshold     Ürünün şubedeki düşük stok eşiği.
 * @returns Eşik bu hareketle yeni geçildiyse `true`.
 */
export function crossedBelowThreshold(
  previousQuantity: number,
  newQuantity: number,
  minThreshold: number,
): boolean {
  if (minThreshold <= 0) {
    return false;
  }
  return previousQuantity > minThreshold && newQuantity <= minThreshold;
}
