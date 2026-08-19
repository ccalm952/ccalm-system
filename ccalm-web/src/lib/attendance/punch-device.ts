const PUNCH_DEVICE_TOKEN_KEY = "attendance:device-token";

export function getPunchDeviceToken(): string {
  const existing = localStorage.getItem(PUNCH_DEVICE_TOKEN_KEY);
  if (existing) return existing;
  const token = crypto.randomUUID();
  localStorage.setItem(PUNCH_DEVICE_TOKEN_KEY, token);
  return token;
}
