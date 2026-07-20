import { useState, useEffect } from 'react';
import { callFunction, ApiError } from '../../lib/api';
import { Screen, ScreenHeader, Card, Button, Label, Chip, SelectField, Loading, EmptyState, ErrorText, Modal } from '../../components/ui';
import { MetroSelector, SelectedMetroChips, metroListForCity } from '../../components/MetroSelector';
import { RatingBadge } from '../../components/RatingBadge';

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
  avg_rating: number | null;
  rating_count: number;
}

interface Vacancy {
  id: string;
  address: string;
  payment: number;
}

const MARKETPLACES = ['WB', 'Ozon', 'Яндекс Маркет'];
const CITIES = ['Москва', 'Санкт-Петербург', 'Все'];

export const SearchEmployeesScreen = ({ onBack }: { onBack: () => void }) => {
  const [selectedCity, setSelectedCity] = useState('Москва');
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<Set<string>>(new Set());
  const [selectedMetro, setSelectedMetro] = useState<Set<string>>(new Set());
  const [showMetroSelector, setShowMetroSelector] = useState(false);
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [selectedFreelancer, setSelectedFreelancer] = useState<Freelancer | null>(null);
  const [ownerVacancies, setOwnerVacancies] = useState<Vacancy[]>([]);

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

      // Бэкенд не фильтрует по метро — делаем это на клиенте.
      // metro_stations на сервере хранятся как названия станций, а selectedMetro — id.
      let filtered = data.freelancers || [];
      if (selectedMetro.size > 0) {
        const metroList = metroListForCity(selectedCity);
        const names = new Set(
          Array.from(selectedMetro).map((id) => metroList.find((s) => s.id === id)?.name).filter(Boolean)
        );
        filtered = filtered.filter((f) => f.metro_stations?.some((name) => names.has(name)));
      }
      setFreelancers(filtered);
    } catch (err) {
      console.error('Failed to load freelancers:', err);
      setError(err instanceof ApiError ? err.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
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

  const handleOfferShift = async (freelancer: Freelancer) => {
    setSelectedFreelancer(freelancer);
    try {
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

  // telegram_id владельца берётся на сервере из подписи Telegram, а telegram_id
  // фрилансера резолвится по id резюме (search-freelancers его намеренно не отдаёт).
  const handleSelectVacancyForOffer = async (vacancyId: string, freelancerResumeId: string) => {
    try {
      await callFunction('job-matches', {
        action: 'create',
        vacancy_id: vacancyId,
        freelancer_resume_id: freelancerResumeId,
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
    <Screen>
      <ScreenHeader title="Поиск сотрудников" variant="owner" onBack={onBack} />

      <div style={{ marginBottom: 20 }}>
        <SelectField variant="owner" label="Город" value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}>
          {CITIES.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </SelectField>

        <div className="field">
          <Label>Маркетплейсы</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {MARKETPLACES.map((m) => (
              <Chip key={m} label={m} variant="owner" active={selectedMarketplaces.has(m)} onClick={() => toggleMarketplace(m)} />
            ))}
          </div>
        </div>

        {selectedCity !== 'Все' && (
          <div>
            <Button variant="owner" tone="outline" onClick={() => setShowMetroSelector(true)}>
              Выбрать метро
            </Button>
            <SelectedMetroChips city={selectedCity} selected={selectedMetro} onRemove={toggleMetroStation} variant="owner" />
          </div>
        )}
      </div>

      {showMetroSelector && selectedCity !== 'Все' && (
        <MetroSelector
          city={selectedCity}
          selected={selectedMetro}
          onToggle={toggleMetroStation}
          onDone={() => setShowMetroSelector(false)}
          onCancel={() => {
            setShowMetroSelector(false);
            setSelectedMetro(new Set());
          }}
          variant="owner"
        />
      )}

      {error && <ErrorText>{error}</ErrorText>}
      {loading && <Loading />}
      {!loading && freelancers.length === 0 && <EmptyState>Фрилансеров не найдено</EmptyState>}

      {!loading &&
        freelancers.map((freelancer) => (
          <Card key={freelancer.id} variant="owner">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                {freelancer.first_name} {freelancer.last_name}
              </div>
              <RatingBadge avgRating={freelancer.avg_rating} count={freelancer.rating_count} />
            </div>
            {freelancer.city && <div className="meta">📍 {freelancer.city}</div>}
            {freelancer.marketplaces?.length > 0 && <div className="meta">📦 {freelancer.marketplaces.join(', ')}</div>}
            {freelancer.preferred_schedule && <div className="meta">📅 {freelancer.preferred_schedule}</div>}
            {freelancer.hourly_rate && <div className="price owner">💰 от {freelancer.hourly_rate} ₽/час</div>}
            {freelancer.metro_stations?.length > 0 && <div className="meta">🚇 {freelancer.metro_stations.join(', ')}</div>}
            {freelancer.about && (
              <div className="meta" style={{ lineHeight: 1.4, marginBottom: 10 }}>
                💬 "{freelancer.about}"
              </div>
            )}
            <Button variant="owner" small onClick={() => handleOfferShift(freelancer)}>
              Предложить смену
            </Button>
          </Card>
        ))}

      {/* Выбор вакансии для предложения */}
      {showOfferModal && selectedFreelancer && (
        <Modal
          title={`Предложить: ${selectedFreelancer.first_name} ${selectedFreelancer.last_name}`}
          onClose={() => {
            setShowOfferModal(false);
            setSelectedFreelancer(null);
          }}
        >
          {ownerVacancies.length === 0 ? (
            <EmptyState>📋 Нет активных вакансий для предложения</EmptyState>
          ) : (
            ownerVacancies.map((vacancy) => (
              <Card
                key={vacancy.id}
                variant="owner"
                onClick={() => handleSelectVacancyForOffer(vacancy.id, selectedFreelancer.id)}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                  📍 {vacancy.address}
                </div>
                <div className="price owner">💰 {vacancy.payment} ₽</div>
              </Card>
            ))
          )}
          <Button
            variant="owner"
            tone="secondary"
            onClick={() => {
              setShowOfferModal(false);
              setSelectedFreelancer(null);
            }}
          >
            Отмена
          </Button>
        </Modal>
      )}
    </Screen>
  );
};
