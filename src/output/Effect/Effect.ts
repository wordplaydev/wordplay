import toStructure from '#basis/toStructure.ts';
import { getBind } from '#locale/getBind.ts';
import { pickReadableName } from '#locale/getConceptName.ts';
import type Locales from '#locale/Locales.ts';
import type { NameText } from '#locale/LocaleText.ts';
import type OutputTexts from '#locale/OutputTexts.ts';
import { TYPE_SYMBOL } from '#parser/Symbols.ts';
import type { PhotosensitivityRisk } from '#output/PhotosensitivityAnalysis.ts';
import Valued from '#output/Output/Valued.ts';
import { adaptLightness } from '#output/Color/adapt.ts';

/** Draws one frame of an effect. `seconds` is the time since the effect started, and is 0
 *  for every frame when motion is reduced. Width and height are in canvas pixels. */
export type Painter = (
    context: CanvasRenderingContext2D,
    seconds: number,
    width: number,
    height: number,
) => void;

/**
 * How an effect is drawn over the stage. Each is a layer stacked above the stage's content
 * and below its overlay, in list order, so a later effect applies to an earlier one's result.
 * `ripple` is the exception: WebKit ignores an SVG reference in `backdrop-filter`, so it
 * distorts the content itself, beneath every other layer.
 */
export type EffectLayer =
    /** A CSS filter applied to everything beneath the layer. */
    | { kind: 'backdrop'; filter: string }
    /** A flat CSS background laid over everything beneath, optionally blended. */
    | {
          kind: 'fill';
          background: string;
          blend: string | undefined;
          opacity: number;
      }
    /** A canvas repainted every frame, at `resolution` canvas pixels per stage pixel. */
    | {
          kind: 'paint';
          painter: Painter;
          resolution: number;
          blend: string | undefined;
          /** Whether the painting changes over time; a still one is painted once. */
          moving: boolean;
          /** Whether the canvas is smoothed when stretched over the stage, rather than kept blocky. */
          smooth: boolean;
      }
    /** An SVG displacement of the content, in stage pixels. */
    | { kind: 'ripple'; amount: number; scale: number; speed: number };

/** An effect laid over the whole stage, like grain or blur. Each kind of effect is a structure that names this interface. */
export abstract class Effect extends Valued {
    /** How to draw this effect, given whether the stage's colors are being adapted to a dark canvas. */
    abstract getLayer(adapting: boolean): EffectLayer;

    /** The names of this kind of effect, used to describe it to screen readers. */
    abstract getNames(texts: OutputTexts): NameText;

    /** Photosensitivity risks this effect poses at its current settings. */
    getRisks(): PhotosensitivityRisk[] {
        return [];
    }

    getDescription(locales: Locales): string {
        return locales.getPrimaryPlainText(
            (l) => pickReadableName(this.getNames(l.output)) ?? '',
        );
    }
}

export function createEffectType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Effect, TYPE_SYMBOL)}()
`);
}

/** Clamp a number to a range, treating anything non-finite as the fallback. */
export function clampSetting(
    value: number | undefined,
    fallback: number,
    min: number,
    max: number,
): number {
    const number =
        value !== undefined && Number.isFinite(value) ? value : fallback;
    return Math.max(min, Math.min(max, number));
}

/**
 * A built-in color an effect paints with, given as LCh lightness (0–1), chroma, and hue.
 * It is adapted to a dark canvas exactly as a creator's colors are, or a black vignette
 * or dark dust would vanish on a stage that adaptation has turned black.
 */
export function effectColor(
    lightness: number,
    chroma: number,
    hue: number,
    alpha: number,
    adapting: boolean,
): string {
    const l = adapting ? adaptLightness(lightness) : lightness;
    return `lch(${l * 100}% ${chroma} ${hue}deg / ${alpha})`;
}
