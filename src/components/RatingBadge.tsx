interface RatingBadgeProps {
  avgRating: number | null;
  count: number;
}

/** Звёздный рейтинг пользователя. Пустой — «Нет оценок». */
export const RatingBadge = ({ avgRating, count }: RatingBadgeProps) => {
  if (!avgRating || count === 0) {
    return <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Нет оценок</span>;
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
      <span style={{ fontSize: 14, color: '#F59E0B' }}>★</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{avgRating.toFixed(1)}</span>
      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>({count})</span>
    </span>
  );
};
