import { useEffect } from 'react';
import type { DrawingType } from '@/components/practice/icc/ICCDrawingTools';

interface Options {
  /** Whether the active studio is showing (scenario selected, not in selector/tutorial) */
  active: boolean;
  // Store actions
  togglePlayback: () => void;
  advance: () => void;
  openTrade: (dir: 'buy' | 'sell', lots: number, sl: number, tp: number) => void;
  setBias: (bias: 'bullish' | 'bearish') => void;
  setMarkingMode: (mode: 'indication' | 'correction' | 'continuation' | null) => void;
  markingMode: 'indication' | 'correction' | 'continuation' | null;
  toggleGhost: () => void;
  reset: () => void;
  isFinished: boolean;
  // Trade params
  lotSize: string;
  slPips: string;
  tpPips: string;
  // Drawing tools
  activeDrawingTool: DrawingType | null;
  setActiveDrawingTool: (tool: DrawingType | null) => void;
  // Keyboard help
  setShowKeyboardHelp: (show: boolean | ((p: boolean) => boolean)) => void;
  // Bookmark callback (Enhancement 3)
  onBookmark?: () => void;
  // Sound callback
  onSoundTick?: () => void;
}

const MARKING_MODES = ['indication', 'correction', 'continuation'] as const;
const DRAWING_TOOLS: Record<string, DrawingType> = { t: 'trendline', h: 'horizontal', f: 'fibonacci' };

export function useICCKeyboardShortcuts(opts: Options) {
  useEffect(() => {
    if (!opts.active) return;

    const handler = (e: KeyboardEvent) => {
      // Skip when typing in form fields
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const key = e.key.toLowerCase();

      switch (key) {
        case ' ':
          e.preventDefault();
          if (!opts.isFinished) opts.togglePlayback();
          break;

        case 'arrowright':
          if (!opts.isFinished) {
            opts.advance();
            opts.onSoundTick?.();
          }
          break;

        case 'b':
          if (!opts.isFinished) {
            opts.openTrade('buy', parseFloat(opts.lotSize) || 0.1, parseInt(opts.slPips) || 25, parseInt(opts.tpPips) || 50);
          }
          break;

        case 's':
          if (!opts.isFinished) {
            opts.openTrade('sell', parseFloat(opts.lotSize) || 0.1, parseInt(opts.slPips) || 25, parseInt(opts.tpPips) || 50);
          }
          break;

        case 'q':
          opts.setBias('bullish');
          break;

        case 'w':
          opts.setBias('bearish');
          break;

        case '1':
        case '2':
        case '3': {
          const mode = MARKING_MODES[parseInt(key) - 1];
          opts.setMarkingMode(opts.markingMode === mode ? null : mode);
          break;
        }

        case 't':
        case 'h':
        case 'f': {
          // Shift+key → handled above for ?, skip normal t/h/f if shift held
          if (e.shiftKey) break;
          const tool = DRAWING_TOOLS[key];
          opts.setActiveDrawingTool(opts.activeDrawingTool === tool ? null : tool);
          break;
        }

        case 'g':
          opts.toggleGhost();
          break;

        case 'r':
          opts.reset();
          break;

        case 'm':
          opts.onBookmark?.();
          break;

        case 'escape':
          opts.setMarkingMode(null);
          opts.setActiveDrawingTool(null);
          break;

        case '?':
          opts.setShowKeyboardHelp((prev: boolean) => !prev);
          break;

        default:
          break;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [
    opts.active, opts.isFinished, opts.markingMode, opts.activeDrawingTool,
    opts.lotSize, opts.slPips, opts.tpPips,
  ]);
}
