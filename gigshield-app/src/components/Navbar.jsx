import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const isAuth = !!localStorage.getItem('gs_access')
  const [scrolled, setScrolled] = useState(false)
  const isLanding = location.pathname === '/'

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!isLanding) {
    // Legacy simple navbar for authenticated app pages to avoid breaking dashboard layout
    return (
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-[#ffffff0f] backdrop-blur-xl bg-[#0a0e1a]/80">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="text-white font-bold text-lg font-[--font-display]">FlowFix</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="text-sm font-['IBM_Plex_Mono'] text-white">Home</Link>
            <Link to="/wallet" className="text-sm font-['IBM_Plex_Mono'] text-slate-400 hover:text-white">My Savings</Link>
            <Link to="/claims" className="text-sm font-['IBM_Plex_Mono'] text-slate-400 hover:text-white">Payments</Link>
            <Link to="/claim/active" className="text-sm font-['IBM_Plex_Mono'] text-slate-400 hover:text-white">Payout Tracker</Link>
            <button 
              onClick={() => {
                localStorage.clear()
                navigate('/login')
              }} 
              className="text-xs text-red-400 hover:text-red-300 ml-4 font-['IBM_Plex_Mono']"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
    )
  }

  // --- Landing Page Specific Nav from Prompt ---
  return (
    <nav 
      className={`fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-[1280px] rounded-full flex items-center justify-between transition-all duration-400 z-50 px-7 py-3.5 border border-[--night-border] ${
        scrolled 
          ? 'bg-[rgba(20,21,24,0.88)] backdrop-blur-[14px]' 
          : 'bg-[rgba(20,21,24,0.20)] backdrop-blur-[4px]'
      }`}
    >
      {/* Left Logo */}
      <Link to="/" className="flex items-center font-[--font-display] text-[18px] text-[--mist]">
        Flow
        <span className="inline-block w-[7px] h-[7px] rounded-full bg-[--orange] mx-[1px]" />
        Fix
      </Link>

      {/* Center Links */}
      <div className="hidden md:flex items-center gap-9 font-[--font-mono] text-[13px]">
        {['How it Works', 'Protection Plans', 'Driver Stories', 'Fund Status'].map((label) => (
          <a a href={`#${label.toLowerCase().replace(/ /g, '-')}`} key={label} className="text-[rgba(229,231,235,0.6)] hover:text-[--orange] transition-colors duration-200">
            {label}
          </a>
        ))}
      </div>

      {/* Right CTA */}
      <div className="flex items-center gap-4">
        {isAuth ? (
          <Link 
            to="/dashboard" 
            className="font-[--font-mono] text-[13px] font-semibold rounded-full px-6 py-2.5 text-[#0d0e0f] border-none cursor-pointer transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              boxShadow: '0 0 20px rgba(249,115,22,0.25)'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.filter = 'brightness(1.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.filter = 'brightness(1)'; }}
          >
            Go to Dashboard
          </Link>
        ) : (
          <Link 
            to="/login" 
            className="font-[--font-mono] text-[13px] font-semibold rounded-full px-6 py-2.5 text-[#0d0e0f] border-none cursor-pointer transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              boxShadow: '0 0 20px rgba(249,115,22,0.25)'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.filter = 'brightness(1.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.filter = 'brightness(1)'; }}
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  )
}
