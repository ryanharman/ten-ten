import styles from "./sound-toggle.module.css";

interface SoundToggleProps {
  readonly on: boolean;
  readonly onToggle: () => void;
}

export function SoundToggle({ on, onToggle }: SoundToggleProps) {
  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={onToggle}
      aria-pressed={on}
      aria-label="Sound"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
        <path d="M4 9v6h4l5 4V5L8 9H4z" />
        {on ? (
          <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" />
        ) : (
          <path d="M16 9l6 6M22 9l-6 6" />
        )}
      </svg>
    </button>
  );
}
