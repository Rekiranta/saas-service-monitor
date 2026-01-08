import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Clock } from 'lucide-react';
import type { Service } from '../../types';
import { StatusBadge } from '../StatusBadge';

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const getOverallStatus = () => {
    if (service.environments.length === 0) return 'unknown';

    const statuses = service.environments.map((env) => env.current_status);
    if (statuses.includes('down')) return 'down';
    if (statuses.includes('degraded')) return 'degraded';
    if (statuses.every((s) => s === 'healthy')) return 'healthy';
    return 'unknown';
  };

  const overallStatus = getOverallStatus();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <Link
            to={`/services/${service.id}`}
            className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
          >
            {service.name}
          </Link>
          {service.description && (
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">
              {service.description}
            </p>
          )}
        </div>
        <StatusBadge status={overallStatus} />
      </div>

      {service.url && (
        <a
          href={service.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {service.url}
        </a>
      )}

      {/* Environments */}
      <div className="mt-4 space-y-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Environments
        </p>
        <div className="grid grid-cols-3 gap-2">
          {service.environments.map((env) => (
            <div
              key={env.id}
              className="flex flex-col items-center p-2 rounded-lg bg-gray-50"
            >
              <StatusBadge status={env.current_status} size="sm" showLabel={false} />
              <span className="mt-1 text-xs font-medium text-gray-700 capitalize">
                {env.name}
              </span>
              {env.last_check && (
                <span className="mt-0.5 text-xs text-gray-400 flex items-center gap-0.5">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(env.last_check), { addSuffix: true })}
                </span>
              )}
            </div>
          ))}
          {service.environments.length === 0 && (
            <p className="col-span-3 text-sm text-gray-400 text-center py-2">
              No environments configured
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
