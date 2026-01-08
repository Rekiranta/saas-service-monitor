export type UserRole = 'admin' | 'member' | 'viewer';
export type EnvironmentType = 'development' | 'staging' | 'production';
export type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Environment {
  id: string;
  name: EnvironmentType;
  url: string;
  service_id: string;
  created_at: string;
  current_status: HealthStatus | null;
  last_check: string | null;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  team_id: string;
  created_at: string;
  environments: Environment[];
}

export interface HealthCheck {
  id: string;
  environment_id: string;
  status: HealthStatus;
  response_time_ms: number | null;
  status_code: number | null;
  error_message: string | null;
  checked_at: string;
}

export interface WebSocketMessage {
  type: 'status_update' | 'subscribed' | 'pong';
  service_id?: string;
  environment_id?: string;
  status?: HealthStatus;
  response_time_ms?: number;
  timestamp?: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
}
