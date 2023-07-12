import type { DocText, NameText, FunctionText, NameAndDoc } from './Locale';

type NativeTexts = {
    Boolean: {
        doc: DocText;
        name: NameText;
        function: {
            and: FunctionText<[NameAndDoc]>;
            or: FunctionText<[NameAndDoc]>;
            not: FunctionText<[]>;
            equals: FunctionText<[NameAndDoc]>;
            notequal: FunctionText<[NameAndDoc]>;
        };
        conversion: {
            text: DocText;
        };
    };
    None: {
        doc: DocText;
        name: NameText;
        function: {
            equals: FunctionText<[NameAndDoc]>;
            notequals: FunctionText<[NameAndDoc]>;
        };
        conversion: {
            text: DocText;
        };
    };
    Text: {
        doc: DocText;
        name: NameText;
        function: {
            length: FunctionText<[]>;
            equals: FunctionText<[NameAndDoc]>;
            notequals: FunctionText<[NameAndDoc]>;
            repeat: FunctionText<[NameAndDoc]>;
            segment: FunctionText<[NameAndDoc]>;
            combine: FunctionText<[NameAndDoc]>;
            has: FunctionText<[NameAndDoc]>;
        };
        conversion: {
            text: DocText;
            number: DocText;
        };
    };
    Number: {
        doc: DocText;
        name: NameText;
        function: {
            add: FunctionText<[NameAndDoc]>;
            subtract: FunctionText<[NameAndDoc]>;
            multiply: FunctionText<[NameAndDoc]>;
            divide: FunctionText<[NameAndDoc]>;
            remainder: FunctionText<[NameAndDoc]>;
            truncate: FunctionText<[NameAndDoc]>;
            absolute: FunctionText<[NameAndDoc]>;
            power: FunctionText<[NameAndDoc]>;
            root: FunctionText<[NameAndDoc]>;
            lessThan: FunctionText<[NameAndDoc]>;
            greaterThan: FunctionText<[NameAndDoc]>;
            lessOrEqual: FunctionText<[NameAndDoc]>;
            greaterOrEqual: FunctionText<[NameAndDoc]>;
            equal: FunctionText<[NameAndDoc]>;
            notequal: FunctionText<[NameAndDoc]>;
            cos: FunctionText<[]>;
            sin: FunctionText<[]>;
        };
        conversion: {
            text: DocText;
            list: DocText;
            s2m: DocText;
            s2h: DocText;
            s2day: DocText;
            s2wk: DocText;
            s2year: DocText;
            s2ms: DocText;
            ms2s: DocText;
            min2s: DocText;
            h2s: DocText;
            day2s: DocText;
            wk2s: DocText;
            yr2s: DocText;
            m2pm: DocText;
            m2nm: DocText;
            m2micro: DocText;
            m2mm: DocText;
            m2cm: DocText;
            m2dm: DocText;
            m2km: DocText;
            m2Mm: DocText;
            m2Gm: DocText;
            m2Tm: DocText;
            pm2m: DocText;
            nm2m: DocText;
            micro2m: DocText;
            mm2m: DocText;
            cm2m: DocText;
            dm2m: DocText;
            km2m: DocText;
            Mm2m: DocText;
            Gm2m: DocText;
            Tm2m: DocText;
            km2mi: DocText;
            mi2km: DocText;
            cm2in: DocText;
            in2cm: DocText;
            m2ft: DocText;
            ft2m: DocText;
            g2mg: DocText;
            mg2g: DocText;
            g2kg: DocText;
            kg2g: DocText;
            g2oz: DocText;
            oz2g: DocText;
            oz2lb: DocText;
            lb2oz: DocText;
        };
    };
    List: {
        doc: DocText;
        name: NameText;
        kind: NameText;
        out: NameText;
        outofbounds: NameText;
        function: {
            add: FunctionText<[NameAndDoc]>;
            append: FunctionText<[NameAndDoc]>;
            replace: FunctionText<[NameAndDoc, NameAndDoc]>;
            length: FunctionText<[]>;
            random: FunctionText<[]>;
            first: FunctionText<[]>;
            last: FunctionText<[]>;
            has: FunctionText<[NameAndDoc]>;
            join: FunctionText<[NameAndDoc]>;
            sansFirst: FunctionText<[]>;
            sansLast: FunctionText<[]>;
            sans: FunctionText<[NameAndDoc]>;
            sansAll: FunctionText<[NameAndDoc]>;
            reverse: FunctionText<[]>;
            equals: FunctionText<[NameAndDoc]>;
            notequals: FunctionText<[NameAndDoc]>;
            translate: FunctionText<[NameAndDoc]> & {
                value: NameAndDoc;
                index: NameAndDoc;
            };
            filter: FunctionText<[NameAndDoc]> & {
                value: NameAndDoc;
            };
            all: FunctionText<[NameAndDoc]> & {
                value: NameAndDoc;
            };
            until: FunctionText<[NameAndDoc]> & {
                value: NameAndDoc;
            };
            find: FunctionText<[NameAndDoc]> & {
                value: NameAndDoc;
            };
            combine: FunctionText<[NameAndDoc, NameAndDoc]> & {
                combination: NameAndDoc;
                next: NameAndDoc;
                index: NameAndDoc;
            };
        };
        conversion: {
            text: DocText;
            set: DocText;
        };
    };
    Set: {
        doc: DocText;
        name: NameText;
        kind: NameText;
        function: {
            equals: FunctionText<[NameAndDoc]>;
            notequals: FunctionText<[NameAndDoc]>;
            add: FunctionText<[NameAndDoc]>;
            remove: FunctionText<[NameAndDoc]>;
            union: FunctionText<[NameAndDoc]>;
            intersection: FunctionText<[NameAndDoc]>;
            difference: FunctionText<[NameAndDoc]>;
            filter: FunctionText<[NameAndDoc]> & {
                value: NameAndDoc;
            };
            translate: FunctionText<[NameAndDoc]> & {
                value: NameAndDoc;
            };
        };
        conversion: {
            text: DocText;
            list: DocText;
        };
    };
    Map: {
        doc: DocText;
        name: NameText;
        key: NameText;
        value: NameText;
        result: NameText;
        function: {
            equals: FunctionText<[NameAndDoc]>;
            notequals: FunctionText<[NameAndDoc]>;
            set: FunctionText<[NameAndDoc, NameAndDoc]>;
            unset: FunctionText<[NameAndDoc]>;
            remove: FunctionText<[NameAndDoc]>;
            filter: FunctionText<[NameAndDoc]> & {
                key: NameAndDoc;
                value: NameAndDoc;
            };
            translate: FunctionText<[NameAndDoc]> & {
                key: NameAndDoc;
                value: NameAndDoc;
            };
        };
        conversion: {
            text: DocText;
            set: DocText;
            list: DocText;
        };
    };
};

export default NativeTexts;
