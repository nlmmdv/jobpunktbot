import { useState, useEffect } from 'react';
import { callFunction, ApiError } from '../../lib/api';
import { metroMoscow } from '../../data/metro-moscow';
import { metroSPb } from '../../data/metro-spb';

interface Freelancer {
  id: string;
  first_name: string;
  last_name: string;
  city: string;
  about: string;
  marketplaces: string[];
  hourly_rate: number;
  metro_stations: string[];
  preferred_schedule?: string;
}

const MARKETPLACES = ['WB', 'Ozon', 'Яндекс Маркет'];
const CITIES = ['Москва', 'Санкт-Петербург', 'Все'];

interface Vacancy {
  id: string;
  title: string;
  address: string;
  payment: number;
}

export const SearchEmployeesScreen = () => {
  const [selectedCity, setSelectedCity] = useState('Москва');
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<Set<string>>(new Set());
  const [selectedMetro, setSelectedMetro] = useState<Set<string>>(new Set());
  const [metroSearch, setMetroSearch] = useState('');
  const [showMetroSelector, setShowMetroSelector] = useState(false);
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [selectedFreelancer, setSelectedFreelancer] = useState<Freelancer | null>(null);
  const [ownerVacancies, setOwnerVacancies] = useState<Vacancy[]>([]);

  const metroList = selectedCity === 'Санкт-Петербург' ? metroSPb : metroMoscow;

  useEffect(() => {
    loadFreelancers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity, selectedMarketplaces, selectedMetro]);

  const loadFreelancers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await callFunction<{ freelancers: Freelancer[] }>('search-freelancers', {
        city: selectedCity === 'Все' ? 'Все' : selectedCity,
        marketplace: selectedMarketplaces.size > 0 ? Array.from(selectedMarketplaces)[0] : 'Все',
      });

      // Бэкенд не умеет фильтровать по метро, поэтому фильтруем на клиенте.
      // metro_stations на сервере хранятся как названия станций, а selectedMetro - id, поэтому сравниваем по названиям.
      let filtered = data.freelancers || [];
      if (selectedMetro.size > 0) {
        const selectedMetroNames = new Set(
          Array.from(selectedMetro).map((id) => metroList.find((s) => s.id === id)?.name).filter(Boolean)
        );
        filtered = filtered.filter((f) => f.metro_stations?.some((name) => selectedMetroNames.has(name)));
      }
      setFreelancers(filtered);
    } catch (err) {
      console.error('Failed to load freelancers:', err);
      setError(err instanceof ApiError ? err.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
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

  const handleOfferShift = async (freelancer: Freelancer) => {
    setSelectedFreelancer(freelancer);
    try {
      // Load owner's active vacancies
      const data = await callFunction<{ vacancies: Vacancy[] }>('owner-vacancies', {
        action: 'list',
      });
      setOwnerVacancies(data.vacancies?.filter((v: any) => v.status === 'active') || []);
      setShowOfferModal(true);
    } catch (err) {
      console.error('Failed to load vacancies:', err);
      alert('❌ Ошибка при загрузке вакансий');
    }
  };

  const handleSelectVacancyForOffer = async (vacancyId: string, freelancerTelegramId: number, ownerTelegramId: number) => {
    try {
      await callFunction('job-matches', {
        action: 'create',
        vacancy_id: vacancyId,
        owner_telegram_id: ownerTelegramId,
        freelancer_telegram_id: freelancerTelegramId,
        initiated_by: 'owner',
      });
      setShowOfferModal(false);
      setSelectedFreelancer(null);
      alert('✅ Предложение отправлено!');
    } catch (err) {
      console.error('Failed to send offer:', err);
      alert('❌ Ошибка при отправке предложения');
    }
  };

  return (
    <div style={{ padding: '20px 18px', maxWidth: 400, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#17151F', marginBottom: 16 }}>Поиск сотрудников</div>

      {/* Filters */}
      <div style={{ marginBottom: 20 }}>
        {/* City filter */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6E6A7C', marginBottom: 6 }}>Город</label>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: '#F5F8FE', color: '#17151F', border: '1.5px solid #E1EBFB', fontSize: 14, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}
          >
            {CITIES.map((city) => (<option key={city} value={city}>{city}</option>))}
          </select>
        </div>

        {/* Marketplace filter */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6E6A7C', marginBottom: 6 }}>Маркетплейсы</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {MARKETPLACES.map((m) => (
              <span
                key={m}
                onClick={() => toggleMarketplace(m)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                  border: selectedMarketplaces.has(m) ? 'none' : '1.5px solid #2563EB',
                  background: selectedMarketplaces.has(m) ? '#2563EB' : 'transparent',
                  color: selectedMarketplaces.has(m) ? '#fff' : '#2563EB',
                  cursor: 'pointer'
                }}
              >
                {m}
              </span>
            ))}
          </div>
        </div>

        {/* Metro filter */}
        {selectedCity !== 'Все' && (
          <div>
            <button
              onClick={() => setShowMetroSelector(true)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: '#F5F8FE', color: '#2563EB', border: '1.5px solid #2563EB', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Выбрать метро
            </button>
            {selectedMetro.size > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {Array.from(selectedMetro).map((id) => (
                  <span key={id} style={{ padding: '6px 12px', borderRadius: 999, background: '#2563EB', color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {getMetroStationName(id)}
                    <button onClick={() => toggleMetroStation(id)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showMetroSelector && selectedCity !== 'Все' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(23,21,31,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 18px 30px', width: '100%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#17151F', marginBottom: 16 }}>Выбор метро</div>
            <input
              type="text"
              placeholder="Поиск станции..."
              value={metroSearch}
              onChange={(e) => setMetroSearch(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: '#F5F8FE', border: '1.5px solid #E1EBFB', color: '#17151F', fontSize: 14, marginBottom: 12, outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 12 }}>
              {filteredMetroStations.map((station) => (
                <label key={station.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '12px 8px', borderRadius: 8 }}>
                  <input type="checkbox" checked={selectedMetro.has(station.id)} onChange={() => toggleMetroStation(station.id)} style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#2563EB' }} />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: station.lineColor }}></div>
                  <span style={{ fontSize: 13, color: '#17151F' }}>{station.name}</span>
                </label>
              ))}
            </div>
            <button onClick={() => setShowMetroSelector(false)} style={{ width: '100%', padding: 14, border: 'none', borderRadius: 14, background: '#2563EB', color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 8, cursor: 'pointer' }}>Готово</button>
            <button onClick={() => { setShowMetroSelector(false); setSelectedMetro(new Set()); setMetroSearch(''); }} style={{ width: '100%', padding: 14, border: 'none', borderRadius: 14, background: '#F5F8FE', color: '#8B8798', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Отмена</button>
          </div>
        </div>
      )}

      {error && <div style={{ marginBottom: 12, color: '#DC2626', fontSize: 14 }}>{error}</div>}

      {loading && <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8B8798', fontSize: 14 }}>Загрузка...</div>}

      {!loading && freelancers.length === 0 && <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8B8798', fontSize: 14 }}>Фрилансеров не найдено</div>}

      {!loading && freelancers.length > 0 && (
        <div>
          {freelancers.map((freelancer) => (
            <div key={freelancer.id} style={{ background: '#F5F8FE', border: '1px solid #E1EBFB', borderRadius: 14, padding: 14, marginBottom: 12, boxShadow: '0 2px 10px rgba(23,21,31,0.04)' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#17151F', marginBottom: 8 }}>
                {freelancer.first_name} {freelancer.last_name}
              </div>

              {freelancer.city && (
                <div style={{ fontSize: 12, color: '#6E6A7C', marginBottom: 4 }}>📍 {freelancer.city}</div>
              )}

              {freelancer.marketplaces?.length > 0 && (
                <div style={{ fontSize: 12, color: '#6E6A7C', marginBottom: 4 }}>📦 {freelancer.marketplaces.join(', ')}</div>
              )}

              {freelancer.preferred_schedule && (
                <div style={{ fontSize: 12, color: '#6E6A7C', marginBottom: 4 }}>📅 {freelancer.preferred_schedule}</div>
              )}

              {freelancer.hourly_rate && (
                <div style={{ fontSize: 13, fontWeight: 700, color: '#2563EB', marginBottom: 4 }}>💰 от {freelancer.hourly_rate} ₽/час</div>
              )}

              {freelancer.metro_stations?.length > 0 && (
                <div style={{ fontSize: 12, color: '#6E6A7C', marginBottom: 8 }}>🚇 {freelancer.metro_stations.join(', ')}</div>
              )}

              {freelancer.about && (
                <div style={{ fontSize: 12, color: '#6E6A7C', marginBottom: 10, lineHeight: 1.4 }}>💬 "{freelancer.about}"</div>
              )}

              <button
                onClick={() => handleOfferShift(freelancer)}
                style={{
                  width: '100%',
                  padding: 10,
                  border: 'none',
                  borderRadius: 10,
                  background: '#2563EB',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
                }}
              >
                Предложить смену
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Offer Modal */}
      {showOfferModal && selectedFreelancer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'flex-end',
          zIndex: 1000,
        }} onClick={() => setShowOfferModal(false)}>
          <div style={{
            width: '100%',
            background: '#fff',
            borderRadius: '20px 20px 0 0',
            padding: '20px 18px 30px',
            maxHeight: '80vh',
            overflow: 'auto',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#17151F', marginBottom: 16 }}>
              Выберите вакансию для предложения
            </div>
            <div style={{ fontSize: 14, color: '#6E6A7C', marginBottom: 16 }}>
              {selectedFreelancer.first_name} {selectedFreelancer.last_name}
            </div>

            {ownerVacancies.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#8B8798' }}>
                📋 Нет активных вакансий для предложения
              </div>
            ) : (
              ownerVacancies.map((vacancy) => (
                <div
                  key={vacancy.id}
                  onClick={() => handleSelectVacancyForOffer(vacancy.id, parseInt(selectedFreelancer.id), 0)}
                  style={{
                    background: '#F5F8FE',
                    border: '1px solid #E1EBFB',
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 10,
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#ECF3FF')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#F5F8FE')}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#17151F', marginBottom: 6 }}>
                    {vacancy.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#6E6A7C', marginBottom: 4 }}>
                    📍 {vacancy.address}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#2563EB' }}>
                    💰 {vacancy.payment}₽
                  </div>
                </div>
              ))
            )}

            <button
              onClick={() => setShowOfferModal(false)}
              style={{
                width: '100%',
                padding: 14,
                border: '1px solid #E1EBFB',
                borderRadius: 12,
                background: '#fff',
                color: '#6E6A7C',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: 16,
              }}
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
