import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { callFunction } from '../../lib/api';
import { CreateResumeScreen } from './CreateResumeScreen';
import { Screen, ScreenHeader, Card, Button, Label, Chip, Badge, Loading, EmptyState, Modal } from '../../components/ui';
import { ResumeGate } from '../../components/ResumeGate';
import { MetroSelector, SelectedMetroChips, metroStationName } from '../../components/MetroSelector';

interface Vacancy {
  id: string;
  address: string;
  type: 'temporary' | 'permanent';
  date: string;
  start_time: string;
  end_time: string;
  marketplaces: string[];
  payment: number;
  metro_stations: string[];
  /** Владелец вакансии. В таблице owner_vacancies это telegram_id (не owner_telegram_id). */
  telegram_id?: number;
}

interface Resume {
  id: string;
  status: string;
}

const MARKETPLACES = ['WB', 'Ozon', 'Яндекс Маркет'];

const ScrollPicker = ({ items, value, onChange }: { items: string[]; value: string; onChange: (val: string) => void }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemHeight = 44;

  useEffect(() => {
    const idx = items.indexOf(value);
    if (containerRef.current && idx >= 0) {
      containerRef.current.scrollTop = idx * itemHeight;
    }
  }, [items, value]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const idx = Math.round(containerRef.current.scrollTop / itemHeight);
    if (items[idx] && items[idx] !== value) onChange(items[idx]);
  };

  return (
    <div style={{ position: 'relative', height: itemHeight * 3, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: itemHeight, left: 0, right: 0, height: itemHeight, background: 'var(--bg-input)', borderRadius: 10, border: '1.5px solid #E7E4F1', zIndex: 0, pointerEvents: 'none' }} />
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{ height: '100%', overflowY: 'scroll', scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch', position: 'relative', zIndex: 1, paddingTop: itemHeight, paddingBottom: itemHeight, scrollBehavior: 'smooth' } as React.CSSProperties}
      >
        <style>{`div[data-scroll-picker]::-webkit-scrollbar{display:none}div[data-scroll-picker]{-ms-overflow-style:none;scrollbar-width:none}`}</style>
        <div data-scroll-picker>
          {items.map((item) => (
            <div key={item} style={{ height: itemHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: item === value ? 'var(--text-primary)' : '#B7B2C4', scrollSnapAlign: 'start', transition: 'color 0.15s' }}>
              {item}
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: itemHeight, background: 'linear-gradient(to bottom, rgba(255,255,255,1), rgba(255,255,255,0))', pointerEvents: 'none', zIndex: 2 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: itemHeight, background: 'linear-gradient(to top, rgba(255,255,255,1), rgba(255,255,255,0))', pointerEvents: 'none', zIndex: 2 }} />
    </div>
  );
};

const TimeScroller = ({ label, value, onChange }: { label: string; value: string; onChange: (val: string) => void }) => {
  const [showScroller, setShowScroller] = useState(false);
  const [hours, setHours] = useState(value ? String(parseInt(value.split(':')[0])).padStart(2, '0') : '00');
  const [minutes, setMinutes] = useState(value ? String(parseInt(value.split(':')[1])).padStart(2, '0') : '00');

  const handleConfirm = () => {
    onChange(`${hours}:${minutes}`);
    setShowScroller(false);
  };

  return (
    <div>
      <label className="label" style={{ display: 'block' }}>{label}</label>
      <div
        onClick={() => setShowScroller(true)}
        style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--bg-input)', color: value ? 'var(--text-primary)' : '#B7B2C4', border: '1.5px solid var(--border)', fontSize: 14, cursor: 'pointer', textAlign: 'center' }}
      >
        {value || '--:--'}
      </div>

      {showScroller && (
        <Modal title="Выбор времени" onClose={() => setShowScroller(false)}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <div className="label" style={{ textAlign: 'center' }}>Часы</div>
              <ScrollPicker items={Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))} value={hours} onChange={setHours} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', paddingTop: 20 }}>:</div>
            <div style={{ flex: 1 }}>
              <div className="label" style={{ textAlign: 'center' }}>Минуты</div>
              <ScrollPicker items={['00', '15', '30', '45']} value={minutes} onChange={setMinutes} />
            </div>
          </div>
          <Button onClick={handleConfirm} style={{ marginBottom: 8 }}>Готово</Button>
          <Button tone="secondary" onClick={() => setShowScroller(false)}>Отмена</Button>
        </Modal>
      )}
    </div>
  );
};

