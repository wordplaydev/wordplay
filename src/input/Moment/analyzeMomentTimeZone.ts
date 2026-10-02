import type Conflict from '#conflicts/Conflict.ts';
import type { EvaluateAnalyzer } from '#conflicts/evaluateAnalyzers.ts';
import UnknownTimeZone from '#conflicts/UnknownTimeZone.ts';
import { isSupportedTimeZone, suggestTimeZones } from '#locale/timeZones.ts';
import type Bind from '#nodes/Bind.ts';
import type Context from '#nodes/Context.ts';
import type Evaluate from '#nodes/Evaluate.ts';
import TextLiteral from '#nodes/TextLiteral.ts';

/**
 * Static analysis for Moment and Now (registered per definition via
 * registerEvaluateAnalyzer): when the time zone argument is a literal that
 * isn't a known IANA zone, warn with city-name-matched suggestions, so
 * creators discover zones by typing a city they know. Computed time zones
 * can't be checked statically; they remain runtime-checked (exception values).
 */
export default function createTimeZoneAnalyzer(bind: Bind): EvaluateAnalyzer {
    return (evaluate: Evaluate, context: Context): Conflict[] => {
        const input = evaluate.getInput(bind, context);
        if (!(input instanceof TextLiteral)) return [];
        const locales = context.project.basis.locales;
        const zone = input.getValue(locales.getLocales()).text.trim();
        if (zone === '' || isSupportedTimeZone(zone)) return [];
        return [
            new UnknownTimeZone(
                input,
                zone,
                suggestTimeZones(zone, locales.getLocales()),
            ),
        ];
    };
}
