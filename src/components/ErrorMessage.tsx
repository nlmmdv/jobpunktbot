import { Text } from '@telegram-apps/telegram-ui';
import { COLORS } from '../constants';

interface ErrorMessageProps {
  message?: string;
  onDismiss?: () => void;
}

export const ErrorMessage = ({ message, onDismiss }: ErrorMessageProps) => {
  if (!message) return null;

  return (
    <div
      style={{
        background: '#FEE2E2',
        border: `1px solid #FECACA`,
        borderRadius: 12,
        padding: '12px 16px',
        marginBottom: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Text style={{ color: COLORS.error, fontSize: 14 }}>{message}</Text>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: COLORS.error,
            cursor: 'pointer',
            fontSize: 16,
            padding: 0,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
};
