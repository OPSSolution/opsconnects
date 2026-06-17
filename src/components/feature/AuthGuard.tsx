import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "@/utils/auth";

interface AuthGuardProps {
  children: React.ReactNode;
  require?: "partner" | "admin" | "agent" | "viewer" | "any";
}

function homeFor(role: string) {
  if (role === "admin")  return "/admin";
  if (role === "agent")  return "/agent";
  if (role === "viewer") return "/viewer";
  return "/dashboard";
}

export default function AuthGuard({ children, require: required = "any" }: AuthGuardProps) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    getSession().then((session) => {
      if (!session) {
        navigate("/login", { replace: true });
        return;
      }
      // Strict role pages: bounce wrong roles to their own home
      if (required !== "any" && session.role !== required) {
        navigate(homeFor(session.role), { replace: true });
        return;
      }
      // Agents/viewers visiting general partner routes → their own home
      if (required === "any" && (session.role === "agent" || session.role === "viewer")) {
        navigate(homeFor(session.role), { replace: true });
        return;
      }
      setAllowed(true);
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center">
        <span className="w-6 h-6 border-2 border-primary-400 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!allowed) return null;

  return <>{children}</>;
}
