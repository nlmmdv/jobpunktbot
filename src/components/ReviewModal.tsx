import { useState } from 'react';
import { callFunction } from '../lib/api';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetName: string;
  onSuccess?: () => void;
}

export const ReviewModal = ({ isOpen, onClose, targetId, targetName, onSuccess }: ReviewModalProps) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!rating) {
      alert('Пожалуйста, выберите оценку');
      return;
    }

    setIsSubmitting(true);
    try {
      await callFunction('submit-review', {
        reviewee_id: targetId,
        rating,
        comment: comment || undefined,
      });

      alert('✅ Отзыв успешно отправлен. Спасибо!');
      setRating(5);
      setComment('');
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error submitting review:', err);
      alert('❌ Ошибка при отправке отзыва. Пожалуйста, попробуйте позже.');
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
          ⭐ Оставить отзыв
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          {targetName}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 12, color: 'var(--text-primary)' }}>
            Оценка
          </label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-around' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                style={{
                  fontSize: 32,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: star <= rating ? 1 : 0.4,
                  transition: 'opacity 0.2s',
                }}
              >
                ⭐
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, textAlign: 'center' }}>
            Ваша оценка: {rating} из 5
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8, color: 'var(--text-primary)' }}>
            Комментарий (необязательно)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Расскажите подробнее о вашем опыте работы..."
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
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: 8,
              border: 'none',
              background: isSubmitting ? '#D1D5DB' : '#6366F1',
              color: 'white',
              fontSize: 12,
              fontWeight: 600,
              cursor: isSubmitting ? 'default' : 'pointer',
            }}
          >
            {isSubmitting ? 'Отправка...' : 'Отправить отзыв'}
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
