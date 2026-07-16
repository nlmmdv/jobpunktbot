import { Button } from './ui';

/**
 * Заглушка для фрилансера без резюме — единый экран-приглашение
 * создать резюме (используется в «Подработке», «Вакансиях», «Заменах»).
 */
export const ResumeGate = ({ description, onCreate }: { description: string; onCreate: () => void }) => (
  <div className="screen" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
    <div style={{ fontSize: 48, marginBottom: 24 }}>📝</div>
    <div style={{ fontSize: 18, fontWeight: 800, color: '#17151F', marginBottom: 8 }}>Создайте резюме</div>
    <div className="subtitle" style={{ marginBottom: 24 }}>{description}</div>
    <Button onClick={onCreate}>Создать резюме</Button>
  </div>
);
