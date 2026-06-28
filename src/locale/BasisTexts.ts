import type {
    DocText,
    FunctionText,
    NameAndDoc,
    NameText,
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
            repeat: FunctionText<[NameAndDoc]>;
            /** [formatted] See `en-US.json` for documentation  */
            combine: FunctionText<[NameAndDoc]>;
        };
        /** Conversions in the type */
        conversion: {
            /** [formatted] See `en-US.json` for documentation  */
            text: DocText;
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
            /** [formatted] See `en-US.json` for documentation  */
            s2m: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            s2h: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            s2day: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            s2wk: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            s2year: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            s2ms: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            ms2s: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            min2s: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            h2s: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            day2s: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            wk2s: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            yr2s: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            m2pm: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            m2nm: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            m2micro: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            m2mm: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            m2cm: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            m2dm: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            m2km: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            m2Mm: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            m2Gm: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            m2Tm: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            pm2m: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            nm2m: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            micro2m: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            mm2m: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            cm2m: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            dm2m: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            km2m: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            Mm2m: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            Gm2m: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            Tm2m: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            km2mi: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            mi2km: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            cm2in: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            in2cm: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            m2ft: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            ft2m: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            g2mg: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            mg2g: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            g2kg: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            kg2g: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            g2oz: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            oz2g: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            oz2lb: DocText;
            /** [formatted] See `en-US.json` for documentation  */
            lb2oz: DocText;
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
            sans: FunctionText<[NameAndDoc]>;
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
