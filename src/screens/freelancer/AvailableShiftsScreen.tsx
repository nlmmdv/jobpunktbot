import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { callFunction } from '../../lib/api';
import { metroMoscow } from '../../data/metro-moscow';
import { metroSPb } from '../../data/metro-spb';
import { CreateResumeScreen } from './CreateResumeScreen';

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
    const scrollTop = containerRef.current.scrollTop;
    const idx = Math.round(scrollTop / itemHeight);
    if (items[idx] && items[idx] !== value) onChange(items[idx]);
  };

  return (
    <div style={{ position: 'relative', height: itemHeight * 3, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute',
        top: itemHeight,
        left: 0,
        right: 0,
        height: itemHeight,
        background: '#F7F6FB',
        borderRadius: 10,
        border: '1.5px solid #E7E4F1',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          height: '100%',
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
          position: 'relative',
          zIndex: 1,
          paddingTop: itemHeight,
          paddingBottom: itemHeight,
          scrollBehavior: 'smooth'
        } as any}
      >
        <style>{`
          div[data-scroll-picker]::-webkit-scrollbar {
            display: none;
          }
          div[data-scroll-picker] {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
        <div data-scroll-picker>
          {items.map((item) => (
            <div
              key={item}
              style={{
                height: itemHeight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 700,
                color: item === value ? '#17151F' : '#B7B2C4',
                scrollSnapAlign: 'start',
                transition: 'color 0.15s'
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: itemHeight,
          background: 'linear-gradient(to bottom, rgba(255,255,255,1), rgba(255,255,255,0))',
          pointerEvents: 'none',
          zIndex: 2
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: itemHeight,
          background: 'linear-gradient(to top, rgba(255,255,255,1), rgba(255,255,255,0))',
          pointerEvents: 'none',
          zIndex: 2
        }}
      />
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
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6E6A7C', marginBottom: 6 }}>{label}</label>
      <div
        onClick={() => setShowScroller(true)}
        style={{
          padding: '12px 14px',
          borderRadius: 12,
          background: '#F7F6FB',
          color: value ? '#17151F' : '#B7B2C4',
          border: '1.5px solid #ECEAF4',
          fontSize: 14,
          cursor: 'pointer',
          textAlign: 'center'
        }}
      >
        {value || '--:--'}
      </div>

      {showScroller && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(23,21,31,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 18px 30px', width: '100%', maxWidth: 400 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#17151F', marginBottom: 16 }}>Выбор времени</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6E6A7C', marginBottom: 8, textAlign: 'center' }}>Часы</div>
                <ScrollPicker
                  items={Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))}
                  value={hours}
                  onChange={setHours}
                />
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#17151F', paddingTop: 20 }}>:</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6E6A7C', marginBottom: 8, textAlign: 'center' }}>Минуты</div>
                <ScrollPicker
                  items={['00', '15', '30', '45']}
                  value={minutes}
                  onChange={setMinutes}
                />
              </div>
            </div>
            <button onClick={handleConfirm} style={{ width: '100%', padding: 14, border: 'none', borderRadius: 14, background: '#6D28D9', color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 8, boxShadow: '0 8px 20px rgba(109,40,217,0.25)', cursor: 'pointer' }}>Готово</button>
            <button onClick={() => setShowScroller(false)} style={{ width: '100%', padding: 14, border: 'none', borderRadius: 14, background: '#F7F6FB', color: '#8B8798', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Отмена</button>
          </div>
        </div>
      )}
    </div>
  );
};

export const AvailableShiftsScreen = () => {
  const { profile } = useAuth();
  const userCity = profile?.city || 'Москва';

  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<Set<string>>(new Set());
  const [selectedMetro, setSelectedMetro] = useState<Set<string>>(new Set());
  const [metroSearch, setMetroSearch] = useState('');
  const [showMetroSelector, setShowMetroSelector] = useState(false);
  const [minDate, setMinDate] = useState('');
  const [minTime, setMinTime] = useState('');
  const [maxTime, setMaxTime] = useState('');
  const [showCreateResume, setShowCreateResume] = useState(false);

  const metroList = userCity === 'Санкт-Петербург' ? metroSPb : metroMoscow;

  useEffect(() => {
    if (profile?.telegram_id) {
      loadResume();
    }
  }, [profile]);

  useEffect(() => {
    if (resume) {
      loadVacancies();
    }
    // selectedMetro тоже используется внутри loadVacancies для фильтрации —
    // без него в зависимостях выбор станции метро не перезапускал загрузку.
  }, [selectedMarketplaces, selectedMetro, minDate, minTime, maxTime]);

  const loadResume = async () => {
    if (!profile?.telegram_id) return;
    setLoading(true);
    try {
      const data = await callFunction<{ resume: Resume | null }>('freelancer-resumes', {
        action: 'get',
        telegramId: profile.telegram_id,
      });
      if (data.resume) {
        setResume(data.resume);
      }
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

      if (minDate) {
        filtered = filtered.filter((v: Vacancy) => v.date >= minDate);
      }

      if (minTime) {
        filtered = filtered.filter((v: Vacancy) => v.start_time >= minTime);
      }

      if (maxTime) {
        filtered = filtered.filter((v: Vacancy) => v.end_time <= maxTime);
      }

      if (selectedMarketplaces.size > 0) {
        filtered = filtered.filter((v: Vacancy) =>
          v.marketplaces.some((m) => selectedMarketplaces.has(m))
        );
      }

      if (selectedMetro.size > 0) {
        // metro_stations на сервере хранятся как названия станций, а selectedMetro - id.
        const selectedMetroNames = new Set(
          Array.from(selectedMetro).map(getMetroStationName).filter(Boolean)
        );
        filtered = filtered.filter((v: Vacancy) =>
          v.metro_stations.some((m) => selectedMetroNames.has(m))
        );
      }

      setVacancies(filtered);
    } catch (err) {
      console.error('Failed to load vacancies:', err);
    }
  };

  const toggleMarketplace = (marketplace: string) => {
    const newSelected = new Set(selectedMarketplaces);
    if (newSelected.has(marketplace)) {
      newSelected.delete(marketplace);
    } else {
      newSelected.add(marketplace);
    }
    setSelectedMarketplaces(newSelected);
  };

  const toggleMetroStation = (stationId: string) => {
    const newSelected = new Set(selectedMetro);
    if (newSelected.has(stationId)) {
      newSelected.delete(stationId);
    } else {
      newSelected.add(stationId);
    }
    setSelectedMetro(newSelected);
  };

  const getMetroStationName = (stationId: string) => {
    return metroList.find(s => s.id === stationId)?.name || '';
  };

  const filteredMetroStations = metroList.filter(station =>
    station.name.toLowerCase().includes(metroSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ padding: '20px 18px', maxWidth: 400, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' }}>
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8B8798', fontSize: 14 }}>Загрузка...</div>
      </div>
    );
  }

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

  if (!resume) {
    return (
      <div style={{ padding: '20px 18px', maxWidth: 400, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 24 }}>📝</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#17151F', marginBottom: 8 }}>Создайте резюме</div>
          <div style={{ fontSize: 14, color: '#8B8798', marginBottom: 24 }}>Создайте резюме чтобы просматривать доступные замены</div>
          <button
            onClick={() => setShowCreateResume(true)}
            style={{ width: '100%', padding: 14, border: 'none', borderRadius: 14, background: '#6D28D9', color: '#fff', fontSize: 14, fontWeight: 700, boxShadow: '0 8px 20px rgba(109,40,217,0.25)', cursor: 'pointer' }}
          >
            Создать резюме
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 18px', maxWidth: 400, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#17151F', marginBottom: 16 }}>⏰ Доступные замены</div>

      {/* Filters */}
      <div style={{ marginBottom: 20 }}>
        {/* Date filter */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6E6A7C', marginBottom: 6 }}>Дата начиная с</label>
          <input
            type="date"
            value={minDate}
            onChange={(e) => setMinDate(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: '#F7F6FB', color: '#17151F', border: '1.5px solid #ECEAF4', fontSize: 14, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}
          />
        </div>

        {/* Time filter */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <TimeScroller label="Начало не ранее" value={minTime} onChange={setMinTime} />
          <TimeScroller label="Окончание не позже" value={maxTime} onChange={setMaxTime} />
        </div>

        {/* Marketplace filter */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6E6A7C', marginBottom: 6 }}>Маркетплейсы</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {MARKETPLACES.map((m) => (
              <span
                key={m}
                onClick={() => toggleMarketplace(m)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                  border: selectedMarketplaces.has(m) ? 'none' : '1.5px solid #6D28D9',
                  background: selectedMarketplaces.has(m) ? '#6D28D9' : 'transparent',
                  color: selectedMarketplaces.has(m) ? '#fff' : '#6D28D9',
                  cursor: 'pointer'
                }}
              >
                {m}
              </span>
            ))}
          </div>
        </div>

        {/* Metro filter */}
        <div>
          <button
            onClick={() => setShowMetroSelector(true)}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: '#F7F6FB', color: '#6D28D9', border: '1.5px solid #6D28D9', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Выбрать метро
          </button>
          {selectedMetro.size > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {Array.from(selectedMetro).map((id) => (
                <span key={id} style={{ padding: '6px 10px', borderRadius: 999, background: '#6D28D9', color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {getMetroStationName(id)}
                  <button onClick={() => toggleMetroStation(id)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>✕</button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {showMetroSelector && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(23,21,31,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 18px 30px', width: '100%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#17151F', marginBottom: 16 }}>Выбор метро</div>
            <input
              type="text"
              placeholder="Поиск станции..."
              value={metroSearch}
              onChange={(e) => setMetroSearch(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: '#F7F6FB', border: '1.5px solid #ECEAF4', color: '#17151F', fontSize: 14, marginBottom: 12, outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 12 }}>
              {filteredMetroStations.map((station) => (
                <label key={station.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '12px 8px', borderRadius: 8 }}>
                  <input type="checkbox" checked={selectedMetro.has(station.id)} onChange={() => toggleMetroStation(station.id)} style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#6D28D9' }} />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: station.lineColor }}></div>
                  <span style={{ fontSize: 13, color: '#17151F' }}>{station.name}</span>
                </label>
              ))}
            </div>
            <button onClick={() => setShowMetroSelector(false)} style={{ width: '100%', padding: 14, border: 'none', borderRadius: 14, background: '#6D28D9', color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 8, cursor: 'pointer' }}>Готово</button>
            <button onClick={() => { setShowMetroSelector(false); setSelectedMetro(new Set()); setMetroSearch(''); }} style={{ width: '100%', padding: 14, border: 'none', borderRadius: 14, background: '#F7F6FB', color: '#8B8798', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Отмена</button>
          </div>
        </div>
      )}

      {vacancies.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8B8798', fontSize: 14 }}>
          📋 Подходящих замен не найдено
        </div>
      ) : (
        <div>
          {vacancies.map((vacancy) => (
            <div
              key={vacancy.id}
              style={{
                background: '#F7F6FB',
                border: '1px solid #ECEAF4',
                borderRadius: 14,
                padding: 14,
                marginBottom: 12,
                boxShadow: '0 2px 10px rgba(23,21,31,0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#17151F', flex: 1 }}>{vacancy.address}</div>
                <span style={{ background: '#EDE4FB', color: '#7C3AED', padding: '4px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', marginLeft: 8 }}>
                  ⏰ Временная
                </span>
              </div>

              <div style={{ fontSize: 12, fontWeight: 600, color: '#6D28D9', marginBottom: 8 }}>
                📅 {new Date(vacancy.date).toLocaleDateString('ru')}, {vacancy.start_time} — {vacancy.end_time}
              </div>

              {vacancy.marketplaces && vacancy.marketplaces.length > 0 && (
                <div style={{ fontSize: 11, color: '#6E6A7C', marginBottom: 6 }}>
                  📦 {vacancy.marketplaces.join(', ')}
                </div>
              )}

              {vacancy.metro_stations && vacancy.metro_stations.length > 0 && (
                <div style={{ fontSize: 11, color: '#6E6A7C', marginBottom: 8 }}>
                  🚇 {vacancy.metro_stations.join(', ')}
                </div>
              )}

              <div style={{ fontSize: 12, fontWeight: 700, color: '#17151F', marginBottom: 10 }}>
                💰 {vacancy.payment}₽
              </div>

              <button
                onClick={() => alert('Функция отклика в разработке')}
                style={{
                  width: '100%',
                  padding: 9,
                  border: 'none',
                  borderRadius: 10,
                  background: '#6D28D9',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(109,40,217,0.2)',
                }}
              >
                Откликнуться
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