export const AvailableShiftsScreen = ({ onBack }: { onBack: () => void }) => {
  const { profile } = useAuth();
  const userCity = profile?.city || 'Москва';

  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<Set<string>>(new Set());
  const [selectedMetro, setSelectedMetro] = useState<Set<string>>(new Set());
  const [showMetroSelector, setShowMetroSelector] = useState(false);
  const [minDate, setMinDate] = useState('');
  const [minTime, setMinTime] = useState('');
  const [maxTime, setMaxTime] = useState('');
  const [showCreateResume, setShowCreateResume] = useState(false);

  useEffect(() => {
    if (profile?.telegram_id) {
      loadResume();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  useEffect(() => {
    if (resume) {
      loadVacancies();
    }
    // selectedMetro тоже используется внутри loadVacancies для фильтрации —
    // без него в зависимостях выбор станции метро не перезапускал загрузку.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMarketplaces, selectedMetro, minDate, minTime, maxTime]);

  const loadResume = async () => {
    if (!profile?.telegram_id) return;
    setLoading(true);
    try {
      const data = await callFunction<{ resume: Resume | null }>('freelancer-resumes', {
        action: 'get',
        telegramId: profile.telegram_id,
      });
      if (data.resume) setResume(data.resume);
    } catch (err) {
      console.error('Failed to load resume:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadVacancies = async () => {
    try {
      const data = await callFunction<{ vacancies: Vacancy[] }>('list-vacancies', {
        type: 'temporary',
        city: userCity,
      });

      let filtered = data.vacancies || [];
      if (minDate) filtered = filtered.filter((v) => v.date >= minDate);
      if (minTime) filtered = filtered.filter((v) => v.start_time >= minTime);
      if (maxTime) filtered = filtered.filter((v) => v.end_time <= maxTime);
      if (selectedMarketplaces.size > 0) {
        filtered = filtered.filter((v) => v.marketplaces.some((m) => selectedMarketplaces.has(m)));
      }
      if (selectedMetro.size > 0) {
        // metro_stations на сервере хранятся как названия станций, а selectedMetro — id.
        const names = new Set(Array.from(selectedMetro).map((id) => metroStationName(userCity, id)).filter(Boolean));
        filtered = filtered.filter((v) => v.metro_stations.some((m) => names.has(m)));
      }
      setVacancies(filtered);
    } catch (err) {
      console.error('Failed to load vacancies:', err);
    }
  };

  const handleApply = async (vacancyId: string, ownerTelegramId?: number) => {
    if (!ownerTelegramId) {
      alert('❌ У вакансии не указан владелец');
      return;
    }
    try {
      await callFunction('job-matches', {
        action: 'create',
        vacancy_id: vacancyId,
        owner_telegram_id: ownerTelegramId,
        freelancer_telegram_id: profile?.telegram_id,
        initiated_by: 'freelancer',
      });
      alert('✅ Отклик отправлен!');
      loadVacancies();
    } catch (err) {
      console.error('Failed to apply:', err);
      const errorMsg = err instanceof Error ? err.message : 'неизвестная ошибка';
      if (errorMsg.includes('Уже существует')) {
        alert('❌ Вы уже откликнулись на эту смену');
      } else if (errorMsg.includes('initData')) {
        alert('❌ Сеанс истёк. Пожалуйста, перезагрузите приложение');
      } else {
        alert(`❌ Ошибка при отправке отклика: ${errorMsg}`);
      }
    }
  };

  const toggleMarketplace = (m: string) => {
    const next = new Set(selectedMarketplaces);
    if (next.has(m)) next.delete(m);
    else next.add(m);
    setSelectedMarketplaces(next);
  };

  const toggleMetroStation = (id: string) => {
    const next = new Set(selectedMetro);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedMetro(next);
  };

  if (showCreateResume) {
    return (
      <CreateResumeScreen
        onDone={(newResume) => {
          setResume(newResume);
          setShowCreateResume(false);
        }}
        onCancel={() => setShowCreateResume(false)}
      />
    );
  }

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Доступные замены" variant="freelancer" onBack={onBack} />
        <Loading />
      </Screen>
    );
  }

  if (!resume) {
    return (
      <ResumeGate
        description="Создайте резюме чтобы просматривать доступные замены"
        onCreate={() => setShowCreateResume(true)}
      />
    );
  }

  return (
    <Screen>
      <ScreenHeader title="⏰ Доступные замены" variant="freelancer" onBack={onBack} />

      <div style={{ marginBottom: 20 }}>
        <div className="field">
          <Label>Дата начиная с</Label>
          <input type="date" value={minDate} onChange={(e) => setMinDate(e.target.value)} className="input" style={{ marginBottom: 0 }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <TimeScroller label="Начало не ранее" value={minTime} onChange={setMinTime} />
          <TimeScroller label="Окончание не позже" value={maxTime} onChange={setMaxTime} />
        </div>

        <div className="field">
          <Label>Маркетплейсы</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {MARKETPLACES.map((m) => (
              <Chip key={m} label={m} variant="freelancer" active={selectedMarketplaces.has(m)} onClick={() => toggleMarketplace(m)} />
            ))}
          </div>
        </div>

        <div>
          <Button tone="outline" onClick={() => setShowMetroSelector(true)}>Выбрать метро</Button>
          <SelectedMetroChips city={userCity} selected={selectedMetro} onRemove={toggleMetroStation} variant="freelancer" />
        </div>
      </div>

      {showMetroSelector && (
        <MetroSelector
          city={userCity}
          selected={selectedMetro}
          onToggle={toggleMetroStation}
          onDone={() => setShowMetroSelector(false)}
          onCancel={() => {
            setShowMetroSelector(false);
            setSelectedMetro(new Set());
          }}
          variant="freelancer"
        />
      )}

      {vacancies.length === 0 ? (
        <EmptyState>📋 Подходящих замен не найдено</EmptyState>
      ) : (
        vacancies.map((vacancy) => (
          <Card key={vacancy.id} variant="freelancer">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>{vacancy.address}</div>
              <Badge tone="temp-f">⏰ Временная</Badge>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-freelancer)', marginBottom: 8 }}>
              📅 {new Date(vacancy.date).toLocaleDateString('ru')}, {vacancy.start_time} — {vacancy.end_time}
            </div>
            {vacancy.marketplaces?.length > 0 && <div className="meta">📦 {vacancy.marketplaces.join(', ')}</div>}
            {vacancy.metro_stations?.length > 0 && <div className="meta">🚇 {vacancy.metro_stations.join(', ')}</div>}
            <div className="price freelancer" style={{ marginBottom: 10 }}>💰 {vacancy.payment} ₽</div>
            <Button small onClick={() => handleApply(vacancy.id, vacancy.telegram_id)}>
              Откликнуться
            </Button>
          </Card>
        ))
      )}
    </Screen>
  );
};
