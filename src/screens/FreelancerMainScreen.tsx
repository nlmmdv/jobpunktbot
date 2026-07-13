import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FreelancerShiftsScreen } from './freelancer/FreelancerShiftsScreen';
import { VacanciesScreen } from './freelancer/VacanciesScreen';
import { AvailableShiftsScreen } from './freelancer/AvailableShiftsScreen';
import { ProfileScreen } from './freelancer/ProfileScreen';
import { BackButton } from '../components/MainMenuLayout';

type Screen = 'menu' | 'shifts' | 'vacancies' | 'available' | 'profile';

export const FreelancerMainScreen = () => {
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
            onClick={() => setScreen('shifts')}
            style={{
              aspectRatio: '1',
              borderRadius: 20,
              background: '#F7F6FB',
              border: '1px solid #ECEAF4',
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
            <span style={{ fontSize: 12, fontWeight: 600, color: '#17151F' }}>Подработка</span>
          </div>

          <div
            onClick={() => setScreen('vacancies')}
            style={{
              aspectRatio: '1',
              borderRadius: 20,
              background: '#F7F6FB',
              border: '1px solid #ECEAF4',
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
            <span style={{ fontSize: 30 }}>💼</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#17151F' }}>Вакансии</span>
          </div>

          <div
            onClick={() => setScreen('available')}
            style={{
              aspectRatio: '1',
              borderRadius: 20,
              background: '#F7F6FB',
              border: '1px solid #ECEAF4',
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
            <span style={{ fontSize: 30 }}>⏰</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#17151F' }}>Замены</span>
          </div>

          <div
            onClick={() => setScreen('profile')}
            style={{
              aspectRatio: '1',
              borderRadius: 20,
              background: '#F7F6FB',
              border: '1px solid #ECEAF4',
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

  if (screen === 'shifts') {
    return (
      <div className="min-h-screen bg-white text-text-primary p-4">
        <BackButton onClick={handleBack} variant="freelancer" />
        <FreelancerShiftsScreen />
      </div>
    );
  }

  if (screen === 'vacancies') {
    return (
      <div className="min-h-screen bg-white text-text-primary p-4 pb-24">
        <BackButton onClick={handleBack} variant="freelancer" />
        <VacanciesScreen />
      </div>
    );
  }

  if (screen === 'available') {
    return (
      <div className="min-h-screen bg-white text-text-primary p-4 pb-24">
        <BackButton onClick={handleBack} variant="freelancer" />
        <AvailableShiftsScreen />
      </div>
    );
  }

  if (screen === 'profile') {
    return (
      <div className="min-h-screen bg-white text-text-primary p-4">
        <BackButton onClick={handleBack} variant="freelancer" />
        <ProfileScreen />
      </div>
    );
  }

  return null;
};
