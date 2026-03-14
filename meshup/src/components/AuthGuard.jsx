// 📁 src/components/AuthGuard.jsx
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/router";
import {
  selectIsAuthenticated,
  selectIsRehydrating,
  selectIsInitialized,
} from "../store/slices/authSlice";

export default function AuthGuard({ children }) {
  const router          = useRouter();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isRehydrating   = useSelector(selectIsRehydrating);
  const isInitialized   = useSelector(selectIsInitialized);

  useEffect(() => {
    // ✅ Only redirect AFTER the session check (rehydrateAuth) has fully completed
    // isRehydrating=false AND isInitialized=true means the /me check is done
    if (!isRehydrating && isInitialized && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isRehydrating, isInitialized, router]);

  // ✅ Show spinner while we wait for the auth cookie check to complete
  // This prevents the brief flash of the dashboard for unauthenticated users
  if (isRehydrating || !isInitialized) {
    return (
      <div style={{
        minHeight: "100vh", background: "#0d0d12",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 16,
        color: "#7878a0", fontFamily: "DM Sans, sans-serif", fontSize: 14,
      }}>
        <div style={{
          width: 36, height: 36,
          border: "3px solid rgba(124,58,237,0.2)",
          borderTopColor: "#7c3aed",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }} />
        <span>Loading your workspace…</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ✅ Auth check done — not authenticated → render nothing (redirect in progress)
  if (!isAuthenticated) return null;

  // ✅ Authenticated → render page
  return children;
}