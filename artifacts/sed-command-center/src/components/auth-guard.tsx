import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";

export function AuthGuard({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    const user = localStorage.getItem("sed_user");
    if (!user && location !== "/login") {
      setLocation("/login");
    } else if (user && location === "/login") {
      setLocation("/");
    }
  }, [location, setLocation]);

  return <>{children}</>;
}
