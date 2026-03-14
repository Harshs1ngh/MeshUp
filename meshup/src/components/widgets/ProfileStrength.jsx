// 📁 src/components/widgets/ProfileStrength.jsx
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import { fetchMyProfile, selectTasks, selectStrength } from "../../store/slices/profileSlice";
import styles from "../../styles/widgets.module.css";

export default function ProfileStrength() {
  const dispatch = useDispatch();
  const router   = useRouter();
  const tasks    = useSelector(selectTasks);
  const strength = useSelector(selectStrength);

  useEffect(() => { dispatch(fetchMyProfile()); }, [dispatch]);

  // ✅ At 100% — show a celebration card instead of task list
  if (strength >= 100) {
    return (
      <div className={styles.widget} style={{ textAlign: "center", padding: "20px 16px" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#34d399", marginBottom: 4 }}>
          Profile Complete!
        </div>
        <div style={{ fontSize: 12, color: "#7878a0" }}>
          Your profile is fully set up. You're showing up at full strength.
        </div>
      </div>
    );
  }

  const color = strength >= 80 ? "#34d399" : strength >= 50 ? "#a78bfa" : "#f97316";

  return (
    <div className={styles.widget}>
      <div className={styles.widgetHeader}>
        <span className={styles.widgetTitle}>Profile strength</span>
        <span className={styles.widgetBadge} style={{ color }}>{strength}%</span>
      </div>

      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{
          width: `${strength}%`,
          background: `linear-gradient(90deg, #7c3aed, ${color})`,
        }} />
      </div>

      <ul className={styles.profileTasks}>
        {tasks.map((t) => (
          <li
            key={t.id}
            className={t.done ? styles.profileTaskDone : styles.profileTask}
            onClick={() => !t.done && router.push("/users/profile")}
            title={t.done ? "Done" : "Click to complete"}
          >
            <span className={t.done ? styles.taskCheck : styles.taskCircle}>
              {t.done ? "✓" : ""}
            </span>
            {t.label}
            {!t.done && <span className={styles.taskPoints}>+{t.weight}%</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}