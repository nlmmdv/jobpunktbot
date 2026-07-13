import { useState } from 'react';
import { Button, Text, Title } from '@telegram-apps/telegram-ui';

interface RegistrationScreenProps {
  onSelectRole: (role: 'owner' | 'freelancer') => void;
  onBack: () => void;
}

export const RegistrationScreen = ({ onSelectRole, onBack }: RegistrationScreenProps) => {
  const [hoveredCard, setHoveredCard] = useState<'owner' | 'freelancer' | null>(null);

  return (
    <div style={{ padding: '16px 18px', maxWidth: 400, margin: '0 auto' }}>
      {/* Back button */}
      <Button
        size="s"
        onClick={onBack}
        style={{ color: '#6D28D9', marginBottom: '20px', background: 'none', border: 'none' }}
      >
        ← Назад
      </Button>

      <Title level="2" style={{ marginBottom: '4px', color: '#17151F' }}>ПроПункт</Title>
      <Text style={{ marginBottom: '24px', color: '#8B8798', fontSize: '14px' }}>
        Выберите тип аккаунта для регистрации
      </Text>

      {/* Owner Card */}
      <div
        onClick={() => onSelectRole('owner')}
        onMouseEnter={() => setHoveredCard('owner')}
        onMouseLeave={() => setHoveredCard(null)}
        style={{
          background: hoveredCard === 'owner' ? '#F5F8FE' : '#FFFFFF',
          border: '1.5px solid #E1EBFB',
          borderRadius: 16,
          padding: '24px 18px',
          marginBottom: 16,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: hoveredCard === 'owner' ? '0 4px 12px rgba(37,99,235,0.15)' : '0 2px 10px rgba(23,21,31,0.04)',
          transform: hoveredCard === 'owner' ? 'translateY(-2px)' : 'translateY(0)',
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 12 }}>💼</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#17151F', marginBottom: 8 }}>
          Владелец ПВЗ
        </div>
        <div style={{ fontSize: 13, color: '#6E6A7C', lineHeight: '1.5', marginBottom: 16 }}>
          Управляйте своим отделением, ищите и нанимайте курьеров для доставки
        </div>
        <div style={{
          display: 'inline-block',
          background: '#E1EBFB',
          color: '#2563EB',
          padding: '6px 12px',
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 600,
        }}>
          Для организаций
        </div>
      </div>

      {/* Freelancer Card */}
      <div
        onClick={() => onSelectRole('freelancer')}
        onMouseEnter={() => setHoveredCard('freelancer')}
        onMouseLeave={() => setHoveredCard(null)}
        style={{
          background: hoveredCard === 'freelancer' ? '#F7F6FB' : '#FFFFFF',
          border: '1.5px solid #ECEAF4',
          borderRadius: 16,
          padding: '24px 18px',
          marginBottom: 24,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: hoveredCard === 'freelancer' ? '0 4px 12px rgba(109,40,217,0.15)' : '0 2px 10px rgba(23,21,31,0.04)',
          transform: hoveredCard === 'freelancer' ? 'translateY(-2px)' : 'translateY(0)',
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 12 }}>👤</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#17151F', marginBottom: 8 }}>
          Фрилансер/Курьер
        </div>
        <div style={{ fontSize: 13, color: '#6E6A7C', lineHeight: '1.5', marginBottom: 16 }}>
          Находите подработку и выполняйте доставки для ПВЗ и получайте заработок
        </div>
        <div style={{
          display: 'inline-block',
          background: '#EDE4FB',
          color: '#7C3AED',
          padding: '6px 12px',
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 600,
        }}>
          Для физических лиц
        </div>
      </div>

      {/* Info section */}
      <div style={{
        background: '#F7F6FB',
        border: '1px solid #ECEAF4',
        borderRadius: 12,
        padding: '16px',
        textAlign: 'center',
      }}>
        <Text style={{ fontSize: 12, color: '#6E6A7C', lineHeight: '1.5' }}>
          Оба аккаунта можно создать одновременно под одним Telegram профилем.
          Просто выберите тип и заполните данные.
        </Text>
      </div>
    </div>
  );
};
