import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { callFunction, ApiError } from '../../lib/api';
import { RatingBadge } from '../../components/RatingBadge';
import {
  Screen,
  ScreenHeader,
  Card,
  Button,
  TextField,
  TextArea,
  SelectField,
  Modal,
  type Variant,
} from '../../components/ui';
import { CITIES_LIST, TEXT_LIMITS } from '../../constants';

interface ProfileScreenProps {
  onBack: () => void;
  variant?: Variant;
}

const InfoRow = ({ emoji, label, value }: { emoji: string; label: string; value: string }) => (
  <div className="info-row">
    <span className="emoji">{emoji}</span>
    <div>
      <div className="info-label">{label}</div>
      <div className="info-value">{value}</div>
    </div>
  </div>
);

export const ProfileScreen = ({ onBack, variant = 'freelancer' }: ProfileScreenProps) => {
  const { profile, applyProfile } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    city: profile?.city || CITIES_LIST[0],
    about: profile?.about || '',
  });
  const [saving, setSaving] = useState(false);
  const [rating, setRating] = useState<{ avg_rating: number | null; rating_count: number }>({
    avg_rating: null,
    rating_count: 0,
  });

  useEffect(() => {
    if (!profile?.telegram_id) return;
    callFunction<{ avg_rating: number | null; rating_count: number }>('get-rating', {
      telegramId: profile.telegram_id,
    })
      .then((r) => setRating({ avg_rating: r.avg_rating, rating_count: r.rating_count }))
      .catch((err) => console.error('Failed to load rating:', err));
  }, [profile?.telegram_id]);

  const handleSave = async () => {
    if (!profile?.telegram_id) return;
    setSaving(true);

    try {
      const data = await callFunction<{ profile: { first_name: string; last_name: string; city: string; about?: string } }>(
        'update-profile',
        {
          telegramId: profile.telegram_id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          city: formData.city,
          about: formData.about,
        }
      );
      setShowEditModal(false);
      setFormData({
        first_name: data.profile.first_name,
        last_name: data.profile.last_name,
        city: data.profile.city,
        about: data.profile.about || '',
      });
      // Прокидываем изменения в контекст, иначе имя/город в шапке остаются
      // старыми — они читаются из profile, а не из локального formData.
      applyProfile({
        ...profile,
        first_name: data.profile.first_name,
        last_name: data.profile.last_name,
        city: data.profile.city,
        about: data.profile.about,
      });
    } catch (err) {
      console.error('Failed to save profile:', err);
      alert(err instanceof ApiError ? err.message : 'Ошибка при сохранении профиля');
    } finally {
      setSaving(false);
    }
  };

  // Экран открывают обе роли, поэтому подпись берём из variant,
  // а не пишем «Фрилансер» всем подряд.
  const roleLabel = variant === 'owner' ? 'Владелец ПВЗ' : 'Фрилансер';

  return (
    <Screen>
      <ScreenHeader title="Профиль" variant={variant} onBack={onBack} />

      {profile && (
        <>
          <div className={`avatar ${variant}`}>
            {profile.first_name?.[0]?.toUpperCase()}
            {profile.last_name?.[0]?.toUpperCase()}
          </div>
          <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            {profile.first_name} {profile.last_name}
          </div>
          <div style={{ textAlign: 'center', marginBottom: 4 }}>
            <RatingBadge avgRating={rating.avg_rating} count={rating.rating_count} />
          </div>
          <div className="subtitle" style={{ textAlign: 'center' }}>
            {roleLabel}
          </div>

          <Card variant={variant} large>
            <InfoRow emoji="📱" label="Телефон" value={profile.phone || '—'} />
            <div className="info-divider" />
            <InfoRow emoji="📍" label="Город" value={profile.city || '—'} />
            <div className="info-divider" />
            <InfoRow emoji="💬" label="О себе" value={formData.about || '—'} />
          </Card>

          <Button variant={variant} onClick={() => setShowEditModal(true)}>
            ✏️ Редактировать
          </Button>
        </>
      )}

      {showEditModal && (
        <Modal title="Редактировать профиль" onClose={() => !saving && setShowEditModal(false)}>
          <TextField
            variant={variant}
            label="Имя"
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
          />
          <TextField
            variant={variant}
            label="Фамилия"
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
          />
          <TextField variant={variant} label="Телефон" value={profile?.phone || ''} disabled />
          <SelectField
            variant={variant}
            label="Город"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          >
            {CITIES_LIST.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectField>
          <TextArea
            variant={variant}
            label="О себе"
            maxLength={TEXT_LIMITS.ABOUT}
            value={formData.about}
            onChange={(e) => setFormData({ ...formData, about: e.target.value })}
            placeholder="Расскажите о своем опыте..."
          />

          <Button variant={variant} onClick={handleSave} disabled={saving} style={{ marginTop: 4, marginBottom: 8 }}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
          <Button variant={variant} tone="secondary" onClick={() => setShowEditModal(false)} disabled={saving}>
            Отмена
          </Button>
        </Modal>
      )}
    </Screen>
  );
};
