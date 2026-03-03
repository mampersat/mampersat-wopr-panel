import React, { useRef, useEffect, useCallback } from 'react';
import { PanelProps } from '@grafana/data';
import { WoprOptions } from '../types';

const COLS = 80;
const ROWS = 24;

// ---------------------------------------------------------------------------
// Placeholder algorithm – replace this function when the real algorithm
// is ready. Receives the current grid (Uint8Array of COLS*ROWS values,
// 0 = off, 255 = full brightness) and mutates it in-place.
// ---------------------------------------------------------------------------
function tickGrid(grid: Uint8Array): void {
  for (let i = 0; i < grid.length; i++) {
    grid[i] = Math.random() < 0.5 ? 255 : 0;
  }
}

function renderGrid(
  ctx: CanvasRenderingContext2D,
  grid: Uint8Array,
  width: number,
  height: number
): void {
  const pixelW = width / COLS;
  const pixelH = height / ROWS;
  const gap = 1;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const v = grid[row * COLS + col];
      if (v === 0) {
        continue;
      }
      const alpha = v / 255;
      ctx.fillStyle = `rgba(0, 255, 70, ${alpha})`;
      ctx.fillRect(
        col * pixelW,
        row * pixelH,
        pixelW - gap,
        pixelH - gap
      );
    }
  }
}

interface Props extends PanelProps<WoprOptions> {}

export const WoprPanel: React.FC<Props> = ({ options, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<Uint8Array>(new Uint8Array(COLS * ROWS));
  const rafRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);

  const loop = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }

      if (timestamp - lastTickRef.current >= options.tickIntervalMs) {
        lastTickRef.current = timestamp;
        tickGrid(gridRef.current);
        renderGrid(ctx, gridRef.current, width, height);
      }

      rafRef.current = requestAnimationFrame(loop);
    },
    [width, height, options.tickIntervalMs]
  );

  useEffect(() => {
    // Force an immediate render on mount / resize
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        tickGrid(gridRef.current);
        renderGrid(ctx, gridRef.current, width, height);
      }
    }
    lastTickRef.current = 0;
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: 'block', background: '#000000' }}
    />
  );
};
