/**
 * A corpus of named, realistic, reusable Wordplay patterns (LANGUAGE.md) — the
 * validation harness for the engine AND the seed of a future shipped standard
 * library of importable named patterns (à la Rosie). Each entry is authored as a
 * pattern literal source string with example inputs that should match (`≈`) or
 * not, and optional capture expectations for search (`⌕`).
 *
 * These patterns are intentionally generic, well-named, locale-aware, and
 * possessive-PEG-correct (greedy, no backtracking — order alternations
 * longest-first). They are kept simple enough to read; a few (email, phone,
 * IPv4) are deliberately permissive rather than fully validating, as real-world
 * pattern libraries are.
 */

export type LibraryEntry = {
    /** A stable, importable name (the future stdlib id). */
    name: string;
    /** One-line description. */
    description: string;
    /** The `⣿…⣿` pattern literal source. */
    pattern: string;
    /** Inputs the pattern matches as a whole (`text ≈ pattern` → ⊤). */
    matches: string[];
    /** Inputs the pattern rejects as a whole (`text ≈ pattern` → ⊥). */
    rejects: string[];
    /** Optional locales to load (for word/word-edge/case-fold patterns). */
    locales?: string[];
    /** Optional search-capture expectations: first match's named groups. */
    captures?: { input: string; groups: Record<string, string> };
};

