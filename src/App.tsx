import { useState, Suspense, lazy } from 'react';
import { useAuth } from './contexts/AuthContext';
import { Screen, Loading } from './components/ui';
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
const AdminMainScreen = lazy(() =>
  import('./screens/AdminMainScreen').then((m) => ({ default: m.AdminMainScreen }))
);

type RegistrationStep = 'landing' | 'registration' | 'freelancer_reg' | 'owner_reg';

function App() {
  const { state, error } = useAuth();
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

  if (state === 'administrator') {
    return <Suspense fallback={fullscreenLoader('Загрузка приложения...')}>
      <AdminMainScreen />
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
