import clsx from 'clsx';
import type { EnvironmentType } from '../../types';

interface EnvironmentSelectorProps {
  selected: EnvironmentType | 'all';
  onChange: (env: EnvironmentType | 'all') => void;
}

const environments: { value: EnvironmentType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'production', label: 'Production' },
  { value: 'staging', label: 'Staging' },
  { value: 'development', label: 'Development' },
];

export function EnvironmentSelector({ selected, onChange }: EnvironmentSelectorProps) {
  return (
    <div className="inline-flex rounded-lg bg-gray-100 p-1">
      {environments.map((env) => (
        <button
          key={env.value}
          onClick={() => onChange(env.value)}
          className={clsx(
            'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
            selected === env.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          {env.label}
        </button>
      ))}
    </div>
  );
}
