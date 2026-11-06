import type { ReactNode } from 'react';
import SpectrumField from './SpectrumField';

/** Shared layout for sign-in, sign-up and password reset. */
export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-dvh grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex items-center justify-center px-5 sm:px-8 pt-[calc(var(--nav-h)+2.5rem)] pb-16">
        <div className="w-full max-w-sm">
          <h1 className="display text-4xl text-bone">{title}</h1>
          <p className="mt-3 text-bone-dim">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 pt-6 border-t border-line text-sm text-bone-dim">{footer}</div>}
        </div>
      </div>

      <div className="relative hidden lg:block bg-ink-950 border-l border-line overflow-hidden">
        <SpectrumField anchor={[0.5, 0.5]} className="fade absolute inset-0 w-full h-full" />
        <p className="absolute left-8 bottom-8 right-8 text-sm text-bone-mute max-w-sm">
          The frequency spectrum of an upsampled image. The repeating peaks are what the model looks for.
        </p>
      </div>
    </div>
  );
}
