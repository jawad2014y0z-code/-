/**
 * Simple Authentication Service (Name + Password)
 * Manages user login/registration, avatar, session persistence, and state updates
 */

export interface AuthUser {
  id: string;
  name: string;
  avatar: string;
  createdAt: number;
}

type AuthListener = (user: AuthUser | null) => void;

class AuthService {
  private currentUser: AuthUser | null = null;
  private listeners: Set<AuthListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('jumah_auth_user');
        if (saved) {
          this.currentUser = JSON.parse(saved);
        }
      } catch {
        this.currentUser = null;
      }
    }
  }

  public getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  public isLoggedIn(): boolean {
    return this.currentUser !== null;
  }

  public subscribe(cb: AuthListener): () => void {
    this.listeners.add(cb);
    cb(this.currentUser);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.currentUser));
  }

  public async login(
    name: string,
    password: string,
    avatar: string = '😎'
  ): Promise<{ success: boolean; user?: AuthUser; error?: string; isNew?: boolean }> {
    const cleanName = (name || '').trim();
    const cleanPass = (password || '').trim();

    if (!cleanName) {
      return { success: false, error: 'يرجى إدخال اسمك' };
    }
    if (!cleanPass) {
      return { success: false, error: 'يرجى إدخال كلمة السر' };
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          password: cleanPass,
          avatar,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'فشل تسجيل الدخول' };
      }

      this.currentUser = data.user;
      try {
        localStorage.setItem('jumah_auth_user', JSON.stringify(data.user));
      } catch {
        // ignore
      }

      this.notify();
      return {
        success: true,
        user: data.user,
        isNew: data.isNew,
      };
    } catch (err: any) {
      // Local fallback in case network has offline jitter
      const fallbackUser: AuthUser = {
        id: 'u_' + Date.now().toString(36),
        name: cleanName,
        avatar,
        createdAt: Date.now(),
      };
      this.currentUser = fallbackUser;
      try {
        localStorage.setItem('jumah_auth_user', JSON.stringify(fallbackUser));
      } catch {
        // ignore
      }
      this.notify();
      return { success: true, user: fallbackUser, isNew: true };
    }
  }

  public logout() {
    this.currentUser = null;
    try {
      localStorage.removeItem('jumah_auth_user');
    } catch {
      // ignore
    }
    this.notify();
  }

  public updateAvatar(newAvatar: string) {
    if (!this.currentUser) return;
    this.currentUser = { ...this.currentUser, avatar: newAvatar };
    try {
      localStorage.setItem('jumah_auth_user', JSON.stringify(this.currentUser));
    } catch {
      // ignore
    }
    this.notify();
  }
}

export const authService = new AuthService();
