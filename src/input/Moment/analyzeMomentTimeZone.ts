import type Conflict from '@conflicts/Conflict';
import type { EvaluateAnalyzer } from '@conflicts/evaluateAnalyzers';
import UnknownTimeZone from '@conflicts/UnknownTimeZone';
import { isSupportedTimeZone, suggestTimeZones } from '@locale/timeZones';
import type Bind from '@nodes/Bind';
import type Context from '@nodes/Context';
import type Evaluate from '@nodes/Evaluate';
import TextLiteral from '@nodes/TextLiteral';

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
