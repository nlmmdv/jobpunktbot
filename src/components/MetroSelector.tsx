import { useState } from 'react';
import { Modal, Button, type Variant } from './ui';
import { metroMoscow } from '../data/metro-moscow';
import { metroSPb } from '../data/metro-spb';

interface MetroStation {
  id: string;
  name: string;
  lineColor: string;
}

export const metroListForCity = (city?: string): MetroStation[] =>
  city === 'Санкт-Петербург' ? metroSPb : metroMoscow;

export const metroStationName = (city: string | undefined, id: string): string =>
  metroListForCity(city).find((s) => s.id === id)?.name || '';

/**
 * Общий выбор станций метро (нижний лист).
 * Раньше был скопирован в 5 экранах — теперь единый компонент.
 */
export const MetroSelector = ({
  city,
  selected,
  onToggle,
  onDone,
  onCancel,
  variant,
}: {
  city?: string;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onDone: () => void;
  onCancel: () => void;
  variant: Variant;
}) => {
  const [search, setSearch] = useState('');
  const stations = metroListForCity(city).filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal title="Выбор метро" onClose={onCancel}>
      <input
        type="text"
        placeholder="Поиск станции..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={`input${variant === 'owner' ? ' owner' : ''}`}
      />
      <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 12 }}>
        {stations.map((station) => (
          <label
            key={station.id}
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '12px 8px', borderRadius: 8 }}
          >
            <input
              type="checkbox"
              checked={selected.has(station.id)}
              onChange={() => onToggle(station.id)}
              style={{ width: 18, height: 18, cursor: 'pointer', accentColor: variant === 'owner' ? '#2563EB' : '#6D28D9' }}
            />
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: station.lineColor }} />
            <span style={{ fontSize: 13, color: '#17151F' }}>{station.name}</span>
          </label>
        ))}
      </div>
      <Button variant={variant} onClick={onDone} style={{ marginBottom: 8 }}>Готово</Button>
      <Button variant={variant} tone="secondary" onClick={onCancel}>Отмена</Button>
    </Modal>
  );
};

/**
 * Строка выбранных станций-чипов (с крестиком удаления).
 */
export const SelectedMetroChips = ({
  city,
  selected,
  onRemove,
  variant,
}: {
  city?: string;
  selected: Set<string>;
  onRemove: (id: string) => void;
  variant: Variant;
}) => {
  if (selected.size === 0) return null;
  const bg = variant === 'owner' ? '#2563EB' : '#6D28D9';
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
      {Array.from(selected).map((id) => (
        <span
          key={id}
          style={{ padding: '6px 10px', borderRadius: 999, background: bg, color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          {metroStationName(city, id)}
          <button
            onClick={() => onRemove(id)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, fontSize: 12 }}
          >
            ✕
          </button>
        </span>
      ))}
    </div>
  );
};
