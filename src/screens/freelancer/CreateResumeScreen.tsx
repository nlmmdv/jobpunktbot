import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { callFunction, ApiError } from '../../lib/api';
import { Screen, ScreenHeader, Button, TextField, TextArea, Label, Chip, ErrorText } from '../../components/ui';
import { MetroSelector, SelectedMetroChips, metroStationName, metroListForCity } from '../../components/MetroSelector';
import { TEXT_LIMITS } from '../../constants';

const MARKETPLACES = ['WB', 'Ozon', 'Яндекс Маркет'];

/** Резюме, пришедшее с сервера (для режима редактирования). */
export interface ExistingResume {
  id: string;
  status: string;
  about?: string | null;
  marketplaces?: string[] | null;
  hourly_rate?: number | null;
  preferred_schedule?: string | null;
  metro_stations?: string[] | null;
}

interface CreateResumeScreenProps {
  onDone: (resume: { id: string; status: string }) => void;
  onCancel: () => void;
  /** Передан — экран работает как редактирование, иначе как создание. */
  resume?: ExistingResume | null;
}

export const CreateResumeScreen = ({ onDone, onCancel, resume }: CreateResumeScreenProps) => {
  const { profile } = useAuth();
  const userCity = profile?.city || 'Москва';
  const isEdit = Boolean(resume);

  // В резюме метро хранится названиями, а выбор — по id: переводим обратно.
  const metroIdsFromNames = (names: string[]) =>
    new Set(
      names
        .map((name) => metroListForCity(userCity).find((st) => st.name === name)?.id)
        .filter((id): id is string => Boolean(id))
    );

  const [about, setAbout] = useState(resume?.about || '');
  const [marketplaces, setMarketplaces] = useState<Set<string>>(new Set(resume?.marketplaces || []));
  const [hourlyRate, setHourlyRate] = useState(resume?.hourly_rate || 0);
  const [preferredSchedule, setPreferredSchedule] = useState(resume?.preferred_schedule || '');
  const [selectedMetro, setSelectedMetro] = useState<Set<string>>(
    metroIdsFromNames(resume?.metro_stations || [])
  );
  const [showMetroSelector, setShowMetroSelector] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleMarketplace = (m: string) => {
    const next = new Set(marketplaces);
    if (next.has(m)) next.delete(m);
    else next.add(m);
    setMarketplaces(next);
  };

  const toggleMetroStation = (id: string) => {
    const next = new Set(selectedMetro);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedMetro(next);
  };

  const handleCreate = async () => {
    if (marketplaces.size === 0) {
      setError('Выберите хотя бы один маркетплейс');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const metroNames = Array.from(selectedMetro).map((id) => metroStationName(userCity, id)).filter(Boolean);
      const data = await callFunction<{ resume: { id: string; status: string } }>('freelancer-resumes', {
        action: isEdit ? 'update' : 'create',
        first_name: profile?.first_name,
        last_name: profile?.last_name,
        phone: profile?.phone,
        city: userCity,
        about: about || null,
        marketplaces: Array.from(marketplaces),
        hourly_rate: hourlyRate || null,
        preferred_schedule: preferredSchedule || null,
        metro_stations: metroNames,
      });
      onDone(data.resume);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : isEdit ? 'Не удалось сохранить резюме' : 'Не удалось создать резюме');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader
        title={isEdit ? 'Моё резюме' : 'Создание резюме'}
        subtitle={isEdit ? 'Изменения увидят владельцы ПВЗ' : 'Расскажите о себе, чтобы видеть вакансии и замены'}
        variant="freelancer"
        onBack={onCancel}
      />

      <Label>Маркетплейсы, с которыми работали *</Label>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {MARKETPLACES.map((m) => (
          <Chip key={m} label={m} variant="freelancer" active={marketplaces.has(m)} onClick={() => toggleMarketplace(m)} />
        ))}
      </div>

      <TextField
        label="Желаемая ставка (₽/час)"
        type="number"
        placeholder="500"
        value={hourlyRate || ''}
        onChange={(e) => setHourlyRate(parseInt(e.target.value) || 0)}
      />

      <TextField
        label="Предпочитаемый график"
        placeholder="2/2, 5/2, сменный"
        value={preferredSchedule}
        onChange={(e) => setPreferredSchedule(e.target.value)}
      />

      {userCity !== 'Другое' && (
        <div style={{ marginBottom: 12 }}>
          <Label>Удобное метро</Label>
          <Button tone="outline" onClick={() => setShowMetroSelector(true)}>Выбрать станции</Button>
          <SelectedMetroChips city={userCity} selected={selectedMetro} onRemove={toggleMetroStation} variant="freelancer" />
        </div>
      )}

      <TextArea
        label="О себе"
        maxLength={TEXT_LIMITS.ABOUT}
        value={about}
        onChange={(e) => setAbout(e.target.value)}
        placeholder="Опыт работы, преимущества..."
      />

      {error && <ErrorText>{error}</ErrorText>}

      <Button onClick={handleCreate} disabled={saving} style={{ marginTop: 4 }}>
        {saving ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать резюме'}
      </Button>

      {showMetroSelector && userCity !== 'Другое' && (
        <MetroSelector
          city={userCity}
          selected={selectedMetro}
          onToggle={toggleMetroStation}
          onDone={() => setShowMetroSelector(false)}
          onCancel={() => { setShowMetroSelector(false); setSelectedMetro(new Set()); }}
          variant="freelancer"
        />
      )}
    </Screen>
  );
};
