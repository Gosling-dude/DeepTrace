import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-dvh flex items-center px-5 sm:px-8 pt-[var(--nav-h)]">
      <div className="w-full max-w-7xl mx-auto">
        <p className="num text-sm text-bone-mute">404</p>
        <h1 className="display mt-4 text-[clamp(2.4rem,5.4vw,4.75rem)] text-bone">No trace of that page.</h1>
        <p className="mt-6 text-lg text-bone-dim max-w-md">
          The address may be wrong, or the page may have moved.
        </p>
        <Link to="/" className="btn-primary mt-8">Go to the home page</Link>
      </div>
    </div>
  );
}
