import { createBasisConversion } from '@basis/Basis';
import { getDateTimeDataForLocale } from '@locale/dateTimeData';
import {
    formatDateTimeForLocale,
    isSupportedCalendar,
    SupportedCalendars,
    type DateTimeFields,
    type SupportedCalendar,
} from '@locale/dateTimeFormats';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import type Locales from '@locale/Locales';
import type { NameAndDoc } from '@locale/LocaleText';
import type LocaleText from '@locale/LocaleText';
import Bind from '@nodes/Bind';
import Block, { BlockKind } from '@nodes/Block';
import Convert from '@nodes/Convert';
import NameType from '@nodes/NameType';
import NoneLiteral from '@nodes/NoneLiteral';
import NoneType from '@nodes/NoneType';
import NumberType from '@nodes/NumberType';
import StructureDefinition from '@nodes/StructureDefinition';
import TextType from '@nodes/TextType';
import type Type from '@nodes/Type';
import UnionType from '@nodes/UnionType';
import type Evaluation from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import { Temporal, type TemporalTypes } from '@util/getTemporal';
import type Names from '@nodes/Names';
import MessageException from '@values/MessageException';
import NoneValue from '@values/NoneValue';
import NumberValue from '@values/NumberValue';
import StructureValue, { createStructure } from '@values/StructureValue';
import TextValue from '@values/TextValue';
import type Value from '@values/Value';
import type Expression from '@nodes/Expression';

/** The positional order of Moment's inputs: construction-friendly (date, time,
 *  configuration, then the informational fields Now fills in). */
const YearIndex = 0;
const MonthIndex = 1;
const DayIndex = 2;
const HourIndex = 3;
const MinuteIndex = 4;
const SecondIndex = 5;
const MillisecondIndex = 6;
/** Exported so the time zone analyzer can find the bind (see createDefaultShares). */
export const MomentTimezoneIndex = 7;
const TimezoneIndex = MomentTimezoneIndex;
const CalendarIndex = 8;

/** Temporal's representable ISO year range is about ±275760; clamping keeps
 *  arbitrary program numbers from turning into RangeErrors mid-evaluation. */
const MaximumYear = 99999;

/** The type of Moment's calendar input: one of the supported Unicode calendar
 *  identifiers (as literal text types, so typos are type errors), or none. */
export function createCalendarType(): Type {
    return SupportedCalendars.reduceRight<Type>(
        (union, calendar) => UnionType.make(TextType.make(calendar), union),
        NoneType.make(),
    );
}

/** Make a Moment structure value from a Temporal zoned date/time, for Now. */
export function createMomentStructure(
    evaluator: Evaluator,
    creator: Expression,
    definition: StructureDefinition,
    moment: TemporalTypes.ZonedDateTime,
): StructureValue {
    const number = (value: number) => new NumberValue(creator, value);
    const values: Value[] = [
        number(moment.year),
        number(moment.month),
        number(moment.day),
        number(moment.hour),
        number(moment.minute),
        number(moment.second),
        number(moment.millisecond),
        new TextValue(creator, moment.timeZoneId),
        new TextValue(creator, moment.calendarId),
        moment.era !== undefined
            ? new TextValue(creator, moment.era)
            : new NoneValue(creator),
        moment.weekOfYear !== undefined
            ? number(moment.weekOfYear)
            : new NoneValue(creator),
        number(moment.dayOfWeek),
    ];
    const bindings = new Map<Names, Value>();
    definition.inputs.forEach((input, index) =>
        bindings.set(input.names, values[index]),
    );
    return createStructure(evaluator, definition, bindings);
}

export function createMomentType(locales: Locales): StructureDefinition {
    const names = getNameLocales(locales, (locale) => locale.input.Moment.names);

    const bind = (
        select: (locale: LocaleText) => NameAndDoc,
        type: Type,
    ): Bind =>
        Bind.make(
            getDocLocales(locales, (locale) => select(locale).doc),
            getNameLocales(locales, (locale) => select(locale).names),
            type,
            NoneLiteral.make(),
        );
    const numberBind = (select: (locale: LocaleText) => NameAndDoc) =>
        bind(select, UnionType.orNone(NumberType.make()));

    const inputs = [
        numberBind((l) => l.input.Moment.year),
        numberBind((l) => l.input.Moment.month),
        numberBind((l) => l.input.Moment.day),
        numberBind((l) => l.input.Moment.hour),
        numberBind((l) => l.input.Moment.minute),
        numberBind((l) => l.input.Moment.second),
        numberBind((l) => l.input.Moment.millisecond),
        bind((l) => l.input.Moment.timezone, UnionType.orNone(TextType.make())),
        bind((l) => l.input.Moment.calendar, createCalendarType()),
        bind((l) => l.input.Moment.era, UnionType.orNone(TextType.make())),
        numberBind((l) => l.input.Moment.week),
        numberBind((l) => l.input.Moment.weekday),
    ];

    const conversion = createBasisConversion(
        getDocLocales(locales, (locale) => locale.input.Moment.conversion.text),
        NameType.make(names.getNames()[0]),
        TextType.make(),
        (requestor: Expression, moment: StructureValue, evaluation: Evaluation) =>
            momentToText(requestor, moment, evaluation, locales),
    );

    return StructureDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Moment.doc),
        names,
        [],
        undefined,
        inputs,
        new Block([conversion], BlockKind.Structure),
    );
}

