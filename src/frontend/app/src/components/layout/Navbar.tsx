import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Menu, X, ChevronDown } from 'lucide-react';
import Logo from '../Logo';
import ThemeMenu from '../ThemeMenu';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Over the landing hero the bar is transparent until the page scrolls.
  const overHero = location.pathname === '/' && !scrolled && !mobileOpen;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!profileOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!profileRef.current?.contains(e.target as Node)) setProfileOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setProfileOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [profileOpen]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setProfileOpen(false);
  };

  const isActive = (path: string) =>
    path === '/analyze' || path === '/admin'
      ? location.pathname.startsWith(path)
      : location.pathname === path;

  const navLinks = isAuthenticated
    ? [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/analyze', label: 'Analyze' },
        { to: '/history', label: 'History' },
        ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin' }] : []),
      ]
    : [];

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 border-b transition-[background-color,border-color] duration-300 ${
        overHero ? 'border-transparent bg-transparent' : 'border-line bg-ink-900/90 backdrop-blur-md'
      }`}
      style={{ ['--logo-gap' as string]: overHero ? 'var(--well)' : 'var(--ground)' }}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-8">
            <Link to={isAuthenticated ? '/dashboard' : '/'} aria-label="DeepTrace home" className="flex items-center">
              <Logo />
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-stretch h-14">
              {navLinks.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  aria-current={isActive(to) ? 'page' : undefined}
                  className={`relative flex items-center px-3 text-sm font-medium transition-colors ${
                    isActive(to) ? 'text-bone' : 'text-bone-mute hover:text-bone'
                  }`}
                >
                  {label}
                  {isActive(to) && <span className="absolute inset-x-3 -bottom-px h-px bg-bone" />}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeMenu />
            {isAuthenticated ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                  className="flex items-center gap-2 h-9 pl-1 pr-2 rounded text-sm text-bone-dim hover:text-bone transition-colors"
                >
                  <span className="w-7 h-7 rounded-sm bg-bone text-ink-950 flex items-center justify-center text-xs font-semibold">
                    {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                  <span className="hidden sm:inline">{user?.full_name?.split(' ')[0]}</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
                </button>

                {profileOpen && (
                  <div
                    role="menu"
                    style={{ boxShadow: 'var(--shadow-pop)' }}
                    className="absolute right-0 mt-2 w-60 rounded-md border border-line-strong bg-ink-850 origin-top-right animate-[menu-in_0.16s_cubic-bezier(0.16,1,0.3,1)]"
                  >
                    <div className="px-4 py-3 border-b border-line">
                      <p className="text-sm font-medium text-bone truncate">{user?.full_name}</p>
                      <p className="text-xs text-bone-mute truncate">{user?.email}</p>
                    </div>
                    <div className="p-1">
                      <Link
                        to="/profile"
                        role="menuitem"
                        className="block px-3 py-2 rounded-sm text-sm text-bone-dim hover:text-bone hover:bg-bone/5 transition-colors"
                      >
                        Profile and settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        role="menuitem"
                        className="w-full text-left px-3 py-2 rounded-sm text-sm text-bone-dim hover:text-bone hover:bg-bone/5 transition-colors"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Link to="/login" className="hidden sm:inline-flex items-center h-9 px-3 text-sm font-medium text-bone-dim hover:text-bone transition-colors">
                  Sign in
                </Link>
                <Link to="/signup" className="btn-secondary btn-sm">
                  Create account
                </Link>
              </div>
            )}

            {navLinks.length > 0 && (
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileOpen}
                className="md:hidden w-10 h-10 -mr-2 flex items-center justify-center text-bone-dim hover:text-bone transition-colors"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-line bg-ink-900">
          <div className="px-5 py-2">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                aria-current={isActive(to) ? 'page' : undefined}
                className={`flex items-center min-h-[44px] text-base border-b border-line last:border-b-0 ${
                  isActive(to) ? 'text-bone font-medium' : 'text-bone-dim'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
