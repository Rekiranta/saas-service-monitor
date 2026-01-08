import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import {
  ArrowLeft,
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  Play,
  Loader2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { apiClient } from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';
import type { Service, HealthCheck, EnvironmentType, HealthStatus } from '../types';

export function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [service, setService] = useState<Service | null>(null);
  const [healthHistory, setHealthHistory] = useState<Record<string, HealthCheck[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEnv, setSelectedEnv] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState<string | null>(null);
  const [showAddEnv, setShowAddEnv] = useState(false);
  const [newEnv, setNewEnv] = useState({ name: 'development' as EnvironmentType, url: '' });

  const handleStatusUpdate = useCallback(
    (
      _serviceId: string,
      environmentId: string,
      status: HealthStatus,
      _responseTimeMs: number,
      timestamp: string
    ) => {
      setService((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          environments: prev.environments.map((env) =>
            env.id === environmentId
              ? { ...env, current_status: status, last_check: timestamp }
              : env
          ),
        };
      });
    },
    []
  );

  const { subscribeToService } = useWebSocket({ onStatusUpdate: handleStatusUpdate });

  useEffect(() => {
    if (id) {
      subscribeToService(id);
    }
  }, [id, subscribeToService]);

  const fetchService = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await apiClient.getService(id);
      setService(data);

      // Fetch health history for each environment
      const histories: Record<string, HealthCheck[]> = {};
      for (const env of data.environments) {
        try {
          const history = await apiClient.getHealthHistory(env.id, 50);
          histories[env.id] = history;
        } catch {
          histories[env.id] = [];
        }
      }
      setHealthHistory(histories);

      if (data.environments.length > 0 && !selectedEnv) {
        setSelectedEnv(data.environments[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch service:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id, selectedEnv]);

  useEffect(() => {
    fetchService();
  }, [fetchService]);

  const handleTriggerCheck = async (environmentId: string) => {
    setIsChecking(environmentId);
    try {
      const check = await apiClient.triggerHealthCheck(environmentId);
      setService((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          environments: prev.environments.map((env) =>
            env.id === environmentId
              ? { ...env, current_status: check.status, last_check: check.checked_at }
              : env
          ),
        };
      });
      setHealthHistory((prev) => ({
        ...prev,
        [environmentId]: [check, ...(prev[environmentId] || [])].slice(0, 50),
      }));
    } catch (err) {
      console.error('Failed to trigger health check:', err);
    } finally {
      setIsChecking(null);
    }
  };

  const handleAddEnvironment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      const env = await apiClient.createEnvironment(id, newEnv.name, newEnv.url);
      setService((prev) =>
        prev ? { ...prev, environments: [...prev.environments, env] } : prev
      );
      setShowAddEnv(false);
      setNewEnv({ name: 'development', url: '' });
    } catch (err) {
      console.error('Failed to add environment:', err);
    }
  };

  const handleDeleteEnvironment = async (environmentId: string) => {
    if (!confirm('Are you sure you want to delete this environment?')) return;
    try {
      await apiClient.deleteEnvironment(environmentId);
      setService((prev) =>
        prev
          ? {
              ...prev,
              environments: prev.environments.filter((e) => e.id !== environmentId),
            }
          : prev
      );
    } catch (err) {
      console.error('Failed to delete environment:', err);
    }
  };

  if (isLoading || !service) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
        </div>
      </Layout>
    );
  }

  const selectedHistory = selectedEnv ? healthHistory[selectedEnv] || [] : [];
  const chartData = selectedHistory
    .slice()
    .reverse()
    .map((check) => ({
      time: format(new Date(check.checked_at), 'HH:mm'),
      responseTime: check.response_time_ms || 0,
      status: check.status,
    }));

  return (
    <Layout>
      <div>
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{service.name}</h1>
            {service.description && (
              <p className="mt-1 text-sm text-gray-500">{service.description}</p>
            )}
          </div>
          {service.url && (
            <a
              href={service.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <ExternalLink className="h-4 w-4" />
              {service.url}
            </a>
          )}
        </div>

        {/* Environments */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Environments</h2>
            <button
              onClick={() => setShowAddEnv(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Environment
            </button>
          </div>

          {showAddEnv && (
            <form onSubmit={handleAddEnvironment} className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-3 gap-4">
                <select
                  value={newEnv.name}
                  onChange={(e) =>
                    setNewEnv({ ...newEnv, name: e.target.value as EnvironmentType })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="development">Development</option>
                  <option value="staging">Staging</option>
                  <option value="production">Production</option>
                </select>
                <input
                  type="url"
                  value={newEnv.url}
                  onChange={(e) => setNewEnv({ ...newEnv, url: e.target.value })}
                  placeholder="https://api.example.com/health"
                  required
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddEnv(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="grid grid-cols-3 gap-4">
            {service.environments.map((env) => (
              <div
                key={env.id}
                onClick={() => setSelectedEnv(env.id)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  selectedEnv === env.id
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 capitalize">{env.name}</span>
                  <StatusBadge status={env.current_status} size="sm" />
                </div>
                <p className="text-xs text-gray-500 truncate mb-3">{env.url}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {env.last_check
                      ? formatDistanceToNow(new Date(env.last_check), { addSuffix: true })
                      : 'Never checked'}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTriggerCheck(env.id);
                      }}
                      disabled={isChecking === env.id}
                      className="p-1 text-gray-400 hover:text-emerald-600 disabled:opacity-50"
                      title="Check now"
                    >
                      {isChecking === env.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEnvironment(env.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {service.environments.length === 0 && (
              <p className="col-span-3 text-center py-8 text-gray-500">
                No environments configured. Add one to start monitoring.
              </p>
            )}
          </div>
        </div>

        {/* Response Time Chart */}
        {selectedEnv && chartData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Response Time</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis unit="ms" />
                  <Tooltip
                    formatter={(value: number) => [`${value}ms`, 'Response Time']}
                  />
                  <Line
                    type="monotone"
                    dataKey="responseTime"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
