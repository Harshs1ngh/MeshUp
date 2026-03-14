// 📁 src/components/widgets/TrendingTopics.jsx
import { useDispatch, useSelector } from "react-redux";
import { setActiveTab, selectActiveTab } from "../../store/slices/feedSlice";
import styles from "../../styles/widgets.module.css";

const TRENDING = [
  { tag: "#ProductDesign", filter: "Design"      },
  { tag: "#RemoteWork",    filter: "General"      },
  { tag: "#AITools",       filter: "Engineering"  },
  { tag: "#Startups",      filter: "Startup"      },
  { tag: "#WebDev",        filter: "Engineering"  },
  { tag: "#Hiring",        filter: "Hiring"       },
];

export default function TrendingTopics() {
  const dispatch   = useDispatch();
  const activeTab  = useSelector(selectActiveTab);

  return (
    <div className={styles.widget}>
      <div className={styles.widgetHeader}>
        <span className={styles.widgetTitle}>Trending in your field</span>
      </div>
      <div className={styles.trends}>
        {TRENDING.map(({ tag }) => (
          <button
            key={tag}
            className={styles.trendTag}
            onClick={() => dispatch(setActiveTab("Trending"))}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}