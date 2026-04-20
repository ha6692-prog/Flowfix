import axios from 'axios'

// ── API URL Configuration ────────────────────────────────────────────────────
const PROD_BASE = 'https://flowfix-l2vs.onrender.com'

const normalizeApiUrl = (rawBase) => {
  const trimmed = (rawBase || '').trim().replace(/\/$/, '')
  if (!trimmed) return ''
  return trimmed.endsWith('/api') ? `${trimmed}/` : `${trimmed}/api/`
}

const isLocalApiBase = (baseUrl) => /localhost|127\.0\.0\.1/i.test(baseUrl || '')

const resolveApiBase = () => {
  const envBase = normalizeApiUrl(import.meta.env.VITE_API_URL)
  const prodBase = normalizeApiUrl(PROD_BASE)
  const allowLocalApi = String(import.meta.env.VITE_ALLOW_LOCAL_API || '').toLowerCase() === 'true'

  // Use live API unless local API is explicitly allowed.
  if (envBase && isLocalApiBase(envBase) && !allowLocalApi) {
    return prodBase
  }

  return envBase || prodBase
}

const API_URL = resolveApiBase()

// ── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor: attach JWT ──────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gs_access')
  if (token && !token.startsWith('demo-access-')) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor: auto-refresh tokens ────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const hasNoResponse = !error.response

    // Recover from localhost backend offline by retrying once against live API.
    if (hasNoResponse && !original?._apiFallbackTried && isLocalApiBase(api.defaults.baseURL)) {
      original._apiFallbackTried = true
      const liveBase = normalizeApiUrl(PROD_BASE)
      api.defaults.baseURL = liveBase
      original.baseURL = liveBase
      return api(original)
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('gs_refresh')
      if (refresh && !refresh.startsWith('demo-refresh-')) {
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
  ping:           ()     => axios.request({ method: 'options', url: `${API_URL}auth/register/` }),
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
  const driver = JSON.parse(localStorage.getItem('gs_driver') || '{}')
  const pid = (driver.platform_id || '').toUpperCase()
  // Prefer role derived from the current driver profile to avoid stale gs_role.
  if (pid) return pid.startsWith('ADMIN-') ? 'admin' : 'worker'
  const stored = localStorage.getItem('gs_role')
  if (stored) return stored
  return 'worker'
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

export const isNotFoundError = (err) => err?.response?.status === 404

export const getApiBase = () => api.defaults.baseURL

export default api
