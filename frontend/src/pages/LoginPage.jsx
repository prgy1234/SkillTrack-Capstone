import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { signup } from '../api/client.js';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isSignupRequest = new URLSearchParams(location.search).get('mode') === 'signup';
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [name,setName] = useState('');
  const [cohort,setCohort] = useState('');
  const [success,setSuccess] = useState('');
  const [showPassword,setShowPassword] = useState(false);
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault(); setError(''); setSuccess('');
    if (isSignupRequest) {
      if (!name.trim() || !cohort.trim()) { setError('Add your name and learning programme to continue.'); return; }
      if (password.length < 8) { setError('Choose a password with at least 8 characters.'); return; }
      setLoading(true);
      try { await signup({name:name.trim(),email:email.trim().toLowerCase(),cohort:cohort.trim(),password}); setSuccess('Your learner profile is ready. Sign in to view your workspace.'); setPassword(''); setName(''); setCohort(''); }
      catch(err) { setError(err.message || 'We could not create your account.'); }
      finally { setLoading(false); }
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(normalizedEmail)) { setError('Enter a valid email address.'); return; }
    if (!password) { setError('Enter your password to continue.'); return; }
    setLoading(true);
    try { const user = await login(normalizedEmail,password); if (user.mustChangePassword) navigate('/change-password',{replace:true}); else navigate(user.role === 'Coordinator' ? '/dashboard' : '/my-training',{replace:true}); }
    catch(err) { setError(err.message || 'Sign in failed. Check your details and try again.'); }
    finally { setLoading(false); }
  };

  return <main className="auth-v2">
    <div className="auth-v2-noise"/>
    <header className="auth-v2-header"><Link to="/" className="auth-v2-brand"><span className="auth-v2-mark">N</span><span>SKILLTRACK<small>LEARNING OPERATIONS</small></span></Link><span className="auth-v2-header-note">A BETTER WAY TO MOVE FORWARD <b>↗</b></span></header>
    <div className="auth-v2-layout">
      <section className="auth-v2-story">
        <div className="auth-v2-counter">FIELDNOTE 001 <span>—</span> THE LEARNING PRACTICE</div>
        <h1>Progress isn't<br/>a place. It's a<br/><em>practice.</em></h1>
        <p>Build a rhythm. Track the work. Make each new skill part of what you know.</p>
        <div className="auth-v2-stats"><div><strong>01</strong><span>One place for every milestone</span></div><div><strong>02</strong><span>A clear view of what comes next</span></div><div><strong>03</strong><span>Progress you can make your own</span></div></div>
        <div className="auth-v2-graphic"><div className="graphic-ring ring-one"/><div className="graphic-ring ring-two"/><span className="graphic-center">N<span>+</span></span><span className="graphic-side-label">LEARN / REPEAT / ADVANCE</span></div>
      </section>
      <section className="auth-v2-panel">
        <div className="auth-v2-form-head"><span className="auth-v2-step">{isSignupRequest ? 'NEW LEARNER / 02' : 'MEMBER ACCESS / 01'}</span><h2>{isSignupRequest ? 'Start your record.' : 'Pick up where you left off.'}</h2><p>{isSignupRequest ? 'Create your learner profile to connect your work with your programme.' : 'Enter your details and we’ll take you to the right workspace.'}</p></div>
        {error && <div className="auth-v2-alert" role="alert">{error}</div>}
        {success && <div className="auth-v2-success" role="status">{success}</div>}
        {isSignupRequest && <div className="auth-v2-signup-note"><b>Before you begin</b><span>Use the name your coordinator knows you by, and enter your assigned programme or cohort.</span></div>}
        <form className="auth-v2-form" onSubmit={handleSubmit} noValidate>
          {isSignupRequest && <><label>FULL NAME<input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Aditi Sharma" autoComplete="name" disabled={loading} required/></label><label>PROGRAMME / COHORT<input value={cohort} onChange={e=>setCohort(e.target.value)} placeholder="e.g. Product Design" disabled={loading} required/></label></>}
          <label>EMAIL ADDRESS<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@company.com" autoComplete="username" disabled={loading} required/></label>
          <label>PASSWORD<span className="auth-v2-password"><input type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder={isSignupRequest?'At least 8 characters':'Your password'} autoComplete={isSignupRequest?'new-password':'current-password'} disabled={loading} required/><button type="button" onClick={()=>setShowPassword(v=>!v)}>{showPassword?'HIDE':'SHOW'}</button></span></label>
          <button className="auth-v2-submit" type="submit" disabled={loading}>{loading ? 'PLEASE WAIT…' : isSignupRequest ? 'CREATE LEARNER PROFILE' : 'ENTER WORKSPACE'} <span>↗</span></button>
        </form>
        <div className="auth-v2-switch">{isSignupRequest ? <>Already have a profile? <Link to="/login">Sign in instead</Link></> : <>New to SkillTrack? <Link to="/login?mode=signup">Create a learner profile</Link></>}</div>
        <div className="auth-v2-foot"><Link to="/">← Return to overview</Link><span>SECURE MEMBER ACCESS · SKILLTRACK</span></div>
      </section>
    </div>
  </main>;
}
