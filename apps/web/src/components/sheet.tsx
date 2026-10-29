import type { ReactNode } from "react";
import { useEffect, useId, useRef } from "react";
import styles from "./sheet.module.css";

interface SheetProps {
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}

/** Full-screen modal sheet with a title and Close button; Escape closes it. */
export function Sheet({ title, onClose, children }: SheetProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  // Move focus into the dialog when it opens.
  useEffect(() => closeRef.current?.focus(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className={styles.sheet}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <header className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <button
          ref={closeRef}
          type="button"
          className={styles.close}
          onClick={onClose}
        >
          Close
        </button>
      </header>
      {children}
    </div>
  );
}
