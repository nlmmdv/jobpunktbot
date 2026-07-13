import { useState, type CSSProperties } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { callFunction, ApiError } from '../../lib/api';
import { metroMoscow } from '../../data/metro-moscow';
import { metroSPb } from '../../data/metro-spb';

const MARKETPLACES = ['WB', 'Ozon', 'Яндекс Маркет'];

interface CreateResumeScreenProps {
  onDone: (resume: { id: string; status: string }) => void;
  onCancel: () => void;
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  background: '#F7F6FB',
  border: '1.5px solid #E7E4F1',
  color: '#17151F',
  fontSize: 14,
  marginBottom: 12,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const labelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#6E6A7C',
  marginBottom: 6,
};

export const CreateResumeScreen = ({ onDone, onCancel }: CreateResumeScreenProps) => {
  const { profile } = useAuth();
  const userCity = profile?.city || 'Москва';
  const metroList = userCity === 'Санкт-Петербург' ? metroSPb : metroMoscow;

  const [about, setAbout] = useState('');
  const [marketplaces, setMarketplaces] = useState<Set<string>>(new Set());
  const [hourlyRate, setHourlyRate] = useState(0);
  const [preferredSchedule, setPreferredSchedule] = useState('');
  const [selectedMetro, setSelectedMetro] = useState<Set<string>>(new Set());
  const [metroSearch, setMetroSearch] = useState('');
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

  const getMetroStationName = (id: string) => metroList.find((s) => s.id === id)?.name || '';
  const filteredMetroStations = metroList.filter((s) =>
    s.name.toLowerCase().includes(metroSearch.toLowerCase())
  );

  const handleCreate = async () => {
    if (marketplaces.size === 0) {
      setError('Выберите хотя бы один маркетплейс');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const metroNames = Array.from(selectedMetro).map(getMetroStationName).filter(Boolean);
      const data = await callFunction<{ resume: { id: string; status: string } }>(
        'freelancer-resumes',
        {
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
        }
      );
      onDone(data.resume);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось создать резюме');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        padding: '20px 18px',
        maxWidth: 400,
        margin: '0 auto',
        background: '#fff',
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
      }}
    >
      <div
        onClick={onCancel}
        style={{ color: '#6D28D9', fontSize: 13, fontWeight: 600, marginBottom: 12, cursor: 'pointer' }}
      >
        ← Назад
      </div>

      <div style={{ fontSize: 18, fontWeight: 800, color: '#17151F', marginBottom: 4 }}>Создание резюме</div>
      <div style={{ fontSize: 13, color: '#8B8798', marginBottom: 20 }}>
        Расскажите о себе, чтобы видеть вакансии и замены
      </div>

      <div style={labelStyle}>Маркетплейсы, с которыми работали *</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {MARKETPLACES.map((m) => (
          <span
            key={m}
            onClick={() => toggleMarketplace(m)}
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              background: marketplaces.has(m) ? '#6D28D9' : 'transparent',
              color: marketplaces.has(m) ? '#fff' : '#6D28D9',
              border: '1.5px solid #6D28D9',
            }}
          >
            {m}
          </span>
        ))}
      </div>

      <div style={labelStyle}>Желаемая ставка (₽/час)</div>
      <input
        type="number"
        placeholder="500"
        value={hourlyRate || ''}
        onChange={(e) => setHourlyRate(parseInt(e.target.value) || 0)}
        style={inputStyle}
      />

      <div style={labelStyle}>Предпочитаемый график</div>
      <input
        type="text"
        placeholder="2/2, 5/2, сменный"
        value={preferredSchedule}
        onChange={(e) => setPreferredSchedule(e.target.value)}
        style={inputStyle}
      />

      {userCity !== 'Другое' && (
        <div style={{ marginBottom: 12 }}>
          <div style={labelStyle}>Удобное метро</div>
          <button
            onClick={() => setShowMetroSelector(true)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 12,
              background: '#F7F6FB',
              color: '#6D28D9',
              border: '1.5px solid #6D28D9',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Выбрать станции
          </button>
          {selectedMetro.size > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {Array.from(selectedMetro).map((id) => (
                <span
                  key={id}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 999,
                    background: '#6D28D9',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {getMetroStationName(id)}
                  <button
                    onClick={() => toggleMetroStation(id)}
                    style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, fontSize: 12 }}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={labelStyle}>О себе</div>
      <textarea
        value={about}
        onChange={(e) => setAbout(e.target.value)}
        placeholder="Опыт работы, преимущества..."
        style={{ ...inputStyle, resize: 'none' }}
        rows={4}
      />

      {error && <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <button
        onClick={handleCreate}
        disabled={saving}
        style={{
          width: '100%',
          padding: 14,
          border: 'none',
          borderRadius: 14,
          background: saving ? '#9F73E6' : '#6D28D9',
          color: '#fff',
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 8,
          boxShadow: '0 8px 20px rgba(109,40,217,0.25)',
          cursor: saving ? 'not-allowed' : 'pointer',
        }}
      >
        {saving ? 'Создание...' : 'Создать резюме'}
      </button>

      {showMetroSelector && userCity !== 'Другое' && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(23,21,31,0.4)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 18px 30px', width: '100%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#17151F', marginBottom: 16 }}>Выбор метро</div>
            <input
              type="text"
              placeholder="Поиск станции..."
              value={metroSearch}
              onChange={(e) => setMetroSearch(e.target.value)}
              style={inputStyle}
            />
            <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 12 }}>
              {filteredMetroStations.map((station) => (
                <label key={station.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '12px 8px', borderRadius: 8 }}>
                  <input
                    type="checkbox"
                    checked={selectedMetro.has(station.id)}
                    onChange={() => toggleMetroStation(station.id)}
                    style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#6D28D9' }}
                  />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: station.lineColor }} />
                  <span style={{ fontSize: 13, color: '#17151F' }}>{station.name}</span>
                </label>
              ))}
            </div>
            <button
              onClick={() => setShowMetroSelector(false)}
              style={{ width: '100%', padding: 14, border: 'none', borderRadius: 14, background: '#6D28D9', color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 8, cursor: 'pointer' }}
            >
              Готово
            </button>
            <button
              onClick={() => { setShowMetroSelector(false); setSelectedMetro(new Set()); setMetroSearch(''); }}
              style={{ width: '100%', padding: 14, border: 'none', borderRadius: 14, background: '#F7F6FB', color: '#8B8798', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
