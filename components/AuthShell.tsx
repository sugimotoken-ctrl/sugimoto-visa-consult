import { Logo } from "@/components/Logo";

// Centered card shell for auth screens.
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--cream)] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size={40} />
        </div>
        <div className="card p-8">
          <h1 className="font-serif text-2xl text-[var(--navy)]">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-[var(--slate)]">{subtitle}</p>
          )}
          <div className="mt-6">{children}</div>
        </div>
        {footer && (
          <div className="mt-6 text-center text-sm text-[var(--slate)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
