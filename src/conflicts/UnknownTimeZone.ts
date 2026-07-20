import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '@conflicts/Conflict';
import type LocaleText from '@locale/LocaleText';
import type Locales from '@locale/Locales';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import TextLiteral from '@nodes/TextLiteral';

/**
 * A warning emitted when a literal time zone given to @Moment or @Now isn't a
 * known IANA time zone. Suggestions are matched against zone ids and (possibly
 * localized) city names, so a creator can type a city they know and accept the
 * matching zone. Static analysis only — see analyzeMomentTimeZone; computed
 * time zones are still checked at runtime.
 */
export default class UnknownTimeZone extends Conflict {
    readonly literal: TextLiteral;
    readonly zone: string;
    readonly suggestions: { zone: string; city: string }[];

    constructor(
        literal: TextLiteral,
        zone: string,
        suggestions: { zone: string; city: string }[],
    ) {
        // Warning, not error: the program still evaluates (the stream carries
        // a localized exception value), so learners can keep working.
        super(ConflictSeverity.Warning);
        this.literal = literal;
        this.zone = zone;
        this.suggestions = suggestions;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Evaluate.conflict.UnknownTimeZone;

    getMessage() {
        return {
            node: this.literal,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => UnknownTimeZone.LocalePath(l).explanation,
                    { zone: this.zone },
                ),
        };
    }

    override getResolutions(context: Context, concepts: Node[]): Resolutions {
        const repairs = this.suggestions.map(({ zone, city }) => ({
            kind: 'repair' as const,
            description: (locales: Locales) =>
                locales.concretize(
                    (l) => UnknownTimeZone.LocalePath(l).resolution,
                    { zone, city },
                ),
            mediator: (ctx: Context) => {
                const revised = TextLiteral.make(zone);
                return {
                    newProject: ctx.project.withRevisedNodes([
                        [this.literal, revised],
                    ]),
                    newNode: revised,
                };
            },
        }));
        const [first, ...rest] = repairs;
        return first !== undefined
            ? [first, ...rest]
            : Conflict.fallbackExplainer(this, context, concepts);
    }

    getLocalePath() {
        return UnknownTimeZone.LocalePath;
    }
}
