import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  ClipboardList,
  Copy,
  CreditCard,
  Crown,
  Edit,
  FileText,
  Filter,
  GraduationCap,
  Home,
  IndianRupee,
  Lock,
  LogOut,
  MapPin,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCog,
  Users
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
  companyLogo: '',
  role: '',
  location: '',
  salary: '',
  batch: '2025, 2026',
  branch: 'CSE, IT',
  experience: 'Freshers',
  deadline: '',
  expiryDate: '',
  applyLink: '',
  description: '',
  eligibility: '',
  skills: 'Java, DSA',
  selectionProcess: '',
  tags: '',
  jobType: 'Full Time',
  remote: false,
  workMode: 'On-site',
  status: 'published',
  source: 'dashboard',
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
      setMessage(payload.user.role === 'admin' ? 'Admin console ready.' : 'Welcome back. Fresh jobs are ready.');
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
    if (!token || user?.role === 'admin') return;
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    try {
      const payload = await api(`/api/jobs?${params.toString()}`, { headers: authHeaders });
      setJobs(payload.jobs || []);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function fetchPremiumJobs() {
    if (!token || !user?.isPremium || user?.role === 'admin') return;
    try {
      const payload = await api('/api/premium/jobs', { headers: authHeaders });
      setPremiumJobs(payload.jobs || []);
      setTelegramGroup(payload.telegramGroup || '');
    } catch (error) {
      setMessage(error.message);
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
  }, [token, user?.role]);

  useEffect(() => {
    fetchPremiumJobs();
  }, [token, user?.isPremium, user?.role]);

  if (!token || !user) {
    return (
      <AuthScreen
        mode={mode}
        setMode={setMode}
        login={login}
        setLogin={setLogin}
        register={register}
        setRegister={setRegister}
        loading={loading}
        message={message}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
    );
  }

  if (user.role === 'admin') {
    return <AdminDashboard api={api} authHeaders={authHeaders} user={user} message={message} setMessage={setMessage} logout={logout} />;
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
      </section>
    </main>
  );
}

