import React, { useRef, useEffect, useCallback } from 'react';
import { PanelProps } from '@grafana/data';
import { WoprOptions } from '../types';

const COLS = 80;
const ROWS = 24;
const N    = COLS * ROWS; // 1920 agents

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

// Cumulative probability thresholds per DEFCON level.
// Order matches state constants: green, black, yellow, red.
//
// DEFCON 5: almost always green, occasional yellow, rare red, negligible black
// DEFCON 4: mostly green, ~2× yellow, several reds, small black
// DEFCON 3: still mostly green+yellow, more reds, more blacks
// DEFCON 2: at least half green, yellows + reds + heavy blacks
// DEFCON 1: minority green, heavy reds + blacks
const DEFCON_THRESHOLDS: Readonly<Record<number, readonly [number, number, number, number]>> = {
  5: [45, 95, 99, 100], // green 45%, black 50%, yellow  4%, red  1%
  4: [44, 84, 97, 100], // green 44%, black 40%, yellow 13%, red  3%
  3: [39, 69, 92, 100], // green 39%, black 30%, yellow 23%, red  8%
  2: [25, 65, 86, 100], // green 25%, black 40%, yellow 21%, red 14%
  1: [ 2, 79, 89, 100], // green  2%, black 77%, yellow 10%, red 11%
};

function pickState(defcon: number): number {
  const thresholds = DEFCON_THRESHOLDS[defcon] ?? DEFCON_THRESHOLDS[5];
  const r = Math.random() * 100;
  for (let i = 0; i < thresholds.length; i++) {
    if (r < thresholds[i]) {
      return i;
    }
  }
  return STATE_GREEN;
}

// How long (seconds) before an agent next changes state
function pickDuration(): number {
  return 1 + Math.random() * 9; // 1 – 10 s
}

function initAgents(defcon: number): { states: Uint8Array; nextChange: Float64Array } {
  const states     = new Uint8Array(N);
  const nextChange = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    states[i]     = pickState(defcon);
    nextChange[i] = Math.random() * 10; // stagger initial flips across 0 – 10 s
  }
  return { states, nextChange };
}

// ---------------------------------------------------------------------------
// Tick: advance any agents whose timer has expired
// ---------------------------------------------------------------------------
function tickAgents(states: Uint8Array, nextChange: Float64Array, t: number, defcon: number): void {
  for (let i = 0; i < N; i++) {
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
  height: number
): void {
  const pixelW = width / COLS;
  const pixelH = height / ROWS;
  const gap    = 1;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const color = PALETTE[states[row * COLS + col]];
      if (color[0] === 0 && color[1] === 0 && color[2] === 0) {
        continue; // black — leave background showing
      }
      ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
      ctx.fillRect(col * pixelW, row * pixelH, pixelW - gap, pixelH - gap);
    }
  }
}

// ---------------------------------------------------------------------------
// Panel component
// ---------------------------------------------------------------------------
interface Props extends PanelProps<WoprOptions> {}

export const WoprPanel: React.FC<Props> = ({ options, width, height, replaceVariables }) => {
  const defcon = Math.min(5, Math.max(1, parseInt(replaceVariables(options.defcon), 10))) || 5;

  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const agentsRef    = useRef(initAgents(defcon));
  const rafRef       = useRef<number>(0);
  const lastTickRef  = useRef<number>(0);
  const startTimeRef = useRef<number>(-1);

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
            renderGrid(ctx, states, width, height);
          }
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    },
    [width, height, options.tickIntervalMs, defcon]
  );

  useEffect(() => {
    startTimeRef.current = -1;
    lastTickRef.current  = 0;
    rafRef.current = requestAnimationFrame(loop);
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
