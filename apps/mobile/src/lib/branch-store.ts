import { create } from 'zustand';

/**
 * Seçili şube (UI durumu) — stok ve tarama ekranları arasında paylaşılır.
 *
 * Neden ayrı bir store: `useAuthStore` kimliktir (token, kullanıcı, şubesi);
 * "hangi şubeye bakıyorum" ise geçici bir UI tercihidir. İkisini ayrı tutuyoruz
 * (ayrı sorumluluklar) ama tek kaynakta topluyoruz: aksi halde stok ekranı bir
 * şubeyi, tarama ekranı başka bir şubeyi gösterip kullanıcıyı "bu miktar hangi
 * şubenin?" belirsizliğinde bırakırdı.
 *
 * NOT: Burada tutulan yalnızca *seçebilen* rollerin (SUPER_ADMIN/FIRM_ADMIN/
 * BRANCH_MANAGER) tercihidir. WAREHOUSE_STAFF/FIELD_STAFF kendi şubesine
 * sabittir ve bu store'u kullanmaz — bkz. `useEffectiveBranch`.
 */
interface BranchState {
  /** Şube seçebilen rollerin seçtiği şube kimliği; seçilmediyse boş string. */
  selectedBranchId: string;
  setSelectedBranchId: (branchId: string) => void;
}

export const useBranchStore = create<BranchState>((set) => ({
  selectedBranchId: '',
  setSelectedBranchId: (branchId) => set({ selectedBranchId: branchId }),
}));
