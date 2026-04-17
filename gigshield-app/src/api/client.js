import axios from 'axios'

// ── API URL Configuration ────────────────────────────────────────────────────
// Use environment variable for production backend, fallback to /api for local proxy
const BASE = import.meta.env.VITE_API_URL || 'https://flowfix-l2vs.onrender.com'
const API_URL = BASE.endsWith('/api') ? `${BASE}/` : `${BASE}/api/`

// ── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor: attach JWT ──────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gs_access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response interceptor: auto-refresh tokens ────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('gs_refresh')
      if (refresh) {
        try {
          const { data } = await api.post('auth/token/refresh/', { refresh })
          localStorage.setItem('gs_access', data.access)
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch {
          localStorage.removeItem('gs_access')
          localStorage.removeItem('gs_refresh')
          localStorage.removeItem('gs_driver')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  },
)

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login:          (data) => api.post('auth/login/', data),
  register:       (data) => api.post('auth/register/', data),
  simpleRegister: (data) => api.post('auth/simple-register/', data),
}

// ── Policies ─────────────────────────────────────────────────────────────────
export const policiesApi = {
  listPlans:      ()       => api.get('policies/plans/'),
  activate:       (data)   => api.post('policies/activate/', data),
  myPolicy:       ()       => api.get('policies/my-policy/'),
  cancel:         ()       => api.post('policies/cancel/', {}),
}

// ── Monitoring ────────────────────────────────────────────────────────────────
export const monitoringApi = {
  beacon:  (data) => api.post('monitoring/beacon/', data),
  zoneEdz: ()     => api.get('monitoring/zone-edz/'),
}

// ── Claims ────────────────────────────────────────────────────────────────────
export const claimsApi = {
  myClaims:    (page = 1) => api.get(`claims/my-claims/?page=${page}`),
  activeClaim: ()         => api.get('claims/active/'),
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsApi = {
  publicStats: () => api.get('stats/public/'),
  poolHealth:  () => api.get('dashboard/pool-health/'),
}

// ── Admin ────────────────────────────────────────────────────────────────────
export const adminApi = {
  listDrivers: () => api.get('drivers/admin/list/'),
}

// ── Role helpers ──────────────────────────────────────────────────────────────
// Role is determined from the platform_id prefix stored in localStorage.
// ADMIN- prefix → admin | everything else → worker
export const getRole = () => {
  const stored = localStorage.getItem('gs_role')
  if (stored) return stored
  const driver = JSON.parse(localStorage.getItem('gs_driver') || '{}')
  const pid = (driver.platform_id || '').toUpperCase()
  return pid.startsWith('ADMIN-') ? 'admin' : 'worker'
}

export const detectPlatform = (platformId = '') => {
  const pid = platformId.toUpperCase()
  if (pid.startsWith('ZMT')) return 'Zomato'
  if (pid.startsWith('SWG')) return 'Swiggy'
  if (pid.startsWith('BLK')) return 'Blinkit'
  if (pid.startsWith('ADMIN')) return 'Admin'
  return null
}

// ── Amount formatter ──────────────────────────────────────────────────────────
export const formatINR = (value) =>
  Number(value).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })

export default api
