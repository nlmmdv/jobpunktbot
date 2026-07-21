import { useState, Suspense, lazy } from 'react';
import { useAuth } from './contexts/AuthContext';
import { Screen, Loading, Button } from './components/ui';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { RoleSelectScreen } from './screens/RoleSelectScreen';

// Lazy load registration screens
const FreelancerRegScreen = lazy(() =>
  import('./screens/FreelancerRegScreen').then((m) => ({ default: m.FreelancerRegScreen }))
);
const OwnerRegScreen = lazy(() =>
  import('./screens/OwnerRegScreen').then((m) => ({ default: m.OwnerRegScreen }))
);

// Lazy load main screens
const FreelancerMainScreen = lazy(() =>
  import('./screens/FreelancerMainScreen').then((m) => ({ default: m.FreelancerMainScreen }))
);
const OwnerMainScreen = lazy(() =>
  import('./screens/OwnerMainScreen').then((m) => ({ default: m.OwnerMainScreen }))
);

type RegistrationStep = 'landing' | 'registration' | 'freelancer_reg' | 'owner_reg';

function App() {
  const { state, error, refreshAuth } = useAuth();
  const [regStep, setRegStep] = useState<RegistrationStep>('landing');

  const handleStartRegistration = () => {
    setRegStep('registration');
  };

  const handleSelectRole = (role: 'freelancer' | 'owner') => {
    if (role === 'freelancer') {
      setRegStep('freelancer_reg');
    } else {
      setRegStep('owner_reg');
    }
  };

  const handleBackToRegistration = () => {
    setRegStep('registration');
  };

  const handleBackToLanding = () => {
    setRegStep('landing');
  };

  const fullscreenLoader = (text: string) => (
    <Screen center>
      <Loading text={text} />
    </Screen>
  );

  // Loading state
  if (state === 'loading') {
    return fullscreenLoader('Загрузка...');
  }

  // Сервер не ответил — существующего пользователя не гоним на регистрацию.
  if (state === 'error') {
    // Протухший initData обновляется только переоткрытием мини-аппа, поэтому
    // «Повторить» тут ничего не даст — не показываем кнопку, которая не работает.
    // Только про устаревшую сессию — «неверная подпись» сюда попадать не должна,
    // это реальная поломка, и прятать её за «переоткройте приложение» нельзя.
    const needsReopen = /устарел/i.test(error || '');

    return (
      <Screen center>
        <div style={{ textAlign: 'center', padding: '0 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{needsReopen ? '🔄' : '📡'}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            {needsReopen ? 'Сессия устарела' : 'Не удалось войти'}
          </div>
          <div className="subtitle" style={{ marginBottom: 20 }}>
            {needsReopen
              ? 'Закройте приложение и откройте его заново из бота — это обновит вход.'
              : error || 'Проверьте соединение и попробуйте ещё раз.'}
          </div>
          {!needsReopen && (
            <Button style={{ maxWidth: 240 }} onClick={() => refreshAuth()}>
              Повторить
            </Button>
          )}
        </div>
      </Screen>
    );
  }

  // Authenticated state
  if (state === 'freelancer') {
    return <Suspense fallback={fullscreenLoader('Загрузка приложения...')}>
      <FreelancerMainScreen />
    </Suspense>;
  }

  if (state === 'owner') {
    return <Suspense fallback={fullscreenLoader('Загрузка приложения...')}>
      <OwnerMainScreen />
    </Suspense>;
  }

  // Registration flow for new users
  if (state === 'no_profile') {
    if (regStep === 'landing') {
      return <WelcomeScreen onStart={handleStartRegistration} authError={error} />;
    }

    if (regStep === 'registration') {
      return <RoleSelectScreen onSelectRole={handleSelectRole} onBack={handleBackToLanding} />;
    }

    if (regStep === 'freelancer_reg') {
      return (
        <Suspense fallback={<Loading text="Загрузка..." />}>
          <FreelancerRegScreen onBack={handleBackToRegistration} />
        </Suspense>
      );
    }

    if (regStep === 'owner_reg') {
      return (
        <Suspense fallback={<Loading text="Загрузка..." />}>
          <OwnerRegScreen onBack={handleBackToRegistration} />
        </Suspense>
      );
    }
  }

  return <WelcomeScreen onStart={handleStartRegistration} authError={error} />;
}

export default App;
