import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { callFunction } from '../../lib/api';
import { CreateResumeScreen } from './CreateResumeScreen';
import { Screen, ScreenHeader, Card, Button, TextField, Label, Chip, SectionTitle, Loading, Modal, BackButton } from '../../components/ui';
import { ResumeGate } from '../../components/ResumeGate';
import { MetroSelector, SelectedMetroChips, metroStationName } from '../../components/MetroSelector';

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

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MARKETPLACES = ['WB', 'Ozon', 'Яндекс Маркет'];

// Данные-заглушки для локальной разработки (DEV), когда Edge Functions недоступны.
const MOCK_SHIFTS: Shift[] = [
  {
    id: 'dev-shift-1',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '18:00',
    marketplaces: ['WB', 'Ozon'],
    rate: 500,
    metro: ['Охотный ряд'],
  },
  {
    id: 'dev-shift-2',
    date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '19:00',
    marketplaces: ['Яндекс Маркет'],
    rate: 450,
    metro: ['Тверская'],
  },
];

const Calendar = ({ onDateSelect, shiftsWithDates }: {
  onDateSelect: (date: Date) => void;
  shiftsWithDates: Set<string>;
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  // Приводим воскресенье (0) к индексу 6, чтобы неделя начиналась с понедельника.
  const firstDayRaw = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const firstDay = (firstDayRaw + 6) % 7;

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const isToday = (day: number | null) => {
    if (!day) return false;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date.toDateString() === new Date().toDateString();
  };

  const hasShift = (day: number | null) => {
    if (!day) return false;
    const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toISOString().split('T')[0];
    return shiftsWithDates.has(dateStr);
  };

  const monthName = currentMonth.toLocaleString('ru', { month: 'long', year: 'numeric' });

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button className="arrow" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>‹</button>
        <span className="month">{monthName}</span>
        <button className="arrow" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>›</button>
      </div>

      <div className="calendar-weekdays">
        {WEEKDAYS.map((d) => <div key={d} className="calendar-weekday">{d}</div>)}
      </div>

      <div className="calendar-days">
        {days.map((day, idx) => (
          <div
            key={idx}
            className={`calendar-day${!day ? ' empty' : ''}${isToday(day) ? ' selected' : ''}${hasShift(day) ? ' has-shift' : ''}`}
            onClick={() => day && onDateSelect(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))}
          >
            {day}
          </div>
        ))}
      </div>
    </div>
  );
};

