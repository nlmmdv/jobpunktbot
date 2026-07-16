import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { callFunction, ApiError } from '../lib/api';
import { Screen, ScreenHeader, Card, Button, TextField, SelectField, ErrorText } from '../components/ui';
import { phoneMask } from '../lib/utils';
import { CITIES_LIST } from '../constants';

declare global {
  interface Window {
    Telegram?: any;
  }
}

interface OwnerRegScreenProps {
  onBack: () => void;
}

export const OwnerRegScreen = ({ onBack }: OwnerRegScreenProps) => {
  const { refreshAuth } = useAuth();
  const [telegramId, setTelegramId] = useState<number | null>(null);
  const [telegramUsername, setTelegramUsername] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [city, setCity] = useState(CITIES_LIST[0]);
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
    if (!organizationName.trim()) {
      setError('Укажите наименование организации');
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
        role: 'owner',
        phone,
        first_name: firstName,
        last_name: lastName,
        organization_name: organizationName,
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

  useEffect(() => {
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (user) {
      setTelegramId(user.id);
      setTelegramUsername(user.username || '');
    } else {
      setTelegramId(123456789);
      setTelegramUsername('testuser');
    }

    // Кнопку «Зарегистрироваться» рисуем на странице (см. ниже), нативный
    // MainButton не используем, чтобы кнопка не дублировалась внутри Telegram.
    try {
      window.Telegram?.WebApp?.MainButton?.hide();
    } catch (err) {
      console.error('MainButton hide error:', err);
    }
  }, []);

  return (
    <Screen>
      <ScreenHeader
        title="Регистрация владельца ПВЗ"
        subtitle="Заполните данные организации"
        variant="owner"
        onBack={onBack}
      />

      <Card variant="owner" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{telegramId || 'Загрузка...'}</div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Telegram ID · Read-only</div>
        <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>@{telegramUsername || '—'}</div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Username</div>
      </Card>

      <TextField
        label="Телефон *"
        variant="owner"
        type="tel"
        placeholder="+7"
        value={phone}
        onChange={(e) => {
          setPhone(phoneMask(e.target.value));
          setError('');
        }}
      />
      <TextField
        label="Имя *"
        variant="owner"
        placeholder="Иван"
        value={firstName}
        onChange={(e) => {
          setFirstName(e.target.value);
          setError('');
        }}
      />
      <TextField
        label="Фамилия *"
        variant="owner"
        placeholder="Петров"
        value={lastName}
        onChange={(e) => {
          setLastName(e.target.value);
          setError('');
        }}
      />
      <TextField
        label="Наименование организации *"
        variant="owner"
        placeholder="ИП Иванов"
        value={organizationName}
        onChange={(e) => {
          setOrganizationName(e.target.value);
          setError('');
        }}
      />
      <SelectField label="Город" variant="owner" value={city} onChange={(e) => setCity(e.target.value)}>
        {CITIES_LIST.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </SelectField>

      {error && <ErrorText>{error}</ErrorText>}

      <Button variant="owner" onClick={handleRegister} disabled={loading} style={{ marginTop: 10 }}>
        {loading ? 'Регистрация...' : 'Зарегистрироваться'}
      </Button>
    </Screen>
  );
};
