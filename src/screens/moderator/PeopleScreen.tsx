import { useState, useEffect, useCallback } from 'react';
import { Screen, TextField, Loading } from '../../components/ui';
import { callFunction } from '../../lib/api';
import { PersonCardScreen } from './PersonCardScreen';

interface Block {
  id: string;
  reason: string;
  expires_at: string | null;
  created_at: string;
}

export interface Person {
  id: string;
  telegram_id: number;
  full_name: string;
  role: string;
  city?: string;
  phone?: string;
  created_at: string;
  is_blocked: boolean;
  block: Block | null;
}

const ROLE_FILTERS = [
  { value: 'all', label: 'Все' },
  { value: 'employee', label: 'Сотрудники' },
  { value: 'owner', label: 'Владельцы' },
] as const;

const ROLE_LABELS: Record<string, string> = {
  employee: 'Сотрудник',
  owner: 'Владелец ПВЗ',
  admin: 'Модератор',
};

export const formatWhen = (value?: string | null) =>
  value ? new Date(value).toLocaleString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export const PeopleScreen = ({ onBack }: { onBack: () => void }) => {
  const [people, setPeople] = useState<Person[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openPersonId, setOpenPersonId] = useState<string | null>(null);

  const load = useCallback(async (role: string, query: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await callFunction<{ people: Person[] }>('moderation-service', {
        action: 'list_people',
        role,
        search: query.trim() || undefined,
      });
      setPeople(data.people || []);
    } catch (err) {
      console.error('Не удалось загрузить людей:', err);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить список');
    } finally {
      setLoading(false);
    }
  }, []);

  // Поиск серверный — ждём паузу в наборе, чтобы не слать запрос на каждый символ.
  useEffect(() => {
    const timer = setTimeout(() => load(roleFilter, search), 350);
    return () => clearTimeout(timer);
  }, [roleFilter, search, load]);

  if (openPersonId) {
    return (
      <PersonCardScreen
        personId={openPersonId}
        onBack={() => {
          setOpenPersonId(null);
          load(roleFilter, search);
        }}
      />
    );
  }

  const chip = {
    padding: '7px 12px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid var(--border-card-owner, #E5E7EB)',
  } as const;

  const blockedCount = people.filter((p) => p.is_blocked).length;

  return (
    <Screen>
      <div className="back-btn owner" onClick={onBack} style={{ cursor: 'pointer', marginBottom: 12 }}>
        ← Назад
      </div>
      <div className="title">👥 Люди</div>
      <div className="subtitle">
        Найдено: {people.length}
        {blockedCount > 0 && ` · заблокировано: ${blockedCount}`}
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '12px 0', flexWrap: 'wrap' }}>
        {ROLE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setRoleFilter(f.value)}
            style={{
              ...chip,
              background: roleFilter === f.value ? 'var(--accent-owner, #2563EB)' : 'white',
              color: roleFilter === f.value ? 'white' : 'var(--text-primary)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <TextField
        placeholder="Имя, город или Telegram ID..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        variant="owner"
        style={{ marginBottom: 16 }}
      />

      {loading && <Loading />}

      {!loading && error && (
        <div style={{ padding: 20, textAlign: 'center', color: '#DC2626', fontSize: 13 }}>
          ❌ {error}
          <div style={{ marginTop: 12 }}>
            <button
              onClick={() => load(roleFilter, search)}
              style={{ ...chip, background: '#FEE2E2', color: '#DC2626', border: 'none' }}
            >
              Повторить
            </button>
          </div>
        </div>
      )}

      {!loading && !error && people.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>
          Никого не найдено
        </div>
      )}

      {!loading &&
        !error &&
        people.map((person) => (
          <div
            key={person.id}
            onClick={() => setOpenPersonId(person.id)}
            style={{
              background: 'var(--bg-card-owner-alt, #F9FAFB)',
              border: `1px solid ${person.is_blocked ? '#FCA5A5' : 'var(--border-card-owner, #E5E7EB)'}`,
              borderRadius: 12,
              padding: 12,
              marginBottom: 10,
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {person.full_name || 'Без имени'}
              </div>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>›</span>
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
              {ROLE_LABELS[person.role] || person.role} · ID {person.telegram_id}
              {person.city ? ` · ${person.city}` : ''}
            </div>

            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 4,
                  fontWeight: 600,
                  background: person.is_blocked ? '#FEE2E2' : '#DCFCE7',
                  color: person.is_blocked ? '#DC2626' : '#16A34A',
                }}
              >
                {person.is_blocked
                  ? person.block?.expires_at
                    ? `🚫 До ${formatWhen(person.block.expires_at)}`
                    : '🚫 Бессрочно'
                  : '✅ Активен'}
              </span>
            </div>

            {person.is_blocked && person.block?.reason && (
              <div style={{ fontSize: 11, color: '#DC2626', marginTop: 6 }}>
                Причина: {person.block.reason}
              </div>
            )}
          </div>
        ))}
    </Screen>
  );
};
