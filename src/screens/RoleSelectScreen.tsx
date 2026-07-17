import { BackButton } from '../components/ui';

interface RoleSelectScreenProps {
  onSelectRole: (role: 'freelancer' | 'owner') => void;
  onBack: () => void;
}

/**
 * Экран «Выбор роли» — градиентные карточки из макета.
 */
export const RoleSelectScreen = ({ onSelectRole, onBack }: RoleSelectScreenProps) => (
  <div className="screen">
    <BackButton onClick={onBack} variant="freelancer" />
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 2 }}>
      <svg width="32" height="32" viewBox="0 0 72 72" fill="none">
        <path d="M36 6L64 20V52L36 66L8 52V20L36 6Z" fill="#6D28D9"></path>
        <path d="M36 6L64 20L36 34L8 20L36 6Z" fill="#8B5CF6"></path>
        <path d="M36 34V66L8 52V20L36 34Z" fill="#5B21B6"></path>
        <path d="M36 34V66L64 52V20L36 34Z" fill="#7C3AED"></path>
      </svg>
      <div className="title" style={{ textAlign: 'center', margin: 0 }}>ПроПункт</div>
    </div>
    <div className="subtitle" style={{ textAlign: 'center', marginBottom: 32 }}>Выберите, кто вы</div>

    <div className="gradient-freelancer" onClick={() => onSelectRole('freelancer')} style={{ cursor: 'pointer', marginBottom: 14 }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>💼</div>
      <div style={{ fontSize: 17, fontWeight: 600 }}>Ищу работу</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>Сотрудник на ПВЗ</div>
    </div>

    <div className="gradient-owner" onClick={() => onSelectRole('owner')} style={{ cursor: 'pointer' }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>🏢</div>
      <div style={{ fontSize: 17, fontWeight: 600 }}>Ищу сотрудников</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>Владелец ПВЗ</div>
    </div>

    <div style={{ color: '#66666B', fontSize: 11, textAlign: 'center', marginTop: 26 }}>Вы сможете сменить роль позже в настройках</div>
  </div>
);
