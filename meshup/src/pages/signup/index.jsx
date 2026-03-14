import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { registerUser } from "../../store/slices/authSlice";
import { useRouter } from "next/router";
import styles from "../../styles/signup.module.css";

export default function Register() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { loading, error } = useSelector((state) => state.auth);

  const [step, setStep] = useState(1); // 1 = name, 2 = credentials
  const [focused, setFocused] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleNext = (e) => {
    e.preventDefault();
    if (formData.firstName.trim() && formData.lastName.trim()) setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await dispatch(registerUser(formData));
    if (res.meta.requestStatus === "fulfilled") router.push("/");
  };

  const progressWidth = step === 1 ? "50%" : "100%";

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

        <div className={styles.formWrap}>

          {/* Header */}
          <div className={styles.formHeader}>
            <span className={styles.formBadge}>Free forever · No credit card needed</span>
            <h1 className={styles.formTitle}>
              Create your<br />
              <span className={styles.gradText}>account.</span>
            </h1>
            <p className={styles.formSub}>
              Already a member?{" "}
              <button
                className={styles.inlineLink}
                onClick={() => router.push("/login")}
              >
                Sign in instead
              </button>
            </p>
          </div>

          {/* Step progress */}
          <div className={styles.progress}>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: progressWidth }}
              />
            </div>
            <div className={styles.progressLabels}>
              <span className={step >= 1 ? styles.progressLabelActive : styles.progressLabel}>
                Your name
              </span>
              <span className={step >= 2 ? styles.progressLabelActive : styles.progressLabel}>
                Credentials
              </span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className={styles.errorBox}>
              <span className={styles.errorDot} />
              {error}
            </div>
          )}

          {/* ── STEP 1: Name ── */}
          {step === 1 && (
            <form className={styles.form} onSubmit={handleNext} key="step1">

              <div className={`${styles.fieldRow}`}>
                {/* First name */}
                <div
                  className={`${styles.field} ${
                    focused === "firstName" ? styles.fieldFocused : ""
                  }`}
                >
                  <label className={styles.floatLabel}>First name</label>
                  <input
                    className={styles.input}
                    name="firstName"
                    type="text"
                    placeholder="Alex"
                    value={formData.firstName}
                    onChange={handleChange}
                    onFocus={() => setFocused("firstName")}
                    onBlur={() => setFocused("")}
                    required
                    autoFocus
                    autoComplete="given-name"
                  />
                  <div className={styles.fieldBar} />
                </div>

                {/* Last name */}
                <div
                  className={`${styles.field} ${
                    focused === "lastName" ? styles.fieldFocused : ""
                  }`}
                >
                  <label className={styles.floatLabel}>Last name</label>
                  <input
                    className={styles.input}
                    name="lastName"
                    type="text"
                    placeholder="Johnson"
                    value={formData.lastName}
                    onChange={handleChange}
                    onFocus={() => setFocused("lastName")}
                    onBlur={() => setFocused("")}
                    required
                    autoComplete="family-name"
                  />
                  <div className={styles.fieldBar} />
                </div>
              </div>

              <button type="submit" className={styles.submitBtn}>
                <span className={styles.submitBtnInner}>
                  Continue
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3 8h10M9 4l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div className={styles.btnShine} />
              </button>

            </form>
          )}

          {/* ── STEP 2: Credentials ── */}
          {step === 2 && (
            <form className={styles.form} onSubmit={handleSubmit} key="step2">

              {/* Greeting */}
              <div className={styles.greeting}>
                Hey, <span className={styles.greetingName}>{formData.firstName}</span> 👋
                <br />
                <span className={styles.greetingSub}>Almost there — just your login details.</span>
              </div>

              {/* Email */}
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
                  autoFocus
                  autoComplete="email"
                />
                <div className={styles.fieldBar} />
              </div>

              {/* Password */}
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
                  placeholder="Min. 8 characters"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused("")}
                  required
                  autoComplete="new-password"
                  minLength={8}
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

              {/* Password strength */}
              {formData.password.length > 0 && (
                <div className={styles.strength}>
                  <div className={styles.strengthBars}>
                    <div className={`${styles.strengthBar} ${formData.password.length >= 1 ? styles.strengthFill1 : ""}`} />
                    <div className={`${styles.strengthBar} ${formData.password.length >= 6 ? styles.strengthFill2 : ""}`} />
                    <div className={`${styles.strengthBar} ${formData.password.length >= 10 ? styles.strengthFill3 : ""}`} />
                    <div className={`${styles.strengthBar} ${formData.password.length >= 14 ? styles.strengthFill3 : ""}`} />
                  </div>
                  <span className={styles.strengthLabel}>
                    {formData.password.length < 6
                      ? "Weak"
                      : formData.password.length < 10
                      ? "Fair"
                      : "Strong"}
                  </span>
                </div>
              )}

              {/* Buttons row */}
              <div className={styles.btnRow}>
                <button
                  type="button"
                  className={styles.backStepBtn}
                  onClick={() => setStep(1)}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M9 2L4 7l5 5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Back
                </button>

                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  <span className={styles.submitBtnInner}>
                    {loading ? (
                      <span className={styles.spinner} />
                    ) : (
                      <>
                        Create account
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
              </div>

            </form>
          )}

          {/* Terms */}
          <p className={styles.terms}>
            By creating an account you agree to our{" "}
            <a href="#">Terms of Service</a> and{" "}
            <a href="#">Privacy Policy</a>.
          </p>

        </div>
      </div>

    </div>
  );
}