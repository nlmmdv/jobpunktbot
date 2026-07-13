import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { FreelancerRegScreen } from './screens/FreelancerRegScreen';
import { OwnerRegScreen } from './screens/OwnerRegScreen';
import { FreelancerMainScreen } from './screens/FreelancerMainScreen';
import { OwnerMainScreen } from './screens/OwnerMainScreen';

type RegistrationStep = 'welcome' | 'freelancer_reg' | 'owner_reg';

function App() {
  const { state } = useAuth();
  const [regStep, setRegStep] = useState<RegistrationStep>('welcome');

  const handleSelectRole = (role: 'freelancer' | 'owner') => {
    if (role === 'freelancer') {
      setRegStep('freelancer_reg');
    } else {
      setRegStep('owner_reg');
    }
  };

  const handleBackToWelcome = () => {
    setRegStep('welcome');
  };

  // Loading state
  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-white text-text-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-freelancer mx-auto mb-4"></div>
          <p className="text-text-hint">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Authenticated state
  if (state === 'freelancer') {
    return <FreelancerMainScreen />;
  }

  if (state === 'owner') {
    return <OwnerMainScreen />;
  }

  // Registration flow for new users
  if (state === 'no_profile') {
    if (regStep === 'welcome') {
      return <WelcomeScreen onSelectRole={handleSelectRole} />;
    }

    if (regStep === 'freelancer_reg') {
      return (
        <FreelancerRegScreen
          onBack={handleBackToWelcome}
        />
      );
    }

    if (regStep === 'owner_reg') {
      return (
        <OwnerRegScreen
          onBack={handleBackToWelcome}
        />
      );
    }
  }

  return null;
}

export default App;
