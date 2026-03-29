import type { ApiResponse } from '@edgerelay/shared';

const API_BASE = import.meta.env.PROD
  ? 'https://edgerelay-api.ghwmelite.workers.dev/v1'
  : '/v1';

class ApiClient {
  private token: string | null = null;
  private refreshing: Promise<boolean> | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  /** Called when a new token is obtained via refresh */
  onTokenRefreshed: ((token: string, user: unknown) => void) | null = null;

  /** Called when refresh fails — user must re-login */
  onAuthExpired: (() => void) | null = null;

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    isRetry = false,
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = (await res.json()) as ApiResponse<T>;

    // Auto-refresh on 401 (but not for auth endpoints or retries)
    if (
      res.status === 401 &&
      !isRetry &&
      this.token &&
      !path.startsWith('/auth/')
    ) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        // Retry the original request with new token
        return this.request<T>(method, path, body, true);
      }
      // Refresh failed — trigger logout
      this.onAuthExpired?.();
    }

    return json;
  }

  private async tryRefresh(): Promise<boolean> {
    // Deduplicate concurrent refresh attempts
    if (this.refreshing) return this.refreshing;

    this.refreshing = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.token}`,
          },
        });

        if (!res.ok) return false;

        const json = (await res.json()) as ApiResponse<{
          token: string;
          user: unknown;
        }>;

        if (json.data?.token) {
          this.token = json.data.token;
          this.onTokenRefreshed?.(json.data.token, json.data.user);
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        this.refreshing = null;
      }
    })();

    return this.refreshing;
  }

  get<T>(path: string) {
    return this.request<T>('GET', path);
  }
  post<T>(path: string, body?: unknown) {
    return this.request<T>('POST', path, body);
  }
  put<T>(path: string, body?: unknown) {
    return this.request<T>('PUT', path, body);
  }
  del<T>(path: string) {
    return this.request<T>('DELETE', path);
  }
}

export const api = new ApiClient();
