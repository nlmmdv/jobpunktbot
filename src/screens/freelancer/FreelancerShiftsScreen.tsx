import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { callFunction } from '../../lib/api';
import { metroMoscow } from '../../data/metro-moscow';
import { metroSPb } from '../../data/metro-spb';
import { CreateResumeScreen } from './CreateResumeScreen';

interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  marketplaces: string[];
  rate: number;
  metro: string[];
}

interface Resume {
  id: string;
  status: string;
}

const Calendar = ({ onDateSelect, shiftsWithDates }: {
  onDateSelect: (date: Date) => void;
  shiftsWithDates: Set<string>;
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const days = [];
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const isToday = (day: number | null) => {
    if (!day) return false;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const hasShift = (day: number | null) => {
    if (!day) return false;
    const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      .toISOString()
      .split('T')[0];
    return shiftsWithDates.has(dateStr);
  };

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  const monthName = currentMonth.toLocaleString('ru', { month: 'long', year: 'numeric' });

  return (
    <div style={{ background: '#F7F6FB', border: '1px solid #ECEAF4', borderRadius: 16, padding: 14, marginBottom: 16, boxShadow: '0 2px 10px rgba(23,21,31,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span onClick={prevMonth} style={{ color: '#6D28D9', fontSize: 16, cursor: 'pointer', padding: '4px 8px' }}>‹</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#17151F' }}>{monthName}</span>
        <span onClick={nextMonth} style={{ color: '#6D28D9', fontSize: 16, cursor: 'pointer', padding: '4px 8px' }}>›</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 4 }}>
        {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, color: '#B7B2C4', fontWeight: 600 }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {days.map((day, idx) => (
          <div
            key={idx}
            onClick={() => {
              if (day) {
                onDateSelect(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
              }
            }}
            style={{
              aspectRatio: '1', borderRadius: 8, fontSize: 11, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', cursor: day ? 'pointer' : 'default',
              background: isToday(day) ? '#6D28D9' : '#FFFFFF',
              color: isToday(day) ? '#fff' : '#17151F'
            }}
          >
            {day}
            {hasShift(day) && <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: '#6D28D9' }} />}
          </div>
        ))}
      </div>
    </div>
  );
};

export const FreelancerShiftsScreen = () => {
  const { profile } = useAuth();
  const userCity = profile?.city || 'Москва';
  const metroList = userCity === 'Санкт-Петербург' ? metroSPb : metroMoscow;

  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [formData, setFormData] = useState({
    startTime: '09:00',
    endTime: '22:00',
    marketplaces: [] as string[],
    rate: 0,
    metro: [] as string[],
  });
  const [showMetroSelector, setShowMetroSelector] = useState(false);
  const [metroSearch, setMetroSearch] = useState('');
  const [selectedMetro, setSelectedMetro] = useState<Set<string>>(new Set());
  const [showCreateResume, setShowCreateResume] = useState(false);

  const shiftsWithDates = new Set(shifts.map((s) => s.date));

  useEffect(() => {
    if (profile?.telegram_id) {
      loadResume();
    }
  }, [profile]);

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
        loadShifts();
      }
    } catch (err) {
      console.error('Failed to load resume:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadShifts = async () => {
    if (!profile?.telegram_id) return;
    try {
      const data = await callFunction<{ shifts: any[] }>('freelancer-shifts', {
        action: 'list',
        telegramId: profile.telegram_id,
      });
      if (data.shifts) {
        const formattedShifts = data.shifts.map((s: any) => ({
          id: s.id,
          date: s.date,
          startTime: s.start_time,
          endTime: s.end_time,
          marketplaces: s.marketplaces || [],
          rate: s.rate,
          metro: s.metro || [],
        }));
        setShifts(formattedShifts);
      }
    } catch (err) {
      console.error('Failed to load shifts:', err);
    }
  };

  const handleAddShift = async () => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    const metroNames = Array.from(selectedMetro).map(id => getMetroStationName(id)).filter(Boolean);

    if (!profile?.telegram_id) {
      console.error('No telegram_id found');
      return;
    }

    try {
      const data = await callFunction<{ shift: any }>('freelancer-shifts', {
        action: 'create',
        telegramId: profile.telegram_id,
        date: dateStr,
        start_time: formData.startTime,
        end_time: formData.endTime,
        marketplaces: formData.marketplaces,
        rate: formData.rate,
        metro: metroNames,
      });
      if (data.shift) {
        const newShift: Shift = {
          id: data.shift.id,
          date: data.shift.date,
          startTime: data.shift.start_time,
          endTime: data.shift.end_time,
          marketplaces: data.shift.marketplaces || [],
          rate: data.shift.rate,
          metro: data.shift.metro || [],
        };
        setShifts([...shifts, newShift]);
        setShowModal(false);
        setSelectedMetro(new Set());
        setMetroSearch('');
        setFormData({
          startTime: '09:00',
          endTime: '22:00',
          marketplaces: [],
          rate: 0,
          metro: [],
        });
      }
    } catch (err) {
      console.error('Failed to create shift:', err);
    }
  };

  const toggleMarketplace = (marketplace: string) => {
    setFormData((prev) => ({
      ...prev,
      marketplaces: prev.marketplaces.includes(marketplace)
        ? prev.marketplaces.filter((m) => m !== marketplace)
        : [...prev.marketplaces, marketplace],
    }));
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

  const handleDeleteShift = async (shiftId: string) => {
    if (!profile?.telegram_id) return;

    try {
      await callFunction('freelancer-shifts', {
        action: 'delete',
        telegramId: profile.telegram_id,
        id: shiftId,
      }, { method: 'DELETE' });
      setShifts(shifts.filter(s => s.id !== shiftId));
    } catch (err) {
      console.error('Failed to delete shift:', err);
    }
  };

  const todayShifts = shifts.filter(
    (s) => s.date === selectedDate.toISOString().split('T')[0]
  );

  const dateStr = selectedDate.toLocaleDateString('ru');

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
          loadShifts();
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
          <div style={{ fontSize: 14, color: '#8B8798', marginBottom: 24 }}>Создайте резюме чтобы создавать подработки</div>
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
    <div style={{ padding: '20px 18px', maxWidth: 400, margin: '0 auto', background: '#FFFFFF', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#17151F', marginBottom: 2 }}>Подработка</div>
      <div style={{ color: '#8B8798', fontSize: 12, marginBottom: 14 }}>Город: {userCity}</div>

      <Calendar
        onDateSelect={(date) => {
          setSelectedDate(date);
          setShowModal(true);
        }}
        shiftsWithDates={shiftsWithDates}
      />

      {todayShifts.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#17151F', marginBottom: 10 }}>Заявки на {dateStr}</div>
          {todayShifts.map((shift) => (
            <div key={shift.id} style={{ background: '#F7F6FB', border: '1px solid #ECEAF4', borderRadius: 14, padding: 14, marginBottom: 12, boxShadow: '0 2px 10px rgba(23,21,31,0.04)' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#17151F', marginBottom: 8 }}>{shift.startTime} — {shift.endTime}</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                {shift.marketplaces.map((m) => (
                  <span key={m} style={{ padding: '4px 9px', borderRadius: 7, background: '#6D28D9', color: '#fff', fontSize: 11, fontWeight: 600 }}>{m}</span>
                ))}
              </div>
              <div style={{ color: '#6D28D9', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{shift.rate} ₽/час</div>
              {shift.metro.length > 0 && <div style={{ color: '#8B8798', fontSize: 12 }}>🚇 {shift.metro.join(', ')}</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => handleDeleteShift(shift.id)} style={{ flex: 1, padding: 12, border: 'none', borderRadius: 12, background: '#F0F0F0', color: '#8B8798', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🗑 Удалить</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && !showMetroSelector && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(23,21,31,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 18px 30px', width: '100%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#17151F', marginBottom: 6 }}>Новая заявка</div>
            <div style={{ fontSize: 13, color: '#8B8798', marginBottom: 16 }}>Дата: {selectedDate.toLocaleDateString('ru')}</div>

            <div style={{ fontSize: 12, fontWeight: 600, color: '#6E6A7C', marginBottom: 6 }}>С (время)</div>
            <input
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: '#F7F6FB', border: '1.5px solid #E7E4F1', color: '#17151F', fontSize: 14, marginBottom: 12, outline: 'none', boxSizing: 'border-box' }}
              type="text"
              value={formData.startTime}
              onChange={(e) => setFormData((p) => ({ ...p, startTime: e.target.value }))}
              placeholder="09:00"
            />

            <div style={{ fontSize: 12, fontWeight: 600, color: '#6E6A7C', marginBottom: 6 }}>До (время)</div>
            <input
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: '#F7F6FB', border: '1.5px solid #E7E4F1', color: '#17151F', fontSize: 14, marginBottom: 12, outline: 'none', boxSizing: 'border-box' }}
              type="text"
              value={formData.endTime}
              onChange={(e) => setFormData((p) => ({ ...p, endTime: e.target.value }))}
              placeholder="22:00"
            />

            <div style={{ fontSize: 12, fontWeight: 600, color: '#6E6A7C', marginBottom: 6 }}>Маркетплейсы</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {['WB', 'Ozon', 'Яндекс Маркет'].map((m) => (
                <span
                  key={m}
                  onClick={() => toggleMarketplace(m)}
                  style={{
                    padding: '6px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    background: formData.marketplaces.includes(m) ? '#6D28D9' : 'transparent',
                    color: formData.marketplaces.includes(m) ? '#fff' : '#6D28D9',
                    border: '1.5px solid #6D28D9'
                  }}
                >
                  {m}
                </span>
              ))}
            </div>

            <div style={{ fontSize: 12, fontWeight: 600, color: '#6E6A7C', marginBottom: 6 }}>Желаемая ставка (₽/час)</div>
            <input
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: '#F7F6FB', border: '1.5px solid #E7E4F1', color: '#17151F', fontSize: 14, marginBottom: 12, outline: 'none', boxSizing: 'border-box' }}
              type="text"
              value={formData.rate.toString()}
              onChange={(e) => setFormData((p) => ({ ...p, rate: parseInt(e.target.value) || 0 }))}
              placeholder="500"
            />

            {userCity !== 'Другое' && (
              <div style={{ marginBottom: 12 }}>
                <button
                  onClick={() => setShowMetroSelector(true)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: '#F7F6FB', color: '#6D28D9', border: '1.5px solid #6D28D9', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Выбрать метро (необязательно)
                </button>
                {selectedMetro.size > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {Array.from(selectedMetro).map((id) => (
                      <span
                        key={id}
                        style={{ padding: '6px 10px', borderRadius: 999, background: '#6D28D9', color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
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

            <button
              onClick={() => {
                handleAddShift();
                setSelectedMetro(new Set());
              }}
              style={{ width: '100%', padding: 14, border: 'none', borderRadius: 14, background: '#6D28D9', color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 8, boxShadow: '0 8px 20px rgba(109,40,217,0.25)', cursor: 'pointer' }}
            >
              Создать заявку
            </button>
            <button
              onClick={() => {
                setShowModal(false);
                setSelectedMetro(new Set());
              }}
              style={{ width: '100%', padding: 14, border: 'none', borderRadius: 14, background: '#F7F6FB', color: '#8B8798', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {showMetroSelector && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(23,21,31,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 18px 30px', width: '100%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#17151F', marginBottom: 16 }}>Выбор метро</div>

            <input
              type="text"
              placeholder="Поиск станции..."
              value={metroSearch}
              onChange={(e) => setMetroSearch(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: '#F7F6FB', border: '1.5px solid #E7E4F1', color: '#17151F', fontSize: 14, marginBottom: 12, outline: 'none', boxSizing: 'border-box' }}
            />

            <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 12 }}>
              {filteredMetroStations.map((station) => (
                <label
                  key={station.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '12px 8px', borderRadius: 8 }}
                >
                  <input
                    type="checkbox"
                    checked={selectedMetro.has(station.id)}
                    onChange={() => toggleMetroStation(station.id)}
                    style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#6D28D9' }}
                  />
                  <div
                    style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: station.lineColor }}
                  ></div>
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
              onClick={() => {
                setShowMetroSelector(false);
                setSelectedMetro(new Set());
              }}
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
