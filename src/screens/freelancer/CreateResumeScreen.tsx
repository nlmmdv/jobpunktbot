import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { callFunction, ApiError } from '../../lib/api';
import { Screen, ScreenHeader, Button, TextField, TextArea, Label, Chip, ErrorText } from '../../components/ui';
import { MetroSelector, SelectedMetroChips, metroStationName } from '../../components/MetroSelector';
import { TEXT_LIMITS } from '../../constants';

const MARKETPLACES = ['WB', 'Ozon', 'Яндекс Маркет'];

interface CreateResumeScreenProps {
  onDone: (resume: { id: string; status: string }) => void;
  onCancel: () => void;
}

export const CreateResumeScreen = ({ onDone, onCancel }: CreateResumeScreenProps) => {
  const { profile } = useAuth();
  const userCity = profile?.city || 'Москва';

  const [about, setAbout] = useState('');
  const [marketplaces, setMarketplaces] = useState<Set<string>>(new Set());
  const [hourlyRate, setHourlyRate] = useState(0);
  const [preferredSchedule, setPreferredSchedule] = useState('');
  const [selectedMetro, setSelectedMetro] = useState<Set<string>>(new Set());
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
        action: 'create',
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
      setError(err instanceof ApiError ? err.message : 'Не удалось создать резюме');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader
        title="Создание резюме"
        subtitle="Расскажите о себе, чтобы видеть вакансии и замены"
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
        {saving ? 'Создание...' : 'Создать резюме'}
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
