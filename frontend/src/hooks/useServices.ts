import { useState, useEffect, useCallback } from 'react';
import type { Service, Team } from '../types';
import { apiClient } from '../api/client';

export function useServices(teamId?: string) {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getServices(teamId);
      setServices(data.services);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch services');
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const updateServiceStatus = useCallback(
    (
      serviceId: string,
      environmentId: string,
      status: string,
      responseTimeMs: number,
      timestamp: string
    ) => {
      setServices((prevServices) =>
        prevServices.map((service) => {
          if (service.id !== serviceId) return service;
          return {
            ...service,
            environments: service.environments.map((env) => {
              if (env.id !== environmentId) return env;
              return {
                ...env,
                current_status: status as 'healthy' | 'degraded' | 'down' | 'unknown',
                last_check: timestamp,
              };
            }),
          };
        })
      );
    },
    []
  );

  return {
    services,
    isLoading,
    error,
    refetch: fetchServices,
    updateServiceStatus,
  };
}

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getTeams();
      setTeams(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch teams');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  return { teams, isLoading, error, refetch: fetchTeams };
}
