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
    <div className="title" style={{ textAlign: 'center', marginBottom: 2 }}>ПроПункт</div>
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
