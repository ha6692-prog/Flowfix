import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ActiveClaim from './pages/ActiveClaim'
import Wallet from './pages/Wallet'
import Claims from './pages/Claims'
import useActivityBeacon from './hooks/useActivityBeacon'

export default function App() {
  useActivityBeacon()

  return (
    <BrowserRouter>
      <div className="app-wrapper">
        <Navbar />
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />

          {/* Protected */}
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/claim/active" element={
            <ProtectedRoute><ActiveClaim /></ProtectedRoute>
          } />
          <Route path="/wallet" element={
            <ProtectedRoute><Wallet /></ProtectedRoute>
          } />
          <Route path="/claims" element={
            <ProtectedRoute><Claims /></ProtectedRoute>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
