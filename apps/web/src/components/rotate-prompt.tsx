import styles from "./rotate-prompt.module.css";

/** Shown only on phones in landscape (CSS-driven); the game is portrait-only. */
export function RotatePrompt() {
  return (
    <div className={styles.prompt} role="alert">
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M11 18h2" />
      </svg>
      <p className={styles.text}>Rotate your phone to portrait to play</p>
    </div>
  );
}
