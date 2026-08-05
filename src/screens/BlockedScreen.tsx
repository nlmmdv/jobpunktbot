import { useAuth } from '../contexts/AuthContext';
import { Screen, Button } from '../components/ui';

/**
 * Что видит заблокированный вместо приложения. Показываем причину и срок:
 * человек должен понимать, за что и до когда, иначе он просто пишет в поддержку.
 */
export const BlockedScreen = () => {
  const { block, profile, refreshAuth } = useAuth();

  const until = block?.unblock_at
    ? new Date(block.unblock_at).toLocaleString('ru', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <Screen>
      <div style={{ textAlign: 'center', paddingTop: 48 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🚫</div>
        <div className="title" style={{ marginBottom: 8 }}>Аккаунт заблокирован</div>

        {profile?.first_name && (
          <div className="subtitle" style={{ marginBottom: 20 }}>{profile.first_name}, доступ приостановлен</div>
        )}

        <div
          style={{
            background: 'var(--bg-card-owner-alt, #F9FAFB)',
            border: '1px solid #FCA5A5',
            borderRadius: 12,
            padding: 16,
            textAlign: 'left',
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Причина</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
            {block?.reason || 'не указана'}
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Разблокировка</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: until ? '#D97706' : '#DC2626' }}>
            {until || 'Бессрочно'}
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
          {until
            ? 'После этого времени доступ вернётся сам — просто откройте приложение заново.'
            : 'Чтобы оспорить решение, напишите в поддержку.'}
        </div>

        <Button tone="outline" onClick={refreshAuth}>
          Проверить снова
        </Button>
      </div>
    </Screen>
  );
};
