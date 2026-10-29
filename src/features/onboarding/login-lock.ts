// Wrong-password lockout, kept per email in localStorage so a refresh doesn't reset it.
const LOCK_KEY = "tw_login_locks";

export interface LoginLock {
  attempts: number;
  lockedUntil: number;
}

type LoginLocks = Record<string, LoginLock | undefined>;

const NO_LOCK: LoginLock = { attempts: 0, lockedUntil: 0 };

const readLocks = (): LoginLocks => {
  try {
    return JSON.parse(localStorage.getItem(LOCK_KEY) || "{}") as LoginLocks;
  } catch {
    return {};
  }
};

const writeLocks = (locks: LoginLocks) => {
  try {
    localStorage.setItem(LOCK_KEY, JSON.stringify(locks));
  } catch {
    // storage unavailable
  }
};

/** An ended lock starts the count again. */
export const getLoginLock = (email: string): LoginLock => {
  const lock = readLocks()[email] ?? NO_LOCK;

  return lock.lockedUntil && lock.lockedUntil <= Date.now() ? NO_LOCK : lock;
};

export const saveLoginLock = (email: string, lock: LoginLock) =>
  writeLocks({ ...readLocks(), [email]: lock });

export const clearLoginLock = (email: string) =>
  writeLocks({ ...readLocks(), [email]: undefined });
