import { useState } from 'react';
import { ComplaintModal } from './ComplaintModal';
import { ReviewModal } from './ReviewModal';

interface UserInfo {
  id: string;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  city?: string;
  role: string;
}

interface OtherUserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserInfo;
}

export const OtherUserProfileModal = ({ isOpen, onClose, user }: OtherUserProfileModalProps) => {
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  if (!isOpen) return null;

  return (
    <>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: '#E5E7EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              {user.first_name?.[0]}
              {user.last_name?.[0]}
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: 'none',
                background: '#F3F4F6',
                color: 'var(--text-primary)',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>
            {user.first_name} {user.last_name || ''}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
            {user.role === 'employee' ? '👨‍💼 Сотрудник' : '👤 Фрилансер'} • {user.city || '—'}
          </div>

          <div
            style={{
              background: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>ID пользователя</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{user.telegram_id}</div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button
              onClick={() => setShowReviewModal(true)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 8,
                border: '1px solid #BFDBFE',
                background: '#EFF6FF',
                color: '#1E40AF',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ⭐ Отзыв
            </button>
            <button
              onClick={() => setShowComplaintModal(true)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 8,
                border: '1px solid #FCA5A5',
                background: '#FEE2E2',
                color: '#DC2626',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🚩 Пожаловаться
            </button>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'white',
              color: 'var(--text-primary)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Закрыть
          </button>
        </div>
      </div>

      <ComplaintModal
        isOpen={showComplaintModal}
        onClose={() => setShowComplaintModal(false)}
        complaintType="user"
        targetId={user.id}
        targetName={`${user.first_name} ${user.last_name || ''}`}
      />

      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        targetId={user.id}
        targetName={`${user.first_name} ${user.last_name || ''}`}
      />
    </>
  );
};