export const PatternLibrary: LibraryEntry[] = [
    {
        name: 'hex-color',
        description: 'A CSS hex color, #rgb or #rrggbb.',
        pattern: '⣿"#" (6 {# "a"–"f" "A"–"F"} | 3 {# "a"–"f" "A"–"F"})⣿',
        matches: ['#fff', '#000000', '#FF00AA', '#abc'],
        rejects: ['fff', '#gg0', '#12', '#1234567'],
    },
    {
        name: 'ipv4',
        description:
            'A dotted-quad IPv4 address (permissive — not range-checked).',
        pattern: '⣿(1–3 #) "." (1–3 #) "." (1–3 #) "." (1–3 #)⣿',
        matches: ['192.168.0.1', '8.8.8.8', '255.255.255.0'],
        rejects: ['192.168.0', '1.2.3.4.5', 'abc.d.e.f'],
    },
    {
        name: 'iso-date',
        description: 'An ISO-8601 calendar date, YYYY-MM-DD.',
        pattern: '⣿y:(4 #) "-" m:(2 #) "-" d:(2 #)⣿',
        matches: ['2026-06-15', '0001-01-01'],
        rejects: ['2026-6-15', '26-06-15', '2026/06/15'],
        captures: {
            input: '2026-06-15',
            groups: { y: '2026', m: '06', d: '15' },
        },
    },
    {
        name: 'us-date',
        description: 'A US-style date, M/D/YY or M/D/YYYY.',
        pattern: '⣿(1–2 #) "/" (1–2 #) "/" (4 # | 2 #)⣿',
        matches: ['6/15/2026', '06/15/26', '12/1/99'],
        rejects: ['6-15-2026', '6/15', '6/15/1'],
    },
    {
        name: 'time-24',
        description: 'A 24-hour clock time, HH:MM with optional :SS.',
        pattern: '⣿(2 #) ":" (2 #) ≤1 (":" 2 #)⣿',
        matches: ['14:30', '00:00', '23:59:59'],
        rejects: ['14:3', '1430', '14:30:'],
    },
    {
        name: 'iso-datetime',
        description: 'An ISO-8601 date-time with optional trailing Z.',
        pattern:
            '⣿(4 #) "-" (2 #) "-" (2 #) "T" (2 #) ":" (2 #) ":" (2 #) ≤1 "Z"⣿',
        matches: ['2026-06-15T14:30:00', '2026-06-15T14:30:00Z'],
        rejects: ['2026-06-15 14:30:00', '2026-06-15T14:30'],
    },
    {
        name: 'semver',
        description: 'A semantic version, MAJOR.MINOR.PATCH.',
        pattern: '⣿major:(>0 #) "." minor:(>0 #) "." patch:(>0 #)⣿',
        matches: ['1.2.3', '0.0.0', '10.20.30'],
        rejects: ['1.2', '1.2.3.4', 'v1.2.3'],
        captures: {
            input: '1.2.3',
            groups: { major: '1', minor: '2', patch: '3' },
        },
    },
    {
        name: 'uuid',
        description: 'An RFC-4122 UUID (8-4-4-4-12 hex digits).',
        pattern: '⣿8 hex "-" 4 hex "-" 4 hex "-" 4 hex "-" 12 hex⣿',
        matches: [
            '550e8400-e29b-41d4-a716-446655440000',
            'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF',
        ],
        rejects: ['550e8400e29b41d4a716446655440000', '550e8400-e29b-41d4'],
    },
    {
        name: 'integer',
        description: 'A signed integer.',
        pattern: '⣿≤1 "-" >0 #⣿',
        matches: ['42', '-7', '0', '1000000'],
        rejects: ['', '4.2', '--7', 'abc'],
    },
    {
        name: 'decimal',
        description: 'A signed decimal number.',
        pattern: '⣿≤1 "-" >0 # ≤1 ("." >0 #)⣿',
        matches: ['3.14', '-7', '42', '-0.5'],
        rejects: ['3.', '.5', '3.1.4'],
    },
    {
        name: 'scientific',
        description: 'A number in scientific notation.',
        pattern: '⣿≤1 "-" >0 # ≤1 ("." >0 #) ≤1 ({"e" "E"} ≤1 {"+" "-"} >0 #)⣿',
        matches: ['6.022e23', '1E-9', '-2.5e+3', '42'],
        rejects: ['e9', '1e', '1.2e3.4'],
    },
    {
        name: 'percentage',
        description: 'A percentage, e.g. 50% or 99.9%.',
        pattern: '⣿>0 # ≤1 ("." >0 #) "%"⣿',
        matches: ['50%', '99.9%', '0%', '100%'],
        rejects: ['50', '%50', '50.%'],
    },
    {
        name: 'currency-usd',
        description: 'A US dollar amount, e.g. $5 or $19.99.',
        pattern: '⣿"$" >0 # ≤1 ("." 2 #)⣿',
        matches: ['$5', '$19.99', '$1000'],
        rejects: ['5', '$', '$5.9', '$5.999'],
    },
    {
        name: 'email',
        description: 'A simple email address (permissive).',
        pattern:
            '⣿user:(>0 {_ # "." "_" "-" "+"}) "@" host:(>0 {_ # "-"}) "." tld:(>0 {_ "."})⣿',
        matches: ['amy@example.com', 'a.b+c@mail.co.uk', 'x@y.z'],
        rejects: ['no-at-sign', '@b.com', 'a@b'],
        captures: {
            input: 'amy@example.com',
            groups: { user: 'amy', host: 'example', tld: 'com' },
        },
    },
    {
        name: 'mention',
        description: 'An @-mention.',
        pattern: '⣿"@" who:(>0 {_ # "_"})⣿',
        matches: ['@amy', '@user_1'],
        rejects: ['amy', '@'],
        captures: { input: '@amy', groups: { who: 'amy' } },
    },
    {
        name: 'slug',
        description: 'A URL slug — lowercase words joined by hyphens.',
        pattern: '⣿>0 {_/lowercase #} ≥0 ("-" >0 {_/lowercase #})⣿',
        matches: ['hello-world', 'a1-b2-c3', 'single'],
        rejects: ['Hello-World', 'has space', '-leading', 'trailing-'],
    },
    {
        name: 'credit-card',
        description:
            'A 16-digit card number in four groups (space/dash optional).',
        pattern: '⣿4 # ≤1 {"-" ␣} 4 # ≤1 {"-" ␣} 4 # ≤1 {"-" ␣} 4 #⣿',
        matches: [
            '4111111111111111',
            '4111-1111-1111-1111',
            '4111 1111 1111 1111',
        ],
        rejects: ['411111111111111', '4111-1111-1111'],
    },
    {
        name: 'iso-week',
        description: 'An ISO-8601 week date, YYYY-Www-D.',
        pattern: '⣿(4 #) "-W" (2 #) "-" #⣿',
        matches: ['2026-W24-1', '2026-W01-7'],
        rejects: ['2026-24-1', '2026-W24'],
    },
    {
        name: 'url',
        description: 'A URL split into scheme and remainder.',
        pattern: '⣿scheme:(>0 _) "://" rest:(>0 ◌)⣿',
        matches: ['https://example.com', 'ftp://host/path?q=1'],
        rejects: ['example.com', 'https:/example.com', 'notaurl'],
        captures: {
            input: 'https://example.com',
            groups: { scheme: 'https', rest: 'example.com' },
        },
    },
    {
        name: 'identifier',
        description:
            'A programming identifier (letters/digits/underscore, multilingual).',
        pattern: '⣿{_ "_"} ≥0 {_ # "_"}⣿',
        matches: ['foo', '_bar', 'x1', 'naïve', 'переменная', 'a_b_c'],
        rejects: ['1abc', 'a-b', 'has space'],
    },
    {
        name: 'hashtag',
        description: 'A social hashtag.',
        pattern: '⣿"#" tag:(>0 {_ # "_"})⣿',
        matches: ['#wordplay', '#a1', '#_test'],
        rejects: ['wordplay', '# space', '#'],
        captures: { input: '#wordplay', groups: { tag: 'wordplay' } },
    },
    {
        name: 'phone-us',
        description: 'A US phone number with - or space separators.',
        pattern: '⣿(3 #) {"-" ␣} (3 #) {"-" ␣} (4 #)⣿',
        matches: ['555-123-4567', '555 123 4567'],
        rejects: ['5551234567', '555-123', '55-123-4567'],
    },
    {
        name: 'repeated-word',
        description: 'A doubled word (backreference).',
        pattern: '⣿w:(>0 _) >0 ␣ w⣿',
        matches: ['hello hello', 'the the', 'no  no'],
        rejects: ['hello world', 'hello'],
    },
    {
        name: 'key-value',
        description: 'A "key: value" pair.',
        pattern: '⣿key:(>0 ~{":" ␣}) ":" ␣ value:(>0 ◌)⣿',
        matches: ['name: Amy', 'count: 42'],
        rejects: ['nocolon', 'key:novalue'],
        captures: { input: 'name: Amy', groups: { key: 'name', value: 'Amy' } },
    },
    {
        name: 'zip-us',
        description: 'A US ZIP code, 5 digits with optional +4.',
        pattern: '⣿5 # ≤1 ("-" 4 #)⣿',
        matches: ['98101', '98101-1234'],
        rejects: ['9810', '98101-12', 'ABCDE'],
    },
    {
        name: 'postal-ca',
        description: 'A Canadian postal code, A1A 1A1.',
        pattern: '⣿_ # _ ␣ # _ #⣿',
        matches: ['K1A 0B1', 'M5V 3L9'],
        rejects: ['K1A0B1', '123 456'],
    },
    {
        name: 'time-12',
        description: 'A 12-hour clock time with AM/PM.',
        pattern: '⣿(1–2 #) ":" (2 #) ␣ {"A" "P"} "M"⣿',
        matches: ['3:30 PM', '11:00 AM', '12:45 PM'],
        rejects: ['3:30PM', '330 PM', '3:30 XM'],
    },
    {
        name: 'cjk-word',
        description: 'A run of Han (CJK) characters.',
        pattern: '⣿>0 _/han⣿',
        matches: ['漢字', '中文', '日本語'],
        rejects: ['abc', '123', 'こんにちは'],
    },
    {
        name: 'boolean-word',
        description: 'A case-insensitive boolean keyword.',
        pattern: '⣿Aa("true") | Aa("false")⣿',
        matches: ['true', 'TRUE', 'False', 'fAlSe'],
        rejects: ['yes', 'truthy', '1'],
    },
    {
        name: 'word-en',
        description: 'A single English word (locale-segmented).',
        pattern: '⣿▭/en⣿',
        matches: ['cat', 'hello'],
        rejects: ['cat dog', '123 abc'],
        locales: ['en-US'],
    },
];
