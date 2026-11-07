import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './services/api';
import type { User } from './types';

type AuthValue = { user: User | null; loading: boolean; signIn: (email: string, password: string) => Promise<void>; signUp: (name: string, email: string, password: string) => Promise<void>; signOut: () => void };
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!localStorage.getItem('insightflow_token')) { setLoading(false); return; }
    api.me().then(({ user: current }) => setUser(current)).catch(() => localStorage.removeItem('insightflow_token')).finally(() => setLoading(false));
  }, []);
  async function accept(result: { user: User; token: string }) { localStorage.setItem('insightflow_token', result.token); setUser(result.user); }
  const value: AuthValue = {
    user, loading,
    signIn: async (email, password) => accept(await api.login({ email, password })),
    signUp: async (name, email, password) => accept(await api.register({ name, email, password })),
    signOut: () => { localStorage.removeItem('insightflow_token'); setUser(null); },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value; }