export const FreelancerShiftsScreen = ({ onBack }: { onBack: () => void }) => {
  const { profile } = useAuth();
  const userCity = profile?.city || 'Москва';

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
  });
  const [showMetroSelector, setShowMetroSelector] = useState(false);
  const [selectedMetro, setSelectedMetro] = useState<Set<string>>(new Set());
  const [showCreateResume, setShowCreateResume] = useState(false);

  const shiftsWithDates = new Set(shifts.map((s) => s.date));

  useEffect(() => {
    if (profile?.telegram_id) loadResume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const loadResume = async () => {
    if (!profile?.telegram_id) return;
    setLoading(true);
    try {
      // DEV MODE: резюме и смены-заглушки, без обращения к бэкенду.
      if (import.meta.env.DEV) {
        setResume({ id: 'dev-resume', status: 'active' });
        setShifts(MOCK_SHIFTS);
        setLoading(false);
        return;
      }

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
      if (import.meta.env.DEV) {
        setShifts(MOCK_SHIFTS);
        return;
      }

      const data = await callFunction<{ shifts: any[] }>('freelancer-shifts', {
        action: 'list',
        telegramId: profile.telegram_id,
      });
      if (data.shifts) {
        setShifts(data.shifts.map((s: any) => ({
          id: s.id,
          date: s.date,
          startTime: s.start_time,
          endTime: s.end_time,
          marketplaces: s.marketplaces || [],
          rate: s.rate,
          metro: s.metro || [],
        })));
      }
    } catch (err) {
      console.error('Failed to load shifts:', err);
    }
  };

  const resetForm = () => {
    setShowModal(false);
    setSelectedMetro(new Set());
    setFormData({ startTime: '09:00', endTime: '22:00', marketplaces: [], rate: 0 });
  };

  const handleAddShift = async () => {
    if (!profile?.telegram_id) return;
    const dateStr = selectedDate.toISOString().split('T')[0];
    const metroNames = Array.from(selectedMetro).map((id) => metroStationName(userCity, id)).filter(Boolean);

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
        setShifts([...shifts, {
          id: data.shift.id,
          date: data.shift.date,
          startTime: data.shift.start_time,
          endTime: data.shift.end_time,
          marketplaces: data.shift.marketplaces || [],
          rate: data.shift.rate,
          metro: data.shift.metro || [],
        }]);
        resetForm();
      }
    } catch (err) {
      console.error('Failed to create shift:', err);
    }
  };

  const toggleMarketplace = (m: string) => {
    setFormData((prev) => ({
      ...prev,
      marketplaces: prev.marketplaces.includes(m)
        ? prev.marketplaces.filter((x) => x !== m)
        : [...prev.marketplaces, m],
    }));
  };

  const toggleMetroStation = (id: string) => {
    const next = new Set(selectedMetro);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedMetro(next);
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!profile?.telegram_id) return;
    try {
      await callFunction('freelancer-shifts', {
        action: 'delete',
        telegramId: profile.telegram_id,
        id: shiftId,
      }, { method: 'DELETE' });
      setShifts(shifts.filter((s) => s.id !== shiftId));
    } catch (err) {
      console.error('Failed to delete shift:', err);
    }
  };

  const todayShifts = shifts.filter((s) => s.date === selectedDate.toISOString().split('T')[0]);
  const dateStr = selectedDate.toLocaleDateString('ru');

  if (showCreateResume) {
    return (
      <CreateResumeScreen
        onDone={(newResume) => { setResume(newResume); setShowCreateResume(false); loadShifts(); }}
        onCancel={() => setShowCreateResume(false)}
      />
    );
  }

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Подработка" variant="freelancer" onBack={onBack} />
        <Loading />
      </Screen>
    );
  }

  if (!resume) {
    return <ResumeGate description="Создайте резюме чтобы создавать подработки" onCreate={() => setShowCreateResume(true)} onBack={onBack} />;
  }

  return (
    <Screen>
      <ScreenHeader title="Подработка" subtitle={`Город: ${userCity}`} variant="freelancer" onBack={onBack} />

      <Calendar
        onDateSelect={(date) => { setSelectedDate(date); setShowModal(true); }}
        shiftsWithDates={shiftsWithDates}
      />

      {todayShifts.length > 0 && (
        <>
          <SectionTitle>Заявки на {dateStr}</SectionTitle>
          {todayShifts.map((shift) => (
            <Card key={shift.id} variant="freelancer">
              <div style={{ fontWeight: 700, fontSize: 14, color: '#17151F', marginBottom: 8 }}>{shift.startTime} — {shift.endTime}</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                {shift.marketplaces.map((m) => (
                  <span key={m} style={{ padding: '4px 9px', borderRadius: 7, background: '#6D28D9', color: '#fff', fontSize: 11, fontWeight: 600 }}>{m}</span>
                ))}
              </div>
              <div className="price freelancer">{shift.rate} ₽/час</div>
              {shift.metro.length > 0 && <div className="meta">🚇 {shift.metro.join(', ')}</div>}
              <Button tone="secondary" small onClick={() => handleDeleteShift(shift.id)} style={{ marginTop: 12 }}>🗑 Удалить</Button>
            </Card>
          ))}
        </>
      )}

      {showModal && !showMetroSelector && (
        <Modal title="Новая заявка" onClose={resetForm}>
          <div className="subtitle">Дата: {selectedDate.toLocaleDateString('ru')}</div>

          {/* Текущие доступные смены */}
          {shifts.length > 0 && (
            <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f7', borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#17151F' }}>📅 Ваши смены на текущий момент:</div>
              <div style={{ maxHeight: 120, overflowY: 'auto' }}>
                {shifts.map((shift) => (
                  <div
                    key={shift.id}
                    style={{
                      fontSize: 11,
                      padding: 6,
                      marginBottom: 4,
                      background: 'white',
                      borderRadius: 4,
                      border: '1px solid #e5e5e5',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: '#6D28D9' }}>
                      {new Date(shift.date).toLocaleDateString('ru')} {shift.startTime}—{shift.endTime}
                    </div>
                    <div style={{ color: '#999', marginTop: 2 }}>
                      {shift.marketplaces.join(', ')} • {shift.rate} ₽/ч
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <TextField label="С (время)" value={formData.startTime} onChange={(e) => setFormData((p) => ({ ...p, startTime: e.target.value }))} placeholder="09:00" />
          <TextField label="До (время)" value={formData.endTime} onChange={(e) => setFormData((p) => ({ ...p, endTime: e.target.value }))} placeholder="22:00" />

          <Label>Маркетплейсы</Label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {MARKETPLACES.map((m) => (
              <Chip key={m} label={m} variant="freelancer" active={formData.marketplaces.includes(m)} onClick={() => toggleMarketplace(m)} />
            ))}
          </div>

          <TextField
            label="Желаемая ставка (₽/час)"
            type="number"
            value={formData.rate || ''}
            onChange={(e) => setFormData((p) => ({ ...p, rate: parseInt(e.target.value) || 0 }))}
            placeholder="500"
          />

          {userCity !== 'Другое' && (
            <div style={{ marginBottom: 12 }}>
              <Button tone="outline" onClick={() => setShowMetroSelector(true)}>Выбрать метро (необязательно)</Button>
              <SelectedMetroChips city={userCity} selected={selectedMetro} onRemove={toggleMetroStation} variant="freelancer" />
            </div>
          )}

          <Button onClick={handleAddShift} style={{ marginBottom: 8 }}>Создать заявку</Button>
          <Button tone="secondary" onClick={resetForm}>Отмена</Button>
        </Modal>
      )}

      {showMetroSelector && (
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
