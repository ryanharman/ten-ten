/**
 * Drag performance harness. Serves the production build, emulates a low-end
 * phone (CPU throttling + mobile viewport), performs a long touch drag over
 * the board and a drop, and reports frame times and long tasks.
 *
 * Usage: pnpm --filter @ten-ten/web perf [cpuSlowdown=6]
 * Requires Chromium for Playwright: pnpm --filter @ten-ten/web exec playwright install chromium
 */
import { chromium } from "playwright";
import { preview } from "vite";

const CPU_SLOWDOWN = Number(process.argv[2] ?? 6);
const DRAG_MOVES = 180; // ~3 s of dragging at 60 Hz
const MOVE_INTERVAL_MS = 16;

/** Pass/fail thresholds at the given slowdown. See docs/project-brief.md §6b. */
const BUDGET = { p95FrameMs: 20, maxLongTaskMs: 50, dropToPaintMs: 50 };

interface PageMetrics {
  frames: number[];
  longTasks: number[];
  dropToPaintMs: number;
}

declare global {
  interface Window {
    __perf: {
      recording: boolean;
      frames: number[];
      longTasks: number[];
      upAt: number;
      dropToPaint: number;
    };
  }
}

const server = await preview({
  root: new URL("..", import.meta.url).pathname,
  configLoader: "runner",
  preview: { port: 4174, strictPort: true },
  logLevel: "silent",
});
const url = "http://localhost:4174/";
const browser = await chromium.launch();

try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
  });
  await context.addInitScript(() => {
    const perf = {
      recording: false,
      frames: [] as number[],
      longTasks: [] as number[],
      upAt: 0,
      dropToPaint: 0,
    };
    window.__perf = perf;
    let last = 0;
    const tick = (t: number) => {
      if (perf.recording && last) perf.frames.push(t - last);
      last = t;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    new PerformanceObserver((list) => {
      if (perf.recording)
        for (const entry of list.getEntries())
          perf.longTasks.push(entry.duration);
    }).observe({ type: "longtask", buffered: false });
    // Drop latency: pointerup → second rAF (the frame after React commits).
    window.addEventListener(
      "pointerup",
      () => {
        perf.upAt = performance.now();
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            perf.dropToPaint = performance.now() - perf.upAt;
          }),
        );
      },
      true,
    );
  });

  const page = await context.newPage();
  await page.goto(url);
  await page.waitForSelector("main");
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_SLOWDOWN });

  const geo = await page.evaluate(() => {
    const board = document
      .querySelector("main > div:nth-of-type(1) > div")
      ?.getBoundingClientRect();
    const slot = document
      .querySelector("main > div:nth-of-type(2) > div")
      ?.getBoundingClientRect();
    if (!board || !slot) throw new Error("layout not found");
    return {
      bx: board.x,
      by: board.y,
      bw: board.width,
      sx: slot.x + slot.width / 2,
      sy: slot.y + slot.height / 2,
    };
  });
  const touch = (type: "touchStart" | "touchMove" | "touchEnd", x = 0, y = 0) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" ? [] : [{ x, y }],
    });

  await page.evaluate(() => {
    window.__perf.recording = true;
  });
  await touch("touchStart", geo.sx, geo.sy);
  for (let i = 0; i < DRAG_MOVES; i++) {
    // Sweep back and forth across the board so the snapped cell (and preview) changes often.
    const t = i / DRAG_MOVES;
    const x = geo.bx + geo.bw * (0.5 + 0.45 * Math.sin(t * Math.PI * 6));
    const y = geo.by + geo.bw * (0.35 + 0.6 * t);
    await touch("touchMove", x, y);
    await page.waitForTimeout(MOVE_INTERVAL_MS);
  }
  await touch("touchEnd");
  await page.waitForTimeout(500);
  const metrics: PageMetrics = await page.evaluate(() => {
    window.__perf.recording = false;
    return {
      frames: window.__perf.frames,
      longTasks: window.__perf.longTasks,
      dropToPaintMs: window.__perf.dropToPaint,
    };
  });

  const sorted = [...metrics.frames].sort((a, b) => a - b);
  const pct = (p: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;
  const result = {
    p50FrameMs: pct(0.5),
    p95FrameMs: pct(0.95),
    maxFrameMs: sorted.at(-1) ?? 0,
    framesOver33ms: sorted.filter((f) => f > 33.4).length,
    frames: sorted.length,
    longTasks: metrics.longTasks.length,
    maxLongTaskMs: Math.max(0, ...metrics.longTasks),
    dropToPaintMs: metrics.dropToPaintMs,
  };

  console.log(
    `Drag performance @ ${CPU_SLOWDOWN}x CPU slowdown (390×844 @3x, touch)`,
  );
  for (const [key, value] of Object.entries(result))
    console.log(`  ${key.padEnd(16)} ${value.toFixed(1)}`);
  const failures = [
    result.p95FrameMs > BUDGET.p95FrameMs &&
      `p95 frame ${result.p95FrameMs.toFixed(1)} > ${BUDGET.p95FrameMs} ms`,
    result.maxLongTaskMs > BUDGET.maxLongTaskMs &&
      `long task ${result.maxLongTaskMs.toFixed(1)} > ${BUDGET.maxLongTaskMs} ms`,
    result.dropToPaintMs > BUDGET.dropToPaintMs &&
      `drop→paint ${result.dropToPaintMs.toFixed(1)} > ${BUDGET.dropToPaintMs} ms`,
  ].filter(Boolean);
  if (failures.length) {
    console.log(`✗ Over budget: ${failures.join("; ")}`);
    process.exitCode = 1;
  } else {
    console.log("✓ Within budget");
  }
} finally {
  await browser.close();
  await new Promise<void>((resolve) =>
    server.httpServer.close(() => resolve()),
  );
}
