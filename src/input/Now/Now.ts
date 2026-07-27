import createStreamEvaluator from '@input/createStreamEvaluator';
import { createMomentStructure } from '@input/Moment/Moment';
import { getDateTimeDataForLocale } from '@locale/dateTimeData';
import {
    isSupportedCalendar,
    type SupportedCalendar,
} from '@locale/dateTimeFormats';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import type Locales from '@locale/Locales';
import type LocaleText from '@locale/LocaleText';
import Bind from '@nodes/Bind';
import type Expression from '@nodes/Expression';
import NoneLiteral from '@nodes/NoneLiteral';
import NoneType from '@nodes/NoneType';
import NumberLiteral from '@nodes/NumberLiteral';
import NumberType from '@nodes/NumberType';
import StreamDefinition from '@nodes/StreamDefinition';
import StreamType from '@nodes/StreamType';
import type StructureDefinition from '@nodes/StructureDefinition';
import TextType from '@nodes/TextType';
import Unit from '@nodes/Unit';
import UnionType from '@nodes/UnionType';
import type Evaluation from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import { Temporal } from '@util/getTemporal';
import type ExceptionValue from '@values/ExceptionValue';
import MessageException from '@values/MessageException';
import NumberValue from '@values/NumberValue';
import StructureValue from '@values/StructureValue';
import TemporalStreamValue from '@values/TemporalStreamValue';
import TextValue from '@values/TextValue';
import { createCalendarType } from '@input/Moment/Moment';

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
    return (
        amount * (unit === 'h' ? 3600000 : unit === 'min' ? 60000 : 1000)
    );
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
            select(evaluator.getLocales()[0]),
        );
    // An unset calendar means the active locale's default. An invalid one is
    // reachable despite the literal-union input type, since conflicted
    // programs still evaluate.
    if (calendar !== undefined && !isSupportedCalendar(calendar))
        return error((locale) => locale.input.Moment.error.calendar);
    const chosen: SupportedCalendar =
        calendar !== undefined && isSupportedCalendar(calendar)
            ? calendar
            : getDateTimeDataForLocale(evaluator.getLocales()[0]).calendar;
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
