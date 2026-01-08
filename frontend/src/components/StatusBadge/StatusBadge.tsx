import clsx from 'clsx';
import type { HealthStatus } from '../../types';

interface StatusBadgeProps {
  status: HealthStatus | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const statusConfig = {
  healthy: {
    label: 'Healthy',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-800',
    dotColor: 'bg-emerald-500',
  },
  degraded: {
    label: 'Degraded',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-800',
    dotColor: 'bg-amber-500',
  },
  down: {
    label: 'Down',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    dotColor: 'bg-red-500',
  },
  unknown: {
    label: 'Unknown',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    dotColor: 'bg-gray-500',
  },
};

const sizeConfig = {
  sm: {
    badge: 'px-2 py-0.5 text-xs',
    dot: 'h-1.5 w-1.5',
  },
  md: {
    badge: 'px-2.5 py-1 text-sm',
    dot: 'h-2 w-2',
  },
  lg: {
    badge: 'px-3 py-1.5 text-base',
    dot: 'h-2.5 w-2.5',
  },
};

export function StatusBadge({ status, size = 'md', showLabel = true }: StatusBadgeProps) {
  const config = statusConfig[status || 'unknown'];
  const sizes = sizeConfig[size];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        config.bgColor,
        config.textColor,
        sizes.badge
      )}
    >
      <span className={clsx('rounded-full animate-pulse', config.dotColor, sizes.dot)} />
      {showLabel && config.label}
    </span>
  );
}
