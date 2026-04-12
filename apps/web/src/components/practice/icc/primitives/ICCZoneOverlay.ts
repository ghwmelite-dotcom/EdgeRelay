/**
 * ICC Zone Overlay — Custom primitive for rendering ICC mark zones
 * (Indication, Correction, Continuation) and ghost answer overlays
 * on TradingView Lightweight Charts v5.
 */
import type { CanvasRenderingTarget2D } from 'fancy-canvas';
import type {
  ISeriesPrimitive,
  SeriesAttachedParameter,
  Time,
  IPanePrimitivePaneView,
  IPrimitivePaneRenderer,
  SeriesType,
  ISeriesApi,
  Coordinate,
} from 'lightweight-charts';

interface ZoneData {
  startTime: number;
  endTime: number;
  fillColor: string;
  strokeColor: string;
  label: string;
  isDashed: boolean;
}

const MARK_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  indication: { fill: 'rgba(0,229,255,0.12)', stroke: '#00e5ff', label: 'IND' },
  correction: { fill: 'rgba(255,184,0,0.12)', stroke: '#ffb800', label: 'COR' },
  continuation: { fill: 'rgba(0,255,157,0.12)', stroke: '#00ff9d', label: 'CON' },
};

const GHOST_COLORS: Record<string, { fill: string; stroke: string }> = {
  indication: { fill: 'rgba(0,229,255,0.06)', stroke: '#00e5ff' },
  correction: { fill: 'rgba(255,184,0,0.06)', stroke: '#ffb800' },
};

class ZoneRenderer implements IPrimitivePaneRenderer {
  private _zones: ZoneData[];
  private _series: ISeriesApi<SeriesType> | null;

  constructor(zones: ZoneData[], series: ISeriesApi<SeriesType> | null) {
    this._zones = zones;
    this._series = series;
  }

  draw(target: CanvasRenderingTarget2D): void {
    target.useBitmapCoordinateSpace(({ context: ctx, bitmapSize, horizontalPixelRatio, verticalPixelRatio }) => {
      if (!this._series) return;

      for (const zone of this._zones) {
        const chart = (this._series as any).chart?.();
        if (!chart) continue;

        // Get x coordinates from time scale
        const timeScale = chart.timeScale();
        const x1Raw = timeScale.timeToCoordinate(zone.startTime as unknown as Time);
        const x2Raw = timeScale.timeToCoordinate(zone.endTime as unknown as Time);

        if (x1Raw === null || x2Raw === null) continue;

        const x1 = Math.round(x1Raw * horizontalPixelRatio);
        const x2 = Math.round(x2Raw * horizontalPixelRatio);
        const width = Math.abs(x2 - x1) + Math.round(8 * horizontalPixelRatio);
        const left = Math.min(x1, x2) - Math.round(4 * horizontalPixelRatio);

        // Fill rectangle full height
        ctx.fillStyle = zone.fillColor;
        ctx.fillRect(left, 0, width, bitmapSize.height);

        // Border lines
        ctx.strokeStyle = zone.strokeColor;
        ctx.lineWidth = Math.round(1 * horizontalPixelRatio);
        if (zone.isDashed) {
          ctx.setLineDash([6 * horizontalPixelRatio, 3 * horizontalPixelRatio]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.beginPath();
        ctx.moveTo(left, 0);
        ctx.lineTo(left, bitmapSize.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(left + width, 0);
        ctx.lineTo(left + width, bitmapSize.height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        if (zone.label) {
          ctx.font = `bold ${Math.round(9 * horizontalPixelRatio)}px monospace`;
          ctx.fillStyle = zone.strokeColor;
          ctx.globalAlpha = 0.8;
          ctx.fillText(zone.label, left + Math.round(4 * horizontalPixelRatio), Math.round(14 * verticalPixelRatio));
          ctx.globalAlpha = 1;
        }
      }
    });
  }
}

class ZonePaneView implements IPanePrimitivePaneView {
  private _zones: ZoneData[];
  private _series: ISeriesApi<SeriesType> | null;

  constructor(zones: ZoneData[], series: ISeriesApi<SeriesType> | null) {
    this._zones = zones;
    this._series = series;
  }

  zOrder(): 'bottom' {
    return 'bottom';
  }

  renderer(): IPrimitivePaneRenderer {
    return new ZoneRenderer(this._zones, this._series);
  }
}

export interface ICCMarkInput {
  type: 'indication' | 'correction' | 'continuation';
  startTime: number;
  endTime: number;
}

export interface GhostInput {
  type: 'indication' | 'correction';
  startTime: number;
  endTime: number;
}

export class ICCZoneOverlayPrimitive implements ISeriesPrimitive<Time> {
  private _marks: ICCMarkInput[] = [];
  private _ghosts: GhostInput[] = [];
  private _series: ISeriesApi<SeriesType> | null = null;
  private _paneViews: IPanePrimitivePaneView[] = [];

  attached(param: SeriesAttachedParameter<Time, SeriesType>): void {
    this._series = param.series;
  }

  detached(): void {
    this._series = null;
  }

  updateMarks(marks: ICCMarkInput[], ghosts: GhostInput[]): void {
    this._marks = marks;
    this._ghosts = ghosts;
    this._rebuildViews();
  }

  updateAllViews(): void {
    this._rebuildViews();
  }

  paneViews(): readonly IPanePrimitivePaneView[] {
    return this._paneViews;
  }

  private _rebuildViews(): void {
    const zones: ZoneData[] = [];

    for (const mark of this._marks) {
      const colors = MARK_COLORS[mark.type];
      if (!colors) continue;
      zones.push({
        startTime: mark.startTime,
        endTime: mark.endTime,
        fillColor: colors.fill,
        strokeColor: colors.stroke,
        label: colors.label,
        isDashed: false,
      });
    }

    for (const ghost of this._ghosts) {
      const colors = GHOST_COLORS[ghost.type];
      if (!colors) continue;
      zones.push({
        startTime: ghost.startTime,
        endTime: ghost.endTime,
        fillColor: colors.fill,
        strokeColor: colors.stroke,
        label: '',
        isDashed: true,
      });
    }

    this._paneViews = [new ZonePaneView(zones, this._series)];
  }
}
