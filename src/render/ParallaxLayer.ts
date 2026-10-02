/**
 * Parallax layer stack for Neo-Noir 16-bit scenes.
 *
 * Draw order (back → front, low → high zIndex):
 *   1. sky / distant wash              (ratio ~0)
 *   2. Kremlin silhouette              (ratio ~0.12–0.18)
 *   3. Midground Central Market hall   (ratio ~0.35–0.5)
 *   4. Gameplay (kiosks, actors)       (ratio 1.0 — world space)
 *   5. Lighting overlay                (screen-space mask)
 *   6. Foreground weather              (ratio ~1.15–1.35 or screen-space)
 *
 * Each layer scrolls at `speedRatio * cameraX`. A ratio of 0 is pinned to the
 * viewport; 1 locks to world gameplay; >1 overshoots for near-field depth.
 */

export type ParallaxDrawFn = (
  ctx: CanvasRenderingContext2D,
  /** Rounded horizontal scroll applied for this layer (camX * speedRatio). */
  scrollX: number,
  camX: number,
  viewW: number,
  viewH: number,
) => void;

export interface ParallaxLayerConfig {
  id: string;
  /** Multiplier vs camera X. */
  speedRatio: number;
  /** Lower draws first (behind). */
  zIndex: number;
  /** When true, skip the translate — draw uses scrollX manually / screen space. */
  screenSpace?: boolean;
  draw: ParallaxDrawFn;
}

export class ParallaxLayer {
  readonly id: string;
  speedRatio: number;
  zIndex: number;
  screenSpace: boolean;
  draw: ParallaxDrawFn;

  constructor(config: ParallaxLayerConfig) {
    this.id = config.id;
    this.speedRatio = config.speedRatio;
    this.zIndex = config.zIndex;
    this.screenSpace = config.screenSpace ?? false;
    this.draw = config.draw;
  }

  /** World-space X offset for this layer at the given camera. */
  scrollFor(camX: number): number {
    return camX * this.speedRatio;
  }
}

/** Sorted compositor for a scene's parallax stack. */
export class ParallaxStack {
  private layers: ParallaxLayer[] = [];

  constructor(layers: readonly ParallaxLayerConfig[] = []) {
    this.setLayers(layers);
  }

  setLayers(layers: readonly ParallaxLayerConfig[]): void {
    this.layers = layers.map((c) => new ParallaxLayer(c));
    this.layers.sort((a, b) => a.zIndex - b.zIndex);
  }

  add(config: ParallaxLayerConfig): void {
    this.layers.push(new ParallaxLayer(config));
    this.layers.sort((a, b) => a.zIndex - b.zIndex);
  }

  get(id: string): ParallaxLayer | undefined {
    return this.layers.find((l) => l.id === id);
  }

  /** Paint every layer back-to-front. Call with imageSmoothingEnabled = false. */
  render(
    ctx: CanvasRenderingContext2D,
    camX: number,
    viewW: number,
    viewH: number,
  ): void {
    for (const layer of this.layers) {
      const scrollX = layer.scrollFor(camX);
      if (layer.screenSpace) {
        layer.draw(ctx, scrollX, camX, viewW, viewH);
        continue;
      }
      ctx.save();
      ctx.translate(-Math.round(scrollX), 0);
      layer.draw(ctx, scrollX, camX, viewW, viewH);
      ctx.restore();
    }
  }
}

/** Canonical rynok Neo-Noir layer ids + suggested ratios. */
export const RYNOK_LAYER_ORDER = [
  { id: 'sky', speedRatio: 0, zIndex: 0 },
  { id: 'kremlin', speedRatio: 0.15, zIndex: 10 },
  { id: 'market_hall', speedRatio: 0.42, zIndex: 20 },
  { id: 'gameplay', speedRatio: 1, zIndex: 30 },
  { id: 'lighting', speedRatio: 0, zIndex: 40 },
  { id: 'weather', speedRatio: 1.25, zIndex: 50 },
] as const;
