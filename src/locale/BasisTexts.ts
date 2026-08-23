import type {
    DocText,
    FunctionText,
    NameAndDoc,
    NameText,
    Template,
} from '@locale/LocaleText';

const Empty = [] as const;
type EmptyInputs = typeof Empty;

export type BasisNameAndDoc = {
    /** [formatted] Documentation to explain what the type is for and how it's used. */
    doc: DocText;
    /** [name] The name to use to describe the type of value. */
    name: NameText;
};

type BasisTexts = {
    /** Any ⊤ or ⊥ value */
    Boolean: BasisNameAndDoc & {
        /** Functions in the type */
        function: {
            /** [formatted] See `en-US.json` for documentation  */
            and: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            or: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            not: FunctionText<EmptyInputs>;
            /** [formatted] See `en-US.json` for documentation  */
            equals: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            notequal: FunctionText<[NameAndDoc]>;
        };
        /** Conversions in the type */
        conversion: {
            /** [formatted] See `en-US.json` for documentation  */
            text: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            number: DocText;
        };
    };
    /** A none value, `ø` */
    None: BasisNameAndDoc & {
        /** Functions in the type */
        function: {
            /** [formatted] See `en-US.json` for documentation  */
            equals: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            notequals: FunctionText<[NameAndDoc]>;
        };
        /** Conversions in the type */
        conversion: {
            /** [formatted] None to Text */
            text: DocText;
        };
    };
    /** A text value, e.g., `'hello'` */
    Text: BasisNameAndDoc & {
        /** Functions in the type */
        function: {
            /** [formatted] See `en-US.json` for documentation  */
            length: FunctionText<EmptyInputs>;
            /** [formatted] See `en-US.json` for documentation  */
            equals: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            notequals: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            has: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            starts: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            ends: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            uppercase: FunctionText<EmptyInputs>;
            /** [formatted] See `en-US.json` for documentation  */
            lowercase: FunctionText<EmptyInputs>;
            /** [formatted] See `en-US.json` for documentation  */
            subsequence: FunctionText<[NameAndDoc, NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            index: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            replace: FunctionText<[NameAndDoc, NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            trim: FunctionText<EmptyInputs>;
            /** [formatted] See `en-US.json` for documentation  */
            reverse: FunctionText<EmptyInputs>;
            /** [formatted] See `en-US.json` for documentation  */
            repeat: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            segment: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            combine: FunctionText<[NameAndDoc]>;
            /** `≈` — whether a pattern matches the whole text. See LANGUAGE.md. */
            matches: FunctionText<[NameAndDoc]>;
            /** `⌕` — search the text for a pattern, returning a list of Result. */
            search: FunctionText<[NameAndDoc]>;
        };
        /** Conversions in the type */
        conversion: {
            /** [formatted] See `en-US.json` for documentation  */
            list: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            number: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            formatted: DocText;
        };
    };
    /** A formatted (markup) value, e.g., `` `**hi**` `` */
    Formatted: BasisNameAndDoc & {
        /** Functions in the type */
        function: {
            /** [formatted] See `en-US.json` for documentation  */
            length: FunctionText<EmptyInputs>;
            /** [formatted] See `en-US.json` for documentation  */
            equals: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            notequals: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            has: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            starts: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            ends: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            uppercase: FunctionText<EmptyInputs>;
            /** [formatted] See `en-US.json` for documentation  */
            lowercase: FunctionText<EmptyInputs>;
            /** [formatted] See `en-US.json` for documentation  */
            repeat: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            combine: FunctionText<[NameAndDoc]>;
        };
        /** Conversions in the type */
        conversion: {
            /** [formatted] See `en-US.json` for documentation  */
            text: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            list: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            number: DocText;
        };
    };
    /** A number value, e.g., `5` or `-23.3` */
    Number: BasisNameAndDoc & {
        /** Functions in the type */
        function: {
            /** [formatted] See `en-US.json` for documentation  */
            add: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            subtract: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            multiply: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            divide: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            remainder: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            positive: FunctionText<EmptyInputs>;
            /** [formatted] See `en-US.json` for documentation  */
            round: FunctionText<EmptyInputs>;
            /** [formatted] See `en-US.json` for documentation  */
            roundDown: FunctionText<EmptyInputs>;
            /** [formatted] See `en-US.json` for documentation  */
            roundUp: FunctionText<EmptyInputs>;
            /** [formatted] See `en-US.json` for documentation  */
            power: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            root: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            lessThan: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            greaterThan: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            lessOrEqual: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            greaterOrEqual: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            equal: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            notequal: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            cos: FunctionText<EmptyInputs>;
            /** [formatted] See `en-US.json` for documentation  */
            sin: FunctionText<EmptyInputs>;
            /** [formatted] See `en-US.json` for documentation  */
            tan: FunctionText<EmptyInputs>;
            /** [formatted] See `en-US.json` for documentation  */
            arcsin: FunctionText<EmptyInputs>;
            /** [formatted] See `en-US.json` for documentation  */
            arccos: FunctionText<EmptyInputs>;
            /** [formatted] See `en-US.json` for documentation  */
            arctan: FunctionText<EmptyInputs>;
            /** [formatted] See `en-US.json` for documentation  */
            exp: FunctionText<EmptyInputs>;
            /** [formatted] See `en-US.json` for documentation  */
            log: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            min: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            max: FunctionText<[NameAndDoc]>;
        };
        /** Conversions in the type */
        conversion: {
            /** [formatted] See `en-US.json` for documentation  */
            text: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            list: DocText;
            /** [formatted] Documentation for a unit conversion, e.g. "seconds to minutes". One
             *  template covers every unit conversion; the unit names come from `unit` below. */
            unit: Template<['from', 'to']>;
        };
        /** The name of each unit the built-in conversions know, e.g. "seconds". Only used to
         *  fill in the `conversion.unit` template above. */
        unit: {
            /** [plain] The name of the unit nanoseconds, used in conversion documentation */
            ns: string;
            /** [plain] The name of the unit microseconds, used in conversion documentation */
            us: string;
            /** [plain] The name of the unit milliseconds, used in conversion documentation */
            ms: string;
            /** [plain] The name of the unit seconds, used in conversion documentation */
            s: string;
            /** [plain] The name of the unit minutes, used in conversion documentation */
            min: string;
            /** [plain] The name of the unit hours, used in conversion documentation */
            h: string;
            /** [plain] The name of the unit days, used in conversion documentation */
            day: string;
            /** [plain] The name of the unit weeks, used in conversion documentation */
            wk: string;
            /** [plain] The name of the unit years, used in conversion documentation */
            yr: string;
            /** [plain] The name of the unit picometers, used in conversion documentation */
            pm: string;
            /** [plain] The name of the unit nanometers, used in conversion documentation */
            nm: string;
            /** [plain] The name of the unit micrometers, used in conversion documentation */
            um: string;
            /** [plain] The name of the unit millimeters, used in conversion documentation */
            mm: string;
            /** [plain] The name of the unit centimeters, used in conversion documentation */
            cm: string;
            /** [plain] The name of the unit decimeters, used in conversion documentation */
            dm: string;
            /** [plain] The name of the unit meters, used in conversion documentation */
            m: string;
            /** [plain] The name of the unit hectometers, used in conversion documentation */
            hm: string;
            /** [plain] The name of the unit kilometers, used in conversion documentation */
            km: string;
            /** [plain] The name of the unit megameters, used in conversion documentation */
            Mm: string;
            /** [plain] The name of the unit gigameters, used in conversion documentation */
            Gm: string;
            /** [plain] The name of the unit terameters, used in conversion documentation */
            Tm: string;
            /** [plain] The name of the unit inches, used in conversion documentation */
            in: string;
            /** [plain] The name of the unit feet, used in conversion documentation */
            ft: string;
            /** [plain] The name of the unit yards, used in conversion documentation */
            yd: string;
            /** [plain] The name of the unit miles, used in conversion documentation */
            mi: string;
            /** [plain] The name of the unit nautical miles, used in conversion documentation */
            nmi: string;
            /** [plain] The name of the unit astronomical units, used in conversion documentation */
            au: string;
            /** [plain] The name of the unit light years, used in conversion documentation */
            ly: string;
            /** [plain] The name of the unit micrograms, used in conversion documentation */
            ug: string;
            /** [plain] The name of the unit milligrams, used in conversion documentation */
            mg: string;
            /** [plain] The name of the unit grams, used in conversion documentation */
            g: string;
            /** [plain] The name of the unit kilograms, used in conversion documentation */
            kg: string;
            /** [plain] The name of the unit metric tons, used in conversion documentation */
            t: string;
            /** [plain] The name of the unit ounces, used in conversion documentation */
            oz: string;
            /** [plain] The name of the unit pounds, used in conversion documentation */
            lb: string;
            /** [plain] The name of the unit stones, used in conversion documentation */
            st: string;
            /** [plain] The name of the unit US short tons, used in conversion documentation */
            uston: string;
            /** [plain] The name of the unit British long tons, used in conversion documentation */
            ukton: string;
            /** [plain] The name of the unit degrees Celsius, used in conversion documentation */
            degC: string;
            /** [plain] The name of the unit degrees Fahrenheit, used in conversion documentation */
            degF: string;
            /** [plain] The name of the unit kelvins, used in conversion documentation */
            K: string;
            /** [plain] The name of the unit degrees, used in conversion documentation */
            deg: string;
            /** [plain] The name of the unit radians, used in conversion documentation */
            rad: string;
            /** [plain] The name of the unit square millimeters, used in conversion documentation */
            mm2: string;
            /** [plain] The name of the unit square centimeters, used in conversion documentation */
            cm2: string;
            /** [plain] The name of the unit square meters, used in conversion documentation */
            m2: string;
            /** [plain] The name of the unit square kilometers, used in conversion documentation */
            km2: string;
            /** [plain] The name of the unit square inches, used in conversion documentation */
            in2: string;
            /** [plain] The name of the unit square feet, used in conversion documentation */
            ft2: string;
            /** [plain] The name of the unit square yards, used in conversion documentation */
            yd2: string;
            /** [plain] The name of the unit square miles, used in conversion documentation */
            mi2: string;
            /** [plain] The name of the unit hectares, used in conversion documentation */
            ha: string;
            /** [plain] The name of the unit acres, used in conversion documentation */
            acre: string;
            /** [plain] The name of the unit milliliters, used in conversion documentation */
            mL: string;
            /** [plain] The name of the unit centiliters, used in conversion documentation */
            cL: string;
            /** [plain] The name of the unit deciliters, used in conversion documentation */
            dL: string;
            /** [plain] The name of the unit liters, used in conversion documentation */
            L: string;
            /** [plain] The name of the unit kiloliters, used in conversion documentation */
            kL: string;
            /** [plain] The name of the unit cubic centimeters, used in conversion documentation */
            cm3: string;
            /** [plain] The name of the unit cubic meters, used in conversion documentation */
            m3: string;
            /** [plain] The name of the unit teaspoons, used in conversion documentation */
            tsp: string;
            /** [plain] The name of the unit tablespoons, used in conversion documentation */
            tbsp: string;
            /** [plain] The name of the unit cups, used in conversion documentation */
            cup: string;
            /** [plain] The name of the unit US fluid ounces, used in conversion documentation */
            usfloz: string;
            /** [plain] The name of the unit US pints, used in conversion documentation */
            uspt: string;
            /** [plain] The name of the unit US quarts, used in conversion documentation */
            usqt: string;
            /** [plain] The name of the unit US gallons, used in conversion documentation */
            usgal: string;
            /** [plain] The name of the unit British fluid ounces, used in conversion documentation */
            ukfloz: string;
            /** [plain] The name of the unit British pints, used in conversion documentation */
            ukpt: string;
            /** [plain] The name of the unit British quarts, used in conversion documentation */
            ukqt: string;
            /** [plain] The name of the unit British gallons, used in conversion documentation */
            ukgal: string;
            /** [plain] The name of the unit meters per second, used in conversion documentation */
            mps: string;
            /** [plain] The name of the unit kilometers per hour, used in conversion documentation */
            kmph: string;
            /** [plain] The name of the unit miles per hour, used in conversion documentation */
            miph: string;
            /** [plain] The name of the unit feet per second, used in conversion documentation */
            ftps: string;
            /** [plain] The name of the unit knots, used in conversion documentation */
            kn: string;
            /** [plain] The name of the unit pascals, used in conversion documentation */
            Pa: string;
            /** [plain] The name of the unit hectopascals, used in conversion documentation */
            hPa: string;
            /** [plain] The name of the unit kilopascals, used in conversion documentation */
            kPa: string;
            /** [plain] The name of the unit bars, used in conversion documentation */
            bar: string;
            /** [plain] The name of the unit atmospheres, used in conversion documentation */
            atm: string;
            /** [plain] The name of the unit pounds per square inch, used in conversion documentation */
            psi: string;
            /** [plain] The name of the unit millimeters of mercury, used in conversion documentation */
            mmHg: string;
            /** [plain] The name of the unit joules, used in conversion documentation */
            J: string;
            /** [plain] The name of the unit kilojoules, used in conversion documentation */
            kJ: string;
            /** [plain] The name of the unit calories, used in conversion documentation */
            cal: string;
            /** [plain] The name of the unit kilocalories, used in conversion documentation */
            kcal: string;
            /** [plain] The name of the unit watt hours, used in conversion documentation */
            Wh: string;
            /** [plain] The name of the unit kilowatt hours, used in conversion documentation */
            kWh: string;
            /** [plain] The name of the unit British thermal units, used in conversion documentation */
            BTU: string;
            /** [plain] The name of the unit electronvolts, used in conversion documentation */
            eV: string;
            /** [plain] The name of the unit milliwatts, used in conversion documentation */
            mW: string;
            /** [plain] The name of the unit watts, used in conversion documentation */
            W: string;
            /** [plain] The name of the unit kilowatts, used in conversion documentation */
            kW: string;
            /** [plain] The name of the unit megawatts, used in conversion documentation */
            MW: string;
            /** [plain] The name of the unit gigawatts, used in conversion documentation */
            GW: string;
            /** [plain] The name of the unit horsepower, used in conversion documentation */
            hp: string;
            /** [plain] The name of the unit microamperes, used in conversion documentation */
            uA: string;
            /** [plain] The name of the unit milliamperes, used in conversion documentation */
            mA: string;
            /** [plain] The name of the unit amperes, used in conversion documentation */
            A: string;
            /** [plain] The name of the unit kiloamperes, used in conversion documentation */
            kA: string;
            /** [plain] The name of the unit millivolts, used in conversion documentation */
            mV: string;
            /** [plain] The name of the unit volts, used in conversion documentation */
            V: string;
            /** [plain] The name of the unit kilovolts, used in conversion documentation */
            kV: string;
            /** [plain] The name of the unit milliohms, used in conversion documentation */
            mohm: string;
            /** [plain] The name of the unit ohms, used in conversion documentation */
            ohm: string;
            /** [plain] The name of the unit kiloohms, used in conversion documentation */
            kohm: string;
            /** [plain] The name of the unit megaohms, used in conversion documentation */
            Mohm: string;
            /** [plain] The name of the unit hertz, used in conversion documentation */
            Hz: string;
            /** [plain] The name of the unit kilohertz, used in conversion documentation */
            kHz: string;
            /** [plain] The name of the unit megahertz, used in conversion documentation */
            MHz: string;
            /** [plain] The name of the unit gigahertz, used in conversion documentation */
            GHz: string;
            /** [plain] The name of the unit beats per minute, used in conversion documentation */
            bpm: string;
            /** [plain] The name of the unit bits, used in conversion documentation */
            bit: string;
            /** [plain] The name of the unit bytes, used in conversion documentation */
            B: string;
            /** [plain] The name of the unit kilobytes, used in conversion documentation */
            kB: string;
            /** [plain] The name of the unit megabytes, used in conversion documentation */
            MB: string;
            /** [plain] The name of the unit gigabytes, used in conversion documentation */
            GB: string;
            /** [plain] The name of the unit terabytes, used in conversion documentation */
            TB: string;
            /** [plain] The name of the unit kibibytes, used in conversion documentation */
            KiB: string;
            /** [plain] The name of the unit mebibytes, used in conversion documentation */
            MiB: string;
            /** [plain] The name of the unit gibibytes, used in conversion documentation */
            GiB: string;
            /** [plain] The name of the unit tebibytes, used in conversion documentation */
            TiB: string;
            /** [plain] The name of the unit lux, used in conversion documentation */
            lux: string;
            /** [plain] The name of the unit foot-candles, used in conversion documentation */
            fc: string;
        };
    };
    /** A list value, e.g., `[1 2 3]` */
    List: BasisNameAndDoc & {
        /** [name] The type variable name for the kind of values in the list */
        kind: NameText;
        /** [name] The type variable name to use for functions that produce lists of different types */
        out: NameText;
        /** [name] The name of the exception when an index is out of bounds of a list's values */
        outofbounds: NameText;
        /** Functions in the type */
        function: {
            /** [formatted] See `en-US.json` for documentation  */
            add: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            append: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            replace: FunctionText<[NameAndDoc, NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            length: FunctionText<EmptyInputs>;
            /** [formatted] See `en-US.json` for documentation  */
            random: FunctionText<EmptyInputs>;
            /** [formatted] See `en-US.json` for documentation  */
            shuffled: FunctionText<EmptyInputs>;
            /** [formatted] See `en-US.json` for documentation  */
            first: FunctionText<EmptyInputs>;
            /** [formatted] See `en-US.json` for documentation  */
            last: FunctionText<EmptyInputs>;
            /** [formatted] See `en-US.json` for documentation  */
            has: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            join: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            subsequence: FunctionText<[NameAndDoc, NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            sansFirst: FunctionText<EmptyInputs>;
            /** [formatted] See `en-US.json` for documentation  */
            sansLast: FunctionText<EmptyInputs>;
            /** [formatted] See `en-US.json` for documentation  */
            sansAll: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            reverse: FunctionText<EmptyInputs>;
            /** [formatted] See `en-US.json` for documentation  */
            equals: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            notequals: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            translate: FunctionText<[NameAndDoc]> & {
                translator: [NameAndDoc, NameAndDoc, NameAndDoc];
            };
            /** [formatted] See `en-US.json` for documentation  */
            filter: FunctionText<[NameAndDoc]> & {
                checker: [NameAndDoc, NameAndDoc, NameAndDoc];
            };
            /** [formatted] See `en-US.json` for documentation  */
            all: FunctionText<[NameAndDoc]> & {
                checker: [NameAndDoc, NameAndDoc, NameAndDoc];
            };
            /** [formatted] See `en-US.json` for documentation  */
            until: FunctionText<[NameAndDoc]> & {
                checker: [NameAndDoc, NameAndDoc, NameAndDoc];
            };
            /** [formatted] See `en-US.json` for documentation  */
            find: FunctionText<[NameAndDoc]> & {
                checker: [NameAndDoc, NameAndDoc, NameAndDoc];
            };
            /** [formatted] See `en-US.json` for documentation  */
            combine: FunctionText<[NameAndDoc, NameAndDoc]> & {
                combiner: [NameAndDoc, NameAndDoc, NameAndDoc, NameAndDoc];
            };
            /** [formatted] See `en-US.json` for documentation  */
            sorted: FunctionText<[NameAndDoc]> & { sequencer: [NameAndDoc] };
        };
        /** [formatted] Conversions in the type */
        conversion: { text: DocText; set: DocText };
    };
    /** A set value, `{1 2 3}` */
    Set: BasisNameAndDoc & {
        /** [name] The type variable name for the kind of value in the set */
        kind: NameText;
        /** [name] The type variable name for sets that produce sets of different value types */
        out: NameText;
        /** Functions in the type */
        function: {
            /** [formatted] See `en-US.json` for documentation  */
            size: FunctionText<EmptyInputs>;
            /** [formatted] See `en-US.json` for documentation  */
            equals: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            notequals: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            add: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            remove: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            union: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            intersection: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            difference: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            filter: FunctionText<[NameAndDoc]> & {
                checker: [NameAndDoc, NameAndDoc];
            };
            /** [formatted] See `en-US.json` for documentation  */
            translate: FunctionText<[NameAndDoc]> & {
                translator: [NameAndDoc, NameAndDoc];
            };
        };
        /** Conversions in the type */
        conversion: {
            /** [formatted] See `en-US.json` for documentation  */
            text: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            list: DocText;
        };
    };
    Map: BasisNameAndDoc & {
        /** [name] The type variable name for the map's type of keys */
        key: NameText;
        /** [name] The type variable name for the map's type of values */
        value: NameText;
        /** [name] The type variable name for higher order functions that produce maps of different types */
        result: NameText;
        /** Functions in the type */
        function: {
            /** [formatted] See `en-US.json` for documentation  */
            size: FunctionText<EmptyInputs>;
            /** [formatted] See `en-US.json` for documentation  */
            equals: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            notequals: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            set: FunctionText<[NameAndDoc, NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            unset: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            remove: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            filter: FunctionText<[NameAndDoc]> & {
                checker: [NameAndDoc, NameAndDoc, NameAndDoc];
            };
            /** [formatted] See `en-US.json` for documentation  */
            translate: FunctionText<[NameAndDoc]> & {
                translator: [NameAndDoc, NameAndDoc, NameAndDoc];
            };
        };
        /** Conversions in the type */
        conversion: {
            /** [formatted] See `en-US.json` for documentation  */
            text: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            set: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            list: DocText;
        };
    };
    /** A table value type, e.g., `⎡a•# b•#⎦⎡1 2⎦` */
    Table: BasisNameAndDoc & {
        /** [name] The type variable name for the type of row in a table */
        row: NameText;
        /** Functions in the type */
        function: {
            /** [formatted] See `en-US.json` for documentation  */
            equals: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            notequal: FunctionText<[NameAndDoc]>;
        };
        /** Conversions in the type */
        conversion: {
            /** [formatted] See `en-US.json` for documentation  */
            list: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            text: DocText;
        };
    };
    /** A custom type defined by the user, e.g., `•Kitty(name•'')` */
    Structure: BasisNameAndDoc & {
        /** Functions in the type */
        function: {
            /** [formatted] See `en-US.json` for documentation  */
            equals: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            notequal: FunctionText<[NameAndDoc]>;
        };
        /** Conversions in the type */
        conversion: {
            /** [formatted] See `en-US.json` for documentation  */
            text: DocText;
        };
    };
};

export { type BasisTexts as default };
