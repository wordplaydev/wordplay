import createStreamEvaluator from '#input/createStreamEvaluator.ts';
import { createMomentStructure } from '#input/Moment/Moment.ts';
import { getDateTimeDataForLocale } from '#locale/dateTimeData.ts';
import {
    isSupportedCalendar,
    type SupportedCalendar,
} from '#locale/dateTimeFormats.ts';
import { getDocLocales } from '#locale/getDocLocales.ts';
import { getNameLocales } from '#locale/getNameLocales.ts';
import type Locales from '#locale/Locales.ts';
import type LocaleText from '#locale/LocaleText.ts';
import Bind from '#nodes/Bind.ts';
import type Expression from '#nodes/Expression.ts';
import NoneLiteral from '#nodes/NoneLiteral.ts';
import NoneType from '#nodes/NoneType.ts';
import NumberLiteral from '#nodes/NumberLiteral.ts';
import NumberType from '#nodes/NumberType.ts';
import StreamDefinition from '#nodes/StreamDefinition.ts';
import StreamType from '#nodes/StreamType.ts';
import type StructureDefinition from '#nodes/StructureDefinition.ts';
import TextType from '#nodes/TextType.ts';
import Unit from '#nodes/Unit.ts';
import UnionType from '#nodes/UnionType.ts';
import type Evaluation from '#runtime/Evaluation.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import { Temporal } from '#util/getTemporal.ts';
import type ExceptionValue from '#values/ExceptionValue.ts';
import MessageException from '#values/MessageException.ts';
import NumberValue from '#values/NumberValue.ts';
import StructureValue from '#values/StructureValue.ts';
import TemporalStreamValue from '#values/TemporalStreamValue.ts';
import TextValue from '#values/TextValue.ts';
import { createCalendarType } from '#input/Moment/Moment.ts';
import type { StreamKind } from '#values/StreamValue.ts';
import { first, must } from '#util/nullable.ts';

const DEFAULT_FREQUENCY_MS = 1000;

/** The position of Now's timezone input (after frequency), exported so the
 *  time zone analyzer can find the bind (see createDefaultShares). */
export const NowTimezoneIndex = 1;

/** Convert a frequency in #s, #min, or #h to milliseconds, defaulting to one
 *  second for anything unset or nonsensical. Exported for testing. */
export function frequencyToMilliseconds(
    value: NumberValue | undefined,
): number {
    if (value === undefined) return DEFAULT_FREQUENCY_MS;
    const amount = value.toNumber();
    if (!Number.isFinite(amount) || amount <= 0) return DEFAULT_FREQUENCY_MS;
    const unit = value.unit.toWordplay();
    return amount * (unit === 'h' ? 3600000 : unit === 'min' ? 60000 : 1000);
}

/** The current wall-clock Moment in the given time zone and calendar, or a
 *  localized exception if either identifier is invalid. */
function currentMoment(
    evaluator: Evaluator,
    creator: Expression,
    timezone: string | undefined,
    calendar: string | undefined,
): StructureValue | ExceptionValue {
    const error = (select: (locale: LocaleText) => string) =>
        new MessageException(
            creator,
            evaluator,
            // `getLocales` always ends with the default locale.
            select(must(first(evaluator.getLocales()), 'a locale')),
        );
    // An unset calendar means the active locale's default. An invalid one is
    // reachable despite the literal-union input type, since conflicted
    // programs still evaluate.
    if (calendar !== undefined && !isSupportedCalendar(calendar))
        return error((locale) => locale.input.Moment.error.calendar);
    const chosen: SupportedCalendar =
        calendar !== undefined && isSupportedCalendar(calendar)
            ? calendar
            : getDateTimeDataForLocale(
                  must(first(evaluator.getLocales()), 'a locale'),
              ).calendar;
    try {
        return createMomentStructure(
            evaluator,
            creator,
            evaluator.project.shares.input.Moment,
            Temporal.Now.zonedDateTimeISO(
                timezone ?? Temporal.Now.timeZoneId(),
            ).withCalendar(chosen),
        );
    } catch (_) {
        return error((locale) => locale.input.Moment.error.timezone);
    }
}

