import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/admin', label: 'Analytics', end: true },
  { to: '/admin/users', label: 'Users', end: false },
  { to: '/admin/audit', label: 'Audit log', end: false },
];

/** Sub-navigation shared by the three admin pages. */
export default function AdminTabs() {
  return (
    <nav aria-label="Admin sections" className="seg mb-8">
      {TABS.map(({ to, label, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `seg-item ${isActive ? 'is-active' : ''}`}>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
