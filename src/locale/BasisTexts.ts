import type { DocText, NameText, FunctionText, NameAndDoc } from './Locale';

export type BasisNameAndDoc = {
    /** Documentation to explain what the type is for and how it's used. */
    doc: DocText;
    /** The name to use to describe the type of value. */
    name: NameText;
};

type BasisTexts = {
    /** Any ⊤ or ⊥ value */
    Boolean: BasisNameAndDoc & {
        /** Functions in the type */
        function: {
            /** See `en-US.json` for documentation  */
            and: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            or: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            not: FunctionText<[]>;
            /** See `en-US.json` for documentation  */
            equals: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            notequal: FunctionText<[NameAndDoc]>;
        };
        /** Conversions in the type */
        conversion: {
            /** See `en-US.json` for documentation  */
            text: DocText;
        };
    };
    /** A none value, `ø` */
    None: BasisNameAndDoc & {
        /** Functions in the type */
        function: {
            /** See `en-US.json` for documentation  */
            equals: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            notequals: FunctionText<[NameAndDoc]>;
        };
        /** Conversions in the type */
        conversion: {
            /** None to Text */
            text: DocText;
        };
    };
    /** A text value, e.g., `'hello'` */
    Text: BasisNameAndDoc & {
        /** Functions in the type */
        function: {
            /** See `en-US.json` for documentation  */
            length: FunctionText<[]>;
            /** See `en-US.json` for documentation  */
            equals: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            notequals: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            has: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            starts: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            ends: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            repeat: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            segment: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            combine: FunctionText<[NameAndDoc]>;
        };
        /** Conversions in the type */
        conversion: {
            /** See `en-US.json` for documentation  */
            list: DocText;
            /** See `en-US.json` for documentation  */
            number: DocText;
        };
    };
    /** A number value, e.g., `5` or `-23.3` */
    Number: BasisNameAndDoc & {
        /** Functions in the type */
        function: {
            /** See `en-US.json` for documentation  */
            add: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            subtract: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            multiply: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            divide: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            remainder: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            positive: FunctionText<[]>;
            /** See `en-US.json` for documentation  */
            round: FunctionText<[]>;
            /** See `en-US.json` for documentation  */
            roundDown: FunctionText<[]>;
            /** See `en-US.json` for documentation  */
            roundUp: FunctionText<[]>;
            /** See `en-US.json` for documentation  */
            power: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            root: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            lessThan: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            greaterThan: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            lessOrEqual: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            greaterOrEqual: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            equal: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            notequal: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            cos: FunctionText<[]>;
            /** See `en-US.json` for documentation  */
            sin: FunctionText<[]>;
            /** See `en-US.json` for documentation  */
            min: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            max: FunctionText<[NameAndDoc]>;
        };
        /** Conversions in the type */
        conversion: {
            /** See `en-US.json` for documentation  */
            text: DocText;
            /** See `en-US.json` for documentation  */
            list: DocText;
            /** See `en-US.json` for documentation  */
            s2m: DocText;
            /** See `en-US.json` for documentation  */
            s2h: DocText;
            /** See `en-US.json` for documentation  */
            s2day: DocText;
            /** See `en-US.json` for documentation  */
            s2wk: DocText;
            /** See `en-US.json` for documentation  */
            s2year: DocText;
            /** See `en-US.json` for documentation  */
            s2ms: DocText;
            /** See `en-US.json` for documentation  */
            ms2s: DocText;
            /** See `en-US.json` for documentation  */
            min2s: DocText;
            /** See `en-US.json` for documentation  */
            h2s: DocText;
            /** See `en-US.json` for documentation  */
            day2s: DocText;
            /** See `en-US.json` for documentation  */
            wk2s: DocText;
            /** See `en-US.json` for documentation  */
            yr2s: DocText;
            /** See `en-US.json` for documentation  */
            m2pm: DocText;
            /** See `en-US.json` for documentation  */
            m2nm: DocText;
            /** See `en-US.json` for documentation  */
            m2micro: DocText;
            /** See `en-US.json` for documentation  */
            m2mm: DocText;
            /** See `en-US.json` for documentation  */
            m2cm: DocText;
            /** See `en-US.json` for documentation  */
            m2dm: DocText;
            /** See `en-US.json` for documentation  */
            m2km: DocText;
            /** See `en-US.json` for documentation  */
            m2Mm: DocText;
            /** See `en-US.json` for documentation  */
            m2Gm: DocText;
            /** See `en-US.json` for documentation  */
            m2Tm: DocText;
            /** See `en-US.json` for documentation  */
            pm2m: DocText;
            /** See `en-US.json` for documentation  */
            nm2m: DocText;
            /** See `en-US.json` for documentation  */
            micro2m: DocText;
            /** See `en-US.json` for documentation  */
            mm2m: DocText;
            /** See `en-US.json` for documentation  */
            cm2m: DocText;
            /** See `en-US.json` for documentation  */
            dm2m: DocText;
            /** See `en-US.json` for documentation  */
            km2m: DocText;
            /** See `en-US.json` for documentation  */
            Mm2m: DocText;
            /** See `en-US.json` for documentation  */
            Gm2m: DocText;
            /** See `en-US.json` for documentation  */
            Tm2m: DocText;
            /** See `en-US.json` for documentation  */
            km2mi: DocText;
            /** See `en-US.json` for documentation  */
            mi2km: DocText;
            /** See `en-US.json` for documentation  */
            cm2in: DocText;
            /** See `en-US.json` for documentation  */
            in2cm: DocText;
            /** See `en-US.json` for documentation  */
            m2ft: DocText;
            /** See `en-US.json` for documentation  */
            ft2m: DocText;
            /** See `en-US.json` for documentation  */
            g2mg: DocText;
            /** See `en-US.json` for documentation  */
            mg2g: DocText;
            /** See `en-US.json` for documentation  */
            g2kg: DocText;
            /** See `en-US.json` for documentation  */
            kg2g: DocText;
            /** See `en-US.json` for documentation  */
            g2oz: DocText;
            /** See `en-US.json` for documentation  */
            oz2g: DocText;
            /** See `en-US.json` for documentation  */
            oz2lb: DocText;
            /** See `en-US.json` for documentation  */
            lb2oz: DocText;
        };
    };
    /** A list value, e.g., `[1 2 3]` */
    List: BasisNameAndDoc & {
        /** The type variable name for the kind of values in the list */
        kind: NameText;
        /** The type variable name to use for functions that produce lists of different types */
        out: NameText;
        /** The name of the exception when an index is out of bounds of a list's values */
        outofbounds: NameText;
        /** Functions in the type */
        function: {
            /** See `en-US.json` for documentation  */
            add: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            append: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            replace: FunctionText<[NameAndDoc, NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            length: FunctionText<[]>;
            /** See `en-US.json` for documentation  */
            random: FunctionText<[]>;
            /** See `en-US.json` for documentation  */
            shuffled: FunctionText<[]>;
            /** See `en-US.json` for documentation  */
            first: FunctionText<[]>;
            /** See `en-US.json` for documentation  */
            last: FunctionText<[]>;
            /** See `en-US.json` for documentation  */
            has: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            join: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            subsequence: FunctionText<[NameAndDoc, NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            sansFirst: FunctionText<[]>;
            /** See `en-US.json` for documentation  */
            sansLast: FunctionText<[]>;
            /** See `en-US.json` for documentation  */
            sans: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            sansAll: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            reverse: FunctionText<[]>;
            /** See `en-US.json` for documentation  */
            equals: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            notequals: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            translate: FunctionText<[NameAndDoc]> & {
                translator: [NameAndDoc, NameAndDoc, NameAndDoc];
            };
            /** See `en-US.json` for documentation  */
            filter: FunctionText<[NameAndDoc]> & {
                checker: [NameAndDoc, NameAndDoc, NameAndDoc];
            };
            /** See `en-US.json` for documentation  */
            all: FunctionText<[NameAndDoc]> & {
                checker: [NameAndDoc, NameAndDoc, NameAndDoc];
            };
            /** See `en-US.json` for documentation  */
            until: FunctionText<[NameAndDoc]> & {
                checker: [NameAndDoc, NameAndDoc, NameAndDoc];
            };
            /** See `en-US.json` for documentation  */
            find: FunctionText<[NameAndDoc]> & {
                checker: [NameAndDoc, NameAndDoc, NameAndDoc];
            };
            /** See `en-US.json` for documentation  */
            combine: FunctionText<[NameAndDoc, NameAndDoc]> & {
                combiner: [NameAndDoc, NameAndDoc, NameAndDoc, NameAndDoc];
            };
            /** See `en-US.json` for documentation  */
            sorted: FunctionText<[NameAndDoc]> & {
                sequencer: [NameAndDoc];
            };
        };
        /** Conversions in the type */
        conversion: {
            text: DocText;
            set: DocText;
        };
    };
    /** A set value, `{1 2 3}` */
    Set: BasisNameAndDoc & {
        /** The type variable name for the kind of value in the set */
        kind: NameText;
        /** The type variable name for sets that produce sets of different value types */
        out: NameText;
        /** Functions in the type */
        function: {
            /** See `en-US.json` for documentation  */
            size: FunctionText<[]>;
            /** See `en-US.json` for documentation  */
            equals: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            notequals: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            add: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            remove: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            union: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            intersection: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            difference: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            filter: FunctionText<[NameAndDoc]> & {
                checker: [NameAndDoc, NameAndDoc];
            };
            /** See `en-US.json` for documentation  */
            translate: FunctionText<[NameAndDoc]> & {
                translator: [NameAndDoc, NameAndDoc];
            };
        };
        /** Conversions in the type */
        conversion: {
            /** See `en-US.json` for documentation  */
            text: DocText;
            /** See `en-US.json` for documentation  */
            list: DocText;
        };
    };
    Map: BasisNameAndDoc & {
        /** The type variable name for the map's type of keys */
        key: NameText;
        /** The type variable name for the map's type of values */
        value: NameText;
        /** The type variable name for higher order functions that produce maps of different types */
        result: NameText;
        /** Functions in the type */
        function: {
            /** See `en-US.json` for documentation  */
            size: FunctionText<[]>;
            /** See `en-US.json` for documentation  */
            equals: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            notequals: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            set: FunctionText<[NameAndDoc, NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            unset: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            remove: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            filter: FunctionText<[NameAndDoc]> & {
                checker: [NameAndDoc, NameAndDoc, NameAndDoc];
            };
            /** See `en-US.json` for documentation  */
            translate: FunctionText<[NameAndDoc]> & {
                translator: [NameAndDoc, NameAndDoc, NameAndDoc];
            };
        };
        /** Conversions in the type */
        conversion: {
            /** See `en-US.json` for documentation  */
            text: DocText;
            /** See `en-US.json` for documentation  */
            set: DocText;
            /** See `en-US.json` for documentation  */
            list: DocText;
        };
    };
    /** A table value type, e.g., `⎡a•# b•#⎦⎡1 2⎦` */
    Table: BasisNameAndDoc & {
        /** The type variable name for the type of row in a table */
        row: NameText;
        /** Functions in the type */
        function: {
            /** See `en-US.json` for documentation  */
            equals: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            notequal: FunctionText<[NameAndDoc]>;
        };
        /** Conversions in the type */
        conversion: {
            /** See `en-US.json` for documentation  */
            list: DocText;
            /** See `en-US.json` for documentation  */
            text: DocText;
        };
    };
    /** A custom type defined by the user, e.g., `•Kitty(name•'')` */
    Structure: BasisNameAndDoc & {
        /** Functions in the type */
        function: {
            /** See `en-US.json` for documentation  */
            equals: FunctionText<[NameAndDoc]>;
            /** See `en-US.json` for documentation  */
            notequal: FunctionText<[NameAndDoc]>;
        };
        /** Conversions in the type */
        conversion: {
            /** See `en-US.json` for documentation  */
            text: DocText;
        };
    };
};

export { type BasisTexts as default };
