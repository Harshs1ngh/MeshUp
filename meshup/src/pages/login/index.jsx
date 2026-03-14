import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "../../store/slices/authSlice";
import { useRouter } from "next/router";
import styles from "../../styles/login.module.css";

export default function Login() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { loading, error } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState("");

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

const handleSubmit = async (e) => {
  e.preventDefault();
  const res = await dispatch(loginUser(formData));
  if (res.meta.requestStatus === "fulfilled") {
    router.push("/users");   
  }
};

  return (
    <div className={styles.wrapper}>
      <div className={styles.right}>

        {/* Back button */}
        <button className={styles.backBtn} onClick={() => router.push("/")}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 3L5 8l5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to home
        </button>

        {/* Form wrap — vertically centered */}
        <div className={styles.formWrap}>

          {/* Header */}
          <div className={styles.formHeader}>
            <span className={styles.formBadge}>Welcome back 👋</span>
            <h1 className={styles.formTitle}>
              Sign in to<br />
              <span className={styles.gradText}>MeshUp</span>
            </h1>
            <p className={styles.formSub}>
              Don&apos;t have an account?{" "}
              <button
                className={styles.inlineLink}
                onClick={() => router.push("/signup")}
              >
                Create one free
              </button>
            </p> 
          </div>

          {/* Error */}
          {error && (
            <div className={styles.errorBox}>
              <span className={styles.errorDot} />
              {error}
            </div>
          )}

          {/* Form */}
          <form className={styles.form} onSubmit={handleSubmit}>

            {/* Email field */}
            <div
              className={`${styles.field} ${
                focused === "email" ? styles.fieldFocused : ""
              }`}
            >
              <label className={styles.floatLabel}>Email address</label>
              <input
                className={styles.input}
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused("")}
                required
                autoComplete="email"
                autoFocus
              />
              <div className={styles.fieldBar} />
            </div>

            {/* Password field */}
            <div
              className={`${styles.field} ${
                focused === "password" ? styles.fieldFocused : ""
              }`}
            >
              <label className={styles.floatLabel}>Password</label>
              <input
                className={styles.input}
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                onFocus={() => setFocused("password")}
                onBlur={() => setFocused("")}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
              <div className={styles.fieldBar} />
            </div>

            {/* Forgot password */}
            <div className={styles.forgotRow}>
              <button
                type="button"
                className={styles.forgotBtn}
                onClick={() => router.push("/forgot-password")}
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              <span className={styles.submitBtnInner}>
                {loading ? (
                  <span className={styles.spinner} />
                ) : (
                  <>
                    Sign in
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M3 8h10M9 4l4 4-4 4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </>
                )}
              </span>
              <div className={styles.btnShine} />
            </button>

          </form>

          {/* Terms */}
          <p className={styles.terms}>
            By signing in you agree to our{" "}
            <a href="#">Terms of Service</a> and{" "}
            <a href="#">Privacy Policy</a>.
          </p>

        </div>
      </div>

    </div>
  );
}