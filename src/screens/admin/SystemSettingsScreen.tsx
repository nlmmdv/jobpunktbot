import { useState } from 'react';
import { Screen, TextField } from '../../components/ui';

interface SystemSettings {
  appName: string;
  version: string;
  minRating: number;
  complaintPenalty: number;
  maxWarnings: number;
  defaultBlockDuration: number;
  commissionRate: number;
  enableNotifications: boolean;
  maintenanceMode: boolean;
}

export const SystemSettingsScreen = ({ onBack }: { onBack: () => void }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'rating' | 'blocking' | 'commission' | 'logs'>('general');
  const [settings, setSettings] = useState<SystemSettings>({
    appName: 'ПроПункт',
    version: '1.0.0',
    minRating: 3.0,
    complaintPenalty: 0.1,
    maxWarnings: 3,
    defaultBlockDuration: 24,
    commissionRate: 5,
    enableNotifications: true,
    maintenanceMode: false,
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const updateSetting = (key: keyof SystemSettings, value: any) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <Screen>
      <div className="back-btn owner" onClick={onBack} style={{ cursor: 'pointer', marginBottom: 12 }}>
        ← Назад
      </div>
      <div className="title">⚙️ Системные настройки</div>
      <div className="subtitle">Конфигурация приложения и параметры системы</div>

      {/* Вкладки навигации */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 8 }}>
        {['general', 'rating', 'blocking', 'commission', 'logs'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: activeTab === tab ? 'none' : '1px solid var(--border-card-owner)',
              background: activeTab === tab ? 'var(--accent-owner)' : 'white',
              color: activeTab === tab ? 'white' : 'var(--text-primary)',
              fontWeight: activeTab === tab ? 700 : 600,
              fontSize: 12,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
          >
            {tab === 'general' && '📱 Общие'}
            {tab === 'rating' && '⭐ Рейтинг'}
            {tab === 'blocking' && '🚫 Блокировка'}
            {tab === 'commission' && '💰 Комиссия'}
            {tab === 'logs' && '📊 Логи'}
          </button>
        ))}
      </div>

      {/* Вкладка: Общие настройки */}
      {activeTab === 'general' && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ background: 'var(--bg-card-owner-alt)', borderRadius: 'var(--radius-card-sm)', padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
              📱 Информация приложения
            </div>
            <TextField
              label="Название приложения"
              value={settings.appName}
              onChange={(e) => updateSetting('appName', e.target.value)}
              variant="owner"
              style={{ marginBottom: 12 }}
            />
            <TextField
              label="Версия"
              value={settings.version}
              onChange={(e) => updateSetting('version', e.target.value)}
              variant="owner"
              style={{ marginBottom: 12 }}
            />
          </div>

          <div style={{ background: 'var(--bg-card-owner-alt)', borderRadius: 'var(--radius-card-sm)', padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
              🔔 Состояние приложения
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: 12 }}>
              <input
                type="checkbox"
                checked={settings.enableNotifications}
                onChange={(e) => updateSetting('enableNotifications', e.target.checked)}
                style={{ marginRight: 10, width: 18, height: 18, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>Включить уведомления</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => updateSetting('maintenanceMode', e.target.checked)}
                style={{ marginRight: 10, width: 18, height: 18, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>Режим обслуживания</span>
            </label>
          </div>
        </div>
      )}

      {/* Вкладка: Настройки рейтинга */}
      {activeTab === 'rating' && (
        <div style={{ background: 'var(--bg-card-owner-alt)', borderRadius: 'var(--radius-card-sm)', padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
            ⭐ Параметры рейтинговой системы
          </div>
          <TextField
            label="Минимальный рейтинг для работы"
            type="number"
            value={settings.minRating}
            onChange={(e) => updateSetting('minRating', parseFloat(e.target.value))}
            variant="owner"
            style={{ marginBottom: 12 }}
          />
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, padding: '10px', background: 'white', borderRadius: 6 }}>
            Пользователи с рейтингом ниже этого значения не смогут получать заказы
          </div>

          <TextField
            label="Штраф за жалобу (баллы)"
            type="number"
            step="0.1"
            value={settings.complaintPenalty}
            onChange={(e) => updateSetting('complaintPenalty', parseFloat(e.target.value))}
            variant="owner"
            style={{ marginBottom: 12 }}
          />
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, padding: '10px', background: 'white', borderRadius: 6 }}>
            На сколько пунктов снижается рейтинг при каждой жалобе
          </div>

          <div style={{ background: 'white', padding: 12, borderRadius: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>📊 Текущие настройки:</div>
            <div>• Каждая жалоба: -{settings.complaintPenalty} баллов</div>
            <div>• Максимальный штраф: -{(settings.complaintPenalty * 10).toFixed(1)} баллов (10 жалоб)</div>
            <div>• Минимальный рейтинг: {settings.minRating}/5.0</div>
          </div>
        </div>
      )}

      {/* Вкладка: Настройки блокировки */}
      {activeTab === 'blocking' && (
        <div style={{ background: 'var(--bg-card-owner-alt)', borderRadius: 'var(--radius-card-sm)', padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
            🚫 Параметры системы блокировки
          </div>
          <TextField
            label="Максимум предупреждений перед блокировкой"
            type="number"
            value={settings.maxWarnings}
            onChange={(e) => updateSetting('maxWarnings', parseInt(e.target.value))}
            variant="owner"
            style={{ marginBottom: 12 }}
          />
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, padding: '10px', background: 'white', borderRadius: 6 }}>
            После скольких предупреждений пользователь будет автоматически заблокирован
          </div>

          <TextField
            label="Длительность блокировки по умолчанию (часов)"
            type="number"
            value={settings.defaultBlockDuration}
            onChange={(e) => updateSetting('defaultBlockDuration', parseInt(e.target.value))}
            variant="owner"
            style={{ marginBottom: 12 }}
          />
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, padding: '10px', background: 'white', borderRadius: 6 }}>
            Стандартная длительность при автоматической блокировке после {settings.maxWarnings} предупреждений
          </div>

          <div style={{ background: 'white', padding: 12, borderRadius: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>📊 Текущий каскад:</div>
            <div>• 1-е предупреждение: ⚠️ Предупреждение</div>
            <div>• 2-е предупреждение: ⚠️ Предупреждение</div>
            <div>• 3-е предупреждение: 🚫 Блокировка на {settings.defaultBlockDuration} часов</div>
          </div>
        </div>
      )}

      {/* Вкладка: Настройки комиссий */}
      {activeTab === 'commission' && (
        <div style={{ background: 'var(--bg-card-owner-alt)', borderRadius: 'var(--radius-card-sm)', padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
            💰 Параметры комиссий
          </div>
          <TextField
            label="Комиссия платформы (%)"
            type="number"
            step="0.1"
            value={settings.commissionRate}
            onChange={(e) => updateSetting('commissionRate', parseFloat(e.target.value))}
            variant="owner"
            style={{ marginBottom: 12 }}
          />
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, padding: '10px', background: 'white', borderRadius: 6 }}>
            Процент от стоимости заказа, который взимается в качестве комиссии платформы
          </div>

          <div style={{ background: 'white', padding: 12, borderRadius: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>📊 Примеры расчёта:</div>
            <div>• Заказ 1000₽: Комиссия {(1000 * settings.commissionRate / 100).toFixed(0)}₽, Исполнителю {(1000 - 1000 * settings.commissionRate / 100).toFixed(0)}₽</div>
            <div>• Заказ 5000₽: Комиссия {(5000 * settings.commissionRate / 100).toFixed(0)}₽, Исполнителю {(5000 - 5000 * settings.commissionRate / 100).toFixed(0)}₽</div>
          </div>
        </div>
      )}

      {/* Вкладка: Логи */}
      {activeTab === 'logs' && (
        <div style={{ background: 'var(--bg-card-owner-alt)', borderRadius: 'var(--radius-card-sm)', padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
            📊 Логирование и аудит
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
              Последние действия администраторов
            </div>
            <div style={{ background: 'white', borderRadius: 6, padding: 12 }}>
              <div style={{ fontSize: 12, marginBottom: 10, padding: '8px', borderLeft: '3px solid var(--accent-owner)', background: '#f5f5f5' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Блокировка пользователя</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Admin Test заблокировал Иван Петров на 1 час • 2 мин назад</div>
              </div>
              <div style={{ fontSize: 12, marginBottom: 10, padding: '8px', borderLeft: '3px solid #F59E0B', background: '#f5f5f5' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Предупреждение пользователю</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Admin Test предупредил Мария Сидорова • 15 мин назад</div>
              </div>
              <div style={{ fontSize: 12, marginBottom: 10, padding: '8px', borderLeft: '3px solid #10B981', background: '#f5f5f5' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Разблокировка пользователя</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Admin Test разблокировал Анна Коваленко • 1 час назад</div>
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
              Статистика системы
            </div>
            <div style={{ background: 'white', borderRadius: 6, padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ textAlign: 'center', padding: '12px', borderRadius: 6, background: '#f5f5f5' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>142</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Активных пользователей</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', borderRadius: 6, background: '#f5f5f5' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>28</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Активных компаний</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', borderRadius: 6, background: '#f5f5f5' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>547</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Завершённых заказов</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', borderRadius: 6, background: '#f5f5f5' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>12</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Заблокированных</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Кнопка сохранения */}
      <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
        <button
          onClick={handleSave}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: 'var(--radius-btn)',
            background: 'var(--accent-owner)',
            color: 'white',
            border: 'none',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            (e.target as HTMLButtonElement).style.opacity = '0.9';
          }}
          onMouseOut={(e) => {
            (e.target as HTMLButtonElement).style.opacity = '1';
          }}
        >
          {saved ? '✅ Сохранено' : '💾 Сохранить настройки'}
        </button>
        <button
          onClick={onBack}
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-btn)',
            background: 'white',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-card-owner)',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            (e.target as HTMLButtonElement).style.background = 'var(--bg-card-owner)';
          }}
          onMouseOut={(e) => {
            (e.target as HTMLButtonElement).style.background = 'white';
          }}
        >
          ← Назад
        </button>
      </div>
    </Screen>
  );
};
