import type { User, Team, Service, Environment, HealthCheck, AuthToken } from '../types';

const API_BASE = '/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
      throw new Error(error.detail || 'An error occurred');
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  // Auth endpoints
  async register(email: string, password: string, fullName?: string): Promise<User> {
    return this.request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
  }

  async login(email: string, password: string): Promise<AuthToken> {
    return this.request<AuthToken>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // Teams endpoints
  async getTeams(): Promise<Team[]> {
    return this.request<Team[]>('/teams');
  }

  async createTeam(name: string, description?: string): Promise<Team> {
    return this.request<Team>('/teams', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async deleteTeam(teamId: string): Promise<void> {
    return this.request<void>(`/teams/${teamId}`, { method: 'DELETE' });
  }

  // Services endpoints
  async getServices(teamId?: string): Promise<{ services: Service[]; total: number }> {
    const params = teamId ? `?team_id=${teamId}` : '';
    return this.request<{ services: Service[]; total: number }>(`/services${params}`);
  }

  async getService(serviceId: string): Promise<Service> {
    return this.request<Service>(`/services/${serviceId}`);
  }

  async createService(
    name: string,
    teamId: string,
    description?: string,
    url?: string
  ): Promise<Service> {
    return this.request<Service>('/services', {
      method: 'POST',
      body: JSON.stringify({ name, team_id: teamId, description, url }),
    });
  }

  async updateService(
    serviceId: string,
    data: { name?: string; description?: string; url?: string }
  ): Promise<Service> {
    return this.request<Service>(`/services/${serviceId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteService(serviceId: string): Promise<void> {
    return this.request<void>(`/services/${serviceId}`, { method: 'DELETE' });
  }

  // Environments endpoints
  async getEnvironments(serviceId: string): Promise<Environment[]> {
    return this.request<Environment[]>(`/services/${serviceId}/environments`);
  }

  async createEnvironment(
    serviceId: string,
    name: 'development' | 'staging' | 'production',
    url: string
  ): Promise<Environment> {
    return this.request<Environment>(`/services/${serviceId}/environments`, {
      method: 'POST',
      body: JSON.stringify({ name, url }),
    });
  }

  async deleteEnvironment(environmentId: string): Promise<void> {
    return this.request<void>(`/environments/${environmentId}`, { method: 'DELETE' });
  }

  // Health check endpoints
  async triggerHealthCheck(environmentId: string): Promise<HealthCheck> {
    return this.request<HealthCheck>('/health-checks/trigger', {
      method: 'POST',
      body: JSON.stringify({ environment_id: environmentId }),
    });
  }

  async getHealthHistory(environmentId: string, limit = 100): Promise<HealthCheck[]> {
    return this.request<HealthCheck[]>(
      `/health-checks/environment/${environmentId}?limit=${limit}`
    );
  }
}

export const apiClient = new ApiClient();
