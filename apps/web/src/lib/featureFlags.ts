import { useAuthStore } from '@/stores/auth';

// Admin emails that have access to in-development features. Phase 1 of the
// bias goldmine ships behind this gate. Hardcoded for now — a real flag system
// (config-driven, server-side rules) is Phase 2+.
const ADMIN_EMAILS = new Set<string>([
  'oh84dev@gmail.com',
  'ghwmelite@gmail.com',
  'ohwpstudios@gmail.com',
]);

export function useFeatureFlag(name: 'bias_v2'): boolean {
  const email = useAuthStore((s) => s.user?.email);
  if (!email) return false;
  if (name === 'bias_v2') {
    return ADMIN_EMAILS.has(email.toLowerCase());
  }
  return false;
}
