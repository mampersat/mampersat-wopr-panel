import React, { useRef, useEffect, useCallback } from 'react';
import { PanelProps } from '@grafana/data';
import { WoprOptions } from '../types';

const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;

// ---------------------------------------------------------------------------
// Agent states
// ---------------------------------------------------------------------------
const STATE_GREEN  = 0;
const STATE_BLACK  = 1;
const STATE_YELLOW = 2;
const STATE_RED    = 3;

// RGB per state
const PALETTE: ReadonlyArray<readonly [number, number, number]> = [
  [0,   180, 0],   // green
  [0,   0,   0],   // black (off — timed out)
  [200, 180, 0],   // yellow
  [200, 0,   0],   // red
];

// Relative weights per DEFCON level — edit these to tune the display.
// Values are ratios, not percentages — they just need to be in proportion
// to each other. e.g. black:4, red:1 means black is 4× more likely than red.
const DEFCON_LEVELS: Readonly<Record<number, { green: number; black: number; yellow: number; red: number }>> = {
  5: { green: 1145, black: 1150, yellow:  50, red:  2},
  4: { green: 1114, black: 1140, yellow: 100, red:  6 },
  3: { green: 39, black: 30, yellow: 23, red:  2 },
  2: { green: 25, black: 40, yellow: 21, red: 14 },
  1: { green:  5, black: 77, yellow: 10, red: 11 },
};

function pickState(defcon: number): number {
  const w = DEFCON_LEVELS[defcon] ?? DEFCON_LEVELS[5];
  const total = w.green + w.black + w.yellow + w.red;
  const r = Math.random() * total;
  if (r < w.green)                        { return STATE_GREEN;  }
  if (r < w.green + w.black)              { return STATE_BLACK;  }
  if (r < w.green + w.black + w.yellow)   { return STATE_YELLOW; }
  return STATE_RED;
}

// How long (seconds) before an agent next changes state
function pickDuration(): number {
  return 1 + Math.random() * 9; // 1 – 10 s
}

function initAgents(defcon: number, cols: number, rows: number): { states: Uint8Array; nextChange: Float64Array } {
  const n          = cols * rows;
  const states     = new Uint8Array(n);
  const nextChange = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    states[i]     = pickState(defcon);
    nextChange[i] = Math.random() * 10; // stagger initial flips across 0 – 10 s
  }
  return { states, nextChange };
}

// ---------------------------------------------------------------------------
// Tick: advance any agents whose timer has expired
// ---------------------------------------------------------------------------
function tickAgents(states: Uint8Array, nextChange: Float64Array, t: number, defcon: number): void {
  for (let i = 0; i < states.length; i++) {
    if (t >= nextChange[i]) {
      states[i]     = pickState(defcon);
      nextChange[i] = t + pickDuration();
    }
  }
}

// ---------------------------------------------------------------------------
// Canvas renderer
// ---------------------------------------------------------------------------
function renderGrid(
  ctx: CanvasRenderingContext2D,
  states: Uint8Array,
  width: number,
  height: number,
  shape: 'circle' | 'rectangle',
  cols: number,
  rows: number,
): void {
  const pixelW = width / cols;
  const pixelH = height / rows;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const color = PALETTE[states[row * cols + col]];
      if (color[0] === 0 && color[1] === 0 && color[2] === 0) {
        continue;
      }
      ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
      if (shape === 'circle') {
        ctx.beginPath();
        ctx.arc(
          col * pixelW + pixelW / 2,
          row * pixelH + pixelH / 2,
          Math.min(pixelW, pixelH) / 2 - 0.5,
          0,
          Math.PI * 2
        );
        ctx.fill();
      } else {
        ctx.fillRect(col * pixelW, row * pixelH, pixelW - 1, pixelH - 1);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Panel component
// ---------------------------------------------------------------------------
interface Props extends PanelProps<WoprOptions> {}

export const WoprPanel: React.FC<Props> = ({ options, width, height, replaceVariables }) => {
  const defcon = Math.min(5, Math.max(1, parseInt(replaceVariables(options.defcon), 10))) || 5;
  const cols   = options.cols || DEFAULT_COLS;
  const rows   = options.rows || DEFAULT_ROWS;

  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const agentsRef    = useRef(initAgents(defcon, cols, rows));
  const rafRef       = useRef<number>(0);
  const lastTickRef  = useRef<number>(0);
  const startTimeRef = useRef<number>(-1);
  const loopRef      = useRef<(timestamp: number) => void>(() => {});

  // Re-init agents when grid dimensions change
  useEffect(() => {
    agentsRef.current = initAgents(defcon, cols, rows);
  }, [cols, rows]); // eslint-disable-line react-hooks/exhaustive-deps

  // When DEFCON changes, flush all agent timers so the new
  // probability distribution takes effect on the very next tick.
  useEffect(() => {
    agentsRef.current.nextChange.fill(0);
  }, [defcon]);

  const loop = useCallback(
    (timestamp: number) => {
      if (startTimeRef.current < 0) {
        startTimeRef.current = timestamp;
      }

      if (timestamp - lastTickRef.current >= options.tickIntervalMs) {
        lastTickRef.current = timestamp;

        const t = (timestamp - startTimeRef.current) / 1000;
        const { states, nextChange } = agentsRef.current;

        tickAgents(states, nextChange, t, defcon);

        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            renderGrid(ctx, states, width, height, options.shape, cols, rows);
          }
        }
      }

      rafRef.current = requestAnimationFrame((ts) => loopRef.current(ts));
    },
    [width, height, options.tickIntervalMs, defcon, options.shape, cols, rows]
  );

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  useEffect(() => {
    startTimeRef.current = -1;
    lastTickRef.current  = 0;
    rafRef.current = requestAnimationFrame((ts) => loopRef.current(ts));
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: 'block', background: '#000000' }}
    />
  );
};
