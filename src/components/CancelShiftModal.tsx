import { Modal, Button, type Variant } from './ui';
import { penaltyFor, hoursUntilShift, formatShiftWhen, type CancelRole } from '../lib/cancellation';

interface CancelShiftModalProps {
  role: CancelRole;
  variant: Variant;
  address?: string | null;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Подтверждение отмены смены. Показывает штраф ДО подтверждения — считаем его
 * теми же правилами, что и сервер (src/lib/cancellation.ts).
 */
export const CancelShiftModal = ({
  role,
  variant,
  address,
  date,
  startTime,
  endTime,
  busy,
  onConfirm,
  onClose,
}: CancelShiftModalProps) => {
  const hours = date ? hoursUntilShift(date, startTime) : Number.POSITIVE_INFINITY;
  const { penalty, reason } = penaltyFor(role, hours);
  const free = penalty === 0;

  return (
    <Modal title="Отменить смену?" onClose={() => !busy && onClose()}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
        📍 {address || 'Адрес не указан'}
      </div>
      <div className="meta" style={{ marginBottom: 16 }}>
        📅 {formatShiftWhen(date, startTime, endTime)}
      </div>

      <div
        style={{
          background: free ? 'var(--bg-badge-accepted)' : 'var(--bg-danger)',
          color: free ? 'var(--text-badge-accepted)' : 'var(--text-danger)',
          borderRadius: 12,
          padding: 12,
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 16,
        }}
      >
        {free ? `✅ Без штрафа (${reason.toLowerCase()})` : `⚠️ Штраф: ${penalty} к рейтингу (${reason.toLowerCase()})`}
      </div>

      <Button variant={variant} tone="danger" onClick={onConfirm} disabled={busy} style={{ marginBottom: 8 }}>
        {busy ? 'Отменяем...' : 'Отменить смену'}
      </Button>
      <Button variant={variant} tone="secondary" onClick={onClose} disabled={busy}>
        Назад
      </Button>
    </Modal>
  );
};
