import { useState } from 'react';
import { callFunction } from '../lib/api';

type ComplaintType = 'user' | 'company';

interface ComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaintType: ComplaintType;
  targetId: string;
  targetName: string;
}

const COMPLAINT_REASONS = {
  user: [
    'Плохое поведение',
    'Неисполнение работ',
    'Невежливое общение',
    'Оскорбления',
    'Мошенничество',
    'Другое',
  ],
  company: [
    'Плохое обслуживание',
    'Невежливый персонал',
    'Проблема с доставкой',
    'Некорректная информация',
    'Мошенничество',
    'Другое',
  ],
};

export const ComplaintModal = ({ isOpen, onClose, complaintType, targetId, targetName }: ComplaintModalProps) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reasons = COMPLAINT_REASONS[complaintType];

  const handleSubmit = async () => {
    if (!selectedReason) {
      alert('Пожалуйста, выберите причину жалобы');
      return;
    }

    setIsSubmitting(true);
    try {
      const functionName = complaintType === 'user' ? 'submit-complaint' : 'submit-company-complaint';
      // На компанию клиент знает только telegram_id владельца (он есть в карточке
      // вакансии), а в company_complaints.reported_company_id лежит uuid профиля.
      // Резолвим на сервере, иначе Postgres отвергнет вставку.
      const bodyKey = complaintType === 'user' ? 'reported_user_id' : 'owner_telegram_id';

      await callFunction(functionName, {
        [bodyKey]: targetId,
        reason: selectedReason,
        description: description || undefined,
      });

      alert('✅ Жалоба успешно отправлена. Спасибо за помощь!');
      setSelectedReason('');
      setDescription('');
      onClose();
    } catch (err) {
      console.error('Error submitting complaint:', err);
      alert('❌ Ошибка при отправке жалобы. Пожалуйста, попробуйте позже.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'flex-end',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '20px 20px 0 0',
          padding: '20px',
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
          📋 Пожаловаться на {complaintType === 'user' ? 'пользователя' : 'компанию'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          {targetName}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8, color: 'var(--text-primary)' }}>
            Причина жалобы
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reasons.map((reason) => (
              <button
                key={reason}
                onClick={() => setSelectedReason(reason)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: selectedReason === reason ? '2px solid #3B82F6' : '1px solid var(--border)',
                  background: selectedReason === reason ? '#EFF6FF' : 'white',
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                }}
              >
                {selectedReason === reason && '✓ '} {reason}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8, color: 'var(--text-primary)' }}>
            Дополнительная информация (необязательно)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Опишите подробнее, что произошло..."
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              fontSize: 12,
              fontFamily: 'inherit',
              minHeight: 80,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleSubmit}
            disabled={!selectedReason || isSubmitting}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: 8,
              border: 'none',
              background: !selectedReason || isSubmitting ? '#D1D5DB' : '#DC2626',
              color: 'white',
              fontSize: 12,
              fontWeight: 600,
              cursor: !selectedReason || isSubmitting ? 'default' : 'pointer',
            }}
          >
            {isSubmitting ? 'Отправка...' : 'Отправить жалобу'}
          </button>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'white',
              color: 'var(--text-primary)',
              fontSize: 12,
              fontWeight: 600,
              cursor: isSubmitting ? 'default' : 'pointer',
            }}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};
