import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useServices, useTeams } from '../../hooks/useServices';
import { useWebSocket } from '../../hooks/useWebSocket';
import { ServiceCard } from '../ServiceCard';
import type { HealthStatus } from '../../types';

export function Dashboard() {
  const { services, isLoading, error, refetch, updateServiceStatus } = useServices();
  const { teams } = useTeams();
  const [selectedTeam, setSelectedTeam] = useState<string>('');

  const handleStatusUpdate = useCallback(
    (
      serviceId: string,
      environmentId: string,
      status: HealthStatus,
      responseTimeMs: number,
      timestamp: string
    ) => {
      updateServiceStatus(serviceId, environmentId, status, responseTimeMs, timestamp);
    },
    [updateServiceStatus]
  );

  const { isConnected, subscribeToService } = useWebSocket({
    onStatusUpdate: handleStatusUpdate,
  });

  // Subscribe to all services when they load
  useEffect(() => {
    services.forEach((service) => {
      subscribeToService(service.id);
    });
  }, [services, subscribeToService]);

  // Calculate stats
  const stats = {
    total: services.length,
    healthy: services.filter((s) =>
      s.environments.every((e) => e.current_status === 'healthy')
    ).length,
    degraded: services.filter((s) =>
      s.environments.some((e) => e.current_status === 'degraded')
    ).length,
    down: services.filter((s) =>
      s.environments.some((e) => e.current_status === 'down')
    ).length,
  };

  const filteredServices = selectedTeam
    ? services.filter((s) => s.team_id === selectedTeam)
    : services;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor your services across all environments
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-gray-500">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <button
            onClick={refetch}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Services</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.healthy}</p>
              <p className="text-sm text-gray-500">Healthy</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.degraded}</p>
              <p className="text-sm text-gray-500">Degraded</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.down}</p>
              <p className="text-sm text-gray-500">Down</p>
            </div>
          </div>
        </div>
      </div>

      {/* Team filter */}
      {teams.length > 0 && (
        <div className="mb-6">
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700"
          >
            <option value="">All Teams</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Services grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
        {filteredServices.length === 0 && (
          <div className="col-span-3 text-center py-12 text-gray-500">
            No services found. Create your first service to get started.
          </div>
        )}
      </div>
    </div>
  );
}
