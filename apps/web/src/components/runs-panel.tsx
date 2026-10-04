import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { formatDate, formatDuration } from "../runs/format";
import type { RunRecord } from "../runs/run-recorder";
import { topRuns } from "../runs/run-store";
import styles from "./runs-panel.module.css";

const TOP_COUNT = 5;
const RECENT_COUNT = 20;

interface RunsPanelProps {
  /** Newest first. */
  readonly history: readonly RunRecord[];
  readonly onClose: () => void;
}

function Summary({ history }: { readonly history: readonly RunRecord[] }) {
  const completed = history.filter((r) => r.outcome === "completed");
  const average = completed.length
    ? Math.round(
        completed.reduce((sum, r) => sum + r.score, 0) / completed.length,
      )
    : 0;
  const stats = [
    ["Games", completed.length],
    ["Best", Math.max(0, ...history.map((r) => r.score))],
    ["Average", average],
  ] as const;
  return (
    <dl className={styles.summary}>
      {stats.map(([label, value]) => (
        <div key={label} className={styles.stat}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

interface Column {
  readonly label: string;
  readonly render: (run: RunRecord, index: number) => ReactNode;
  readonly className?: string | undefined;
}

function RunsTable({
  caption,
  columns,
  runs,
}: {
  caption: string;
  columns: readonly Column[];
  runs: readonly RunRecord[];
}) {
  return (
    <table className={styles.table}>
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.label} scope="col">
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {runs.map((run, i) => (
          <tr key={run.id} data-outcome={run.outcome}>
            {columns.map((column) => (
              <td key={column.label} className={column.className}>
                {column.render(run, i)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const SCORE: Column = {
  label: "Score",
  render: (run) => run.score,
  className: styles.score,
};
const LINES: Column = { label: "Lines", render: (run) => run.lines };

const TOP_COLUMNS: readonly Column[] = [
  { label: "#", render: (_, i) => i + 1 },
  SCORE,
  LINES,
  { label: "Date", render: (run) => formatDate(run.endedAt) },
];

const RECENT_COLUMNS: readonly Column[] = [
  {
    label: "Date",
    render: (run) => (
      <>
        {formatDate(run.endedAt)}
        {run.outcome === "abandoned" && (
          <span className={styles.tag}>quit</span>
        )}
      </>
    ),
  },
  SCORE,
  LINES,
  { label: "Moves", render: (run) => run.moves },
  { label: "Time", render: (run) => formatDuration(run.activeMs) },
];

/** Full-screen sheet with stats, top scores and recent runs. */
export function RunsPanel({ history, onClose }: RunsPanelProps) {
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
      aria-labelledby="runs-title"
    >
      <header className={styles.header}>
        <h2 id="runs-title" className={styles.title}>
          Runs
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
      {history.length === 0 ? (
        <p className={styles.empty}>
          No runs yet — finish a game to see it here.
        </p>
      ) : (
        <>
          <Summary history={history} />
          <RunsTable
            caption="Top scores"
            columns={TOP_COLUMNS}
            runs={topRuns(history, TOP_COUNT)}
          />
          <RunsTable
            caption="Recent runs"
            columns={RECENT_COLUMNS}
            runs={history.slice(0, RECENT_COUNT)}
          />
        </>
      )}
    </div>
  );
}
