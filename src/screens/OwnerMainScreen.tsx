import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SearchEmployeesScreen } from './owner/SearchEmployeesScreen';
import { MyVacanciesScreen } from './owner/MyVacanciesScreen';
import { ProfileScreen } from './freelancer/ProfileScreen';
import { BackButton } from '../components/MainMenuLayout';

type Screen = 'menu' | 'search' | 'vacancies' | 'profile';

export const OwnerMainScreen = () => {
  const { profile } = useAuth();
  const [screen, setScreen] = useState<Screen>('menu');

  const handleBack = () => setScreen('menu');

  if (screen === 'menu') {
    return (
      <div style={{ padding: '20px 18px', maxWidth: 400, margin: '0 auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#17151F', marginBottom: 2 }}>ПроПункт</h1>
        <p style={{ fontSize: 13, color: '#8B8798', marginBottom: 22 }}>Привет, {profile?.first_name}!</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div
            onClick={() => setScreen('search')}
            style={{
              aspectRatio: '1',
              borderRadius: 20,
              background: '#F0F5FE',
              border: '1px solid #E1EBFB',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 2px 10px rgba(23,21,31,0.04)',
              cursor: 'pointer',
              transition: 'transform 0.2s'
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = '')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
          >
            <span style={{ fontSize: 30 }}>🔍</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#17151F' }}>Поиск сотрудников</span>
          </div>

          <div
            onClick={() => setScreen('vacancies')}
            style={{
              aspectRatio: '1',
              borderRadius: 20,
              background: '#F0F5FE',
              border: '1px solid #E1EBFB',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 2px 10px rgba(23,21,31,0.04)',
              cursor: 'pointer',
              transition: 'transform 0.2s'
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = '')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
          >
            <span style={{ fontSize: 30 }}>📋</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#17151F' }}>Мои вакансии</span>
          </div>

          <div
            onClick={() => setScreen('profile')}
            style={{
              gridColumn: 'span 2',
              aspectRatio: '2.4',
              borderRadius: 20,
              background: '#F0F5FE',
              border: '1px solid #E1EBFB',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 2px 10px rgba(23,21,31,0.04)',
              cursor: 'pointer',
              transition: 'transform 0.2s'
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = '')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
          >
            <span style={{ fontSize: 30 }}>👤</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#17151F' }}>Профиль</span>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'search') {
    return (
      <div className="min-h-screen bg-white text-text-primary p-4 pb-24">
        <BackButton onClick={handleBack} variant="owner" />
        <SearchEmployeesScreen />
      </div>
    );
  }

  if (screen === 'vacancies') {
    return (
      <div className="min-h-screen bg-white text-text-primary p-4 pb-24">
        <BackButton onClick={handleBack} variant="owner" />
        <MyVacanciesScreen />
      </div>
    );
  }

  if (screen === 'profile') {
    return (
      <div className="min-h-screen bg-white text-text-primary p-4">
        <BackButton onClick={handleBack} variant="owner" />
        <ProfileScreen />
      </div>
    );
  }

  return null;
};
