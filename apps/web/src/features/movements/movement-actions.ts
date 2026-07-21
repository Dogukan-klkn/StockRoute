import { MovementStatus, UserRole } from '@stockroute/shared-types';
import type { MovementAction } from './types';

/**
 * Durum geçişi aksiyonlarının görünürlük kuralları.
 *
 * Her aksiyon **hem** mevcut duruma **hem** kullanıcı rolüne bağlıdır; kurallar
 * backend'deki yetki matrisi (movements.controller.ts) ve durum makinesi
 * (movements.service.ts) ile birebir aynıdır. UI yalnızca gösterim kararı verir;
 * asıl denetim her zaman sunucudadır.
 *
 * `cancel` özel durumdur: rol matrisi tüm rollere açıktır ama servis "yalnızca
 * talebi oluşturan veya FIRM_ADMIN" kuralını uygular; bu yüzden burada da
 * kullanıcı kimliği karşılaştırılır.
 */
interface ActionRule {
  /** Aksiyonun görünür olduğu durumlar. */
  statuses: readonly MovementStatus[];
  /** Aksiyonu yapabilen roller. */
  roles: readonly UserRole[];
  /** Butonun Türkçe etiketi. */
  label: string;
  /** Onay diyaloğunda gösterilecek metin. */
  confirmMessage: string;
  /** Başarı bildirimi. */
  successMessage: string;
}

export const MOVEMENT_ACTION_RULES: Record<MovementAction, ActionRule> = {
  approve: {
    statuses: [MovementStatus.PENDING],
    roles: [UserRole.SUPER_ADMIN, UserRole.FIRM_ADMIN, UserRole.BRANCH_MANAGER],
    label: 'Onayla',
    confirmMessage: 'Bu transfer talebini onaylamak istediğinize emin misiniz?',
    successMessage: 'Transfer onaylandı.',
  },
  reject: {
    statuses: [MovementStatus.PENDING],
    roles: [UserRole.SUPER_ADMIN, UserRole.FIRM_ADMIN, UserRole.BRANCH_MANAGER],
    label: 'Reddet',
    confirmMessage: 'Bu transfer talebini reddetmek istediğinize emin misiniz? Stok değişmez.',
    successMessage: 'Transfer reddedildi.',
  },
  ship: {
    statuses: [MovementStatus.APPROVED],
    roles: [
      UserRole.SUPER_ADMIN,
      UserRole.FIRM_ADMIN,
      UserRole.BRANCH_MANAGER,
      UserRole.WAREHOUSE_STAFF,
    ],
    label: 'Sevk Et',
    confirmMessage:
      'Transfer sevk edilecek ve kaynak şubeden stok düşülecek. Devam etmek istiyor musunuz?',
    successMessage: 'Transfer sevk edildi.',
  },
  receive: {
    statuses: [MovementStatus.IN_TRANSIT],
    roles: [
      UserRole.SUPER_ADMIN,
      UserRole.FIRM_ADMIN,
      UserRole.BRANCH_MANAGER,
      UserRole.WAREHOUSE_STAFF,
      UserRole.FIELD_STAFF,
    ],
    label: 'Teslim Al',
    confirmMessage:
      'Transfer teslim alınacak ve hedef şubeye stok eklenecek. Devam etmek istiyor musunuz?',
    successMessage: 'Transfer teslim alındı.',
  },
  cancel: {
    statuses: [MovementStatus.PENDING, MovementStatus.APPROVED],
    // Rol matrisi geniştir; asıl kısıt aşağıdaki "talep eden veya FIRM_ADMIN" kuralıdır.
    roles: [
      UserRole.SUPER_ADMIN,
      UserRole.FIRM_ADMIN,
      UserRole.BRANCH_MANAGER,
      UserRole.WAREHOUSE_STAFF,
      UserRole.FIELD_STAFF,
    ],
    label: 'İptal Et',
    confirmMessage: 'Bu transfer talebini iptal etmek istediğinize emin misiniz? Stok değişmez.',
    successMessage: 'Transfer iptal edildi.',
  },
};

/** Butonların ekranda görüneceği sıra. */
export const MOVEMENT_ACTION_ORDER: readonly MovementAction[] = [
  'approve',
  'reject',
  'ship',
  'receive',
  'cancel',
];

/** Aksiyon görünürlüğünü belirleyen bağlam. */
interface ActionContext {
  status: MovementStatus;
  role: UserRole | undefined;
  /** Oturumdaki kullanıcının kimliği (cancel kuralı için). */
  userId: string | undefined;
  /** Transferi oluşturan kullanıcının kimliği. */
  requestedById: string;
}

/** Tek bir aksiyonun verilen bağlamda görünür olup olmadığını söyler. */
export function canRunAction(action: MovementAction, context: ActionContext): boolean {
  const rule = MOVEMENT_ACTION_RULES[action];

  if (!rule.statuses.includes(context.status)) {
    return false;
  }
  if (context.role === undefined || !rule.roles.includes(context.role)) {
    return false;
  }
  // İptal: yalnızca talebi oluşturan kullanıcı veya firma yöneticisi.
  if (action === 'cancel') {
    const isOwner = context.userId !== undefined && context.userId === context.requestedById;
    const isAdmin = context.role === UserRole.FIRM_ADMIN || context.role === UserRole.SUPER_ADMIN;
    return isOwner || isAdmin;
  }
  return true;
}

/** Verilen bağlamda görünecek tüm aksiyonları sırayla döner. */
export function availableActions(context: ActionContext): MovementAction[] {
  return MOVEMENT_ACTION_ORDER.filter((action) => canRunAction(action, context));
}
