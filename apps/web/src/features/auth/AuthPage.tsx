import type { ReactNode } from "react";

interface AuthPageProps {
  children: ReactNode;
}

export function AuthPage({ children }: AuthPageProps) {
  return <main className="standalone-auth-page">{children}</main>;
}
