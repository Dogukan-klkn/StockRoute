import axios from 'axios';

/**
 * Axios/NestJS hata yanıtından kullanıcıya gösterilecek Türkçe mesajı çıkarır.
 *
 * NestJS istisnaları gövdede `{ message: string | string[] }` döner
 * (ValidationPipe dizi, HttpException tekil metin verir). Uygun bir mesaj
 * bulunamazsa `fallback` kullanılır. Snackbar bildirimleri bunu tüketir.
 */
export function getApiErrorMessage(error: unknown, fallback = 'Bir hata oluştu.'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message;
    }
  }
  return fallback;
}
