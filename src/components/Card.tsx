import type { ReactNode } from 'react';
import { COLORS } from '../constants';

interface CardProps {
  children: ReactNode;
  variant?: 'freelancer' | 'owner' | 'default';
  clickable?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  hoveredState?: boolean;
  style?: React.CSSProperties;
}

export const Card = ({
  children,
  variant = 'default',
  clickable = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  hoveredState = false,
  style,
}: CardProps) => {
  const getBg = () => {
    if (hoveredState) {
      return variant === 'owner' ? COLORS.bgAccent : COLORS.bgSecondary;
    }
    return COLORS.bgPrimary;
  };

  const getBorder = () => {
    if (variant === 'owner') return COLORS.borderOwner;
    if (variant === 'freelancer') return COLORS.borderPrimary;
    return COLORS.borderPrimary;
  };

  return (
    <div
      onClick={clickable ? onClick : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        background: getBg(),
        border: `1.5px solid ${getBorder()}`,
        borderRadius: 16,
        padding: '24px 18px',
        marginBottom: 16,
        cursor: clickable ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        boxShadow: hoveredState
          ? `0 4px 12px ${variant === 'owner' ? 'rgba(37,99,235,0.15)' : 'rgba(109,40,217,0.15)'}`
          : '0 2px 10px rgba(23,21,31,0.04)',
        transform: hoveredState ? 'translateY(-2px)' : 'translateY(0)',
        ...style,
      }}
    >
      {children}
    </div>
  );
};
