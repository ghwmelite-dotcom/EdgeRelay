import type { ApiResponse } from '@edgerelay/shared';
import { API_BASE } from '@/lib/constants';

export class ApiClient {
  private token: string | null = null;
  private refreshing: Promise<boolean | null> | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  /** Called when a new token is obtained via refresh */
  onTokenRefreshed: ((token: string, user: unknown) => void) | null = null;

  /** Called only when the server rejects the session. */
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

    const requestToken = this.token;
    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      return { data: null, error: { code: 'NETWORK_ERROR', message: 'Unable to connect. Please try again.' } };
    }

    let json: ApiResponse<T>;
    try {
      json = await res.json() as ApiResponse<T>;
      if (!json || typeof json !== 'object' || !('data' in json) || !('error' in json)) throw new Error('Invalid response');
    } catch {
      json = { data: null, error: { code: 'INVALID_RESPONSE', message: 'The server returned an unexpected response. Please try again.' } };
    }
    if (!res.ok && !json.error) json = { data: null, error: { code: 'HTTP_ERROR', message: 'Request failed. Please try again.' } };

    // Auto-refresh on 401 (but not for auth endpoints or retries)
    if (
      res.status === 401 &&
      !isRetry &&
      this.token &&
      !path.startsWith('/auth/')
    ) {
      // Another request may already have refreshed this old token.
      if (this.token !== requestToken) return this.request<T>(method, path, body, true);
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        // Retry the original request with new token
        return this.request<T>(method, path, body, true);
      }
      // Only a definitive session rejection triggers logout.
      if (refreshed === false && this.token === requestToken) this.onAuthExpired?.();
    }

    return json;
  }

  private async tryRefresh(): Promise<boolean | null> {
    // Deduplicate concurrent refresh attempts
    if (this.refreshing) return this.refreshing;

    const refreshToken = this.token;
    this.refreshing = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${refreshToken}`,
          },
        });

        if (!res.ok) return res.status === 401 || res.status === 403 ? false : null;

        const json = (await res.json()) as ApiResponse<{
          token: string;
          user: unknown;
        }>;

        if (this.token !== refreshToken) return null; // Logout/account switch won the race.
        if (json.data?.token) {
          this.token = json.data.token;
          this.onTokenRefreshed?.(json.data.token, json.data.user);
          return true;
        }
        return null;
      } catch {
        return null;
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
