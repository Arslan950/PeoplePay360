import { useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'

const accounts = [
  { email: 'aarav@corp.com', password: 'Admin@123', role: 'Administrator', name: 'Aarav' },
  { email: 'nisha@corp.com', password: 'Manager@123', role: 'Manager', name: 'Nisha' },
  { email: 'rohan@corp.com', password: 'Employee@123', role: 'Employee', name: 'Rohan' },
  { email: 'meera@corp.com', password: 'HR@123', role: 'HR Manager', name: 'Meera' },
  { email: 'dev@corp.com', password: 'Employee@123', role: 'Employee', name: 'Dev' },
]

function Dashboard({ user, onLogout }) {
  const cards = user.role === 'Employee'
    ? [['My leave balance', '18 days'], ['This month attendance', '96%'], ['Next payday', 'Sep 30']]
    : [['Employees', '24'], ['Pending requests', '3'], ['Next payroll', 'Sep 30']]

  return <main className="dashboard">
    <header className="dashboard-header"><div className="brand"><span>PP</span> PeoplePay360</div><button className="logout-button" onClick={onLogout}>Log out</button></header>
    <section className="dashboard-content"><p className="eyebrow">{user.role} dashboard</p><h1>Welcome back, {user.name}</h1><p className="subtitle">Here is your workspace overview.</p>
      <div className="cards">{cards.map(([label, value]) => <article className="card" key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
    </section>
  </main>
}

function Login({ onLogin }) {
  const [email, setEmail] = useState(accounts[0].email)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const selectedAccount = accounts.find((account) => account.email === email)

  function handleSubmit(event) {
    event.preventDefault()
    if (!selectedAccount || password !== selectedAccount.password) return setError('Incorrect password. Use the demo password shown below.')
    onLogin(selectedAccount)
  }

  return <main className="login-page">
    <form className="login-card" onSubmit={handleSubmit}>
      <div className="logo">PP</div><h1>Welcome back</h1><p>Sign in to continue to your workspace.</p>
      <label htmlFor="email">Work email</label>
      <select id="email" value={email} onChange={(event) => { setEmail(event.target.value); setPassword(''); setError('') }}>
        {accounts.map((account) => <option value={account.email} key={account.email}>{account.email} — {account.role}</option>)}
      </select>
      <label htmlFor="password">Password</label>
      <input id="password" type="password" value={password} onChange={(event) => { setPassword(event.target.value); setError('') }} placeholder="Enter password" autoComplete="current-password" />
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="sign-in-button" type="submit">Sign in</button>
      <div className="demo-credentials"><strong>Demo credentials</strong><span>User ID: {selectedAccount.email}</span><span>Password: {selectedAccount.password}</span></div>
    </form>
  </main>
}

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('peoplepay360-user') || 'null'))
  const navigate = useNavigate()
  function handleLogin(account) { localStorage.setItem('peoplepay360-user', JSON.stringify(account)); setUser(account); navigate('/dashboard') }
  function handleLogout() { localStorage.removeItem('peoplepay360-user'); setUser(null); navigate('/login') }

  return <Routes>
    <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />} />
    <Route path="/dashboard" element={user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}
