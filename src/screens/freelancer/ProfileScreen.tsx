import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { callFunction, ApiError } from '../../lib/api';
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
import { CITIES_LIST } from '../../constants';

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
  const { profile, logout } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(profile?.photo_url || null);
  const [rating, setRating] = useState<number | null>(profile?.rating || null);
  const [reviewCount, setReviewCount] = useState(0);
  const [complaintCount, setComplaintCount] = useState(0);
  const [formData, setFormData] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    city: profile?.city || CITIES_LIST[0],
    about: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.id && import.meta.env.DEV === false) {
      loadRating();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const loadRating = async () => {
    try {
      const data = await callFunction<{
        rating: number;
        review_count: number;
        complaint_count: number;
      }>('get-user-rating', {
        user_id: profile?.id,
      });
      setRating(data.rating);
      setReviewCount(data.review_count);
      setComplaintCount(data.complaint_count);
    } catch (err) {
      console.error('Failed to load rating:', err);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleSave = async () => {
    if (!profile?.telegram_id) return;
    setSaving(true);

    try {
      const data = await callFunction<{ profile: { first_name: string; last_name: string; city: string; status?: string } }>(
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
        about: data.profile.status || '',
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
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Профиль"
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  marginBottom: 12,
                  border: `3px solid var(--accent-${variant})`,
                }}
              />
            ) : (
              <div className={`avatar ${variant}`} style={{ width: 100, height: 100, fontSize: 40, marginBottom: 12, marginLeft: 'auto', marginRight: 'auto' }}>
                {profile.first_name?.[0]?.toUpperCase()}
                {profile.last_name?.[0]?.toUpperCase()}
              </div>
            )}
            <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              {profile.first_name} {profile.last_name}
            </div>
            <div className="subtitle" style={{ textAlign: 'center' }}>
              {roleLabel}
            </div>
          </div>

          <Card variant={variant} large>
            <InfoRow emoji="⭐" label="Рейтинг" value={rating ? `${rating.toFixed(1)}/5` : (profile.rating ? `${profile.rating.toFixed(1)}/5` : '—')} />
            {variant === 'owner' && (
              <>
                <div className="info-divider" />
                <InfoRow emoji="📝" label="Отзывы" value={`${reviewCount} отзыв${reviewCount % 10 === 1 && reviewCount % 100 !== 11 ? '' : 'ов'}`} />
                <div className="info-divider" />
                <InfoRow emoji="⚠️" label="Жалобы" value={`${complaintCount} жалоб${complaintCount % 10 === 1 && complaintCount % 100 !== 11 ? 'а' : (complaintCount % 10 >= 2 && complaintCount % 10 <= 4 && (complaintCount % 100 < 10 || complaintCount % 100 >= 20) ? 'ы' : '')}`} />
              </>
            )}
            <div className="info-divider" />
            <InfoRow emoji="📅" label="Аккаунт создан" value={formatDate(profile.created_at)} />
            <div className="info-divider" />
            <InfoRow emoji="📱" label="Телефон" value={profile.phone || '—'} />
            <div className="info-divider" />
            <InfoRow emoji="📍" label="Город" value={profile.city || '—'} />
            <div className="info-divider" />
            <InfoRow emoji="💬" label="О себе" value={formData.about || '—'} />
          </Card>

          <Button variant={variant} onClick={() => setShowEditModal(true)}>
            ✏️ Редактировать
          </Button>

          <Button variant={variant} tone="secondary" onClick={logout} style={{ marginTop: 8 }}>
            🚪 Выход
          </Button>
        </>
      )}

      {showEditModal && (
        <Modal title="Редактировать профиль" onClose={() => !saving && setShowEditModal(false)}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8, color: 'var(--text-primary)' }}>
              📸 Фотография профиля
            </label>
            {photoPreview && (
              <img
                src={photoPreview}
                alt="Предпросмотр"
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  marginBottom: 8,
                  border: `2px solid var(--accent-${variant})`,
                }}
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                border: '1.5px solid var(--border)',
                fontSize: 12,
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          </div>

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
