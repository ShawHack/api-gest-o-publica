
import { Navigate, useLocation } from "react-router-dom";
import { useContext } from "react";
import { Context as UserContext } from "../../../context/UserContext";


export default function RequireAuth({ children }) {
  const location = useLocation();
  const ctx = useContext(UserContext) || {};
  let auth = {};
  try {
    auth = JSON.parse(localStorage.getItem("auth") || "{}") || {};
  } catch {
    auth = {};
  }
  const hasToken = ctx.token || auth?.token;

  if (!hasToken && !ctx.authenticated) {
    const isMonitoramento = location.pathname.includes('/shift-handovers');
    const loginPath = isMonitoramento ? '/monitoramento/login' : '/login';
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }
  return children;
}
