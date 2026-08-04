import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { callFunction, errorText } from '../../lib/api';
import { Screen, ScreenHeader, Card, Button, TextField, TextArea, Label, Chip, Badge, Loading, EmptyState, Modal } from '../../components/ui';
import { MetroSelector, SelectedMetroChips, metroStationName } from '../../components/MetroSelector';
import { TEXT_LIMITS } from '../../constants';

interface Vacancy {
  id: string;
  type: 'temporary' | 'permanent';
  address: string;
  marketplaces: string[];
  metro_stations: string[];
  payment: number;
  date?: string;
  start_time?: string;
  end_time?: string;
  schedule?: string;
  description?: string;
}

const MARKETPLACES = ['WB', 'Ozon', 'Яндекс Маркет'];

// Данные-заглушки для локальной разработки (DEV), когда Edge Functions недоступны.
const MOCK_VACANCIES: Vacancy[] = [
  {
    id: 'dev-own-vac-1',
    type: 'permanent',
    address: 'ул. Тверская, 5',
    marketplaces: ['WB', 'Ozon'],
    metro_stations: ['Охотный ряд'],
    payment: 40000,
    schedule: '5/2',
    description: 'Постоянная работа на ПВЗ',
  },
  {
    id: 'dev-own-vac-2',
    type: 'temporary',
    address: 'Невский пр., 100',
    marketplaces: ['Яндекс Маркет'],
    metro_stations: ['Невский пр-т'],
    payment: 3000,
    date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '18:00',
    description: 'Разовая подработка',
  },
];

const emptyForm = () => ({
  date: new Date().toISOString().split('T')[0],
  address: '',
  marketplaces: new Set<string>(),
  metro: new Set<string>(),
  startTime: '09:00',
  endTime: '22:00',
  schedule: '',
  payment: 0,
  description: '',
});

