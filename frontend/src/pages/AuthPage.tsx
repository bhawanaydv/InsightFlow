import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth';
import { Brand } from '../components/Brand';
import { ApiError } from '../services/api';

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const isSignup = mode === 'signup';
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/app" replace />;
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    if (isSignup && password !== confirm) { setError('Your passwords do not match.'); return; }
    if (password.length < (isSignup ? 8 : 1)) { setError('Use at least 8 characters for your password.'); return; }
    setBusy(true);
    try { if (isSignup) await signUp(name, email, password); else await signIn(email, password); navigate(params.get('next') || '/app'); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'We could not connect. Please try again.'); }
    finally { setBusy(false); }
  }
  return <div className="auth-page"><header className="auth-header wrap"><Brand /><Link className="auth-back" to="/"><ArrowLeft size={15} />Back to home</Link></header><main className="auth-layout"><section className="auth-card"><div className="auth-card-mark"><span className="brand-mark"><span className="auth-spark">✦</span></span></div><span className="section-kicker">{isSignup ? 'A fresh start' : 'Welcome back'}</span><h1>{isSignup ? 'Create your workspace' : 'Good to see you again.'}</h1><p className="auth-subtitle">{isSignup ? 'A clear space for the questions your data can answer.' : 'Pick up where your data left off.'}</p>
      <form onSubmit={submit} className="auth-form" noValidate>{isSignup && <label>Your name<span className="input-wrap"><UserRound size={17} /><input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex Morgan" required minLength={2} /></span></label>}<label>Email address<span className="input-wrap"><Mail size={17} /><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></span></label><label>Password<span className="input-wrap"><LockKeyhole size={17} /><input type={show ? 'text' : 'password'} autoComplete={isSignup ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isSignup ? 'At least 8 characters' : 'Enter your password'} required minLength={isSignup ? 8 : undefined} /><button type="button" className="password-toggle" onClick={() => setShow((value) => !value)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>{isSignup && <label>Confirm password<span className="input-wrap"><LockKeyhole size={17} /><input type={show ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Enter your password again" required /></span></label>}
        {error && <div role="alert" className="form-error">{error}</div>}<button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : isSignup ? 'Create account' : 'Log in'} {!busy && <ArrowRight size={16} />}</button></form><p className="auth-switch">{isSignup ? 'Already have an account?' : 'New to InsightFlow?'} <Link to={isSignup ? '/login' : '/signup'}>{isSignup ? 'Log in' : 'Create an account'}</Link></p><div className="auth-privacy"><LockKeyhole size={14} />Your workspace is private and belongs to you.</div></section><aside className="auth-aside"><div className="auth-aside-orb orb-a" /><div className="auth-aside-orb orb-b" /><div className="auth-aside-content"><span className="auth-aside-tag">THE DATA WORKSPACE FOR CURIOUS MINDS</span><h2>Make room for<br />the <em>aha</em> moment.</h2><p>Every great discovery starts with a question. InsightFlow helps you get to yours.</p><div className="auth-aside-note"><span className="aside-check">✓</span><span><b>Your data, organized.</b><small>Projects keep your files and ideas in one place.</small></span></div><div className="auth-aside-note"><span className="aside-check">✓</span><span><b>Easy to explore.</b><small>Clear previews make a new dataset feel familiar.</small></span></div></div></aside></main><footer className="auth-footer wrap"><span>© 2026 InsightFlow</span><span>Built for people learning from data.</span></footer></div>;
}