export default class Now extends TemporalStreamValue<
    StructureValue | ExceptionValue,
    number
> {
    readonly kind: StreamKind = 'now';

    frequency: number = DEFAULT_FREQUENCY_MS;
    timezone: string | undefined;
    calendar: string | undefined;
    lastTime: DOMHighResTimeStamp | undefined = undefined;

    constructor(
        evaluation: Evaluation,
        frequency: number,
        timezone: string | undefined,
        calendar: string | undefined,
    ) {
        super(
            evaluation,
            evaluation.getEvaluator().project.shares.input.Now,
            currentMoment(
                evaluation.getEvaluator(),
                evaluation.getCreator(),
                timezone,
                calendar,
            ),
            Date.now(),
        );
        this.frequency = frequency;
        this.timezone = timezone;
        this.calendar = calendar;
    }

    // No setup or cleanup necessary; Evaluator manages the animation loop.
    start() {
        return;
    }

    stop() {
        return;
    }

    configure(
        frequency: number,
        timezone: string | undefined,
        calendar: string | undefined,
    ) {
        this.frequency = frequency;
        this.timezone = timezone;
        this.calendar = calendar;
    }

    react(at: number) {
        this.add(
            currentMoment(
                this.evaluator,
                this.creator,
                this.timezone,
                this.calendar,
            ),
            at,
        );
    }

    tick(time: DOMHighResTimeStamp, _: number, multiplier: number) {
        const factor = Math.max(0, multiplier);

        // If the frequency has elapsed, add the current moment to the stream.
        if (
            multiplier > 0 &&
            (this.lastTime === undefined ||
                time - this.lastTime >= this.frequency * factor)
        ) {
            this.lastTime = time;
            this.add(
                currentMoment(
                    this.evaluator,
                    this.creator,
                    this.timezone,
                    this.calendar,
                ),
                Date.now(),
            );
        }
    }

    // The explicit return type matters: an inferred one would make this class's
    // type (and so createDefaultShares' return type) depend on project.shares,
    // which is itself typed by createDefaultShares — a type cycle.
    getType(): StreamType {
        return StreamType.make(
            this.evaluator.project.shares.input.Moment.getTypeReference(),
        );
    }
}

export function createNowDefinition(
    locales: Locales,
    moment: StructureDefinition,
): StreamDefinition {
    const FrequencyBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Now.frequency.doc),
        getNameLocales(locales, (locale) => locale.input.Now.frequency.names),
        UnionType.make(
            NumberType.make(Unit.reuse(['s'])),
            UnionType.make(
                NumberType.make(Unit.reuse(['min'])),
                UnionType.make(
                    NumberType.make(Unit.reuse(['h'])),
                    NoneType.make(),
                ),
            ),
        ),
        NumberLiteral.make(1, Unit.reuse(['s'])),
    );

    const TimezoneBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Now.timezone.doc),
        getNameLocales(locales, (locale) => locale.input.Now.timezone.names),
        UnionType.orNone(TextType.make()),
        NoneLiteral.make(),
    );

    const CalendarBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Now.calendar.doc),
        getNameLocales(locales, (locale) => locale.input.Now.calendar.names),
        createCalendarType(),
        NoneLiteral.make(),
    );

    return StreamDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Now.doc),
        getNameLocales(locales, (locale) => locale.input.Now.names),
        [FrequencyBind, TimezoneBind, CalendarBind],
        createStreamEvaluator(
            moment.getTypeReference(),
            Now,
            (evaluation) =>
                new Now(
                    evaluation,
                    frequencyToMilliseconds(
                        evaluation.get(FrequencyBind.names, NumberValue),
                    ),
                    evaluation.get(TimezoneBind.names, TextValue)?.text,
                    evaluation.get(CalendarBind.names, TextValue)?.text,
                ),
            (stream, evaluation) =>
                stream.configure(
                    frequencyToMilliseconds(
                        evaluation.get(FrequencyBind.names, NumberValue),
                    ),
                    evaluation.get(TimezoneBind.names, TextValue)?.text,
                    evaluation.get(CalendarBind.names, TextValue)?.text,
                ),
        ),
        moment.getTypeReference(),
    );
}
