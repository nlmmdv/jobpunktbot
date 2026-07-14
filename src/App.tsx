import { useState, Suspense, lazy } from 'react';
import { useAuth } from './contexts/AuthContext';
import { Loading } from './components/Loading';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { RegistrationScreen } from './screens/RegistrationScreen';

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
  const { state } = useAuth();
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

  // Loading state
  if (state === 'loading') {
    return <Loading fullscreen message="Загрузка..." />;
  }

  // Authenticated state
  if (state === 'freelancer') {
    return (
      <Suspense fallback={<Loading fullscreen message="Загрузка приложения..." />}>
        <FreelancerMainScreen />
      </Suspense>
    );
  }

  if (state === 'owner') {
    return (
      <Suspense fallback={<Loading fullscreen message="Загрузка приложения..." />}>
        <OwnerMainScreen />
      </Suspense>
    );
  }

  // Registration flow for new users
  if (state === 'no_profile') {
    if (regStep === 'landing') {
      return <WelcomeScreen onStart={handleStartRegistration} />;
    }

    if (regStep === 'registration') {
      return <RegistrationScreen onSelectRole={handleSelectRole} onBack={handleBackToLanding} />;
    }

    if (regStep === 'freelancer_reg') {
      return (
        <Suspense fallback={<Loading message="Загрузка..." />}>
          <FreelancerRegScreen onBack={handleBackToRegistration} />
        </Suspense>
      );
    }

    if (regStep === 'owner_reg') {
      return (
        <Suspense fallback={<Loading message="Загрузка..." />}>
          <OwnerRegScreen onBack={handleBackToRegistration} />
        </Suspense>
      );
    }
  }

  return null;
}

export default App;
