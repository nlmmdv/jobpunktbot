import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { callFunction } from '../../lib/api';
import { metroMoscow } from '../../data/metro-moscow';
import { metroSPb } from '../../data/metro-spb';

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

export const MyVacanciesScreen = () => {
  const { profile } = useAuth();
  const userCity = profile?.city || 'Москва';
  const metroList = userCity === 'Санкт-Петербург' ? metroSPb : metroMoscow;

  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [selectedType, setSelectedType] = useState<'temporary' | 'permanent' | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
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
  const [metroSearch, setMetroSearch] = useState('');
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
    const newSet = new Set(formData.marketplaces);
    if (newSet.has(m)) newSet.delete(m);
    else newSet.add(m);
    setFormData({ ...formData, marketplaces: newSet });
  };

  const toggleMetroStation = (id: string) => {
    const newSet = new Set(formData.metro);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setFormData({ ...formData, metro: newSet });
  };

  const getMetroStationName = (id: string) => metroList.find(s => s.id === id)?.name || '';

  const filteredMetroStations = metroList.filter(s => s.name.toLowerCase().includes(metroSearch.toLowerCase()));

  const handlePublish = async () => {
    if (!profile?.telegram_id || !formData.address || formData.payment <= 0) {
      alert('Заполните все обязательные поля');
      return;
    }

    try {
      const metroNames = Array.from(formData.metro).map(id => getMetroStationName(id)).filter(Boolean);

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

      setShowForm(false);
      setSelectedType(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        address: '',
        marketplaces: new Set(),
        metro: new Set(),
        startTime: '09:00',
        endTime: '22:00',
        schedule: '',
        payment: 0,
        description: '',
      });
      await loadVacancies();
    } catch (err) {
      console.error('Failed to publish vacancy:', err);
      alert('Ошибка при публикации');
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
    <div style={{ padding: '20px 18px', maxWidth: 400, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#17151F' }}>Мои вакансии</div>
        <span onClick={() => setShowTypeSelector(true)} style={{ padding: '7px 12px', borderRadius: 9, background: '#2563EB', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ Создать</span>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8B8798', fontSize: 14 }}>Загрузка...</div>}

      {!loading && vacancies.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8B8798', fontSize: 14 }}>У вас пока нет вакансий</div>
      )}

      {!loading && vacancies.length > 0 && (
        <div>
          {vacancies.map((vacancy) => (
            <div key={vacancy.id} style={{ background: '#F5F8FE', border: '1px solid #E1EBFB', borderRadius: 14, padding: 14, marginBottom: 12, boxShadow: '0 2px 10px rgba(23,21,31,0.04)' }}>
              <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 7, fontSize: 10, fontWeight: 700, marginBottom: 8, background: '#DCE9FE', color: '#1D4ED8' }}>
                {vacancy.type === 'temporary' ? '⏰ Временная' : '📌 Постоянная'}
              </span>

              <div style={{ fontWeight: 700, fontSize: 13.5, color: '#17151F', marginBottom: 6 }}>{vacancy.address}</div>

              <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
                {vacancy.marketplaces.map(m => <span key={m} style={{ padding: '3px 8px', borderRadius: 6, background: '#2563EB', color: '#fff', fontSize: 10.5, fontWeight: 600 }}>{m}</span>)}
              </div>

              {vacancy.type === 'temporary' ? (
                <div style={{ color: '#8B8798', fontSize: 11.5, marginBottom: 4 }}>📅 {vacancy.date}, {vacancy.start_time}–{vacancy.end_time}</div>
              ) : (
                <div style={{ color: '#8B8798', fontSize: 11.5, marginBottom: 4 }}>📋 График: {vacancy.schedule}</div>
              )}

              {vacancy.metro_stations.length > 0 && (
                <div style={{ color: '#8B8798', fontSize: 11.5, marginBottom: 8 }}>🚇 {vacancy.metro_stations.join(', ')}</div>
              )}

              <div style={{ color: '#2563EB', fontWeight: 700, fontSize: 13, marginBottom: 10 }}>💰 {vacancy.payment} ₽</div>

              <div onClick={() => handleDeleteVacancy(vacancy.id)} style={{ padding: 9, borderRadius: 9, background: '#FDECEC', color: '#DC2626', fontSize: 12.5, fontWeight: 600, textAlign: 'center', cursor: 'pointer' }}>🗑 Удалить</div>
            </div>
          ))}
        </div>
      )}

      {/* Type Selector Modal */}
      {showTypeSelector && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(23,21,31,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 18px 30px', width: '100%', maxWidth: 400 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#17151F', marginBottom: 16 }}>Выберите тип</div>

            <div onClick={() => { setSelectedType('temporary'); setShowTypeSelector(false); setShowForm(true); }} style={{ padding: 18, borderRadius: 16, background: '#F5F8FE', border: '1px solid #E1EBFB', marginBottom: 12, cursor: 'pointer', boxShadow: '0 2px 10px rgba(23,21,31,0.04)' }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>⏰</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#17151F' }}>Временная</div>
              <div style={{ fontSize: 12, color: '#8B8798', marginTop: 4 }}>Замена на одну смену</div>
            </div>

            <div onClick={() => { setSelectedType('permanent'); setShowTypeSelector(false); setShowForm(true); }} style={{ padding: 18, borderRadius: 16, background: '#F5F8FE', border: '1px solid #E1EBFB', cursor: 'pointer', boxShadow: '0 2px 10px rgba(23,21,31,0.04)', marginBottom: 12 }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>📌</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#17151F' }}>Постоянная</div>
              <div style={{ fontSize: 12, color: '#8B8798', marginTop: 4 }}>Поиск на постоянную работу</div>
            </div>

            <div onClick={() => setShowTypeSelector(false)} style={{ padding: 14, borderRadius: 14, background: '#F7F6FB', color: '#8B8798', fontSize: 14, fontWeight: 600, textAlign: 'center', cursor: 'pointer' }}>Отмена</div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && selectedType && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(23,21,31,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 18px 30px', width: '100%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#17151F', marginBottom: 16 }}>
              {selectedType === 'temporary' ? '⏰ Временная вакансия' : '📌 Постоянная вакансия'}
            </div>

            {selectedType === 'temporary' && (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6E6A7C', marginBottom: 6 }}>Дата</div>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: '#F7F6FB', border: '1.5px solid #E7E4F1', color: '#17151F', fontSize: 14, marginBottom: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </>
            )}

            <div style={{ fontSize: 12, fontWeight: 600, color: '#6E6A7C', marginBottom: 6 }}>Адрес *</div>
            <input
              type="text"
              placeholder="ул. Примера, д. 1"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: '#F7F6FB', border: '1.5px solid #E7E4F1', color: '#17151F', fontSize: 14, marginBottom: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />

            <div style={{ fontSize: 12, fontWeight: 600, color: '#6E6A7C', marginBottom: 6 }}>ПВЗ</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {MARKETPLACES.map((m) => (
                <span
                  key={m}
                  onClick={() => toggleMarketplace(m)}
                  style={{
                    padding: '6px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    background: formData.marketplaces.has(m) ? '#2563EB' : 'transparent',
                    color: formData.marketplaces.has(m) ? '#fff' : '#2563EB',
                    border: '1.5px solid #2563EB'
                  }}
                >
                  {m}
                </span>
              ))}
            </div>

            {userCity !== 'Другое' && (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6E6A7C', marginBottom: 6 }}>Выбрать метро</div>
                <button
                  onClick={() => setShowMetroSelector(true)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: '#F7F6FB', color: '#2563EB', border: '1.5px solid #2563EB', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 12, fontFamily: 'inherit' }}
                >
                  Выбрать станции
                </button>
                {formData.metro.size > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {Array.from(formData.metro).map((id) => (
                      <span
                        key={id}
                        style={{ padding: '6px 10px', borderRadius: 999, background: '#2563EB', color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
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
              </>
            )}

            {selectedType === 'temporary' ? (
              <>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#6E6A7C', marginBottom: 6 }}>С (время)</div>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: '#F7F6FB', border: '1.5px solid #E7E4F1', color: '#17151F', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#6E6A7C', marginBottom: 6 }}>До (время)</div>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: '#F7F6FB', border: '1.5px solid #E7E4F1', color: '#17151F', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}></div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6E6A7C', marginBottom: 6 }}>График</div>
                <input
                  type="text"
                  placeholder="2/2, 5/2, сменный"
                  value={formData.schedule}
                  onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: '#F7F6FB', border: '1.5px solid #E7E4F1', color: '#17151F', fontSize: 14, marginBottom: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </>
            )}

            <div style={{ fontSize: 12, fontWeight: 600, color: '#6E6A7C', marginBottom: 6 }}>Оплата (₽) *</div>
            <input
              type="number"
              value={formData.payment}
              onChange={(e) => setFormData({ ...formData, payment: parseInt(e.target.value) || 0 })}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: '#F7F6FB', border: '1.5px solid #E7E4F1', color: '#17151F', fontSize: 14, marginBottom: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />

            <div style={{ fontSize: 12, fontWeight: 600, color: '#6E6A7C', marginBottom: 6 }}>Описание</div>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Доп. информация..."
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: '#F7F6FB', border: '1.5px solid #E7E4F1', color: '#17151F', fontSize: 14, marginBottom: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'none' }}
              rows={3}
            />

            {/* Metro Selector Modal */}
            {showMetroSelector && userCity !== 'Другое' && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(23,21,31,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 101 }}>
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
                          checked={formData.metro.has(station.id)}
                          onChange={() => toggleMetroStation(station.id)}
                          style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#2563EB' }}
                        />
                        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: station.lineColor }}></div>
                        <span style={{ fontSize: 13, color: '#17151F' }}>{station.name}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowMetroSelector(false)}
                    style={{ width: '100%', padding: 14, border: 'none', borderRadius: 14, background: '#2563EB', color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 8, cursor: 'pointer' }}
                  >
                    Готово
                  </button>
                  <button
                    onClick={() => { setShowMetroSelector(false); setFormData({ ...formData, metro: new Set() }); setMetroSearch(''); }}
                    style={{ width: '100%', padding: 14, border: 'none', borderRadius: 14, background: '#F7F6FB', color: '#8B8798', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={handlePublish}
              style={{ width: '100%', padding: 14, border: 'none', borderRadius: 14, background: '#2563EB', color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 8, boxShadow: '0 8px 18px rgba(37,99,235,0.22)', cursor: 'pointer' }}
            >
              Опубликовать
            </button>
            <button
              onClick={() => { setShowForm(false); setSelectedType(null); }}
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