export const MyVacanciesScreen = ({ onBack }: { onBack: () => void }) => {
  const { profile } = useAuth();
  const userCity = profile?.city || 'Москва';

  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [selectedType, setSelectedType] = useState<'temporary' | 'permanent' | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm());
  const [showMetroSelector, setShowMetroSelector] = useState(false);

  useEffect(() => {
    // Загружаем один раз при монтировании (профиль уже готов к этому экрану).
    loadVacancies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadVacancies = async () => {
    if (!profile?.telegram_id) return;
    setLoading(true);
    try {
      if (import.meta.env.DEV) {
        setVacancies(MOCK_VACANCIES);
        setLoading(false);
        return;
      }

      const data = await callFunction<{ vacancies: Vacancy[] }>('owner-vacancies', {
        action: 'list',
        telegramId: profile.telegram_id,
      });
      setVacancies(data.vacancies || []);
    } catch (err) {
      console.error('Failed to load vacancies:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMarketplace = (m: string) => {
    const next = new Set(formData.marketplaces);
    if (next.has(m)) next.delete(m);
    else next.add(m);
    setFormData({ ...formData, marketplaces: next });
  };

  const toggleMetroStation = (id: string) => {
    const next = new Set(formData.metro);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFormData({ ...formData, metro: next });
  };

  const closeForm = () => { setShowForm(false); setSelectedType(null); setFormData(emptyForm()); };

  const handlePublish = async () => {
    if (!profile?.telegram_id || !formData.address || formData.payment <= 0) {
      alert('Заполните все обязательные поля');
      return;
    }
    try {
      const metroNames = Array.from(formData.metro).map((id) => metroStationName(userCity, id)).filter(Boolean);
      await callFunction('owner-vacancies', {
        action: 'create',
        telegramId: profile.telegram_id,
        type: selectedType,
        city: userCity,
        address: formData.address,
        metro_stations: metroNames,
        marketplaces: Array.from(formData.marketplaces),
        date: selectedType === 'temporary' ? formData.date : null,
        start_time: selectedType === 'temporary' ? formData.startTime : null,
        end_time: selectedType === 'temporary' ? formData.endTime : null,
        schedule: selectedType === 'permanent' ? formData.schedule : null,
        payment: formData.payment,
        description: formData.description,
      });
      closeForm();
      await loadVacancies();
    } catch (err) {
      console.error('Failed to publish vacancy:', err);
      alert(errorText(err, 'Ошибка при публикации'));
    }
  };

  const handleDeleteVacancy = async (id: string) => {
    if (!profile?.telegram_id) return;
    if (!confirm('Удалить вакансию?')) return;
    try {
      await callFunction('owner-vacancies', { action: 'delete', telegramId: profile.telegram_id, id });
      await loadVacancies();
    } catch (err) {
      console.error('Failed to delete vacancy:', err);
    }
  };

  return (
    <Screen>
      <ScreenHeader
        title="Мои вакансии"
        variant="owner"
        onBack={onBack}
        action={<Button variant="owner" onClick={() => setShowTypeSelector(true)} style={{ width: 'auto', padding: '7px 12px', fontSize: 12 }}>+ Создать</Button>}
      />

      {loading && <Loading />}
      {!loading && vacancies.length === 0 && <EmptyState>У вас пока нет вакансий</EmptyState>}

      {!loading && vacancies.map((vacancy) => (
        <Card key={vacancy.id} variant="owner">
          <Badge tone="temp-o">{vacancy.type === 'temporary' ? '⏰ Временная' : '📌 Постоянная'}</Badge>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#17151F', marginBottom: 6 }}>{vacancy.address}</div>
          <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
            {vacancy.marketplaces.map((m) => (
              <span key={m} style={{ padding: '3px 8px', borderRadius: 6, background: '#2563EB', color: '#fff', fontSize: 10.5, fontWeight: 600 }}>{m}</span>
            ))}
          </div>
          {vacancy.type === 'temporary'
            ? <div className="meta">📅 {vacancy.date}, {vacancy.start_time}–{vacancy.end_time}</div>
            : <div className="meta">📋 График: {vacancy.schedule}</div>}
          {vacancy.metro_stations.length > 0 && <div className="meta">🚇 {vacancy.metro_stations.join(', ')}</div>}
          <div className="price owner" style={{ marginBottom: 10 }}>💰 {vacancy.payment} ₽</div>
          <Button tone="danger" small onClick={() => handleDeleteVacancy(vacancy.id)}>🗑 Удалить</Button>
        </Card>
      ))}

      {/* Выбор типа вакансии */}
      {showTypeSelector && (
        <Modal title="Выберите тип" onClose={() => setShowTypeSelector(false)}>
          <Card variant="owner" large onClick={() => { setSelectedType('temporary'); setShowTypeSelector(false); setShowForm(true); }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>⏰</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#17151F' }}>Временная</div>
            <div style={{ fontSize: 12, color: '#8B8798', marginTop: 4 }}>Замена на одну смену</div>
          </Card>
          <Card variant="owner" large onClick={() => { setSelectedType('permanent'); setShowTypeSelector(false); setShowForm(true); }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>📌</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#17151F' }}>Постоянная</div>
            <div style={{ fontSize: 12, color: '#8B8798', marginTop: 4 }}>Поиск на постоянную работу</div>
          </Card>
          <Button variant="owner" tone="secondary" onClick={() => setShowTypeSelector(false)}>Отмена</Button>
        </Modal>
      )}

      {/* Форма создания вакансии */}
      {showForm && selectedType && (
        <Modal title={selectedType === 'temporary' ? '⏰ Временная вакансия' : '📌 Постоянная вакансия'} onClose={closeForm}>
          {selectedType === 'temporary' && (
            <TextField variant="owner" label="Дата" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
          )}

          <TextField variant="owner" label="Адрес *" placeholder="ул. Примера, д. 1" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />

          <Label>ПВЗ</Label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {MARKETPLACES.map((m) => (
              <Chip key={m} label={m} variant="owner" active={formData.marketplaces.has(m)} onClick={() => toggleMarketplace(m)} />
            ))}
          </div>

          {userCity !== 'Другое' && (
            <div style={{ marginBottom: 12 }}>
              <Label>Метро</Label>
              <Button variant="owner" tone="outline" onClick={() => setShowMetroSelector(true)}>Выбрать станции</Button>
              <SelectedMetroChips city={userCity} selected={formData.metro} onRemove={toggleMetroStation} variant="owner" />
            </div>
          )}

          {selectedType === 'temporary' ? (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <TextField variant="owner" label="С (время)" type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <TextField variant="owner" label="До (время)" type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} />
              </div>
            </div>
          ) : (
            <TextField variant="owner" label="График" placeholder="2/2, 5/2, сменный" value={formData.schedule} onChange={(e) => setFormData({ ...formData, schedule: e.target.value })} />
          )}

          <TextField variant="owner" label="Оплата (₽) *" type="number" value={formData.payment || ''} onChange={(e) => setFormData({ ...formData, payment: parseInt(e.target.value) || 0 })} />

          <TextArea variant="owner" label="Описание" rows={3} maxLength={TEXT_LIMITS.DESCRIPTION} placeholder="Доп. информация..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />

          {showMetroSelector && userCity !== 'Другое' && (
            <MetroSelector
              city={userCity}
              selected={formData.metro}
              onToggle={toggleMetroStation}
              onDone={() => setShowMetroSelector(false)}
              onCancel={() => { setShowMetroSelector(false); setFormData({ ...formData, metro: new Set() }); }}
              variant="owner"
            />
          )}

          <Button variant="owner" onClick={handlePublish} style={{ marginTop: 4, marginBottom: 8 }}>Опубликовать</Button>
          <Button variant="owner" tone="secondary" onClick={closeForm}>Отмена</Button>
        </Modal>
      )}
    </Screen>
  );
};
