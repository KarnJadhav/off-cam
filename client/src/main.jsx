import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BriefcaseBusiness,
  CalendarClock,
  Check,
  Crown,
  Filter,
  GraduationCap,
  IndianRupee,
  Lock,
  LogOut,
  MapPin,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import './styles.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

const emptyRegister = {
  name: '',
  email: '',
  password: '',
  batch: '2026',
  branch: 'CSE',
  roles: 'Software Engineer, Frontend Developer',
  locations: 'Remote, Bengaluru',
  experience: 'Fresher',
  jobType: 'Both',
  workMode: 'Any'
};

const emptyJob = {
  company: '',
  role: '',
  location: '',
  salary: '',
  batch: '2025, 2026',
  branch: 'CSE, IT',
  experience: 'Fresher',
  deadline: '',
  applyLink: '',
  description: '',
  tags: 'Java, React',
  jobType: 'Full-time',
  workMode: 'Hybrid',
  isPremium: false
};

function App() {
  const [token, setToken] = useState(localStorage.getItem('offcam_token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('offcam_user') || 'null'));
  const [mode, setMode] = useState('login');
  const [login, setLogin] = useState({ email: '', password: '' });
  const [register, setRegister] = useState(emptyRegister);
  const [jobs, setJobs] = useState([]);
  const [premiumJobs, setPremiumJobs] = useState([]);
  const [telegramGroup, setTelegramGroup] = useState('');
  const [filters, setFilters] = useState({ q: '', batch: '', branch: '', jobType: '', workMode: '' });
  const [jobForm, setJobForm] = useState(emptyJob);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);

  async function api(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Request failed');
    return payload;
  }

  function persistSession(payload) {
    setToken(payload.token);
    setUser(payload.user);
    localStorage.setItem('offcam_token', payload.token);
    localStorage.setItem('offcam_user', JSON.stringify(payload.user));
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const payload = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(login) });
      persistSession(payload);
      setMessage('Welcome back. Fresh jobs are ready.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const preferences = {
        batch: register.batch,
        branch: register.branch,
        roles: splitCsv(register.roles),
        locations: splitCsv(register.locations),
        experience: register.experience,
        jobType: register.jobType,
        workMode: register.workMode
      };
      const payload = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ ...register, preferences })
      });
      persistSession(payload);
      setMessage('Account created. Your dashboard is tuned to your profile.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchJobs() {
    if (!token) return;
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    try {
      const payload = await api(`/api/jobs?${params.toString()}`, { headers: authHeaders });
      setJobs(payload.jobs || []);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function fetchPremiumJobs() {
    if (!token || !user?.isPremium) return;
    try {
      const payload = await api('/api/premium/jobs', { headers: authHeaders });
      setPremiumJobs(payload.jobs || []);
      setTelegramGroup(payload.telegramGroup || '');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createJob(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const body = {
        ...jobForm,
        batch: splitCsv(jobForm.batch),
        branch: splitCsv(jobForm.branch),
        tags: splitCsv(jobForm.tags),
        deadline: jobForm.deadline ? new Date(jobForm.deadline).toISOString() : ''
      };
      await api('/api/admin/job', { method: 'POST', headers: authHeaders, body: JSON.stringify(body) });
      setJobForm(emptyJob);
      setMessage('Job posted and cache cleared.');
      fetchJobs();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function upgrade() {
    setLoading(true);
    setMessage('');
    try {
      const payload = await api('/api/payment/create-order', { method: 'POST', headers: authHeaders });
      if (!window.Razorpay) throw new Error('Razorpay checkout script failed to load');
      const checkout = new window.Razorpay({
        key: RAZORPAY_KEY_ID || payload.keyId,
        amount: payload.order.amount,
        currency: payload.order.currency,
        name: 'Off-Cam',
        description: 'Premium Membership',
        order_id: payload.order.id,
        handler: async function handlePayment(response) {
          await api('/api/payment/verify', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(response)
          });
          const refreshed = await api('/api/auth/me', { headers: authHeaders });
          const nextUser = refreshed.user;
          setUser(nextUser);
          localStorage.setItem('offcam_user', JSON.stringify(nextUser));
          setMessage('Premium activated. The good stuff is unlocked.');
        },
        prefill: { name: user.name, email: user.email },
        theme: { color: '#0f766e' }
      });
      checkout.open();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    if (token) api('/api/auth/logout', { method: 'POST', headers: authHeaders }).catch(() => {});
    setToken('');
    setUser(null);
    localStorage.removeItem('offcam_token');
    localStorage.removeItem('offcam_user');
  }

  useEffect(() => {
    fetchJobs();
  }, [token]);

  useEffect(() => {
    fetchPremiumJobs();
  }, [token, user?.isPremium]);

  if (!token || !user) {
    return (
      <main className="auth-shell">
        <section className="auth-copy">
          <div className="brand-row">
            <BriefcaseBusiness />
            <span>Off-Cam</span>
          </div>
          <h1>Find off-campus roles before the deadline rush.</h1>
          <p>
            A student-first dashboard for freshers, internships, premium filtered jobs, and admin-curated updates.
          </p>
          <div className="metric-grid">
            <Metric icon={<Filter />} value="Batch" label="Matched openings" />
            <Metric icon={<CalendarClock />} value="Daily" label="Fresh updates" />
            <Metric icon={<Crown />} value="Premium" label="Telegram access" />
          </div>
        </section>
        <section className="auth-panel">
          <div className="tabs">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
            <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Register</button>
          </div>
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="form-stack">
              <Input label="Email" value={login.email} onChange={(email) => setLogin({ ...login, email })} />
              <Input label="Password" type="password" value={login.password} onChange={(password) => setLogin({ ...login, password })} />
              <button className="primary" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="form-stack">
              <Input label="Name" value={register.name} onChange={(name) => setRegister({ ...register, name })} />
              <Input label="Email" value={register.email} onChange={(email) => setRegister({ ...register, email })} />
              <Input label="Password" type="password" value={register.password} onChange={(password) => setRegister({ ...register, password })} />
              <div className="two-col">
                <Input label="Batch" value={register.batch} onChange={(batch) => setRegister({ ...register, batch })} />
                <Input label="Branch" value={register.branch} onChange={(branch) => setRegister({ ...register, branch })} />
              </div>
              <Input label="Preferred roles" value={register.roles} onChange={(roles) => setRegister({ ...register, roles })} />
              <Input label="Locations" value={register.locations} onChange={(locations) => setRegister({ ...register, locations })} />
              <button className="primary" disabled={loading}>{loading ? 'Creating...' : 'Create account'}</button>
            </form>
          )}
          {message && <p className="message">{message}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <BriefcaseBusiness />
          <span>Off-Cam</span>
        </div>
        <nav>
          <a className="active"><Sparkles /> Matched Jobs</a>
          <a><Crown /> Premium</a>
          {user.role === 'admin' && <a><ShieldCheck /> Admin</a>}
        </nav>
        <button className="ghost logout" onClick={logout}><LogOut /> Logout</button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Welcome, {user.name}</p>
            <h1>Jobs matched for your profile</h1>
          </div>
          <div className={`status-pill ${user.isPremium ? 'premium' : ''}`}>
            {user.isPremium ? <Crown /> : <Lock />}
            {user.isPremium ? 'Premium active' : 'Free plan'}
          </div>
        </header>

        {message && <p className="message wide">{message}</p>}

        <section className="controls">
          <label className="search-box">
            <Search />
            <input placeholder="Search company, role, stack..." value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} />
          </label>
          <Input compact label="Batch" value={filters.batch} onChange={(batch) => setFilters({ ...filters, batch })} />
          <Input compact label="Branch" value={filters.branch} onChange={(branch) => setFilters({ ...filters, branch })} />
          <button className="primary compact-btn" onClick={fetchJobs}><Filter /> Apply</button>
        </section>

        {!user.isPremium && (
          <section className="upgrade-band">
            <div>
              <h2>Unlock premium filtered roles</h2>
              <p>Get premium jobs, group access, and priority curated listings for your batch and branch.</p>
            </div>
            <button className="primary" onClick={upgrade} disabled={loading}><IndianRupee /> Upgrade</button>
          </section>
        )}

        {user.isPremium && (
          <section>
            <div className="section-heading">
              <h2>Premium Jobs</h2>
              {telegramGroup && <a className="telegram-link" href={telegramGroup} target="_blank" rel="noreferrer"><Send /> Telegram group</a>}
            </div>
            <JobGrid jobs={premiumJobs} empty="No premium matches yet." />
          </section>
        )}

        <section>
          <div className="section-heading">
            <h2>Latest Jobs</h2>
            <span>{jobs.length} openings</span>
          </div>
          <JobGrid jobs={jobs} empty="No jobs found. Try a wider filter." />
        </section>

        {user.role === 'admin' && (
          <section className="admin-panel">
            <div className="section-heading">
              <h2>Add Job</h2>
              <span>Admin</span>
            </div>
            <form className="job-form" onSubmit={createJob}>
              <Input label="Company" value={jobForm.company} onChange={(company) => setJobForm({ ...jobForm, company })} />
              <Input label="Role" value={jobForm.role} onChange={(role) => setJobForm({ ...jobForm, role })} />
              <Input label="Location" value={jobForm.location} onChange={(location) => setJobForm({ ...jobForm, location })} />
              <Input label="Salary" value={jobForm.salary} onChange={(salary) => setJobForm({ ...jobForm, salary })} />
              <Input label="Batch" value={jobForm.batch} onChange={(batch) => setJobForm({ ...jobForm, batch })} />
              <Input label="Branch" value={jobForm.branch} onChange={(branch) => setJobForm({ ...jobForm, branch })} />
              <Input label="Deadline" type="date" value={jobForm.deadline} onChange={(deadline) => setJobForm({ ...jobForm, deadline })} />
              <Input label="Apply link" value={jobForm.applyLink} onChange={(applyLink) => setJobForm({ ...jobForm, applyLink })} />
              <label className="textarea-label">
                Description
                <textarea value={jobForm.description} onChange={(event) => setJobForm({ ...jobForm, description: event.target.value })} />
              </label>
              <Input label="Tags" value={jobForm.tags} onChange={(tags) => setJobForm({ ...jobForm, tags })} />
              <label className="check-label">
                <input type="checkbox" checked={jobForm.isPremium} onChange={(event) => setJobForm({ ...jobForm, isPremium: event.target.checked })} />
                Premium job
              </label>
              <button className="primary"><Plus /> Post job</button>
            </form>
          </section>
        )}
      </section>
    </main>
  );
}

function Metric({ icon, value, label }) {
  return <div className="metric">{icon}<strong>{value}</strong><span>{label}</span></div>;
}

function Input({ label, value, onChange, type = 'text', compact = false }) {
  return (
    <label className={compact ? 'input-label compact-input' : 'input-label'}>
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function JobGrid({ jobs, empty }) {
  if (!jobs.length) return <p className="empty-state">{empty}</p>;
  return (
    <div className="job-grid">
      {jobs.map((job) => (
        <article className="job-card" key={job._id}>
          <div className="job-card-top">
            <div>
              <h3>{job.role}</h3>
              <p>{job.company}</p>
            </div>
            {job.isPremium ? <Crown className="premium-icon" /> : <Check className="free-icon" />}
          </div>
          <p className="description">{job.description}</p>
          <div className="job-meta">
            <span><MapPin /> {job.location}</span>
            <span><GraduationCap /> {(job.batch || []).join(', ') || 'Any batch'}</span>
            <span><CalendarClock /> {job.deadline ? new Date(job.deadline).toLocaleDateString() : 'Rolling'}</span>
          </div>
          <a className="apply-link" href={job.applyLink} target="_blank" rel="noreferrer">Apply now</a>
        </article>
      ))}
    </div>
  );
}

function splitCsv(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

createRoot(document.getElementById('root')).render(<App />);