function AuthScreen({ mode, setMode, login, setLogin, register, setRegister, loading, message, onLogin, onRegister }) {
  return (
    <main className="auth-shell">
      <section className="auth-copy">
        <div className="brand-row">
          <BriefcaseBusiness />
          <span>Off-Cam</span>
        </div>
        <h1>Find off-campus roles before the deadline rush.</h1>
        <p>A student-first dashboard for freshers, internships, premium filtered jobs, and admin-curated updates.</p>
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
          <form onSubmit={onLogin} className="form-stack">
            <Input label="Email" value={login.email} onChange={(email) => setLogin({ ...login, email })} />
            <Input label="Password" type="password" value={login.password} onChange={(password) => setLogin({ ...login, password })} />
            <button className="primary" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button>
          </form>
        ) : (
          <form onSubmit={onRegister} className="form-stack">
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

const adminNav = [
  ['overview', 'Dashboard', Home],
  ['jobs', 'Jobs', BriefcaseBusiness],
  ['users', 'Users', Users],
  ['premium', 'Premium', Crown],
  ['payments', 'Payments', CreditCard],
  ['notifications', 'Notifications', Bell],
  ['telegram', 'Telegram', Send],
  ['analytics', 'Analytics', BarChart3],
  ['reports', 'Reports', FileText],
  ['settings', 'Settings', Settings],
  ['profile', 'Profile', UserCog]
];

function AdminDashboard({ api, authHeaders, user, message, setMessage, logout }) {
  const [section, setSection] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [users, setUsers] = useState([]);
  const [premiumUsers, setPremiumUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [settings, setSettings] = useState(null);
  const [jobForm, setJobForm] = useState(emptyJob);
  const [editingJobId, setEditingJobId] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [notification, setNotification] = useState({ title: '', message: '', audience: 'all', delivery: ['website', 'email'] });
  const [loading, setLoading] = useState(false);

  async function loadAdmin() {
    setLoading(true);
    try {
      const [overviewData, jobsData, usersData, premiumData, paymentsData, settingsData] = await Promise.all([
        api('/api/admin/overview', { headers: authHeaders }),
        api('/api/admin/jobs', { headers: authHeaders }),
        api('/api/admin/users', { headers: authHeaders }),
        api('/api/admin/premium-users', { headers: authHeaders }),
        api('/api/admin/payments', { headers: authHeaders }),
        api('/api/admin/settings', { headers: authHeaders })
      ]);
      setOverview(overviewData);
      setJobs(overviewData ? jobsData.jobs || [] : jobsData.jobs || []);
      setUsers(usersData.users || []);
      setPremiumUsers(premiumData.users || []);
      setPayments(paymentsData.payments || []);
      setSettings(settingsData);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveJob(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const body = serializeJob(jobForm);
      const path = editingJobId ? `/api/admin/jobs/${editingJobId}` : '/api/admin/jobs';
      const method = editingJobId ? 'PATCH' : 'POST';
      const result = await api(path, { method, headers: authHeaders, body: JSON.stringify(body) });
      setJobForm(emptyJob);
      setEditingJobId('');
      const sent = result.notifications || { email: 0, telegram: 0, dashboard: 0 };
      setMessage(body.status === 'published'
        ? `Job published successfully. Email: ${sent.email}, Telegram: ${sent.telegram}, Dashboard: ${sent.dashboard}.`
        : 'Job saved as draft.');
      await loadAdmin();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateJob(id, updates) {
    await api(`/api/admin/jobs/${id}`, { method: 'PATCH', headers: authHeaders, body: JSON.stringify(updates) });
    await loadAdmin();
  }

  async function deleteJob(id) {
    await api(`/api/admin/jobs/${id}`, { method: 'DELETE', headers: authHeaders });
    setMessage('Job expired/deactivated.');
    await loadAdmin();
  }

  async function duplicateJob(id) {
    await api(`/api/admin/jobs/${id}/duplicate`, { method: 'POST', headers: authHeaders });
    setMessage('Job duplicated as draft.');
    await loadAdmin();
  }

  async function updateUser(id, updates) {
    await api(`/api/admin/users/${id}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify(updates) });
    await loadAdmin();
  }

  async function deleteUser(id) {
    await api(`/api/admin/users/${id}`, { method: 'DELETE', headers: authHeaders });
    setMessage('User deleted.');
    await loadAdmin();
  }

  async function sendNotification(event) {
    event.preventDefault();
    const payload = await api('/api/admin/notifications', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(notification)
    });
    setMessage(`${payload.message}. Recipients: ${payload.notification.recipientCount}`);
    setNotification({ title: '', message: '', audience: 'all', delivery: ['website', 'email'] });
  }

  function editJob(job) {
    setEditingJobId(job._id);
    setJobForm({
      ...emptyJob,
      ...job,
      batch: (job.batch || []).join(', '),
      branch: (job.branch || []).join(', '),
      skills: (job.skills || []).join(', '),
      tags: (job.tags || []).join(', '),
      deadline: job.deadline ? job.deadline.slice(0, 10) : '',
      expiryDate: job.expiryDate ? job.expiryDate.slice(0, 10) : ''
    });
    setSection('jobs');
  }

  const filteredJobs = jobs.filter((job) => {
    const haystack = `${job.company} ${job.role} ${job.location}`.toLowerCase();
    return (!query || haystack.includes(query.toLowerCase())) && (!statusFilter || job.status === statusFilter);
  });

  useEffect(() => {
    loadAdmin();
  }, []);

  return (
    <main className="app-shell admin-shell">
      <aside className="sidebar admin-sidebar">
        <div className="brand-row">
          <ShieldCheck />
          <span>Off-Cam Admin</span>
        </div>
        <nav>
          {adminNav.map(([key, label, Icon]) => (
            <button key={key} className={section === key ? 'active' : ''} onClick={() => setSection(key)}>
              <Icon /> {label}
            </button>
          ))}
        </nav>
        <button className="ghost logout" onClick={logout}><LogOut /> Logout</button>
      </aside>

      <section className="workspace admin-workspace">
        <header className="topbar admin-topbar">
          <div>
            <p className="eyebrow">Admin Dashboard</p>
            <h1>{adminNav.find(([key]) => key === section)?.[1]}</h1>
          </div>
          <button className="ghost" onClick={loadAdmin} disabled={loading}><RefreshCw /> Refresh</button>
        </header>
        {message && <p className="message wide">{message}</p>}

        {section === 'overview' && <Overview overview={overview} />}
        {section === 'jobs' && (
          <JobsAdmin
            jobs={filteredJobs}
            query={query}
            setQuery={setQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            jobForm={jobForm}
            setJobForm={setJobForm}
            editingJobId={editingJobId}
            setEditingJobId={setEditingJobId}
            saveJob={saveJob}
            editJob={editJob}
            updateJob={updateJob}
            deleteJob={deleteJob}
            duplicateJob={duplicateJob}
            loading={loading}
          />
        )}
        {section === 'users' && <UsersAdmin users={users} updateUser={updateUser} deleteUser={deleteUser} />}
        {section === 'premium' && <PremiumAdmin users={premiumUsers} updateUser={updateUser} payments={payments} />}
        {section === 'payments' && <PaymentsAdmin payments={payments} />}
        {section === 'notifications' && <NotificationsAdmin notification={notification} setNotification={setNotification} sendNotification={sendNotification} />}
        {section === 'telegram' && <TelegramAdmin settings={settings} premiumUsers={premiumUsers} />}
        {section === 'analytics' && <AnalyticsAdmin overview={overview} jobs={jobs} payments={payments} />}
        {section === 'reports' && <ReportsAdmin users={users} jobs={jobs} payments={payments} premiumUsers={premiumUsers} />}
        {section === 'settings' && <SettingsAdmin settings={settings} />}
        {section === 'profile' && <ProfileAdmin user={user} logout={logout} />}
      </section>
    </main>
  );
}

function Overview({ overview }) {
  const summary = overview?.summary || {};
  return (
    <>
      <section className="admin-stat-grid">
        <Stat icon={<Users />} label="Total Users" value={summary.totalUsers || 0} />
        <Stat icon={<Crown />} label="Premium Users" value={summary.premiumUsers || 0} />
        <Stat icon={<BriefcaseBusiness />} label="Active Jobs" value={summary.activeJobs || 0} />
        <Stat icon={<IndianRupee />} label="Revenue" value={formatMoney(summary.revenue || 0)} />
      </section>
      <section className="admin-stat-grid small">
        <Stat label="Today's Signups" value={summary.todaysSignups || 0} />
        <Stat label="Today's Payments" value={summary.todaysPayments || 0} />
        <Stat label="Jobs Posted Today" value={summary.jobsPostedToday || 0} />
        <Stat label="Expiring Plans" value={summary.expiringPlans || 0} />
        <Stat label="Published Jobs" value={summary.publishedJobs || 0} />
        <Stat label="Draft Jobs" value={summary.draftJobs || 0} />
        <Stat label="Expired Jobs" value={summary.expiredJobs || 0} />
      </section>
      <section className="admin-grid-two">
        <Chart title="Revenue Last 30 Days" data={overview?.charts?.revenue || []} money />
        <Chart title="User Registrations" data={overview?.charts?.registrations || []} />
        <Chart title="Premium Growth" data={overview?.charts?.premiumGrowth || []} />
        <Chart title="Jobs Posted per Day" data={overview?.charts?.jobsPosted || []} />
      </section>
    </>
  );
}

function JobsAdmin(props) {
  const {
    jobs,
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    jobForm,
    setJobForm,
    editingJobId,
    setEditingJobId,
    saveJob,
    editJob,
    updateJob,
    deleteJob,
    duplicateJob,
    loading
  } = props;

  return (
    <>
      <section className="admin-panel">
        <div className="section-heading">
          <h2>{editingJobId ? 'Edit Job' : 'Add Job'}</h2>
          {editingJobId && <button className="ghost" onClick={() => { setEditingJobId(''); setJobForm(emptyJob); }}>Cancel Edit</button>}
        </div>
        <form className="job-form admin-job-form" onSubmit={saveJob}>
          <Input label="Company" value={jobForm.company} onChange={(company) => setJobForm({ ...jobForm, company })} />
          <Input label="Company Logo" value={jobForm.companyLogo || ''} onChange={(companyLogo) => setJobForm({ ...jobForm, companyLogo })} />
          <Input label="Role" value={jobForm.role} onChange={(role) => setJobForm({ ...jobForm, role })} />
          <Input label="Location" value={jobForm.location} onChange={(location) => setJobForm({ ...jobForm, location })} />
          <Input label="Package" value={jobForm.salary} onChange={(salary) => setJobForm({ ...jobForm, salary })} />
          <Input label="Experience" value={jobForm.experience} onChange={(experience) => setJobForm({ ...jobForm, experience })} />
          <Input label="Batch" value={jobForm.batch} onChange={(batch) => setJobForm({ ...jobForm, batch })} />
          <Input label="Branch" value={jobForm.branch} onChange={(branch) => setJobForm({ ...jobForm, branch })} />
          <Select label="Job Type" value={jobForm.jobType} onChange={(jobType) => setJobForm({ ...jobForm, jobType })} options={['Full Time', 'Internship', 'Internship + PPO']} />
          <Select label="Remote" value={jobForm.remote ? 'Yes' : 'No'} onChange={(remote) => setJobForm({ ...jobForm, remote: remote === 'Yes', workMode: remote === 'Yes' ? 'Remote' : 'On-site' })} options={['No', 'Yes']} />
          <Select label="Status" value={jobForm.status} onChange={(status) => setJobForm({ ...jobForm, status })} options={['draft', 'published']} />
          <Select label="Source" value={jobForm.source} onChange={(source) => setJobForm({ ...jobForm, source })} options={['dashboard', 'telegram']} />
          <Input label="Deadline" type="date" value={jobForm.deadline} onChange={(deadline) => setJobForm({ ...jobForm, deadline })} />
          <Input label="Hide After" type="date" value={jobForm.expiryDate} onChange={(expiryDate) => setJobForm({ ...jobForm, expiryDate })} />
          <Input label="Application Link" value={jobForm.applyLink} onChange={(applyLink) => setJobForm({ ...jobForm, applyLink })} />
          <label className="textarea-label">
            Description
            <textarea value={jobForm.description} onChange={(event) => setJobForm({ ...jobForm, description: event.target.value })} />
          </label>
          <label className="textarea-label">
            Eligibility
            <textarea value={jobForm.eligibility || ''} onChange={(event) => setJobForm({ ...jobForm, eligibility: event.target.value })} />
          </label>
          <Input label="Skills Required" value={jobForm.skills || ''} onChange={(skills) => setJobForm({ ...jobForm, skills })} />
          <label className="textarea-label">
            Selection Process
            <textarea value={jobForm.selectionProcess || ''} onChange={(event) => setJobForm({ ...jobForm, selectionProcess: event.target.value })} />
          </label>
          <Input label="Tags" value={jobForm.tags} onChange={(tags) => setJobForm({ ...jobForm, tags })} />
          <label className="check-label">
            <input type="checkbox" checked={jobForm.isPremium} onChange={(event) => setJobForm({ ...jobForm, isPremium: event.target.checked })} />
            Premium job
          </label>
          <button className="primary" disabled={loading}><Plus /> {jobForm.status === 'published' ? 'Publish Job' : editingJobId ? 'Save Draft' : 'Create Draft'}</button>
        </form>
      </section>

      <section className="admin-panel">
        <div className="section-heading">
          <h2>All Jobs</h2>
          <button className="primary" onClick={() => { setEditingJobId(''); setJobForm(emptyJob); }}><Plus /> Add Job</button>
        </div>
        <div className="admin-filters">
          <label className="search-box">
            <Search />
            <input placeholder="Search company, role, location" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <Select label="Status" value={statusFilter} onChange={setStatusFilter} options={['', 'draft', 'published', 'expired']} />
        </div>
        <DataTable
          columns={['Company', 'Role', 'Source', 'Views', 'Created By', 'Status', 'Deadline', 'Expiry', 'Actions']}
          rows={jobs.map((job) => [
            job.company,
            job.role,
            job.source || 'dashboard',
            job.views || 0,
            job.postedBy?.name || job.postedBy?.email || '-',
            <Badge tone={job.status === 'published' ? 'green' : job.status === 'draft' ? 'yellow' : 'gray'}>{job.status}</Badge>,
            formatDate(job.deadline),
            formatDate(job.expiryDate),
            <ActionGroup>
              <button onClick={() => editJob(job)}><Edit /> Edit</button>
              <button onClick={() => updateJob(job._id, { status: 'draft' })}>Draft</button>
              <button onClick={() => updateJob(job._id, { status: 'published', isActive: true })}>Publish</button>
              <button onClick={() => updateJob(job._id, { status: 'expired' })}>Expire</button>
              <button onClick={() => duplicateJob(job._id)}><Copy /> Duplicate</button>
              <button className="danger" onClick={() => deleteJob(job._id)}><Trash2 /> Delete</button>
            </ActionGroup>
          ])}
        />
      </section>
    </>
  );
}

function UsersAdmin({ users, updateUser, deleteUser }) {
  const [query, setQuery] = useState('');
  const filtered = users.filter((user) => `${user.name} ${user.email} ${user.preferences?.batch || ''} ${user.preferences?.branch || ''}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <section className="admin-panel">
      <div className="section-heading">
        <h2>Users</h2>
        <span>{filtered.length} users</span>
      </div>
      <label className="search-box full">
        <Search />
        <input placeholder="Search by email, batch, college, branch" value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <DataTable
        columns={['Name', 'Email', 'Batch', 'Premium', 'Expiry', 'Actions']}
        rows={filtered.map((item) => [
          item.name,
          item.email,
          item.preferences?.batch || '-',
          item.isPremium ? 'Yes' : 'No',
          formatDate(item.subscriptionExpiry),
          <ActionGroup>
            <button onClick={() => alert(JSON.stringify(item, null, 2))}>View</button>
            <button onClick={() => updateUser(item._id, { isBlocked: !item.isBlocked })}>{item.isBlocked ? 'Unblock' : 'Block'}</button>
            <button onClick={() => updateUser(item._id, { isPremium: true, subscriptionPlan: 'quarterly', extendDays: 90 })}>Upgrade</button>
            <button onClick={() => updateUser(item._id, { isPremium: false, subscriptionPlan: 'none', subscriptionExpiry: null })}>Downgrade</button>
            <button onClick={() => updateUser(item._id, { extendDays: 30 })}>Extend</button>
            <button className="danger" onClick={() => deleteUser(item._id)}>Delete</button>
          </ActionGroup>
        ])}
      />
    </section>
  );
}

function PremiumAdmin({ users, updateUser, payments }) {
  return (
    <section className="admin-panel">
      <div className="section-heading">
        <h2>Premium Subscribers</h2>
        <span>{users.length} active or historical premium users</span>
      </div>
      <DataTable
        columns={['Name', 'Plan', 'Expiry', 'Payment', 'Actions']}
        rows={users.map((user) => {
          const payment = payments.find((item) => item.userId?._id === user._id || item.userId === user._id);
          return [
            user.name,
            user.subscriptionPlan || 'quarterly',
            expiryLabel(user.subscriptionExpiry),
            payment?.razorpayPaymentId || payment?.status || '-',
            <ActionGroup>
              <button onClick={() => updateUser(user._id, { extendDays: 30 })}>Extend</button>
              <button onClick={() => updateUser(user._id, { isPremium: false, subscriptionPlan: 'none', subscriptionExpiry: null })}>Cancel</button>
              <button>Refund</button>
              <button onClick={() => alert(JSON.stringify(payment || {}, null, 2))}>View Payment</button>
            </ActionGroup>
          ];
        })}
      />
    </section>
  );
}

function PaymentsAdmin({ payments }) {
  function exportCsv() {
    downloadCsv('payments.csv', payments.map((payment) => ({
      paymentId: payment.razorpayPaymentId || payment.razorpayOrderId,
      user: payment.userId?.email || '',
      amount: payment.amount,
      status: payment.status,
      date: payment.paidAt || payment.createdAt
    })));
  }

  return (
    <section className="admin-panel">
      <div className="section-heading">
        <h2>Payments</h2>
        <button className="ghost" onClick={exportCsv}><FileText /> Export CSV</button>
      </div>
      <DataTable
        columns={['Payment ID', 'User', 'Amount', 'Status', 'Date', 'Actions']}
        rows={payments.map((payment) => [
          payment.razorpayPaymentId || payment.razorpayOrderId,
          payment.userId?.email || '-',
          formatMoney(payment.amount),
          <Badge tone={payment.status === 'paid' ? 'green' : payment.status === 'failed' ? 'red' : 'yellow'}>{payment.status}</Badge>,
          formatDate(payment.paidAt || payment.createdAt),
          <ActionGroup><button onClick={() => alert(JSON.stringify(payment, null, 2))}>View</button></ActionGroup>
        ])}
      />
    </section>
  );
}

function NotificationsAdmin({ notification, setNotification, sendNotification }) {
  return (
    <section className="admin-panel">
      <div className="section-heading">
        <h2>Compose Notification</h2>
        <span>Website, Email, Telegram</span>
      </div>
      <form className="notification-form" onSubmit={sendNotification}>
        <Input label="Title" value={notification.title} onChange={(title) => setNotification({ ...notification, title })} />
        <Select label="Audience" value={notification.audience} onChange={(audience) => setNotification({ ...notification, audience })} options={['all', 'premium', 'free', 'batch', 'company']} />
        <label className="textarea-label">
          Message
          <textarea value={notification.message} onChange={(event) => setNotification({ ...notification, message: event.target.value })} />
        </label>
        <div className="delivery-row">
          {['website', 'email', 'telegram'].map((item) => (
            <label className="check-label" key={item}>
              <input
                type="checkbox"
                checked={notification.delivery.includes(item)}
                onChange={(event) => {
                  const next = event.target.checked ? [...notification.delivery, item] : notification.delivery.filter((value) => value !== item);
                  setNotification({ ...notification, delivery: next });
                }}
              />
              {item}
            </label>
          ))}
        </div>
        <button className="primary"><Send /> Send</button>
      </form>
    </section>
  );
}

function TelegramAdmin({ settings, premiumUsers }) {
  const invite = settings?.telegramConfigured ? 'Configured in server environment' : 'Telegram group link is not configured';
  return (
    <section className="admin-grid-two">
      <Panel title="Premium Group">
        <InfoRow label="Members" value={premiumUsers.length} />
        <InfoRow label="Pending Requests" value="Manual for v1" />
        <InfoRow label="Invite Link" value={invite} />
        <div className="button-row">
          <button className="primary"><Send /> Generate Invite Link</button>
          <button className="ghost">Disable Link</button>
          <button className="ghost" onClick={() => navigator.clipboard?.writeText(invite)}><Copy /> Copy</button>
        </div>
      </Panel>
      <Panel title="Bot Automation">
        <p className="muted">Telegram Bot automation is planned for the next phase. Current v1 uses the configured premium group link.</p>
      </Panel>
    </section>
  );
}

function AnalyticsAdmin({ overview, jobs, payments }) {
  const topCompanies = countBy(jobs, 'company');
  const popularRoles = countBy(jobs, 'role');
  return (
    <section className="admin-grid-two">
      <Chart title="Daily Users" data={overview?.charts?.registrations || []} />
      <Chart title="Premium Growth" data={overview?.charts?.premiumGrowth || []} />
      <Chart title="Revenue" data={overview?.charts?.revenue || []} money />
      <Chart title="Jobs Posted" data={overview?.charts?.jobsPosted || []} />
      <ListPanel title="Top Companies" items={topCompanies} />
      <ListPanel title="Popular Roles" items={popularRoles} />
      <Panel title="Application Clicks">
        <p className="muted">Trackable apply links can be added in Phase 2 analytics.</p>
      </Panel>
      <Panel title="Most Viewed Jobs">
        <p className="muted">Views require a job-view event collection.</p>
      </Panel>
    </section>
  );
}

function ReportsAdmin({ users, jobs, payments, premiumUsers }) {
  const reports = [
    ['Users Report', users],
    ['Jobs Report', jobs],
    ['Revenue Report', payments.filter((payment) => payment.status === 'paid')],
    ['Payments Report', payments],
    ['Premium Users Report', premiumUsers]
  ];
  return (
    <section className="admin-panel">
      <div className="section-heading">
        <h2>Reports</h2>
        <span>CSV export available now</span>
      </div>
      <div className="report-grid">
        {reports.map(([label, rows]) => (
          <article className="report-card" key={label}>
            <FileText />
            <h3>{label}</h3>
            <p>{rows.length} records</p>
            <div className="button-row">
              <button className="primary" onClick={() => downloadCsv(`${label.toLowerCase().replaceAll(' ', '-')}.csv`, rows)}>CSV</button>
              <button className="ghost">Excel</button>
              <button className="ghost">PDF</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SettingsAdmin({ settings }) {
  return (
    <section className="admin-grid-two">
      <Panel title="General">
        <InfoRow label="Website Name" value={settings?.websiteName || 'Off-Cam'} />
        <InfoRow label="Support Email" value={settings?.supportEmail || '-'} />
        <InfoRow label="Contact" value="Add support phone in env/settings later" />
        <InfoRow label="Social Links" value="Not configured" />
      </Panel>
      <Panel title="Pricing">
        <InfoRow label="Free Plan" value="Job dashboard access" />
        <InfoRow label="Premium Price" value={formatMoney(settings?.premiumPrice || 0)} />
        <InfoRow label="Subscription Days" value={settings?.subscriptionDays || 90} />
      </Panel>
      <Panel title="Payment">
        <InfoRow label="Razorpay Keys" value={settings?.razorpayConfigured ? 'Configured' : 'Missing'} />
        <InfoRow label="Webhook Status" value={settings?.razorpayConfigured ? 'Ready' : 'Not ready'} />
      </Panel>
      <Panel title="Email and Telegram">
        <InfoRow label="SMTP Settings" value={settings?.emailConfigured ? 'Configured' : 'Missing'} />
        <InfoRow label="Bot Token" value={settings?.telegramConfigured ? 'Configured' : 'Missing'} />
        <InfoRow label="Group Link" value={settings?.telegramConfigured ? 'Configured' : 'Missing'} />
      </Panel>
    </section>
  );
}

function ProfileAdmin({ user, logout }) {
  return (
    <section className="admin-grid-two">
      <Panel title="Profile">
        <InfoRow label="Name" value={user.name} />
        <InfoRow label="Email" value={user.email} />
        <InfoRow label="Role" value={user.role} />
        <div className="button-row">
          <button className="ghost">Change Password</button>
          <button className="ghost">2FA Future</button>
          <button className="primary" onClick={logout}><LogOut /> Logout</button>
        </div>
      </Panel>
      <Panel title="Nice-to-Have Queue">
        <ul className="plain-list">
          <li>Job approval queue</li>
          <li>Bulk upload jobs</li>
          <li>Scheduled posting</li>
          <li>Duplicate detection</li>
          <li>Homepage banner manager</li>
          <li>Contact messages inbox</li>
        </ul>
      </Panel>
    </section>
  );
}

function Metric({ icon, value, label }) {
  return <div className="metric">{icon}<strong>{value}</strong><span>{label}</span></div>;
}

function Stat({ icon, label, value }) {
  return <article className="admin-stat">{icon}<span>{label}</span><strong>{value}</strong></article>;
}

function Panel({ title, children }) {
  return <section className="admin-panel"><h2>{title}</h2>{children}</section>;
}

function InfoRow({ label, value }) {
  return <div className="info-row"><span>{label}</span><strong>{value}</strong></div>;
}

function Chart({ title, data, money = false }) {
  const max = Math.max(...data.map((item) => Number(item.value) || 0), 1);
  return (
    <section className="admin-panel">
      <h2>{title}</h2>
      <div className="bar-chart">
        {data.length ? data.slice(-14).map((item, index) => (
          <div className="bar-item" key={`${item.label}-${index}`}>
            <span style={{ height: `${Math.max(8, (Number(item.value) / max) * 120)}px` }} />
            <small>{money ? formatMoney(item.value) : item.value}</small>
          </div>
        )) : <p className="muted">No data yet.</p>}
      </div>
    </section>
  );
}

function ListPanel({ title, items }) {
  return (
    <Panel title={title}>
      <ul className="rank-list">
        {items.length ? items.map((item) => <li key={item.label}><span>{item.label}</span><strong>{item.value}</strong></li>) : <li><span>No data yet</span><strong>0</strong></li>}
      </ul>
    </Panel>
  );
}

function Input({ label, value, onChange, type = 'text', compact = false }) {
  return (
    <label className={compact ? 'input-label compact-input' : 'input-label'}>
      {label}
      <input type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="input-label">
      {label}
      <select value={value || ''} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option || 'All'}</option>)}
      </select>
    </label>
  );
}

function DataTable({ columns, rows }) {
  return (
    <div className="table-wrap">
      <table className="admin-table">
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, index) => (
            <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
          )) : (
            <tr><td colSpan={columns.length}>No records found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ActionGroup({ children }) {
  return <div className="action-group">{children}</div>;
}

function Badge({ tone = 'gray', children }) {
  return <span className={`badge ${tone}`}>{children}</span>;
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
            <span><CalendarClock /> {formatDate(job.deadline) || 'Rolling'}</span>
          </div>
          <a className="apply-link" href={job.applyLink} target="_blank" rel="noreferrer">Apply now</a>
        </article>
      ))}
    </div>
  );
}

function serializeJob(job) {
  return {
    ...job,
    batch: splitCsv(job.batch),
    branch: splitCsv(job.branch),
    skills: splitCsv(job.skills),
    tags: splitCsv(job.tags),
    workMode: job.remote ? 'Remote' : 'On-site',
    deadline: job.deadline ? new Date(job.deadline).toISOString() : '',
    expiryDate: job.expiryDate ? new Date(job.expiryDate).toISOString() : ''
  };
}

function splitCsv(value = '') {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMoney(value) {
  return `Rs. ${Math.round(Number(value || 0) / 100).toLocaleString('en-IN')}`;
}

function expiryLabel(value) {
  if (!value) return 'No expiry';
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (days < 0) return `Expired ${Math.abs(days)} days ago`;
  if (days === 1) return 'Expires tomorrow';
  if (days <= 7) return `Expires in ${days} days`;
  return formatDate(value);
}

function countBy(items, key) {
  const map = new Map();
  for (const item of items) {
    const label = item[key] || 'Unknown';
    map.set(label, (map.get(label) || 0) + 1);
  }
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6);
}

function downloadCsv(filename, rows) {
  const safeRows = rows.map((row) => flattenRow(row));
  const headers = Object.keys(safeRows[0] || { empty: '' });
  const csv = [headers.join(','), ...safeRows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? '')).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function flattenRow(row) {
  const flat = {};
  for (const [key, value] of Object.entries(row)) {
    if (value && typeof value === 'object') {
      flat[key] = value.email || value.name || value._id || JSON.stringify(value);
    } else {
      flat[key] = value;
    }
  }
  return flat;
}

createRoot(document.getElementById('root')).render(<App />);
