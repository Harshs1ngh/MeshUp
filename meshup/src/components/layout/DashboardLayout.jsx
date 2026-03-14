import { useState } from "react";
import { useDispatch } from "react-redux";
import { useRouter } from "next/router";
import { logoutUser } from "../../store/slices/authSlice";
import AuthGuard from "../AuthGuard";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import styles from "../../styles/layout.module.css";

export default function DashboardLayout({ children }) {
  const dispatch = useDispatch();
  const router   = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    router.replace("/login");
  };

  return (
    <AuthGuard>
      <div className={styles.layout}>
        <div className={styles.glowTop} />
        <div className={styles.glowBottom} />

        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onLogout={handleLogout}
        />

        {sidebarOpen && (
          <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
        )}

        <div className={styles.main}>
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
          <div className={styles.pageContent}>
            {children}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}