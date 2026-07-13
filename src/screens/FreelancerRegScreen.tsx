import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { callFunction, ApiError } from '../lib/api';
import { Button, Input, Select, Section, Cell, Title, Text } from '@telegram-apps/telegram-ui';

declare global {
  interface Window {
    Telegram?: any;
  }
}

interface FreelancerRegScreenProps {
  onBack: () => void;
}

const phoneMask = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits === '8') return '+7';

  const limited = digits.slice(0, 11);
  if (limited.startsWith('8')) {
    const rest = limited.slice(1);
    return '+7' + rest;
  }
  if (limited.startsWith('7')) {
    return '+' + limited;
  }
  return '+7' + limited;
};

export const FreelancerRegScreen = ({ onBack }: FreelancerRegScreenProps) => {
  const { refreshAuth } = useAuth();
  const [telegramId, setTelegramId] = useState<number | null>(null);
  const [telegramUsername, setTelegramUsername] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [city, setCity] = useState('Москва');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateForm = (): boolean => {
    if (!firstName.trim()) {
      setError('Укажите имя');
      return false;
    }
    if (!lastName.trim()) {
      setError('Укажите фамилию');
      return false;
    }
    if (!phone.trim()) {
      setError('Укажите телефон');
      return false;
    }
    if (phone.replace(/\D/g, '').length !== 11) {
      setError('Телефон должен содержать 11 цифр');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    if (!telegramId) {
      setError('Ошибка: не удалось получить Telegram ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await callFunction('tg-register', {
        role: 'freelancer',
        phone,
        first_name: firstName,
        last_name: lastName,
        city,
        telegram_username: telegramUsername,
      });

      await refreshAuth();
    } catch (err) {
      console.error('Registration error:', err);
      setError(err instanceof ApiError ? err.message : 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  // Держим актуальный handleRegister в ref, чтобы обработчик MainButton
  // не приходилось переподписывать на каждое нажатие клавиши в форме.
  const handleRegisterRef = useRef(handleRegister);
  useEffect(() => {
    handleRegisterRef.current = handleRegister;
  });

  useEffect(() => {
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (user) {
      setTelegramId(user.id);
      setTelegramUsername(user.username || '');
    } else {
      setTelegramId(123456789);
      setTelegramUsername('testuser');
    }

    try {
      if (window.Telegram?.WebApp?.MainButton) {
        window.Telegram.WebApp.MainButton.setParams({
          text: 'Зарегистрироваться',
          color: '#6D28D9',
          is_active: true,
          is_visible: true,
        });

        const handleClick = () => {
          handleRegisterRef.current();
        };

        window.Telegram.WebApp.MainButton.onClick(handleClick);

        return () => {
          window.Telegram.WebApp.MainButton.offClick(handleClick);
        };
      }
    } catch (err) {
      console.error('MainButton setup error:', err);
    }
  }, []);

  return (
    <div style={{ padding: '16px 0' }}>
      <Button
        size="s"
        onClick={onBack}
        style={{ color: '#6D28D9', marginBottom: '16px', background: 'none', border: 'none' }}
      >
        ← Назад
      </Button>

      <Title level="2" style={{ marginBottom: '4px' }}>Регистрация фрилансера</Title>
      <Text style={{ marginBottom: '20px', color: 'var(--tg-theme-hint-color)' }}>Заполните свои данные</Text>

      <Section>
        <Cell subtitle="Read-only">{telegramId || 'Загрузка...'}</Cell>
        <Cell subtitle="@Username">@{telegramUsername || '—'}</Cell>
      </Section>

      <Section header="Личные данные">
        <Input
          type="tel"
          placeholder="+7"
          value={phone}
          onChange={(e) => {
            setPhone(phoneMask(e.target.value));
            setError('');
          }}
          header="Телефон *"
        />
        <Input
          type="text"
          placeholder="Иван"
          value={firstName}
          onChange={(e) => {
            setFirstName(e.target.value);
            setError('');
          }}
          header="Имя *"
        />
        <Input
          type="text"
          placeholder="Петров"
          value={lastName}
          onChange={(e) => {
            setLastName(e.target.value);
            setError('');
          }}
          header="Фамилия *"
        />
        <Select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          header="Город"
        >
          <option>Москва</option>
          <option>Санкт-Петербург</option>
          <option>Другое</option>
        </Select>
      </Section>

      {error && <Text style={{ color: '#DC2626', marginBottom: '12px', padding: '12px' }}>{error}</Text>}

      <Section>
        <Button
          size="l"
          onClick={handleRegister}
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? 'Регистрация...' : 'Зарегистрироваться'}
        </Button>
      </Section>
    </div>
  );
};
