import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import styles from "../styles/landing.module.css";

/* ── Custom cursor ─────────────────────────────────────────── */
function Cursor({ onMove }) {
  const dotRef   = useRef(null);
  const ringRef  = useRef(null);
  const trailRef = useRef(null);
  const pos      = useRef({ x: -200, y: -200 });
  const ring     = useRef({ x: -200, y: -200 });
  const trail    = useRef({ x: -200, y: -200 });
  const hovered  = useRef(false);
  const raf      = useRef(null);
   

  useEffect(() => {
    const onMouseMove = (e) => {
      pos.current = { x: e.clientX, y: e.clientY };
      // Pass to parent for spotlight
      onMove?.(e.clientX, e.clientY);
    };
    
    const setHover = (v) => () => { hovered.current = v; };
    const addHovers = () => {
      document.querySelectorAll("a,button,[data-hover]").forEach(el => {
        el.addEventListener("mouseenter", setHover(true));
        el.addEventListener("mouseleave", setHover(false));
      });
    };
    addHovers();
    window.addEventListener("mousemove", onMouseMove);

    const lerp = (a, b, t) => a + (b - a) * t;

    const tick = () => {
      const { x, y } = pos.current;
      const h = hovered.current;

      // DOT — instant
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${x - 3}px,${y - 3}px)`;
        dotRef.current.style.boxShadow = h
          ? "0 0 18px 6px rgba(167,139,250,.9), 0 0 50px 14px rgba(124,58,237,.55)"
          : "0 0 12px 4px rgba(167,139,250,.7), 0 0 30px 8px rgba(124,58,237,.4)";
        dotRef.current.style.transform += h ? " scale(1.4)" : "";
      }

      // RING — 12% lerp (fast but visible lag)
      ring.current.x = lerp(ring.current.x, x, 0.12);
      ring.current.y = lerp(ring.current.y, y, 0.12);
      if (ringRef.current) {
        const s = h ? 2.2 : 1;
        ringRef.current.style.transform = `translate(${ring.current.x - 22}px,${ring.current.y - 22}px) scale(${s})`;
        ringRef.current.style.borderColor = h
          ? "rgba(167,139,250,.9)"
          : "rgba(167,139,250,.45)";
        ringRef.current.style.boxShadow = h
          ? "0 0 30px 8px rgba(124,58,237,.35), inset 0 0 20px rgba(124,58,237,.1)"
          : "0 0 20px 4px rgba(124,58,237,.12)";
      }

      // TRAIL — 5% lerp (very slow glow)
      trail.current.x = lerp(trail.current.x, x, 0.05);
      trail.current.y = lerp(trail.current.y, y, 0.05);
      if (trailRef.current) {
        const ts = h ? 1.6 : 1;
        trailRef.current.style.transform = `translate(${trail.current.x - 40}px,${trail.current.y - 40}px) scale(${ts})`;
        trailRef.current.style.opacity = h ? ".9" : ".6";
      }

      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(raf.current);
    };
  }, [onMove]);

  return (
    <>
      <div ref={dotRef}   className={styles.cursorDot}   />
      <div ref={ringRef}  className={styles.cursorRing}  />
      <div ref={trailRef} className={styles.cursorTrail} />
    </>
  );
}

/* ── Magnetic button ───────────────────────────────────────── */
function MagBtn({ children, className, onClick }) {
  const ref = useRef(null);

  const onMove = useCallback((e) => {
    const el = ref.current; if (!el) return;
    const r  = el.getBoundingClientRect();
    const dx = (e.clientX - r.left - r.width  / 2) * 0.32;
    const dy = (e.clientY - r.top  - r.height / 2) * 0.32;
    el.style.transform = `translate(${dx}px,${dy}px)`;
  }, []);

  const onLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = "translate(0,0)";
  }, []);

  return (
    <button
      ref={ref}
      className={className}
      onClick={onClick}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </button>
  );
}

/* ── Main ──────────────────────────────────────────────────── */
export default function LandingPage() {
  const router        = useRouter();
  const spotRef       = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handleMouseMove = useCallback((cx, cy) => {
    if (spotRef.current) {
      spotRef.current.style.background = `radial-gradient(
        650px circle at ${cx}px ${cy}px,
        rgba(124,58,237,.09) 0%,
        transparent 70%
      )`;
    }
  }, []);

  return (
    <>
      <style>{`*{cursor:none!important}`}</style>

      <div className={`${styles.page} ${ready ? styles.ready : ""}`}>
        <Cursor onMove={handleMouseMove} />

        {/* spotlight overlay */}
        <div ref={spotRef} className={styles.spotlight} />

        {/* atmosphere */}
        <div className={styles.grid}  />
        <div className={styles.wash}  />
        <div className={styles.wash2} />

        {/* ── NAV ── */}
        <nav className={styles.nav}>
          <div className={styles.logo}> 
            <div className={styles.logoM}><img  src="MeshUp.png" width={50} height={30} /></div>
            <span className={styles.logoName}>MeshUp</span>
          </div>
          <div className={styles.navRight}>
            <a href="#" className={styles.navLink}
              onClick={e => { e.preventDefault(); router.push("/login"); }}>
              Sign in
            </a>
            <MagBtn className={styles.navCta} onClick={() => router.push("/login")}>
              Get started
            </MagBtn>
          </div>
        </nav>

        {/* ── HERO ── */}
        <main className={styles.hero}>
          <p className={styles.eyebrow}>Professional networking</p>

          <h1 className={styles.headline}>
            <span className={styles.line1}>Build the network</span>
            <span className={styles.line2}>you <em>deserve.</em></span>
          </h1>

          <p className={styles.sub}>
            Connect intentionally. Converse meaningfully.<br />
            Track your progress. Grow without noise.
          </p>

          <div className={styles.actions}>
            <MagBtn className={styles.btnPrimary} onClick={() => router.push("/login")}>
              Start for free
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.7"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </MagBtn>
            <button className={styles.btnGhost} onClick={() => router.push("/login")}>
              Sign in →
            </button>
          </div>

          <div className={styles.pills}>
            {[
              ["10K+", "professionals"],
              ["50K+", "connections"],
              ["1M+",  "messages"],
            ].map(([n, l]) => (
              <div key={l} className={styles.pill} data-hover>
                <span className={styles.pillNum}>{n}</span>
                <span className={styles.pillLabel}>{l}</span>
              </div>
            ))}
          </div>
        </main>

        {/* ── FOOTER ── */}
        <footer className={styles.footer}>
          <span>© {new Date().getFullYear()} MeshUp</span>
          <span>Built for people who build.</span>
        </footer>
      </div>
    </>
  );
}