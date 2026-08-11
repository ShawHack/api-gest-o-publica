
import { Navigate, useLocation } from "react-router-dom";
import { useContext } from "react";
import { Context as UserContext } from "../../../context/UserContext";


export default function RoleGate({ allow = [], children, fallback = null }) {
  const location = useLocation();
  const ctx = useContext(UserContext) || {};
  let auth = {};
  try {
    auth = JSON.parse(localStorage.getItem("auth") || "{}") || {};
  } catch {
    auth = {};
  }
  const role = String(ctx.user?.role || ctx.role || auth.role || "usuario").toLowerCase();
  const isAdmin = role === "admin" || !!ctx.user?.isAdmin || !!auth.isAdmin;
  const normalizedAllow = allow.map((r) => String(r).toLowerCase());
  const canAccess = normalizedAllow.includes(role) || (normalizedAllow.includes("admin") && isAdmin);
  if (canAccess) return children;
  if (fallback) return fallback;
  return <Navigate to="/sepulturas" replace state={{ from: location }} />;
}
