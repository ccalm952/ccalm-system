export const SALARY_UNLOCK_KEY = "salary:unlockToken";

export function getSalaryUnlockToken(): string | null {
  return sessionStorage.getItem(SALARY_UNLOCK_KEY);
}

export function setSalaryUnlockToken(token: string | null) {
  if (!token) sessionStorage.removeItem(SALARY_UNLOCK_KEY);
  else sessionStorage.setItem(SALARY_UNLOCK_KEY, token);
}

export function hasSalaryUnlockToken(): boolean {
  return !!getSalaryUnlockToken();
}