/** Read a positional numeric input, truncated to a clamped integer, treating
 *  anything non-finite (or unset) as absent. */
function integerInput(moment: StructureValue, index: number): number | undefined {
    const value = moment.getInput(index);
    if (!(value instanceof NumberValue)) return undefined;
    const number = value.toNumber();
    return Number.isFinite(number)
        ? Math.max(-MaximumYear, Math.min(MaximumYear, Math.trunc(number)))
        : undefined;
}

function textInput(moment: StructureValue, index: number): string | undefined {
    const value = moment.getInput(index);
    return value instanceof TextValue ? value.text : undefined;
}

/** Convert a Moment to localized text: resolve the target locale (mirroring
 *  Number → Text, including `→ ''/language` targets), reconstruct a Temporal
 *  date/time in the Moment's calendar and time zone, and format it with the
 *  locale's committed date/time data. */
function momentToText(
    requestor: Expression,
    moment: StructureValue,
    evaluation: Evaluation,
    locales: Locales,
): Value {
    const evaluator = evaluation.getEvaluator();

    // If the creator named a target locale on the conversion's text type
    // (e.g. `→ ''/hi`), render in that locale and tag the resulting text with
    // it; otherwise use the active output locale and leave the text untagged.
    const creator = evaluation.getCreator();
    const requestedLanguage =
        creator instanceof Convert && creator.type instanceof TextType
            ? creator.type.concreteLanguage(evaluation.getContext())
            : undefined;
    const target = requestedLanguage?.getLocaleID() ?? locales.getLocale();
    const data = getDateTimeDataForLocale(target);

    const error = (
        select: (locale: LocaleText) => string,
    ): MessageException =>
        new MessageException(
            requestor,
            evaluator,
            select(evaluator.getLocales()[0]),
        );

    // An unset calendar means the target locale's; an invalid one (reachable
    // despite the literal-union type, since conflicted programs still evaluate)
    // is an exception.
    const calendarText = textInput(moment, CalendarIndex);
    if (calendarText !== undefined && !isSupportedCalendar(calendarText))
        return error((locale) => locale.input.Moment.error.calendar);
    const calendar: SupportedCalendar = calendarText ?? data.calendar;

    const timezone = textInput(moment, TimezoneIndex);

    const year = integerInput(moment, YearIndex);
    const month = integerInput(moment, MonthIndex);
    const day = integerInput(moment, DayIndex);
    const hour = integerInput(moment, HourIndex);
    const minute = integerInput(moment, MinuteIndex);
    const second = integerInput(moment, SecondIndex);
    const millisecond = integerInput(moment, MillisecondIndex);

    const hasDate =
        year !== undefined || month !== undefined || day !== undefined;
    const hasTime =
        hour !== undefined ||
        minute !== undefined ||
        second !== undefined ||
        millisecond !== undefined;

    let zoned: TemporalTypes.ZonedDateTime;
    try {
        const timeZone = timezone ?? Temporal.Now.timeZoneId();
        const now = Temporal.Now.zonedDateTimeISO(timeZone).withCalendar(calendar);
        // Unset parts follow a hierarchy (year > month > day > hour > …):
        // anything LARGER than the largest part given comes from the current
        // moment, and anything smaller starts at its beginning (month and day
        // at 1, time at 0). So Moment(month: 12) is December 1 of this year.
        const given = [year, month, day, hour, minute, second, millisecond];
        const largest = given.findIndex((value) => value !== undefined);
        const defaulted = (index: number, current: number, start: number) =>
            given[index] ?? (index < largest ? current : start);
        zoned =
            !hasDate && !hasTime
                ? // A Moment with no parts at all is the current date and time.
                  now
                : Temporal.ZonedDateTime.from(
                      {
                          timeZone,
                          calendar,
                          year: year ?? now.year,
                          month: defaulted(1, now.month, 1),
                          day: defaulted(2, now.day, 1),
                          hour: defaulted(3, now.hour, 0),
                          minute: defaulted(4, now.minute, 0),
                          second: defaulted(5, now.second, 0),
                          millisecond: defaulted(6, now.millisecond, 0),
                      },
                      { overflow: 'constrain' },
                  );
    } catch (_) {
        // The only invalid input left after clamping is the time zone name.
        return error((locale) => locale.input.Moment.error.timezone);
    }

    const fields: DateTimeFields = {
        year: zoned.year,
        relatedISOYear: zoned.withCalendar('iso8601').year,
        monthCode: zoned.monthCode,
        month: zoned.month,
        day: zoned.day,
        hour: zoned.hour,
        minute: zoned.minute,
        second: zoned.second,
    };
    if (zoned.era !== undefined) fields.era = zoned.era;
    if (zoned.eraYear !== undefined) fields.eraYear = zoned.eraYear;

    const both = !hasDate && !hasTime;
    return new TextValue(
        requestor,
        formatDateTimeForLocale(fields, calendar, data, target, {
            date: hasDate || both,
            time: hasTime || both,
        }),
        requestedLanguage,
    );
}
