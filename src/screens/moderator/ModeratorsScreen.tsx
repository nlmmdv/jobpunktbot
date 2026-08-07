import { useState, useEffect, useCallback } from 'react';
import { Screen, TextField, Loading } from '../../components/ui';
import { callFunction } from '../../lib/api';
import { pluralWith } from '../../lib/utils';

interface ModeratorRow {
  id: string;
  telegram_id: number;
  full_name: string;
  city?: string;
  granted_at: string | null;
  granted_by_name: string | null;
  is_root: boolean;
  is_self: boolean;
  can_revoke: boolean;
  revoke_hint: string | null;
}

interface Candidate {
  id: string;
  telegram_id: number;
  full_name: string;
  role: string;
  city?: string;
  is_blocked: boolean;
}

const when = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

/**
 * Назначение модераторов. Назначать может любой модератор, снимать — не любого:
 * запрещено разжаловать того, кто выше по цепочке назначений. Право на снятие
 * определяет сервер (can_revoke), здесь только показываем причину отказа.
 */
export const ModeratorsScreen = ({ onBack }: { onBack: () => void }) => {
  const [moderators, setModerators] = useState<ModeratorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callFunction<{ moderators: ModeratorRow[] }>('moderation-service', {
        action: 'list_moderators',
      });
      setModerators(data.moderators || []);
    } catch (err) {
      console.error('Не удалось загрузить модераторов:', err);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить список');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Кандидатов ищем только по явному запросу: показывать всю базу незачем.
  useEffect(() => {
    if (search.trim().length < 2) {
      setCandidates([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await callFunction<{ people: Candidate[] }>('moderation-service', {
          action: 'list_people',
          role: 'all',
          search: search.trim(),
          limit: 20,
        });
        setCandidates((data.people || []).filter((p) => p.role !== 'admin'));
      } catch (err) {
        console.error('Поиск не удался:', err);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const grant = async (person: Candidate) => {
    const roleWord = person.role === 'owner' ? 'владельца ПВЗ' : 'сотрудника';
    if (
      !confirm(
        `Назначить ${person.full_name} модератором?\n\n` +
          `Сейчас это профиль ${roleWord} — после назначения он потеряет свой кабинет ` +
          `и будет видеть только панель модератора.`
      )
    )
      return;

    setBusyId(person.id);
    try {
      await callFunction('moderation-service', { action: 'grant_moderator', subjectId: person.id });
      setSearch('');
      setCandidates([]);
      await load();
    } catch (err) {
      alert(`❌ ${err instanceof Error ? err.message : 'Не удалось назначить'}`);
    } finally {
      setBusyId(null);
    }
  };

  const revoke = async (mod: ModeratorRow) => {
    if (!confirm(`Снять права модератора с ${mod.full_name}?`)) return;

    setBusyId(mod.id);
    try {
      await callFunction('moderation-service', { action: 'revoke_moderator', subjectId: mod.id });
      await load();
    } catch (err) {
      alert(`❌ ${err instanceof Error ? err.message : 'Не удалось снять права'}`);
    } finally {
      setBusyId(null);
    }
  };

  const btn = {
    padding: '7px 12px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
  } as const;

  const card = {
    background: 'var(--bg-card-owner-alt, #F9FAFB)',
    border: '1px solid var(--border-card-owner, #E5E7EB)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  } as const;

  return (
    <Screen>
      <div className="back-btn owner" onClick={onBack} style={{ cursor: 'pointer', marginBottom: 12 }}>
        ← Назад
      </div>
      <div className="title">🛡️ Модераторы</div>
      <div className="subtitle">{pluralWith(moderators.length, ['человек', 'человека', 'человек'])}</div>

      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '16px 0 8px' }}>
        Назначить нового
      </div>
      <TextField
        placeholder="Имя или Telegram ID, минимум 2 символа..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        variant="owner"
      />

      {searching && <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: 8 }}>Ищем...</div>}

      {!searching && search.trim().length >= 2 && candidates.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: 8 }}>
          Никого не найдено
        </div>
      )}

      {candidates.map((person) => (
        <div key={person.id} style={{ ...card, marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                {person.full_name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {person.role === 'owner' ? 'Владелец ПВЗ' : 'Сотрудник'} · ID {person.telegram_id}
              </div>
            </div>
            <button
              onClick={() => grant(person)}
              disabled={busyId === person.id || person.is_blocked}
              style={{
                ...btn,
                background: person.is_blocked ? '#F3F4F6' : 'var(--accent-owner, #2563EB)',
                color: person.is_blocked ? '#9CA3AF' : 'white',
              }}
            >
              {person.is_blocked ? 'Заблокирован' : 'Назначить'}
            </button>
          </div>
        </div>
      ))}

      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '24px 0 8px' }}>
        Действующие модераторы
      </div>

      {loading && <Loading />}

      {!loading && error && (
        <div style={{ padding: 20, textAlign: 'center', color: '#DC2626', fontSize: 13 }}>❌ {error}</div>
      )}

      {!loading &&
        !error &&
        moderators.map((mod) => (
          <div key={mod.id} style={{ ...card, opacity: busyId === mod.id ? 0.6 : 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              {mod.full_name}
              {mod.is_self && (
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}> · это вы</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
              ID {mod.telegram_id}
              {mod.city ? ` · ${mod.city}` : ''}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
              {mod.is_root
                ? 'Назначен через базу'
                : `Назначил: ${mod.granted_by_name || 'неизвестно'}${
                    when(mod.granted_at) ? ` · ${when(mod.granted_at)}` : ''
                  }`}
            </div>

            <div style={{ marginTop: 10 }}>
              {mod.can_revoke ? (
                <button
                  onClick={() => revoke(mod)}
                  disabled={busyId === mod.id}
                  style={{ ...btn, background: '#FEE2E2', color: '#DC2626' }}
                >
                  Снять права
                </button>
              ) : (
                <span
                  style={{
                    fontSize: 11,
                    padding: '4px 8px',
                    borderRadius: 4,
                    background: '#F3F4F6',
                    color: '#6B7280',
                    fontWeight: 600,
                  }}
                >
                  🔒 {mod.revoke_hint}
                </span>
              )}
            </div>
          </div>
        ))}
    </Screen>
  );
};
