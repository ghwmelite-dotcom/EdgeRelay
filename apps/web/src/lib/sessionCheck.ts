// Client-side session freshness guard.
//
// Zustand persists the auth state to localStorage, so `isAuthenticated`
// reads as true across tabs / page loads. But the underlying JWT has a
// 24h TTL — if the user idles on a public page past that window, the
// stored flag is stale. A click on a protected route hits an API call,
// gets 401, and the UI bounces through refresh → login. By the time the
// user sees the login screen, they've already spent a few seconds
// expecting a normal navigation.
//
// This module decodes the JWT payload client-side (no network call) and
// clears the stale auth state immediately if `exp` is in the past. Paired
// with BackBreadcrumb, this routes the user to "/" instead of "/dashboard"
// as soon as the page they're viewing mounts — before any confusing
// navigation attempt.

import { useAuthStore } from '@/stores/auth';

interface JwtPayload {
  exp?: number;
  sub?: string;
}

function decodePayload(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    // Replace base64url-safe chars + pad before decoding
    const b64 = parts[1]!.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Verifies the persisted JWT is still unexpired and clears stale state
 * if not. Returns true if the session is (locally) valid, false otherwise.
 * Cheap — no network call. Safe to call on every public-page mount.
 */
export function checkSessionFreshness(): boolean {
  const state = useAuthStore.getState();
  if (!state.isAuthenticated || !state.token) return false;

  const payload = decodePayload(state.token);
  if (!payload) {
    state.logout();
    return false;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp <= nowSec) {
    // Silent logout — the UI doesn't need a toast; navigation will route
    // to Home via BackBreadcrumb now that isAuthenticated is false.
    state.logout();
    return false;
  }

  return true;
}
