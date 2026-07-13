import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { callFunction, ApiError } from '../../lib/api';

export const ProfileScreen = () => {
  const { profile } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    city: profile?.city || 'Москва',
    about: '',
  });
  const [saving, setSaving] = useState(false);

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

  return (
    <div style={{ padding: '20px 18px', maxWidth: 400, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#17151F', marginBottom: 16 }}>Профиль</div>

      {profile && (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #6D28D9, #5B21B6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: '#fff', fontWeight: 700 }}>
              {profile.first_name?.[0]?.toUpperCase()}{profile.last_name?.[0]?.toUpperCase()}
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 700, color: '#17151F', marginBottom: 4 }}>
            {profile.first_name} {profile.last_name}
          </div>
          <div style={{ textAlign: 'center', fontSize: 13, color: '#8B8798', marginBottom: 20 }}>Фрилансер</div>

          <div style={{ background: '#F7F6FB', border: '1px solid #ECEAF4', borderRadius: 14, padding: 16, marginBottom: 16, boxShadow: '0 2px 10px rgba(23,21,31,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 16 }}>📱</span>
              <div>
                <div style={{ fontSize: 11, color: '#8B8798' }}>Телефон</div>
                <div style={{ fontSize: 14, color: '#17151F', fontWeight: 600 }}>{profile.phone || '—'}</div>
              </div>
            </div>
            <div style={{ height: 1, background: '#ECEAF4', marginBottom: 12 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 16 }}>📍</span>
              <div>
                <div style={{ fontSize: 11, color: '#8B8798' }}>Город</div>
                <div style={{ fontSize: 14, color: '#17151F', fontWeight: 600 }}>{profile.city}</div>
              </div>
            </div>
            <div style={{ height: 1, background: '#ECEAF4', marginBottom: 12 }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: 16 }}>💬</span>
              <div>
                <div style={{ fontSize: 11, color: '#8B8798' }}>О себе</div>
                <div style={{ fontSize: 14, color: '#17151F' }}>{formData.about || '—'}</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowEditModal(true)}
            style={{ width: '100%', padding: 14, border: 'none', borderRadius: 14, background: '#6D28D9', color: '#fff', fontSize: 14, fontWeight: 700, boxShadow: '0 8px 20px rgba(109,40,217,0.25)', cursor: 'pointer' }}
          >
            ✏️ Редактировать
          </button>
        </>
      )}

      {showEditModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(23,21,31,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 18px 30px', width: '100%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#17151F', marginBottom: 16 }}>Редактировать профиль</div>

            <div style={{ fontSize: 12, fontWeight: 600, color: '#6E6A7C', marginBottom: 6 }}>Имя</div>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: '#F7F6FB', border: '1.5px solid #E7E4F1', color: '#17151F', fontSize: 14, marginBottom: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />

            <div style={{ fontSize: 12, fontWeight: 600, color: '#6E6A7C', marginBottom: 6 }}>Фамилия</div>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: '#F7F6FB', border: '1.5px solid #E7E4F1', color: '#17151F', fontSize: 14, marginBottom: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />

            <div style={{ fontSize: 12, fontWeight: 600, color: '#6E6A7C', marginBottom: 6 }}>Телефон</div>
            <input
              type="text"
              value={profile?.phone || ''}
              disabled
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: '#EDEAF4', border: '1.5px solid #E7E4F1', color: '#8B8798', fontSize: 14, marginBottom: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', cursor: 'not-allowed' }}
            />

            <div style={{ fontSize: 12, fontWeight: 600, color: '#6E6A7C', marginBottom: 6 }}>Город</div>
            <select
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: '#F7F6FB', border: '1.5px solid #E7E4F1', color: '#17151F', fontSize: 14, marginBottom: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
            >
              <option value="Москва">Москва</option>
              <option value="Санкт-Петербург">Санкт-Петербург</option>
              <option value="Другое">Другое</option>
            </select>

            <div style={{ fontSize: 12, fontWeight: 600, color: '#6E6A7C', marginBottom: 6 }}>О себе</div>
            <textarea
              value={formData.about}
              onChange={(e) => setFormData({ ...formData, about: e.target.value })}
              placeholder="Расскажите о своем опыте..."
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: '#F7F6FB', border: '1.5px solid #E7E4F1', color: '#17151F', fontSize: 14, marginBottom: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'none' }}
              rows={4}
            />

            <button
              onClick={handleSave}
              disabled={saving}
              style={{ width: '100%', padding: 14, border: 'none', borderRadius: 14, background: saving ? '#9F73E6' : '#6D28D9', color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 8, boxShadow: '0 8px 20px rgba(109,40,217,0.25)', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button
              onClick={() => setShowEditModal(false)}
              disabled={saving}
              style={{ width: '100%', padding: 14, border: 'none', borderRadius: 14, background: '#F7F6FB', color: '#8B8798', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1 }}
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
