/**
 * Drawing Primitive — Renders trendlines, horizontal S/R, and fibonacci
 * retracements on TradingView Lightweight Charts v5.
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
import type { DrawingObject } from '../ICCDrawingTools';

class DrawingRenderer implements IPrimitivePaneRenderer {
  private _drawings: DrawingObject[];
  private _series: ISeriesApi<SeriesType> | null;
  private _timeframe: string;

  constructor(drawings: DrawingObject[], series: ISeriesApi<SeriesType> | null, timeframe: string) {
    this._drawings = drawings;
    this._series = series;
    this._timeframe = timeframe;
  }

  draw(target: CanvasRenderingTarget2D): void {
    target.useBitmapCoordinateSpace(({ context: ctx, bitmapSize, horizontalPixelRatio, verticalPixelRatio }) => {
      if (!this._series) return;

      const chart = (this._series as any).chart?.();
      if (!chart) return;

      const timeScale = chart.timeScale();
      const tfDrawings = this._drawings.filter(d => d.timeframe === this._timeframe);

      for (const d of tfDrawings) {
        if (d.type === 'horizontal') {
          const y = this._series.priceToCoordinate(d.startPrice);
          if (y === null) continue;
          const yBmp = Math.round((y as number) * verticalPixelRatio);

          ctx.strokeStyle = d.color;
          ctx.lineWidth = Math.round(1 * horizontalPixelRatio);
          ctx.setLineDash([6 * horizontalPixelRatio, 3 * horizontalPixelRatio]);
          ctx.beginPath();
          ctx.moveTo(0, yBmp);
          ctx.lineTo(bitmapSize.width, yBmp);
          ctx.stroke();
          ctx.setLineDash([]);

          // Label
          ctx.font = `${Math.round(9 * horizontalPixelRatio)}px monospace`;
          ctx.fillStyle = d.color;
          ctx.globalAlpha = 0.8;
          const label = `S/R ${d.startPrice > 100 ? d.startPrice.toFixed(1) : d.startPrice.toFixed(4)}`;
          ctx.fillText(label, Math.round(4 * horizontalPixelRatio), yBmp - Math.round(3 * verticalPixelRatio));
          ctx.globalAlpha = 1;
        }

        if (d.type === 'trendline') {
          const y1 = this._series.priceToCoordinate(d.startPrice);
          const y2 = this._series.priceToCoordinate(d.endPrice);
          if (y1 === null || y2 === null) continue;

          // Convert time from index — use the stored timestamps
          const x1Raw = timeScale.timeToCoordinate(d.startIndex as unknown as Time);
          const x2Raw = timeScale.timeToCoordinate(d.endIndex as unknown as Time);
          if (x1Raw === null || x2Raw === null) continue;

          const x1 = Math.round((x1Raw as number) * horizontalPixelRatio);
          const y1Bmp = Math.round((y1 as number) * verticalPixelRatio);
          const x2 = Math.round((x2Raw as number) * horizontalPixelRatio);
          const y2Bmp = Math.round((y2 as number) * verticalPixelRatio);

          ctx.strokeStyle = d.color;
          ctx.lineWidth = Math.round(1.5 * horizontalPixelRatio);
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(x1, y1Bmp);
          ctx.lineTo(x2, y2Bmp);
          ctx.stroke();

          // Endpoint circles
          const r = Math.round(3 * horizontalPixelRatio);
          ctx.fillStyle = d.color;
          ctx.globalAlpha = 0.6;
          ctx.beginPath();
          ctx.arc(x1, y1Bmp, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x2, y2Bmp, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        if (d.type === 'fibonacci') {
          const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
          const range = d.endPrice - d.startPrice;

          for (const level of levels) {
            const price = d.startPrice + range * level;
            const y = this._series.priceToCoordinate(price);
            if (y === null) continue;
            const yBmp = Math.round((y as number) * verticalPixelRatio);
            const opacity = level === 0 || level === 1 ? 0.8 : 0.5;

            ctx.strokeStyle = d.color;
            ctx.lineWidth = Math.round(0.8 * horizontalPixelRatio);
            ctx.setLineDash([4 * horizontalPixelRatio, 4 * horizontalPixelRatio]);
            ctx.globalAlpha = opacity;
            ctx.beginPath();
            ctx.moveTo(0, yBmp);
            ctx.lineTo(bitmapSize.width, yBmp);
            ctx.stroke();

            // Level label
            ctx.font = `${Math.round(8 * horizontalPixelRatio)}px monospace`;
            ctx.fillStyle = d.color;
            ctx.fillText(
              `${(level * 100).toFixed(1)}%`,
              bitmapSize.width - Math.round(50 * horizontalPixelRatio),
              yBmp - Math.round(3 * verticalPixelRatio),
            );
          }
          ctx.globalAlpha = 1;
          ctx.setLineDash([]);

          // Shaded golden zone (38.2% - 61.8%)
          const y382 = this._series.priceToCoordinate(d.startPrice + range * 0.382);
          const y618 = this._series.priceToCoordinate(d.startPrice + range * 0.618);
          if (y382 !== null && y618 !== null) {
            const top = Math.min(Math.round((y382 as number) * verticalPixelRatio), Math.round((y618 as number) * verticalPixelRatio));
            const height = Math.abs(Math.round((y382 as number) * verticalPixelRatio) - Math.round((y618 as number) * verticalPixelRatio));
            ctx.fillStyle = d.color;
            ctx.globalAlpha = 0.04;
            ctx.fillRect(0, top, bitmapSize.width, height);
            ctx.globalAlpha = 1;
          }
        }
      }
    });
  }
}

class DrawingPaneView implements IPanePrimitivePaneView {
  private _drawings: DrawingObject[];
  private _series: ISeriesApi<SeriesType> | null;
  private _timeframe: string;

  constructor(drawings: DrawingObject[], series: ISeriesApi<SeriesType> | null, timeframe: string) {
    this._drawings = drawings;
    this._series = series;
    this._timeframe = timeframe;
  }

  zOrder(): 'top' {
    return 'top';
  }

  renderer(): IPrimitivePaneRenderer {
    return new DrawingRenderer(this._drawings, this._series, this._timeframe);
  }
}

export class DrawingToolPrimitive implements ISeriesPrimitive<Time> {
  private _drawings: DrawingObject[] = [];
  private _series: ISeriesApi<SeriesType> | null = null;
  private _timeframe = '5M';
  private _paneViews: IPanePrimitivePaneView[] = [];

  attached(param: SeriesAttachedParameter<Time, SeriesType>): void {
    this._series = param.series;
  }

  detached(): void {
    this._series = null;
  }

  setTimeframe(tf: string): void {
    this._timeframe = tf;
  }

  updateDrawings(drawings: DrawingObject[]): void {
    this._drawings = drawings;
    this._rebuildViews();
  }

  updateAllViews(): void {
    this._rebuildViews();
  }

  paneViews(): readonly IPanePrimitivePaneView[] {
    return this._paneViews;
  }

  private _rebuildViews(): void {
    this._paneViews = [new DrawingPaneView(this._drawings, this._series, this._timeframe)];
  }
}
