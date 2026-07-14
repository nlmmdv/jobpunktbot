import { Text } from '@telegram-apps/telegram-ui';
import { COLORS } from '../constants';

interface LoadingProps {
  message?: string;
  fullscreen?: boolean;
}

export const Loading = ({ message = 'Загрузка...', fullscreen = false }: LoadingProps) => {
  const containerStyle: React.CSSProperties = fullscreen
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 255, 255, 0.95)',
        zIndex: 1000,
      }
    : {
        textAlign: 'center',
        padding: '40px 20px',
      };

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            border: `3px solid ${COLORS.bgSecondary}`,
            borderTop: `3px solid ${COLORS.primaryFreelancer}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <Text style={{ color: COLORS.textTertiary, fontSize: 14 }}>{message}</Text>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
