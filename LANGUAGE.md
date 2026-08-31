# Wordplay

_Amy J. Ko_

Hello! You must be here looking for the Wordplay programming language's specification. That means you're probably a programmer or computer scientist, or you prefer to read a more formal explanation of the programming language instead of going through the tutorial to learn. Welcome! We'll try to make this somewhat painless.

This guide will be a complete overview of Wordplay's syntax and semantics. We'll eschew formal semantics for now, unless someone wants to contribute them. That does mean that we've yet to prove the program's semantics sound. (Perhaps that's a contribution you'd like to make to?). And in general, consider this a work in progress, so if you find sections missing, just report an issue, and we'll work on it.

## History

Wordplay started as Amy Ko's sabbatical project in 2022. Her primary goals were to spend the year away from teaching and service creating art, and she wanted that art to be a programmable medium interactive typography, but also a context for adolescents to learn about computing, particularly those who are not fluent in English and/or are disabled. This led to a language design that is free of English keywords, a functional design that simplifies debugging and comprehension, several other language features that integrate localiziation and rich description. You might be interested in reading the [design specification](https://docs.google.com/document/d/1pTAuU0qyfp09SifNUaZ_tbQXbSgunSLfZLBRkeWf_Fo) she wrote for herself prior to the 16 months she spent building it; the design roughly follows the ideas and vision laid out in that document.

## Formatting

Throughout this guide, we'll use a few formatting conventions:

- Content in quote blocks are language grammar specifications, and will be formatted with an upper-case non-terminal name, followed by a `→`, and then an expression composed of:
    - Non-terminal names,
    - `｜` (full-width pipe) for options,
    - `（）` (full-width parens) for groups,
    - `？` (full-width question mark) for optional,
    - `＊` (full-width asterisk) for zero or more repetitions,
    - `＋` (full-width plus) for one or more repetitions,
    - `//` for POSIX regular expresssions, formatted as code
    - Any text in code format is a literal token character (e.g., `` `ƒ` ``, `` `→` ``)
    - Any text in italics is a comment
- We'll use the same syntax for the lexical grammar. All lexical non-terminals are in lower case. Within the lexical grammar, ASCII `|` is used for alternation between literal token characters; full-width metasymbols are reserved for the higher-level syntactic grammar.
- Code examples are presented in code blocks. All examples are syntactically valid programs, but may not all be conflict free.

## Overview

Wordplay's design is inspired by aspects of Smalltalk, Lisp, APL, TypeScript, and Elm. Here are a few key concepts about Wordplay's language design:

- It's **purely functional**, which means there are no side effects and no mutable values. All expressions and all functions evaluate to values that are purely computation on inputs.
- It's **reactive** in that some values are _streams_ of values that change to external events, which cause data dependent expressions to reevaluate with the stream's new values. This is what allows for interactivity.
- It's **strongly typed** with optional static typing and type inference, but it's type system is relatively basic, with support for unions and some constant type assertions, but not much more.
- It's **single-threaded**, in that a program starts and finishes evaluating, and all changes to stream values cause serial reevaluation, though stream value changes can pool causing a single reevaluation.
- It's **lexically scoped**, of course. I'm not an anarchist.
- It's **object oriented** in that all values are like objects that contain functions and conversions, and when creator-defined, can also contain named values.
- It's **localized**. This means that bindings and text values can have an arbitrary number of language-tagged aliases. Text values are selected based on selected locales in the environment.

## Terminology

There are a few key terms in this guide:

- _Value_ an immutable in memory representation of some data
- _Expression_ some syntactically valid bit of code that evaluates to a value
- _Evaluation_ following the rules of each expression to compute a value
- _Conflict_ a discrepancy between two or more parts of an expression detected statically that prevents evaluation
- _Exception_ a discrepany detected during evaluation that requires halting; most correspond to a conflict.
- _Evaluator_ the comopnent that manages evaluation of programs

## Lexical design

Wordplay's _canonical_ lexical grammar contains no keywords, in order to avoid privileging any particular natural language. Instead, it uses a set of single character Unicode symbols, each associated with a particular kind of value or expression (and sometimes two, since we support a markup notation within comments and markup values).

Layered on top of this is an optional **localized-keyword** facility (see [Localized keywords](#localized-keywords) below): the built-in constructs and the three logical connectives may also be written and read as single-token words in any of a program's declared locales, interchangeably with their symbols. The symbol remains the canonical form; words are an alias and a render skin, so no language is privileged and symbol-only programs are unaffected.

### Localized keywords

Each built-in construct (`ƒ`, `•`, `#`, `ø`, `⊤`/`⊥`, `↓`, `↑`, `→`, `↦`, `?`, `??`, `???`, `…`, `∆`, `◆`, `←`, `⬚`) and the logical connectives (`&`, `|`, `~`) has a localized **keyword** word per locale (stored in each locale's `keyword` block; see `Keywords.ts`). Each keyword must be a **single token** — no spaces or hyphens — since the tokenizer matches it as one whole name-run. Punctuation and delimiters (`( ) [ ] { } , : . / _` quotes, etc.) are never localized, because they have no spaces and would be indistinguishable from names.

- **Reading.** A per-user setting toggles display between symbols (default) and words; in words mode each construct renders as its locale word, and conversely a word-typed construct renders as its symbol in symbols mode. This is render-only — the stored source is unchanged.
- **Which words are recognized.** Only those of the languages the project **declares** it is written in — the list a creator edits in the languages dialog, which is also what decides which localized names bind. A keyword word is therefore a _parse_ dependency, not just a name lookup: removing a language degrades its words to plain names. Declaring or removing a language re-tokenizes the project's sources immediately, and a fresh project recognizes its declared languages' words from the first keystroke. The tooling accounts for that (`Project.getKeywordLocalesUsed` treats a language whose keyword words the code uses as used, so nothing suggests removing it), but it is the reason a project's declared languages are its own data and never follow the reader's.
- **Writing.** When a program declares locales, typing a keyword word lexes it as a **dual-type** token carrying both `Name` and the construct's canonical `Sym`. The parser picks by position: the construct where the grammar expects one (e.g. `función(x) x` is a function definition), a plain name elsewhere. So a binding named like a keyword (e.g. `número`) still works — it _shadows_ the keyword rather than being reserved. A name that shadows a keyword whose construct wins at expression start raises a low-severity advisory.
- **Meaning.** A keyword token also carries its construct's **canonical symbol**, and anything that needs the token's _meaning_ reads that rather than its text — one `Sym` can have two words of opposite meaning (`⊤`/`⊥` are both `Boolean`), so a typed `true` is true because its canonical symbol is `⊤`, and a word-form connective short-circuits and narrows exactly like its symbol. Operator words also resolve by their canonical symbol when the typed word isn't a name of the function, so a locale whose keyword differs from its function name still works.
- **Prefix negation.** The word for `~` starts a unary negation when an operand follows **on the same line** (`not ⊤`). The symbol form instead requires **no space** before its operand (`~⊤`, to disambiguate `-`); a word needs the space, so its rule is line-based. A word for `~` at the end of a line stays a plain name, so a binding that shadows it is still usable.
- **Copy/paste.** Copying rewrites keyword constructs to their canonical symbols, so copied code is locale-neutral and pastes into any project (and renders in the reader's words).

Three design decisions shape which symbols are localized and how:

- **Which symbols.** Every built-in construct is localizable. Among operators, only the three logical connectives (`&` and, `|` or, `~` not) are — the arithmetic and relational operators stay purely symbolic, because an operator's word implies an argument order and reading direction that no single language shares, which is the readability problem symbols were chosen to avoid in the first place.
- **The `?` glyph carries two keywords.** `?` lexes to two distinct constructs — the Boolean type (`x•?`, keyword `truth`) and the conditional (`cond ? yes no`, keyword `then`) — because no single word reads well in both roles. Typing either word is unambiguous (each maps to a distinct `Sym`); rendering the shared `?` glyph as a word picks by the token's parent role (a Boolean type → `truth`, a conditional → `then`), the same parent/usage check used to word the operators `&`/`|`/`~`.
- **Pattern keywords.** The pattern sublanguage's atoms (`◌` any, `_` letter, `#` digit, `⊢`/`⊣` anchors, …) are localized too, in a separate tokenizer context so a pattern word never collides with a same-spelled code word. The one exception is case-fold `Aa`: it is a fixed, **unlocalized** token in every language, since letter case exists only in bicameral scripts (Latin, Greek, Cyrillic) and a per-language word would be meaningless for most of the world — so `Aa` (the editor's case-toggle convention) is used universally.

Some tokens are associated with basic values:

> none → `ø`  
> true → `⊤`  
> false → `⊥`

Numbers can be:

> arabic → `/-?[0-9]+([.,][0-9]+)?%?/`  
> arabicbase → `/-?([2-9]|1[0-6]);[0-9A-F]+([.,][0-9A-F]+)?%?/`  
> roman → `/(Ⅰ|Ⅱ|Ⅲ|Ⅳ|Ⅴ|Ⅵ|Ⅶ|Ⅷ|Ⅸ|Ⅹ|Ⅺ|Ⅻ|Ⅼ|Ⅽ|Ⅾ|Ⅿ)+/`  
> han → `/-?[0-9]*[一二三四五六七八九十百千万億兆]+(・[一二三四五六七八九分厘毛糸忽]+)?/`  
> thai → `/-?[๐๑๒๓๔๕๖๗๘๙]+([.,][๐๑๒๓๔๕๖๗๘๙]+)?%?/`  
> bengali → `/-?[০১২৩৪৫৬৭৮৯]+([.,][০১২৩৪৫৬৭৮৯]+)?%?/`  
> devanagari → `/-?[०१२३४५६७८९]+([.,][०१२३४५६७८९]+)?%?/`  
> gujarati → `/-?[૦૧૨૩૪૫૬૭૮૯]+([.,][૦૧૨૩૪૫૬૭૮૯]+)?%?/`  
> gurmukhi → `/-?[੦੧੨੩੪੫੬੭੮੯]+([.,][੦੧੨੩੪੫੬੭੮੯]+)?%?/`  
> kannada → `/-?[೦೧೨೩೪೫೬೭೮೯]+([.,][೦೧೨೩೪೫೬೭೮೯]+)?%?/`  
> tamil → `/-?[௦௧௨௩௪௫௬௭௮௯]+([.,][௦௧௨௩௪௫௬௭௮௯]+)?%?/`  
> telugu → `/-?[౦౧౨౩౪౫౬౭౮౯]+([.,][౦౧౨౩౪౫౬౭౮౯]+)?%?/`  
> pi → `π`  
> infinity → `∞`  
> numeral → arabic | arabicbase | roman | han | thai | bengali | devanagari | gujarati | gurmukhi | kannada | tamil | telugu | pi | infinity

The `han` production covers the shared Han-character numeral system used across Chinese, Japanese, and Korean (一二三…十百千万億兆). It uses nested myriad grouping: small orders (十百千) accumulate into a group that is multiplied by the next big unit (万/億/兆), so 三億五千万 is 3·10⁸ + 5000·10⁴ = 350,000,000.

Unlike the other numeral productions, `han` does not match when the numeral is immediately followed by another Han character, because 一/四/十 and their siblings very commonly begin ordinary CJK words: 四角形 (rectangle), 四捨五入 (rounding), 一致する (to match). Those read as `name`, not as a number followed by a unit. The restriction is limited to Han, so crossing into another script still reads as a measurement — 四m is 4 meters, and 五つ is 5 in units of つ.

The `thai` production accepts the Thai digit characters ๐–๙, which are positional like Arabic decimals, so ๑๒๓ is 123 and ๑๒๓.๔๕ is 123.45. The seven Indic productions (`bengali`, `devanagari`, `gujarati`, `gurmukhi`, `kannada`, `tamil`, `telugu`) work the same way against their own digit sets; Bengali script is shared by Bengali and Assamese, Devanagari by Hindi and Marathi, and Gurmukhi by Punjabi.

We hope to add other numerals as we localize other languages.

Numbers are also localized on **output**. When a number becomes text — through the `→ ''` conversion or by being interpolated into a text template — it is rendered in the numeral system and grouping/decimal conventions of an output locale: native digits for the positional scripts above (Devanagari, Bengali, Gurmukhi, Gujarati, Kannada, Tamil, Telugu, Thai), locale grouping (including South-Asian 3-then-2 grouping, e.g. `10,00,000`), and the locale's decimal separator. Scripts without a positional digit set (Arabic, and the additive Han system) fall back to Western digits with the locale's grouping. By default the active project locale is used. To render in a specific locale regardless of the reader, tag the target text type with a language/region: the conversion `1234 → ''/hi-IN` and interpolation into a tagged literal `'\n\'/hi-IN` both produce Hindi digits. (A language tag on a `→ ''` target is treated as a rendering request — the generic number→text conversion satisfies it — and the resulting text is tagged with that locale.) This rendering is deterministic across platforms — it does not use `Intl.NumberFormat` — and always preserves full precision. Source code and round-trippable value text stay Arabic-Western regardless of locale.

Dates and times are localized on output the same way. A `Moment` structure (see the Streams section for its relationship to the `Now` stream) converts to text with `→ ''`, rendering per the output locale's conventions — field order, month and era names, 12/24-hour clock, day periods, and native digits — in the Moment's own calendar and time zone. Like number output, this is deterministic across platforms: it does not call `Intl.DateTimeFormat` at runtime, but instead uses per-locale formatting data extracted from a pinned Unicode CLDR JSON release at development time and committed to the repository (`static/locales/<locale>/<locale>-datetimes.json`, generated by `npm run datetimes`; the locale verifier checks presence, shape, CLDR-version provenance, and core consistency). A language tag on the target text type (`→ ''/hi`) renders for that locale instead of the reader's; a small "core" of every supported locale's data (its patterns and default calendar) ships in the app bundle so such targets work even for locales the reader hasn't selected, with each locale's full multi-calendar data loading alongside the locale itself. Chinese and Dangi calendar months render numerically (their month names are year-dependent), and only modern Japanese era names are included.

Text literals can be opened and closed with numerous delimiters:

> textopen → `"` | `“` | `„` | `'` | `‘` | `‹` | `«` | `「` | `『`  
> textclose → `"` | `„` | `”` | `'` | `’` | `›` | `»` | `」` | `』`  
> markup → `` ` ``  
> doc → `¶`  
> text → _any sequence of characters between open/close and markup delimiters_

Wordplay has a secondary notation for markup, delimited by backticks, as in ¶ `` `I am *bold*` `` ¶. Between backticks, these tokens are valid:

> linkopen → `<`  
> linkclose → `>`  
> italics → `/`  
> code → `\`  
> light → `~`  
> underscore → `_`  
> bold → `*`  
> extrabold → `^`  
> link → `@`  
> mention → `$(?:[?!]|#?[a-zA-Z0-9]+)`  
> concept → `@(?!(https?)?://|mailto:)NAME([.]NAME|/NAME)?` where NAME does not mix Latin and non-Latin script
> email → `LOCAL@DOMAIN`, an ordinary email address  
> externalexample → `\[a-z]+\|[^\\]*(\\[a-z]+\|[^\\]*)*\\`

An external example embeds code from another programming language for documentation that contrasts Wordplay with other languages. It is delimited like `code` (with `\`) but is tag-first: each variant is a short lowercase language tag, a `|`, then the verbatim code, with variants separated by a single `\` and the whole terminated by a `\` — e.g. `\py| a = 5\js| let a = 5;\`. The leading `<tag>|` distinguishes it from a Wordplay `code` example (`\1 + 1\`); the body is captured verbatim and never tokenized, type-checked, or evaluated (so it cannot itself contain a `\`). Renderers highlight the variant matching the reader's chosen contrast language. Any lowercase tag is accepted; known tags map to a syntax-highlighting grammar, and unknown tags render plain.

A Wordplay `code` example (`\1 + 1\`) may be followed immediately by suffix annotations: `⭐` (or the word `highlight`) marks it for visual highlighting in tutorials, and `🪲` marks it as expected to contain conflicts so documentation tooling permits them (the markup analogue of a tutorial's `conflicts: true` — used for examples that intentionally illustrate errors or bare symbols). Both are optional and may appear in either order, e.g. `\1cat + 1dog\🪲`.

A concept link references a documented concept (e.g. `@Phrase`). A concept and one of its members (a property, function, or other subconcept) are separated by `.`, mirroring property access (e.g. `@Color.random`, `@Phrase.size`). A `/` separator instead references something that is not a concept: a UI element (`@UI/toolbar`), an interface tour (`@Tour/source`, which renders as the control that starts it), a how-to (`@How/...`), a Unicode codepoint in the reserved `U` namespace (`@U/1F600`, which renders as its character, 😀), or a creator-defined character (`@username/charactername`). The reserved namespaces (`UI`, `Tour`, `How`, `U`) can never collide with usernames, which require at least five characters. Unlike a custom character, whose existence isn't known when a document is checked, every tour is, so `@Tour/` naming one that doesn't exist is a conflict rather than an unresolved link. The separator must be followed by a name, so a sentence-ending period after a link (e.g. `see @Color.`) is left as punctuation.

A reference's name **ends where the script changes**: a name is either all Latin or all non-Latin, so text in another script attached directly to a reference is not part of it (`@Doc의` is a link to `Doc` followed by the Korean particle, `@language।` is a link followed by the danda). Without this, the name would swallow that text and resolve to nothing, which is how translated documentation acquires broken references. A Latin name keeps its own diacritics and neutral combining marks (`@parámetros` is one name), and a name written entirely in another script is one name too (`@프로그램`), so a locale's own glossary forms work; another script's combining marks and invisible format characters (a zero-width non-joiner) end a Latin name, since they belong to the word being written. An all-Latin typo (`@Phrasee`) stays one name, so it is visibly broken rather than silently resolving to a prefix.

A bare lowercase `@term` (no separator) references a **glossary term** rather than a documented concept (e.g. `@value`, `@expression`). Resolution tries, in order: a concept id, then the glossary term with that id, then one of the term's other written forms — the plurals, conjugations, and synonyms each locale lists for its words (e.g. `@parameters` for the `parameter` term). Concepts (capitalized ids like `@Phrase`) therefore win over glossary terms (lowercase ids), and both win over a form. Form matching ignores case, so a sentence-initial `@Parameters` resolves too, and the reference renders **as written**, so an inflected word stays one whole link instead of a link followed by a stray letter. A form is matched against the locale the text is written in, falling back to en-US's forms, in which case the locale's own canonical word is displayed. A form containing a space or hyphen can't be referenced, since the reference's name ends there.

A `$` mention substitutes a named template input (e.g. `$expected`), with `$?`/`$!` as special placeholders. A mention name is ASCII alphanumeric — kept ASCII so an input reference immediately followed by attached native-script text (e.g. Korean `$borrow는`) ends at the ASCII boundary. A mention may be immediately followed (no space) by a **branch** `[…|…]` that selects one of its arms; branches may nest.

A plain mention's branch selects on **presence**: two arms, the first when the input is set (and not `false`), the second when it isn't (e.g. `$count[$count things|nothing]`).

A mention marked with `#` (e.g. `$#count`) is a **count**, and its branch selects a **plural form**: one arm per form the reading locale distinguishes, in the CLDR canonical order `zero, one, two, few, many, other` filtered to that locale's forms. English has two (`$#count[$count value|$count values]`), Japanese one, Polish four, Arabic six. The marker is not part of the input's name — `$#count` and `$count` refer to the same input, and only the marked mention's branch pluralizes, so a presence branch on a numeric input keeps testing presence. If a branch has fewer arms than the locale's forms, the last arm is used, so a partly translated string still renders.

A `$` mention whose name is a key in the locale's **word list** (`terms`) is a **terminology reference**: it is expanded to that key's per-locale phrase _at the string level, before tokenization_, so a locale can keep the same word consistent everywhere and change it in one place (e.g. a `$program` term expanding to `project`). Because this expansion happens before the tokenizer runs, term **keys** may use Unicode letters and numbers (starting with a letter) — a locale can name terms in its own script — even though the tokenizer's mention rule for input references stays ASCII. Substitution is a single, non-recursive pass, so a term's phrase never itself contains another `$term`. Term keys are verified disjoint from every template input name, so a `$name` is never ambiguous. This is plain-text substitution, distinct from a glossary `@term`, which is a documented term rendered as an interactive link. Everything documented — concepts and glossary terms alike — is referenced with `@` (above); `$` is only for input substitution and word-list terms.

> words → _any sequence of characters between `markup` that aren't markup delimeters above_

Markup delimiters only tokenize as delimiters where they have syntactic meaning; everywhere else they are ordinary `words` characters, so a stray symbol never breaks markup parsing. Specifically: `[` opens a branch only immediately after a mention; `|` and `]` are branch delimiters only inside an open branch; `<` opens a link only when the whole `<…@…>` tag follows on the line; `@` (the link separator) and `>` are tag delimiters only inside an open link tag; and any character that matches no markup token at all is a word, never an unknown token. A bare URL (`https://…`) is its own token so that its `//` isn't folded by the escape rule below, and it reads as word-like content; a bare email address is a token for the same reason, so that its `@` isn't read as the start of a concept link. Doubling a markup symbol (e.g. `**`, `[[`, `@@`) always escapes it as a literal character.

Compound data structures have several delimiters:

> listopen → `[`  
> listclose → `]`  
> setopen → `{`  
> setclose → `}`  
> tableopen → `⎡`  
> tableclose → `⎦`  
> select → `⎡?`  
> insert → `⎡+`  
> delete → `⎡-`  
> update → `⎡:`

Some are associated with reactive values:

> reaction → `…` | `...`  
> initial → `◆`  
> change → `∆` | `∂`  
> previous → `←`

The language uses a placeholder token extensively to allow for unifinished syntactially valid code.

> placeholder → `_`

Some tokens are associated with names:

> alias → `,`  
> bind → `:`

Some are associated with localization:

> language-italic → `/`  
> region → `-`  
> locale → `🌎` | `🌍` | `🌏`

Some are associated with declarations:

> function → `ƒ`  
> type → `•`

Some are associated with particular types of expressions:

> evalopen → `(`  
> evalclose → `)`  
> question → `?` | `¿`  
> otherwise → `??`  
> match → `???`
> conversion → `→` | `->` | `=>`  
> translate → `↦` | `↤`  
> access → `.`  
> this → `⬚`

Some are operators, including arithetmic, inequalities, logical, and unicode math, supplemental, and arrows:

> operator → `+` | `-` | `×` | `·` | `÷` | `%` | `^` | `<` | `≤` | `=` | `≠` | `≥` | `>` | `~` | `&` | `|` | `/[\u2200-\u22FF\u2A00-\u2AFF\u2190-\u21FF\u27F0-\u27FF\u2900-\\u297F]/`

Four of these operators are **dual-type** tokens: in addition to `operator`, `|` is also `or`, `·` is also `product`, `^` is also `exponent`, and `%` is also `percent`. Each is lexed carrying both candidate types, and the parser picks by position — the second type only where the grammar expects it (`|` in a union type; `·`/`^` in a unit; `%` as a unitless ratio number type), and a plain `operator` everywhere else (e.g. arithmetic, where `%` is the remainder operator).

Some are associated with type declarations:

> numbertype → `#`  
> or → `|`  
> percent → `%`  
> markuptype → `\…\`, `\...\`  
> literaltype → `!`  
> typevariableopen → `⸨`  
> typevariableclose → `⸩`

Some delimit a pattern, and the operations on text that use one (see the **Pattern** section below). The matcher's atom and quantifier glyphs (`◌ _ # ␣ … ⊢ ⊣ ▸ ◂ Aa ▭ ┊` and the inequalities) are only lexed specially _inside_ `⣿ ⣿`; outside, those glyphs — and `_` — keep their ordinary meaning:

> patternopen → `⣿`  
> patternclose → `⣿`  
> match → `≈`  
> search → `⌕`

Some are associated with importing and exporting values from source:

> borrow → `↓`  
> share → `↑`

Every other possible sequence of Unicode characters is interpreted as a `name`, separated by space or one of the tokens above.

Emoji presentation selectors are treated asymmetrically during tokenization. The **color** selector U+FE0F is removed from the whole source before lexing: a bare emoji-default codepoint already renders in color, so the selector distinguishes nothing, and dropping it means `👍️` and `👍` are the same text and `🌬️` and `🌬` are the same name. The **monochrome** selector U+FE0E is preserved, because it is the only way to ask for text presentation, and so is meaning-bearing: `'👍︎'` and `'👍'` are different text values, and the first renders monochrome wherever it is shown. Names are the exception — a name strips both selectors, so a name can never depend on presentation.

Three kinds of space are meaningful during tokenization: space ` ` (U+0020), `\t` (U+0009), and the line feed character `\n` (U+000A). Spaces segment names, and are preserved and associated as preceding space for each tokens. This preceding space is used during parsing in limited ways to distinguish the role of names. All other forms of Unicode spaces (e.g., zero width spaces, non-breaking spaces, etc.) are interpreted as part of names. (Probably a questionable design choice, and maybe one we'll return to.).

## Basic Values

Okay! Now that we've got tokens out of the way, let's talk about values. Conceptually, all values are immutable, and each contain some number of built in functions from which to derive other values. All values contain some number of built in conversion functions as well, accessed with `→`.

### None

> NONE → `ø`

None is declared with `ø`. It's only equal to itself. That's it! Here it is in a program, all by itself:

```
ø
```

Guess what that program evaluates to? Yep, `ø`!

But this program?

```
ø→''
```

You guessed it, `'ø'`.

#### _evaluation_

None immediately evaluates to a none value, with no intermediate steps.

#### _equality_

None is only equal to itself.

### Booleans

> BOOLEAN_LITERAL → `⊤` ｜ `⊥`

There are only two Boolean values:

```
⊤
⊥
```

We chose these symbols from logic in order avoid giving primary to any particular natural language, but also because to learners they're likely to have no inherent meaning. This allows Wordplay to shape that meaning on a blank canvas, rather than competing with existing connotations and conceptions of other words or symbols.

The usual Boolean logic applies with operators such as `~` not, `&` and, and `|`. For example:

```
(⊤ & ⊥) | ~⊥
```

This evaluates to `⊤`.

As mentioned above, all values are objects with functions inside, and so these logical operations are equivalent to these expressions:

```
⊤.&(⊥).|(⊥.~())
⊤.and(⊥).or(⊥.not())
```

We'll discuss more on the differences between those to function evaluations later; for now just know that they're equivalent.

#### _evaluation_

Boolean literals evaluate to to boolean values without any intermediate steps.

#### _equality_

`⊤` is only equal to itself; `⊥` is only equal to itself.

### Numbers

> NUMBER → numeral UNIT？  
> UNIT → DIMENSION （`·` DIMENSION）＊ （`/` DIMENSION （`·` DIMENSION）＊）？  
> DIMENSION → name （`^` arabic）？

Numbers are arbitrary precision decimals with optional units, where units are just products and quotients of names:

```
1
1m
1m/s
1m/s^2
17000kitties
百一neko
```

Unit names have no inherent semantics, other than those specified by basic arithmetic, and the conversions built in. For example, this evaluates to `4m`, because the `s^2` cancel each other out:

```
2m/s^2 · 2s^2
```

But this is a type error, because the units aren't compatible:

```
2kitties + 12kitties/mi
```

The unit type system is not arbitrarily sophisticated: when mathematical operators go beyond the semantics of products, sums, and powers, units are dropped.

#### _built-in units_

Every unit below can be converted to and from every other unit in its row, with `→`. Conversions are defined between each unit and the **bold** hub of its row; [Convert](#convert) searches the conversion graph for a path, so `1km → #mi` works even though no conversion between those two is declared. A unit not listed here is still a perfectly good unit — it just has no built-in conversions, and a [conversion definition](#convert) can give it some.

| Measure     | Units                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| Time        | `ns` `µs` `ms` **`s`** `min` `h` `day` `wk` `yr`                                                                          |
| Length      | `pm` `nm` `µm` `mm` `cm` `dm` **`m`** `hm` `km` `Mm` `Gm` `Tm` `in` `ft` `yd` `mi` `nmi` `au` `ly`                        |
| Mass        | `µg` `mg` **`g`** `kg` `t` `oz` `lb` `st` `uston` `ukton`                                                                 |
| Temperature | **`°C`** `°F` `K`                                                                                                         |
| Angle       | **`°`** `rad`                                                                                                             |
| Area        | `mm^2` `cm^2` **`m^2`** `km^2` `in^2` `ft^2` `yd^2` `mi^2` `ha` `acre`                                                    |
| Volume      | `mL` `cL` `dL` **`L`** `kL` `cm^3` `m^3` `tsp` `tbsp` `cup` `usfloz` `uspt` `usqt` `usgal` `ukfloz` `ukpt` `ukqt` `ukgal` |
| Speed       | **`m/s`** `km/h` `mi/h` `ft/s` `kn`                                                                                       |
| Pressure    | **`Pa`** `hPa` `kPa` `bar` `atm` `psi` `mmHg`                                                                             |
| Energy      | **`J`** `kJ` `cal` `kcal` `Wh` `kWh` `BTU` `eV`                                                                           |
| Power       | `mW` **`W`** `kW` `MW` `GW` `hp`                                                                                          |
| Current     | `µA` `mA` **`A`** `kA`                                                                                                    |
| Voltage     | `mV` **`V`** `kV`                                                                                                         |
| Resistance  | `mΩ` **`Ω`** `kΩ` `MΩ`                                                                                                    |
| Frequency   | **`Hz`** `kHz` `MHz` `GHz` `bpm`                                                                                          |
| Data        | `b` **`B`** `kB` `MB` `GB` `TB` `KiB` `MiB` `GiB` `TiB`                                                                   |
| Illuminance | **`lux`** `fc`                                                                                                            |

Three of these need saying out loud:

- **Temperature shifts as well as scales.** `0°C → #°F` is `32°F`, not `0°F`. Temperature is the only measure that works this way, and there are deliberately no prefixed temperature units, so an offset is never compounded with a prefix.
- **Volumes name their system.** There is no bare `gal`, `floz`, `pt` or `qt`, because those differ between US customary and British imperial measure; `usgal` and `ukgal` are the two different things they could mean. Units that are the same in both — `oz`, `lb`, `mi`, `ft`, `in`, `yd` — are unqualified. `t` is the metric tonne; `uston` and `ukton` are the short and long tons. `tsp`, `tbsp`, and `cup` are the metric-legal 5 mL, 15 mL, and 240 mL.
- **`°` and `rad` measure the same thing.** `sin`, `cos`, and `tan` take radians, so an angle in degrees — which is what [Place](#place) rotations and [Color](#color) hues are — has to be converted first: `(45° → #rad).sin()`. Those three functions and their inverses are unitless, since a ratio of two lengths has no unit.

A library may give a unit meaning of its own by declaring the units it accepts and reading them back. `Track`'s note list does this with the western note values (`𝅝` a whole note, `𝅗𝅥` a half, `𝅘𝅥` a quarter, `𝅘𝅥𝅮` an eighth, `𝅘𝅥𝅯` a sixteenth, each optionally followed by `𝅭` to lengthen it by half), so `3𝅗𝅥` is the third degree of the scale played for two beats. This is an ordinary unit on an ordinary number — nothing about the language changes — and the units are meaningless outside the type that declares them.

A number _type_ distinguishes three unit cases:

- `#` means **any unit** — it accepts a number with any unit (or none), and a value typed `#` is accepted anywhere a number is expected. It is a wildcard, intended for type declarations where the unit doesn't matter.
- `#!` means **no unit** — it accepts only a unitless number, so `x•#!: 1` is fine but `x•#!: 1s` is a type error.
- `#unit` (e.g. `#m`, `#m/s`) means a **specific unit** — it accepts only a number with that exact unit.

A concrete number value always has either no unit (e.g. `1`) or a specific unit (e.g. `1m`); it is never the `#` wildcard. Because `1` is unitless rather than "any unit", adding a unitless number to one with a unit is a type error in both directions:

```
1 + 1s
1s + 1
```

The same matching rule applies to `-` and the inequality comparisons (`<`, `≤`, `≥`, `>`): the two operands must have the same unit. Products (`·`), quotients (`÷`), and powers combine units instead, so they accept operands with any units (e.g. `1 · 1m` is `#m` and `2m ÷ 2s` is `#m/s`).

`!#` is the **not-a-number** literal, written the same way in every language (like `∞` and `π`). Most not-a-numbers come from a computation rather than being written: a text that isn't a number (`'abc' → #`), `√-1`, `arcsin` outside its domain, `∞ - ∞`. It takes a unit like any other number (`!#m`). Dividing by zero is **not** one of these — see the next paragraph.

Divide `÷` and remainder `%` evaluate to `ø` when the divisor is zero (never a silent `NaN`), so their output type is `# | ø`. To keep ordinary arithmetic concise, the type is narrowed back to `#` when the divisor is provably non-zero — a non-zero number literal, the `.length()` of a non-empty literal list, set, map, or table, or a name bound (transitively) to one of those. Otherwise the result is `# | ø`, and using it where a number is required is a conflict that suggests handling the possible zero with `??` (e.g. `total ÷ count ?? 0`).

#### _evaluation_

Number literals evaluate to a number value that stores an immutable [decimal.js](https://mikemcl.github.io/decimal.js/) value and immutable unit.

#### _equality_

Numbers are only equal to other numbers that have identical decimal values and equivalent units. Units are only equivalent when the set of dimensions specified on each unit are equivalent and the power of each dimension specified is equivalent.

Two not-a-numbers with the same unit are equal, so `!# = !#` is `⊤` and a creator can ask whether a computation came back not-a-number. (IEEE-754 makes NaN unequal to itself so hardware can flag a bad operation without trapping; Wordplay's `=` asks whether two values are the same thing, and it has `ø` and exceptions for signalling.) Units still count, so `!#m = !#s` is `⊥`, just as `1m = 1` is. Because `≤` and `≥` mean "less/greater than **or equal**", `!# ≤ !#` and `!# ≥ !#` are `⊤`, while the strict `<` and `>` are `⊥` — ordering something that isn't a number has no answer. `min` and `max` still propagate not-a-number, and sorting a list by a not-a-number key puts those items last.

### Text

> TEXT → TRANSLATION＊  
> TRANSLATION → textopen （text ｜ CODE ｜ concept）＊ textclose LOCALE  
> LOCALE → LANGUAGE （`_` LANGUAGE）＊ （`-` REGION （`_` REGION）＊）？  
> LANGUAGE → _any valid ISO 639 language code, or the language's name in that language or in English_  
> REGION → _any valid ISO 3166 country code, or the region's name in its own language or in English_

A language or region may be written by name as well as by code, so `'hola'/es`, `'hola'/Español`, and `'hola'/Spanish` are the same tag, as are `/es-MX`, `/es-México`, and `/es-Mexico`. Matching ignores case, accents, spaces, and punctuation — `/ESPANOL` and `/es` both name Spanish — and it never depends on the reader's own language, so a program means the same thing to everyone. A tag keeps the spelling it was written with; only its meaning is resolved, so `/Español` stays `/Español` in the source.

Two consequences follow from the fact that a tag is a single token. A name is written **without its spaces and punctuation** (`/BahasaIndonesia`, `/es-CotedIvoire`, `/GuineaBissau`), since `-`, `_`, `,`, `.`, `'`, and `(` are all syntax. And a **code always wins** over a name that would fold onto it: `/yi` is Yiddish rather than Sichuan Yi, `/ho` is Hiri Motu, and `/lu` is Luba-Katanga. That leaves exactly one language reachable only by its code — Ho, whose name in every language is "Ho", which is Hiri Motu's code, and so is written `/hoc`. A language written with two scripts can be named in either (`/bosanski` or `/босански`). Two letters are also reserved symbols — `ø` and `ƒ` — so a name containing one is not a single token and cannot be written: Faroese is `/fo` or `/Faroese` rather than `/føroyskt`, and the regions `Bouvetøya` and `Føroyar` likewise go by their English names.

A language or region that names neither a code nor a name is a conflict, so a misspelling is reported rather than silently meaning nothing.

A locale tag may list multiple languages joined by `_` (e.g. `/es_en` for mixed Spanish and English) and, after the `-`, multiple regions joined by `_` (e.g. `/en-US_CA`). The full tag serializes as `lang1_lang2-region1_region2`. Operations that combine text union the languages and regions of their inputs (see _Text_ below). The tag also decides whose casing rules `uppercase`/`lowercase` apply — a multilingual tag uses its primary language, and untagged text uses Unicode's locale-independent root mapping, so a program's result never depends on the machine running it. The tag likewise decides how @List's `sorted` orders text: it compares by Unicode collation, so a capital letter sorts next to its lowercase one rather than before every lowercase word, and case only breaks a tie between otherwise equal text. When every tagged value in a sort agrees on a tag, that language's ordering applies (Swedish puts `ä` after `z`); untagged values abstain rather than override, and a disagreement falls back to the same locale-independent root, which orders emoji the way Unicode groups them rather than by code point. Letters only have case in bicameral scripts, so text in a script without one is unchanged. Text also supports `subsequence` (a slice), `index` (where another text first appears), `replace` (every copy of one text swapped for another, unioning the locales as `+` does), `trim`, and `reverse`. Every one of these counts in graphemes, as `length` and `→ ['']` do, so a symbol built from several code points is never cut in half; `subsequence` and `index` count from 1 and `subsequence` includes both ends, matching @List's.

Text values, unlike in other programming languages, are not a single sequence of Unicode code points. Rather, they are unique in a few ways:

- They are interpreted as a sequence of graphemes, using a grapheme segmentation algorithm. That means that emojis comprised of multiple Unicode code points are treated as a single symbol when indexing text.
- They can be language tagged, indicating what language and optional region they are written in
- They can have multiple translations, allowing for one to be selected at runtime using the environment's list of preferred locales.
- They can contain `concept` references (the same `@…` tokens used in markup), so that codepoints (e.g. `@U/1F600`) and creator-defined characters (e.g. `@username/charactername`) can be written in plain text and rendered. A codepoint reference evaluates to its character; a custom-character reference is kept in the text as-is and rendered as a glyph by the output. To avoid mistaking an email's domain for a reference, an `@` that directly follows an ASCII email-local-part character (`A–Z a–z 0–9 . _ % + -`) is treated as literal text rather than a reference — _unless_ the reference uses a `/` separator (e.g. `@username/charactername`), which an email domain never does. So references are recognized at the start of the text, after whitespace, after non-ASCII text (making the rule work in scripts without inter-word spaces), and — for the `/` form — even mid-word in Latin text (e.g. `hi@amy/cat`); only `.`-style references that follow an email-local-part character (e.g. the `@example.com` in `jdoe@example.com`) stay literal.
- Language tags are a language
- A language tag says what language text is written in, not which text it is, so it takes no part in equality: `'hi' = 'hi'/en` is `⊤`, and so is `'hi'/en = 'hi'/es`. Only the graphemes decide. The same rule governs membership in lists, sets, and maps, so a plain key finds a language-tagged one.

For example, these are all valid text values:

```
'hi'
'hi'/en
'hi'/en-US
'hi'/en-US'hola'/es-MX
'hi'/en-US'hola'/es-MX『こんにちは』/ja
```

If `en-US` were the preferred locale, they would all evaluate to `'hi'`. But in the latter case, if Spanish or Japanese were selected, they would evaluate to `'hola'` or `『こんにちは』`'

It's possible to check whether an environment has a particular locale selected with the locale predicate:

> ISLOCALE → locale LANGUAGE？

```
🌎/en
```

This will return `⊤` if the locale is in the preferred list, and, `⊥` otherwise.

Text can also be templates, with aribtrary expressions that are automatically converted to text:

```
'hi number \8 + 8\'
'what will you be? \choose(name)\'en
```

These are similar to string templates in other languages, just with a slightly simpler syntax.

#### _evaluation_

Text literals first get the environment's list of preferred locales and then select the first translation in the list of translations that match the exact language and region, and if there isn't one, then the first translation that matches the language, and if there isn't one, then the first translation.

#### _equality_

Text is equal to other text with an identical sequence of graphemes. The locale takes no part (see above), so only the graphemes decide.

Two text values with different text delimiters are considered equivalent, and so are two with different language declarations:

```
'hi' = 『hi』
'hi'/en = 『hi』/ja
```

### Markup

> MARKUP → FORMATTED＊  
> FORMATTED → `` ` `` CONTENT `` ` `` LANGUAGE  
> CONTENT → PARAGRAPH＊  
> PARAGRAPH → SEGMENT＊  
> SEGMENT → words ｜ url ｜ email ｜ LINK ｜ concept ｜ CODE ｜ MENTION ｜ BRANCH  
> LINK → `<` words `@` url `>`  
> CODE → `\` PROGRAM `\`  
> BRANCH → mention `[` SEGMENT＊ (`|` SEGMENT＊)＊ `]`

The final basic value is markup, which behaves identically to text values aside from their delimiters, and the meaning of the delimiters internal to text:

```
`<wordplay@https://wordlay.dev>`
`_hello_ /world/^!^`
`my code \1 + 1 = 2\`
```

These three values are 1) a link, 2) a hello world with underscores, italics, and extra bold, and 3) a sentence with an embedded code example.

An email address is a link too, and needs no delimiters: writing one in markup makes it a link that opens a message to that address.

```
`write to hi@wordplay.dev`
`<email us@mailto:hi@wordplay.dev>`
```

A link's URL is a single URL token, not arbitrary words: it is an `http`/`https` address, a `mailto:` address, a schemeless `://path` within Wordplay, or a bare email address. Only those become links; anything else in a link's URL position renders as its description, unlinked.

#### _evaluation_

Formatted literals first get the environment's list of preferred locales and then select the first translation in the list of translations that match the exact language and region, and if there isn't one, then the first translation that matches the language, and if there isn't one, then the first translation. The selected translation's locale travels with the resulting markup value (just as a text value carries its locale), so operations and output rendering can localize it.

#### _operations_

Markup values support the same locale-aware operations as text, via the `` `…` `` type: `length`, `=`/`≠`, `has`, `starts`, `ends`, `repeat`, `+` (combine, which concatenates the markup and unions the operands' locales), and `uppercase`/`lowercase`, which convert only the prose, leaving formatting delimiters, `@concept` links, `\example\` code, `$mention` keys, and link URLs as they are. They also convert to a @List of their symbols (`→ ['']`, which drops formatting) and to a @Number. They also convert to and from @Text (`` `…` `` → `''` drops formatting; `''` → `` `…` `` interprets any markup in the text). Like text, combining markup with differing locales unions them, and the `/` locale operator overrides a computed markup's locale.

#### _equality_

Markup values follow the same equality rules as text — the locale takes no part — but must also have the exact same markup structure.

### Pattern

Regular expressions are empirically hard to read, write, and learn: developers over-constrain patterns roughly 3× more than they over-relax them, incorrect escaping and invisible greedy/lazy choices are dominant bug sources, and dense unstructured notation overwhelms comprehension (Wang, Brown, Jennings & Stolee, _An Empirical Study on Regular Expression Bugs_, MSR 2020 / EMSE 2022; Chapman, Wang & Stolee, _Exploring Regular Expression Comprehension_, ASE 2017; Michael, Donohue, Davis, Lee & Servant, [_Regexes are Hard_](https://fservant.github.io/papers/Michael_Donohue_Davis_Lee_Servant_ASE19.pdf), ASE 2019).

A pattern is Wordplay's take on regular expressions: a multilingual, grapheme-based description of the _shape_ of text. Patterns address these problems with three structural commitments: (1) the match boundary _is_ the operation (`≈` whole-text vs `⌕` search), so an anchor can't be forgotten; (2) quoted = literal, so there is no escaping; and (3) one matching semantics — greedy, possessive, and longest-match everywhere — so there is no greedy/lazy distinction to learn, no silent default, and no dependence on the order branches are written. Matching over NFC extended grapheme clusters makes a pattern behave the same across languages and scripts. The syntax converges deliberately with the readable-regex DSL family — [Rosie](https://rosie-lang.org/) (whose PEG-style possessive, linear-time matching this adopts directly), [Pomsky](https://pomsky-lang.org/), [Melody](https://github.com/yoav-lavi/melody), and SRL — favouring usability by _subtracting_ from full regex power. One extension is deliberately deferred: a `@U/<hex>` codepoint atom (mirroring the codepoint reference syntax in markup and text literals) for matching invisible or hard-to-type scalars without re-introducing escaping into raw literals.

A pattern literal is delimited by `⣿ ⣿` and contains a small sub-grammar; its type is written `•⣿⣿`.

> PATTERN → `⣿` SEQUENCE? `⣿`  
> SEQUENCE → ITEM (`|`? ITEM)\*  
> ITEM → CAPTURE | COMPLEMENT | QUANTIFIED | ATOM  
> CAPTURE → name `:` ATOM  
> COMPLEMENT → `~` ATOM  
> QUANTIFIED → QUANTIFIER (COMPLEMENT | ATOM)  
> QUANTIFIER → (`>` | `≥` | `<` | `≤` | `=`)? number ((`–` | `-`) number)?  
> ATOM → CLASS | LITERAL | SET | GROUP | ANCHOR | LOOK | WORD | WORDEDGE | CASEFOLD | REST | name  
> CLASS → (`◌` | `_` | `#` | `␣`) (`/` PROPERTY)?  
> LITERAL → `'…'` | `"…"`  
> SET → `{` MEMBER\* `}` where MEMBER is a class, range `'a'–'z'`, literal, or named class  
> GROUP → `(` SEQUENCE `)` — groups only; never captures  
> ANCHOR → `⊢` | `⊣`  
> LOOK → (`▸` | `◂`) `(` SEQUENCE `)`  
> WORD → `▭` `/` lang, WORDEDGE → `┊` `/` lang (locale-segmented via `Intl.Segmenter`)  
> CASEFOLD → `Aa` (`/` lang)? `(` SEQUENCE `)`  
> REST → `…`

The base classes are `◌` (any grapheme), `_` (a letter), `#` (a digit), and `␣` (a space, horizontal whitespace only); `…` matches the rest of the input (a possessive `≥0 ◌`). A `/property` narrows a class to a Unicode category, binary property, script, or `Property=Value` (e.g. `_/greek`, `◌/emoji`, `◌/Script=Greek`), tested against the grapheme cluster's base (first) scalar. Property names come from a curated, **localizable** registry (`letter`, `digit`, `emoji`, `linebreak`, scripts like `greek`/`han`, …), with the canonical Unicode id (`Lu`, `Nd`, `Script=Greek`) always available as a fallback; an unrecognized name is a conflict, not a silent match. Quantifier counts precede the atom they repeat (`3 #`, `>0 #`, `≤1 #`, `2–4 #`); the range dash is written `–` but a typed hyphen `-` is accepted as an alias (so `2-4 #` and `'a'-'z'` work without the en-dash). A bare name is a backreference to an earlier capture, or — if no such capture exists — a named class (e.g. `linebreak`).

A literal `"…"` is **raw**: the whole quoted span is one token, matched grapheme-exact with no escaping, markup, embedded expressions, codepoint resolution, `/lang` tag, or multiple translations — so `⣿"@foo"⣿` matches the characters `@foo` and `⣿"1+1"⣿` matches `1+1`. Any Wordplay text delimiter works (`'…'`, `"…"`, `«…»`, …); choose one the text doesn't contain, since there is no escape. To match a specific character, write it (`⣿"✓"⣿`). `Aa(…)` folds case over its subpattern — bare `Aa` uses Unicode's default folding, `Aa/lang` applies locale-specific casing (e.g. Turkic `i`/`İ`), and a backreference inside the scope folds too. A tag with no BCP-47 form, such as a multilingual `Aa/es_en`, folds by its primary language. `▭`/`┊` (word and word-edge) **require** a `/lang` tag, since word segmentation has no locale-independent answer. Case is sensitive, lines have no special mode (`◌` matches a line break; compose line anchors from `⊢`/`⊣`, lookaround, and `linebreak`), and `⣿⣿` empties match only empty text.

Matching is a **possessive parsing expression grammar (PEG)**: greedy with no backtracking, so it runs in linear time and is immune to catastrophic backtracking. Alternation is **longest-match** and order-independent — of the `|` branches that fit, the longest wins (`"cat" | "cats"` ≡ `"cats" | "cat"`) — consistent with the language's "match as much as you can" rule. It is still possessive: a shorter branch that would leave room for what follows is not reconsidered, so `⣿("aa" | "a") "ab"⣿` fails on `"aab"`. Sequences read strictly left to right with no precedence; group with `(…)`. Text is compared as NFC extended grapheme clusters, so a pattern behaves the same across languages and scripts.

#### _operations_

Two optionally infix operations on @Text take a pattern (they are functions on the Text basis, resolved against the left operand's type):

- `text ≈ pattern` → `?` — does the _whole_ text match (as if wrapped in `⊢ … ⊣`)?
- `text ⌕ pattern` → `[Result]` — the list of leftmost, non-overlapping matches.

A `Result` is a built-in @Structure with the matched `text`, its 1-based inclusive `start` and `end`, and `groups`/`starts`/`ends` maps from each capture name to its text and positions.

#### _evaluation_

A pattern literal evaluates to a pattern value carrying the literal. `≈` and `⌕` compile the match into Evaluator steps that advance a scoped match state one grapheme-atom at a time, so a match is observable and reversible step by step like the rest of evaluation, rather than an opaque call.

#### _conflicts_

`EmptyPattern` (a `⣿⣿` with no atoms), `MalformedQuantifier` (a range whose minimum exceeds its maximum), `UnrecognizedPatternProperty` (an unknown `/property`), `MissingPatternLocale` (a `▭`/`┊` with no locale tag), `UndefinedBackreference` (a bare name that is neither a capture nor a known class), `DuplicateCaptureName` (two captures sharing a name), and `OverlappingAlternatives` (a warning when one literal `|` branch is a prefix of another, since longest-match always prefers the longer).

#### _equality_

Two pattern values are equal when their source literals are equal.

## Compound Values

Now let's talk about the four built-in compound values (and how to get values out of them).

### List

> LIST → `[` （EXPRESSION ｜ SPREAD）＊ `]`  
> SPREAD → `:` EXPRESSION

Lists are sequences of values:

```
[]
[1]
[1 2 3]
[1 ø 'yo']
```

Lists can be constructed from other lists with `:` preceding a list value:

```
[:[1 2 3] :[4 5 6]]
```

This evaluates to `[1 2 3 4 5 6]`

Getting values out of lists is just a matter of indexing them. Lists are index from `1` to their length. So this list access produces `5`:

```
[1 2 3 4 5 6 7 8 9][5]
```

List indices wrap, so this is `1`

```
[1 2 3 4 5][6]
```

And this is also `1`:

```
[1 2 3 4 5][-5]
```

Because indices wrap, no index is ever out of range. There are only three ways a list access evaluates to `ø`: an index of `0`, since lists are indexed from `1`; an index that isn't a whole number; and any index into an empty list, which has no values to wrap onto. For convenience, however, this possibility isn't included in a list access's type, as it would require pervasive, and mostly unhelpful checking for `ø`. This does let type errors slip through as runtime errors, but was chosen to avoid imposing type gymnastics on learners. It also means `??` on a list access is a conflict, since the access's type doesn't include `ø` for it to coalesce.

A list access's type is usually the type of any item in the list. But when the list's type gives a type per position (see `LISTTYPE` under [Types](#types)) and the index is a constant in range, the access has the type of exactly that position.

Lists have a wide range of higher order functions. For example, `translate` can map a list's values to different values, and `combine` can reduce a list of values into some value:

```
[1 2 3 4 5 6 7 8].translate(ƒ(num) 2.power(num))
[1 2 3 4 5 6 7 8].combine(1 ƒ(num sum) num + sum)
```

#### _evaluation_

Lists first evaluate all of their value expressions, in reading order, and then construct a list from those values.

#### _equality_

List are equalivent to other lists when they have the same number of values and each pair of corresponding values in the sequence are equal.

Because all values in Wordplay are immutable, all of these operations produce new lists.

### Set

> SET → `{` EXPRESSION＊ `}`  
> SETCHECK → EXPRESSION `{` EXPRESSION `}`

Sets are non-ordered collections of unique values, where unique is defined by value equality. Here's are some examples of sets:

```
{}
{'hi'}
{1 ø ['pony' 'horse' 'dog]}
```

Because sets do not have duplicates, these two sets are equivalent.

```
{1 2 3 4}
{1 1 2 2 3 3 4 4}
```

Set membership can be checked by following a set with a value as a key. For example, this evaluates to ⊥.

```
{1 2 3}{4}
```

### _conflicts_

- A set contains a key/value pair

#### _evaluation_

Sets first evaluate all of their value expressions, in reading order, and then construct a set from those values, removing any duplicates.

#### _equality_

Sets are equal when they have the same size and equivalent values.

### Map

> MAP → `{` （`:` ｜ KEYVALUE＊） `}`  
> KEYVALUE → EXPRESSION `:` EXPRESSION

Maps create a mapping between values and other values. They're like sets in that they only contain unique keys, but values can reoccur. Here are some valid maps literals:

```
{:}
{'amy': 43 'ellen': 21}
{1: [1 2 3] 2: [-1 -2 -3]}
```

Values can be retrieved via keys with the same syntax as sets; this evaluates to `43`:

```
{'amy': 43 'ellen': 21}{'amy'}
```

### _conflicts_

- A map contains a value that is not bound to a key

#### _evaluation_

Maps evaluate each key/value pair in reading order, and keys, then values, then the next pair. After, all of the pairs are converted into a map storing the pairs. Later duplicate keys override earlier keys.

#### _equality_

Maps are equivalent when they are the same size, and every key/value pair that occurs in one has a corresponding equivalent key value pair in the other.

### Table

> TABLE → TABLETYPE ROW＊  
> TABLETYPE → `⎡` BIND＊ `⎦`  
> ROW → `⎡` （BIND ｜ EXPRESSION）＊ `⎦`  
> SELECT → EXPRESSION `⎡?` ROW EXPRESSION  
> INSERT → EXPRESSION `⎡+` ROW  
> UPDATE → EXPRESSION `⎡:` ROW EXPRESSION  
> DELETE → EXPRESSION `⎡-` EXPRESSION

Tables are like relational tables, with a series of named columns with type declarations, and zero or more unordered rows indicating values for each of those columns. However, they are immutable in that every operation on a table produces a new table to reflect the value. They don't aspire to be space efficient, just a simple interface for expressing and updating tabular data.

Here's an example table:

```
⎡name•'' score#point⎦
⎡'amy'   20point⎦
⎡'ellen' 72point⎦
⎡'tony'  11point⎦
⎡'jen'   1234point⎦
```

This is a two column table, with one text column and one number column with a `point` unit.

There are four basic table operations. Imagine we've named the table above `points`. Here we select some data from the table above:

```
points ⎡?⎦ score > 50point
```

This results in a table with just the score column rows with score more than 50.

Here we insert a row:

```
points ⎡+ 'joe' 17point⎦
```

This evaluates to a table with five rows.

Here we update a row:

```
points ⎡: score: 22point⎦ name = 'amy'
```

And here we delete a row:

```
points ⎡- name = 'amy'
```

Tables can be converted to lists of data structures, where each row name is a property. (More on structures later).

### _conflicts_

- A table is given rows that do not conform to it's table type
- A table type is given a bind with no type declaration

#### _evaluation_

Tables evaluate their rows in reading order, and rows evaluate their columns in reading order. Then, a table is constructed with the completed rows.

#### _equality_

Tables are equivalent when they have the same number of rows, and each row in one table corresponds to an equivalent row in the other table. Rows are equivalent if all of their column values are equvalient.

## Evaluations

There three different syntaxes for evaluating functions on values.

### Evaluate

> EVALUATE → EXPRESSION `(` （BIND ｜ EXPRESSION）＊ `)`

The standard way is to provide a function value, and then parentheses delimited sequence of values:

```
1.add(1)
```

This evaluation, for example, provides the `add` function defined on `1` and gives it a single input, `1`, then evaluates to their sum, `2`.

Not all functions are defined on values. For example, if a function was named `laugh`, we could evaluate it with:

```
laugh()
```

Inputs must conform to the types defined in a function's definition. (We'll talk more about how to define functions later).

Inputs may be given positionally or by name (`name: value`). A named input whose value is missing — because the tokens after its `:` begin another named input or close the evaluation — parses with an empty unparsable value rather than consuming what follows, so the inputs after an in-progress input remain intact (and editing tools can offer values for it).

### _conflicts_

- The function expression given is not a function type
- The function type resolved does not match the inputs given (missing required values, extra values, values of the wrong type)
- The function expression could resolve to many different functions that take different inputs

#### _evaluation_

Evaluation expressions first evaluate their function value, and if one was not found, then generate a value exception, halting the program. Next, they evaluate their inputs, in reading order. If required inputs were not provided, a value exception is generated and the program halts. If an input is not of the required type, then a type exception is generated and the program halts. Otherwise, a new evaluation is added to the evaluator's evaluation stack, the inputs are bound to all of the names given in the function's binds, and the function's expression is evaluated in the context of the new evaluation scope. After the function's expression is done evaluating, then the evaluation finishes evaluating, evaluating to the value of the evaluated function.

Function evaluations in **tail position** are handled specially. A call is in tail position when its value is necessarily the value of the nearest enclosing function evaluation: it is the function's body expression, either branch (but not the condition) of a conditional in tail position, or the last statement of a block in tail position when every other statement is a bind or type definition (so that statement is the block's sole result — a block with several results evaluates to a list of them, and then no single statement is in tail position). For such a call, the evaluator _replaces_ the enclosing function's evaluation (and any block evaluations above it) on the evaluation stack with the new evaluation instead of adding to the stack, and the new evaluation delivers its value directly to the enclosing function's original caller. The value is identical either way; the consequence is that tail recursion — self- or mutual — does not grow the evaluation stack, so its depth is bounded by the evaluator's step budget rather than its evaluation depth limit, and a function that tail-calls forever halts with an evaluation limit exception naming it when that step budget is exhausted. Only function evaluations are replaced this way; structure and stream evaluations, and operator (binary/unary) evaluations, always push.

### Binary Evaluate

> BINARYEVALUATE → ATOMIC （operator ATOMIC）＊

While the evaluate syntax is fine, when using them with function names that are operator tokens, they can look kind of funny:

```
1.+(1)
```

Not only is that a bit cluttered, but it deviates strongly from conventions in mathematics. Binary evaluate syntax addresses this, allowing for infix format for any function definition that has an `operator` name:

```
1 + 1
```

Parsing order for binary evaluate expressions is strictly inline start to inline end (left to right in a left to right language), and so this expression, which in PEMDAS operator precedence would be `2.5`, actually evaluates to `2.25`:

```
1 + 2 · 3 ÷ 4
```

To avoid confusion, the language warns when multiple distinct operators are being used without specifying evaluation order, and suggests using `()` to clarify, like this:

```
1 + ((2 · 3) ÷ 4)
```

While binary evaluations are mostly just syntactic sugar on regular evaluation, there is one exception: Boolean `&` and `|` ooperators are short circuited, meaning they do not evaluate the right expression if the left is true in the case of `&` or false in the case of `|`. These two special cases act more like conditional shorthands.

### _conflicts_

- Same as evaluate

#### _evaluation_

Binary evaluations first evaluate their left input, and then resolve the operator name on the left value. If a function is not found, it evaluates to a function exception, which halts the program. If one is found, then the right expression is evaluated. If the function expected anything other than one input, then it an exception value is generated and the program halts. Otherwise, the single value is provided to the function, and its result is given as the binary evaluate's value.

### Unary Operator

Finally, there is a third prefix unary operator syntax, allowing for expressions like:

```
-(1 + 2)
~(puzzle & mystery)
```

The way that Wordplay distinguishes between unary and binary evaluations is _space sensitive_ if the token following the operator has no space, then it is unary. This convention means that this expression is parsed as a single number `1`, followed by an entirely separate `+` unary evaluation on another unary evaluation of `-`:

```
1-+2
```

For it to be interpreted as infix, space is required

```
1-+2df
```

This tiny bit of space-sensitive parsing aligns with mathematical syntax, but also imposes some consistency in formatting.

### _conflicts_

- Same as evaluate

#### _evaluation_

Unary evaluates evaluate their input value, and then resolve the operator name on that value. If a function could not be found, it evaluates to a function exception, which halts the program. If it could, but the function excepted inputs, then a value exception is generated, and the program halts. Otherwise, the function is evaluated on the value, and the unary evaluate evaluates to the result of the function evaluation.

### Conditional

> CONDITIONAL → EXPRESSION `?` EXPRESSION EXPRESSION

Conditions are a special kind of evaluation that evaluates to one of two expressions depending on a Boolean condition's value. This is much like an `if` statement in other languages, but functional, and like the tertiary conditional operators found in many imperative languages.

```
1 > 0 ? 'math works!' 'math broke'
```

Conditionals have operator precedence over all other expressions. Unlike all other evaluations, only one of the two expressions is evaluated at runtime, depending on the value of the condition. It's best to think of it like a special function on Boolean values.

Note that there's no separator between the true anf false cases in this synatax (e.g., `:` in JavaScript, for example). This was partly to reduce overloading of other symbols, but also to encourage use of new lines to convey structure.

A condition that checks a type (`x•#`) or compares against a literal (`x = 'a'`, `map{key} ≠ ø`) **narrows** what it checks inside the branches: the true branch sees only the checked type, and the false branch only the rest of the union. `&`, `|`, and `~` combine checks as intersection, union, and complement. What narrows is the expression the check names — a name, a property, a list index, or a map key — matched by how it's written, so `map{key}` narrows another `map{key}` but not `map{other}`.

The check doesn't have to be written inline. A name bound to it works the same, since the condition is followed through the definitions it names:

```
valid: notes{pressed} ≠ ø
valid ? Phrase(notes{pressed}) Phrase('')
```

Only the names that _decide_ the condition are followed, not every name in it: in `game.phase = 2`, `game` is the subject being asked about rather than the question, so its definition isn't consulted. And it's the _check_ that a name may stand for, not the value being checked — binding `n: map{key}` and testing `n ≠ ø` narrows `n`, not `map{key}`.

Parentheses and docs don't change what a check asks, so `(x)•#` narrows exactly as `x•#` does.

A name bound to a literal narrows like the literal written inline, so `k: 'x'` and then `a = k` refines `a` just as `a = 'x'` does. Two things deliberately do not narrow. A comparison against a text literal with **several translations** refines nothing, because the literal evaluates to the reader's translation and which one that is isn't known while checking — the comparison being false rules out only the one that was compared. And an input's default is not its value, since a caller may pass anything, so `ƒ f(k•'': 'x')` does not let `a = k` narrow.

### _conflicts_

- The condition is not boolean typed

#### _evaluation_

Conditions first evaluate their condition. If the condition does not evaluate to a boolean value, a type exception is generated, and the program halts. If the condition was true, it evaluates the true expression, otherwise it evaluates the false expression. The conditional then evaluates to the result.

### Otherwise

> OTHERWISE → EXPRESSION `??` EXPRESSION

The otherwise (`??`) operator is a none-coalescing shorthand: it evaluates to its left expression unless that expression is `ø`, in which case it evaluates to its right expression. It's useful when working with values that might be `ø`, such as map lookups for missing keys or a `find` that matches nothing:

```
{'amy': 43}{'jen'} ?? 0
```

This evaluates to `0`, because the map lookup is `ø`.

### _conflicts_

- The left expression's type does not include `ø` (the operator is unnecessary)

#### _evaluation_

Evaluates the left expression. If the result is `ø`, evaluates and returns the right expression; otherwise returns the left value.

### Match

> MATCH → EXPRESSION `???` （EXPRESSION `:` EXPRESSION）＊ EXPRESSION

Match expressions select one of several expressions based on equality with a key. The first expression is the value being matched; pairs of `key: result` follow; and a final expression is the default when no key matches. For example:

```
sound ???
    'meow': 'cat'
    'woof': 'dog'
    'unknown'
```

If `sound` equals `'meow'`, this evaluates to `'cat'`; if `'woof'`, `'dog'`; otherwise `'unknown'`.

A match **narrows** the value it matches on, the same way a conditional narrows what its condition checks (see [Conditional](#conditional)). Inside a key's value expression, the matched value is known to be that key; inside a later key's, it's known not to be any earlier one; and in the default expression, it's known to be none of them. Only keys whose value can be named — a number, none, or single-translation text literal, or a name bound to one — take part; a computed key rules nothing out, so the default keeps every type it might still have.

### _conflicts_

- A key's type is incompatible with the matched value's type
- The default expression is missing

#### _evaluation_

Evaluates the matched value, then evaluates each key in reading order, comparing for equality with the matched value. The first matching key's value expression is evaluated and returned. If no key matches, the default expression is evaluated and returned.

### Convert

> CONVERT → EXPRESSION `→` TYPE  
> CONVERSION → DOCS `→` TYPE TYPE EXPRESSION

A final kind of evaluate is conversions, already mentioned earlier in examples. Conversions take a type declaration (described later) and attempt to find a series of one or more conversions that would convert the value to a type.

For example, one can convert text into a list of graphemes like this:

```
'hello' → []
```

But one can also convert text to a set of unique characters like this:

```
'hello' → {}
```

Internally, it found the conversion to `[]`, and then it found the conversion from `[]` to `{}`

The same works for numbers with units, as numerous conversion functions are defined for numbers with different units (see [built-in units](#built-in-units) for the full list):

```
1km → #m
```

Conversions can be extended with conversion definitions. This defines a global conversion from kitty counts to cat counts, where `⬚` ([This](#this)) refers to the input value:

```
→ #kitty #cat ⬚ ÷ 2
```

### _conflicts_

- There is no conversion in scope that matches the request

#### _evaluation_

Conversions first evaluate their input value. Then, all conversions in scope are retrieved, including all of the conversions defined on the input value, and any defined external to the value. Finally, a graph is built of all of the conversion paths, the shortest path is found betwen the input and output types. If no path is found, a conversion exception is generated, halting the program. Otherwise, the conversion function is evaluated on the input, and its result is provided as the convert's value.

When the input expression's static type is a name type referring to a structure, the named structure's own conversions are consulted just as if the type were the structure type itself, before generic conversions apply.

### Translate

> TRANSLATE → EXPRESSION `↦` EXPRESSION

A translate maps a collection into a new one. Its left side must be a list, set, map, or table, and its right side is an expression evaluated once for each item, with `⬚` ([This](#this)) bound to the current item. It's a terse equivalent of the higher-order `translate` function: `[1 2 3] ↦ ⬚ + 1` is equivalent to `[1 2 3].translate(ƒ(item) item + 1)` and produces `[2 3 4]`.

```
[1 2 3] ↦ ⬚ + 1
{1 2 3} ↦ ⬚ + 1
{1:10 2:20} ↦ ⬚ + 1
```

The right-to-left form `↤` is identical and provided for right-to-left languages.

For lists and sets, `⬚` is each value, and the result is a new list or set of the translated values. For maps, `⬚` is each value and the result is a new map with the same keys and translated values. For tables, `⬚` is each row structure and the result is a new table whose rows come from the translated structures.

### _conflicts_

- `ExpectedCollection`: the left side is not a list, set, map, or table
- `ExpectedThis`: the right side has no `⬚` referring to the current item (a warning, only reported when the left side is a valid collection)

#### _evaluation_

A translate first evaluates its left side to a collection value. It then iterates the collection's values in order, binding `⬚` to each item, evaluating the right side, and collecting the results. When iteration completes, the collected results are assembled into a new collection of the same kind as the input.

### This

> THIS → `⬚`

`⬚` refers to an implicit, unnamed value supplied by the nearest enclosing context. It is only valid inside one of four constructs, and its meaning depends on which:

- in a **conversion definition**, it is the input value being converted;
- in a **reaction**, it is the reaction's most recent value;
- in a **structure definition**, it is the current structure instance;
- in a **translate** (`↦`), it is the current item being mapped.

Because `⬚` is a complete expression on its own, its properties and functions are reached with ordinary access: `⬚.x`. Using `⬚` outside any of these four contexts is a conflict (`MisplacedThis`).

## Names

There are numerous ways that names are used in Wordplay, some of which have already been mentioned (function names, unit names, column names).

### Bind

> BIND → DOCS？ `↑`？ NAMES `…`？ （`•` TYPE）？ （`:` EXPRESSION）？  
> NAMES → NAME （`,` NAME）＊  
> NAME → （name ｜ operator ｜ `_`） LANGUAGE？  
> REFERENCE → name ｜ operator

Bindings are used throughout the language to declare names for things like values, table colums, function inputs, and more. They all use the same syntax, and can have a things like documentation, language tags, aliases, type declarations, and optional values. These are all syntatically valid bindings:

```
sum
sum: 1
sum•#: 1
sum/en
sum/en-US
sum/en-US,suma/es
sum/en-US,suma/es-MX
¶Sum of values¶/en sum/en-US,suma/es-MX
¶Sum of values¶/en sum/en-US,suma/es-MX: 1
```

All of those examples define a name `sum`; some of them specify its type, some provide a value, some provide documentation, some have multiple language tagged aliases to enable localization of the program. Context determines whether these are semantically valid; for example, table columns require binds to specify a type; bindings in blocks (described below) have to have values.

Scoping of names is static and lexical, and duplicates and shadowing are not allowed.

Referring to beindings is a simple matter of using one of their names. Here we define sum to `1`, then refer to it, and get back `1`:

```
sum: 1
sum
```

Bindings declare all provided names in scope, so they can be referred to by any of their aliases, without using a matching language tag.

### _conflicts_

- The type of the value expression is incompatible with the declared type
- There are duplicate names
- A name is already defined in scope

#### _evaluation_

Binds evaluate in 1) blocks, 2) when offering a default value for a function evaluation, 3) when offering a default evaluation for a table row. In all of these cases, they evaluate their value expression, bind it in scope using all of the bind's names, and then evaluate to the value.

### Block

> BLOCK → DOCS？ `(` （BIND ｜ EXPRESSION）＋ `)`

Blocks are a sequence of zero or more bindings, followed by an expression, and evaluate to the expression's value. They serve two purposes: to help define evaluation order for infix expressions as we saw earlier, and to help break up complex computation into named substeps, as in this example:

```
base: 2
1 + (
        score: base + 5
        weight: 18
        score · weight
    )
```

Blocks may have more than one non-bind expression. A block with exactly one evaluates to its value; a block with several evaluates to a list of their values, in reading order.

Programs are also blocks, but with required open and close parentheses.

#### _conflicts_

- There are no expressions
- The block is not closed

#### _evaluation_

Blocks create a scope in which to bind names, then evaluate each of their statements in reading order, then discard the scope and evaluate to their non-bind expressions' values: that expression's value if there is one, or a list of them in reading order if there are several.

### Functions

> FUNCTION → DOCS？ `↑`？ `ƒ` NAMES TYPEVARIABLES？ `(` BIND＊ `)` （`•` TYPE）？ EXPRESSION  
> TYPEVARIABLES → `⸨` NAME＊ `⸩`

Function definitions, like binds, can have zero or more names, optional documentation, and take a series of binds specifying their inputs, and an expression defining its outputs. Binds can optionally specify types, default values, and an optional evaluation type can be provided as well. If they're not, types are inferred, if possible. Functions are values, like everything else.

Here are some example function definitions:

```
ƒ () 'secret'
ƒ sum(a•# b•#) a + b
ƒ sum(a•#:0 b•#:0) a + b
ƒ sum(a•#:0 b•#:0)•# a + b
¶Add some numbers¶ ƒ sum(a•# b•#) a + b
ƒ kind(num•#) (
    odd: (num % 2) = 1
    odd ? 'odd' 'even'
)
ƒ accumulate(numbers…•#) numbers.combine(1 ƒ(sum num) sum + num)
```

#### _conflicts_

- The type of the expression is not compatible with the declared type
- Inputs have duplicate names
- The function names are already defined elsewhere

#### _evaluation_

Functions evaluate to a function value that has a reference to the definition.

### Structures

> STRUCTURE → DOCS？ `↑`？ `•` NAMES NAME＊ TYPEVARIABLES？ `(` BIND＊ `)` BLOCK  
> PROPERTY → EXPRESSION `.` NAME  
> PROPERTYBIND → PROPERTY `:` EXPRESSION

Structure definitions are how to declare new types of values. Structures can have properties, functions, and conversions, just like the built-in value types. For example, here's a new data type:

```
•Kitty(name•'' breed•'' sound•'' activity•#) (
  ƒ meow() sound · activity
)
```

Structures are essentially like functions that retain a closure on their block scope. To create a structure, we just evaluate the Structure function. We can evaluate functions on it immediately, or bind it and evaluate functions on it later.

```
Kitty('boomy' 'tuxie' 'moo' 3).meow()
```

This produces `moomoomoo`.

Accessing properties and functions uses a dot notation:

```
boomy: Kitty('boomy' 'tuxie' 'moo' 3)
boomy.name
boomy.meow()
```

Because all values are immutable, Wordplay also offers a special syntax for creating copies of values with updated properties:

```
boomy: Kitty('boomy' 'tuxie' 'moo' 3)
moomy: boomy.name:'mooooomy'
```

This creates a new `Kitty` value with the new name and the old other properties (but does not modify the previous value, and binds it to a new name).

#### _static members_

A function or bind inside a structure's block can be marked with `↑` to make it belong to the structure definition itself, instead of to its instances. Static members are evaluated once when the structure is defined and are reached through the structure's name. They are also visible on instances.

```
•Math() (
  ↑ pi: 3.14159
  ↑ ƒ square(n•#) n · n
)

Math.pi          ¶ 3.14159 ¶
Math.square(5)   ¶ 25 ¶
m: Math()
m.square(5)      ¶ 25 ¶
```

A static function or bind can't reference the structure's instance _inputs_, because an instance isn't required to use them; doing so is reported as an unknown name. Everything else in scope where the structure was defined is visible, including the structure itself, its other static members, and the built-in globals — so a static function can build an instance of its own structure.

Several built-ins use statics: `Color.red` and the other basic colors, `Color.random()`, `Instrument.piano`, `Music.major`, and the predefined animations on `Sequence` (`Sequence.sway()`, `Sequence.spin()`, and the rest).

#### _conflicts_

- The inputs have duplicate names
- One of the structure's names is already defined in scope

#### _evaluation_

Structures evaluate to a structure value that has a reference to the definition.

## Streams

As noted earlier, Wordplay has special values that are streams of values that change over time.

### Built-In

These are created by evaluating their pre-defined stream definitions. Some streams tick continuously based on time:

```
Volume()
Pitch()
Camera()
Hand()
Face()
Objects()
Motion()
Time()
Now()
```

`Camera`, `Hand`, `Face`, and `Objects` all read the webcam. `Hand` tracks a hand via MediaPipe's hand landmarker and emits a `Gesture` structure (place, open/fist, per-finger flags, palm-facing); `Face` tracks a face via MediaPipe's face landmarker and emits an `Expression` structure (place, eyes/mouth open, smiling, frowning, brows raised, each with a matching 0–1 amount, plus head turn/tilt in degrees); `Objects` recognizes 80 kinds of everyday things via MediaPipe's object detector and emits a list of `Thing` structures (name, confidence, place, width, height), sorted by confidence, filtered by its optional `category`, `confidence`, and `count` inputs. `Objects` names things in the project's language: the detector model's labels are English-only, so each locale carries its own table of display names and aliases (`input.Objects.categories`), and the `category` input is typed as a union of those localized literals. When more than one of these streams runs at once they share a single camera session rather than each opening their own.

`Time` and `Now` differ in what they model: `Time` emits elapsed milliseconds since evaluation began (good for animation), while `Now` emits wall-clock `Moment` structure values — a date and time of day in a chosen IANA time zone and Unicode calendar (good for clocks and calendars). `Now` takes an optional frequency (`#s`, `#min`, or `#h`, defaulting to `1s`) and optional `timezone` and `calendar` text inputs that configure the Moments it emits; like other streams, changing those inputs reconfigures the stream on reevaluation.

`Moment` itself is a shared immutable structure (not a stream) with optional properties for `year`, `month`, `day`, `hour`, `minute`, `second`, `millisecond`, `timezone`, and `calendar`, plus informational `era`, `week`, and `weekday` fields that `Now` fills in. Its `calendar` input is typed as a union of the supported Unicode calendar identifier text literals, so misspelled calendars are type errors. Time zone strings stay plain text, checked two ways: a _literal_ time zone that isn't one of the committed canonical IANA identifiers (`src/locale/timezones.json`, from the pinned CLDR release) produces an `UnknownTimeZone` conflict at edit time, with click-to-fix suggestions matched against zone ids and (localized) city names — so writing a city like `'tokyo'` offers `'Asia/Tokyo'`; _computed_ time zones are validated at runtime, producing an exception value when invalid. The conflict is produced by a per-definition evaluate analyzer (`registerEvaluateAnalyzer`), the same extensible mechanism `Phrase` uses to check font formats, not by `Evaluate` itself. A `Moment` converts to localized text with `→ ''` (see the date/time localization note in the Numbers section's output-localization discussion).

Some streams evaluate based on events from user activity:

```
Button()
Chat()
Choice()
Key()
Placement()
Pointer()
Speech()
```

Some are events from the physics engine:

```
Collision()
```

`Collision` emits a `Rebound` each time two things in the stage's physical world begin to touch, and then `ø` immediately after, since a collision is over as soon as it happens — a program counting collisions has to check that the value it has is a `Rebound` rather than reacting to every change, or it counts each touch twice. A `Rebound` carries the `subject` and `object` names that touched and the unit `direction` from the first to the second, normalized so that the name given as `Collision`'s own `subject` is always reported as the rebound's. An output is **in the physical world** if it has `Matter`, if a `Motion` places it, if it is a `Shape` directly on the `Stage`, or if some `Collision` names it — that last clause is what lets two named `Phrase` notice each other with no `Matter` at all. A name is what makes output _detectable_; `Matter` **together with a `Motion`** is what makes it _solid_. Only a body a `Motion` simulates is pushed by a contact — output the program places is kinematic, so it goes exactly where the program puts it and passes through whatever it touches, while still reporting the touch — and `Shape` barriers are always solid. `Matter`'s `text` and `ground` decide what an output can bump into at all, so turning one off hides that whole category from `Collision` rather than merely letting it pass through. Given two names, a `Collision` reports only those two touching; given one, it reports that one touching anything else in the physical world; given none, it reports every touch among things already there. Named `Shape` barriers appear in rebounds by name, so a program can react to a particular wall or exempt one from a catch-all. A barrier collides as the form it is drawn from rather than as the box around it: a `Circle` as a circle, a `Polygon` as its polygon, and a `Path` as the line it draws — so a path can be a hill or a valley that things come to rest inside, and one with fewer than two places bounds nothing at all. A `Phrase` and a `Group` collide as their bounding box. Only output placed directly on the `Stage` is simulated: a `Group` has its own coordinate system, so its contents are invisible to `Collision`, and the `Group` itself is what can be named and watched.

Output can also be a _source_ of gravity rather than only a subject of it. `Matter`'s `pull` is `0` by default, meaning the output attracts nothing; any other value makes it draw every simulated body toward it, with an acceleration proportional to its `mass` times its `pull` and falling off with the square of the distance. A negative `pull` pushes away instead, which is how a repelling magnet or a force field is written. Only output whose place comes from a `Motion` can be moved by a pull, since only a simulated body responds to a force at all — so an attractor with an ordinary `Place` sits still and pulls, which is what a sun or a magnet usually wants. Attraction reaches only within one depth: each distinct `z` is a separate simulation, so output on different layers never pulls on each other. Very near an attractor the falloff is capped rather than growing without bound, so a direct hit slings a body past instead of launching it off stage. As with `Collision`, only output placed directly on the `Stage` takes part: a `Group` has its own coordinate system, so an attractor inside one pulls on nothing.

`Stage`'s `air` scales how quickly moving output slows down. It is `1` by default, the air resistance every project has always had; `0` is outer space, where a body keeps whatever speed it has, which is what an orbit needs to survive more than a second or two. Values above `1` are thicker than air, and a negative `air` is read as `0`, since air that pushed a body faster the longer it travelled would have no meaning.

Some are events from playing output:

```
Beat()
```

`Beat` emits a `Downbeat` structure each time a playing `Music` reaches a beat. A `Downbeat` is a full snapshot of the player at that moment: the `name` of the music it came from, its `count` of beats, `tempo`, `volume`, `key`, `scale`, the `Instrument`s sounding, and a `words` list of the syllables being sung, and a `parts` list holding one `Part` per `Track` in order. A `Part` reports that track's `instrument`, whether it is `sounding` (a held note counts through the beats it sustains), the `degrees` covering the beat, their resolved `pitch` in semitones, `volume`, `pan`, the `words` being sung on it, and the track's own `scale`, `key`, and `loop` — all after defaults and overrides are applied, so it describes what is heard rather than what was written. Degrees need not be whole: a degree between two scale steps resolves to the pitch between their semitones, and sounds as both of those notes at once (the nearer one louder) unless the track's `mash` is `⊥`, which bends a single note off pitch instead. `count` begins at 0 when a music starts and starts over only when the music does (a `replay`, or leaving the stage and returning); an edit splices in without resetting it. Pausing does not reset it either: a music held by `pause`, or one on a stage that is paused or being stepped, emits no beats while it waits and resumes counting from where it stopped. Each `Music` counts independently, so an unfiltered `Beat` interleaves counts from several musics and `name` is what distinguishes them. It is driven by the music player's own scheduler rather than by the frame clock, so it only ticks while music plays, but its value is always a `Downbeat` and never `ø`: before the first beat it holds a silent one, with `count` 0, a `tempo` of 0, and empty `scale`, `instruments`, and `parts`. Since beats count from 0, `count` alone doesn't distinguish that from the first beat of a song; `tempo` does, because a playing `Music` is clamped to at least 1 beat per minute. Its optional `name` input names a single `Music` to hear; with `ø` it hears every music playing. Beats are emitted when they become audible rather than when they are scheduled, so visuals built on `Beat` stay in step with what is heard.

A `Track` whose `instrument` is `Instrument.voice` sings. That instrument is a formant synthesizer rather than a recording of a singer: a glottal source through a bank of four resonances whose frequencies are fixed at one neutral vocal tract and never move with pitch, which is anatomically impossible and is what keeps it hearable as an instrument rather than as a person, and as neither a man's voice nor a woman's at any note. What it sings comes from the track's optional `words`, a text of syllables separated by spaces, written in the International Phonetic Alphabet — a notation that says what to sound rather than how to spell, so it is neither tied to a language nor to an alphabet. Syllables are handed to the notes that sound, one each — the spaces are what divide them — and rests take none. A syllable ending in `-` is held across one further note for each `-`, which is how a melisma is written. When the syllables run out they begin again from the first, and a voice given no `words` at all holds a neutral vowel rather than falling silent, so it always sounds. `Downbeat` reports whatever is being sung as `words`, so a visualization can show a lyric as it is heard. Every vowel, consonant, and diacritic on the IPA chart is recognized, though what they sound like ranges from good (vowels, nasals, approximants, fricatives) through adequate (plosives, trills) to merely distinct (clicks, implosives, pharyngeals); a symbol that is not recognized is skipped rather than refused, and a track with no `words` sings a neutral vowel. Every other instrument ignores `words`.

And some are events from network activity

```
Webpage()
```

All of these essentially boil down to stream definitions define names, a sequence of binds defining initialization inputs to the stream, a value type, an expression that updates a stream upon each evaluation. The update expressions, defined internally, essentially update configuration details, allowing for stream behavior to change over time.

Streams are treated like any other values, except that they all have a starting value, and a sequence of later values. Referring to a stream value always evaluates to its latest value (unless time travel debugging, in which caes it evaluates to its value at the current time).

#### _evaluation_

When a built in stream definition is evaluated, the evaluator keeps track of which stream creation expressions have evaluated, and how many times they have evaluated in this evaluation of the program. If the particular expression has not been evaluated this number of times yet, a new stream is created and indicated by its expression and evaluation count. If it has been created in the past, then the existing stream is retrieved. Finally, the stream creation expression evaluates to the current value of the stream.

### Reaction

> REACTION → EXPRESSION `…` EXPRESSION？ （`…`）？ EXPRESSION？  
> CHANGED → `∆` EXPRESSION

Only the initial value and the first `…` are required. The second `…` may be omitted, in which case the
next expression follows the condition directly, and the condition and next expression may each be left
out entirely — each absence is a conflict rather than unreadable code, so a reaction still reads as a
reaction while it's being written.

It's possible to derive new streams from existing streams. For example, here we take `Time()` and convert it to stream of even and odd values:

```
time: Time()
'-' … ∆ time … time > 2000ms ? 'dingdingding' '-'
```

This can be read "start as a dash, and when time changes, if time is greater than 2 seconds, be 'dingdingding', otherwise stay a dash.

This uses a change expression, which evaluates to ⊤ when the stream referred to was the one of the streams that caused the current evaluation.

A binding that holds a stream can be annotated with the type of the values the stream produces, and it still counts as a stream for `∆` and [Previous](#previous). For example, `time•#ms: Time()` and `time: Time()` both work with `∆ time`.

To make a value's stream-ness _explicit_ — and, in particular, to carry it across a function boundary — annotate it with a **stream type** `•…T` (a stream of `T` values). A `•…T` value dereferences to its latest `T` value wherever a `T` is expected (so `clk•…#ms` can be compared, added, and so on just like a `#ms`), but it also satisfies `∆`, `←`, and reaction conditions, which a plain `#ms` value cannot. This is how a stream is passed into a function: declare the parameter `•…T`, and the caller may pass any stream of `T`.

```
ƒ smooth(signal•…#) (←← 8 signal).combined(0 ƒ(total•# v•#) total + v) ÷ 8
smooth(Volume())
```

Here `smooth` reads the recent history of whatever number stream it's given. A parameter typed with the plain value type (`signal•#`) would _not_ work — only a `•…T` parameter is recognized as a stream inside the function. Passing a non-stream value to a `•…T` parameter is a type error.

Reactions can be bound, and their names can be referred to in order to create recurrence relations. For example, here we increment a number every time a mouse button is clicked:

```
clicks: 1 … ∆ Button() clicks + 1
```

This looks like a circular definition of `clicks`, but it's not: the clicks in the reaction's next expression refers to the previous value in the reaction's value stream.

Reactions don't have to be named to refer to their previous values. We can use `⬚` ([This](#this)) to refer to the reaction's value, just like we use it to refer to a value in a conversion definition.

```
1 … ∆ Button() … ⬚ + 1
```

Reactions are the standard way to do event-driven programming declaratively and functionally: they're how programs respond to changes in input.

Reactions also have precedence, like conditionals.

#### _conflicts_

- The condition does not refer to a stream, and so will always or never be true
- There is no condition, so there is nothing to say when to change
- There is no next expression, so there is nothing to change to

#### _evaluation_

A reaction missing its condition or its next expression cannot react: it evaluates to its initial value
and creates no stream.

Otherwise, reactions are evaluated in the same way as built-in stream evaluations. When created, their initial value is created, the stream is initialized with the initial value, and then the value is evaluated to. When the reaction exists already, its conditional is evaluated. If true, its next expression is evaluated, added to the stream, and then evaluated to. If false, the the reaction evaluates to the reaction stream's current value.

### Initial

> INITIAL → `◆`

The initial predict is a single token that evaluates to `⊤` if the program is evaluating for the first time. This is helpful to only do something once in a program, and never again, such as during stream initialization. For example, in this program, time ticks continuously, but evaluates to `'first'` on the first tick, then `'next'` for all others.

```
Time()
◆ ? 'first' 'next'
```

#### _evaluation_

Immediately evaluates to true if the evaluation is the program's first.

### Previous

> PREVIOUS → `←` `←`？ EXPRESSION EXPRESSION

It's also sometimes helpful to get previous values in a stream, to build programs that have some window back into time. Previous expressions can get a previous value a particular number of evaluations ago, as here, where we get the previous time:

```
← 1 Time()
```

Or it can get a list of values looking back a particular number evaluations, as here, where we get the last 10 times:

```
←← 10 Time()
```

#### _evaluation_

Evaluates the stream value, and finds the stream that contains the value. If an previous, evaluates to the value at the index in the stream. If a range, evaluates to a list of values in the requested range.

## Programs

The combined set of all of the expressions above mean that most of Wordplay is expressions:

> PROGRAM → BORROW＊ （BIND ｜ EXPRESSION）＊  
> BORROW → `↓` name （`.` name）？ numeral？  
> EXPRESSION → REACTION ｜ CONDITIONAL ｜ MATCH ｜ OTHERWISE ｜ BINARYEVALUATE ｜ ATOMIC  
> ATOMIC → LITERAL ｜ REF ｜ `_` ｜ EVAL ｜ DEFINITION ｜ PROPERTYBIND ｜ CONVERT ｜ CHECK ｜ QUERY ｜ DOCUMENTED ｜ PREVIOUS ｜ INITIAL ｜ ISLOCALE ｜ LOCALIZED  
> LITERAL → NONE ｜ NUMBER ｜ BOOLEAN ｜ TEXT ｜ MARKUP ｜ LIST ｜ SET ｜ MAP ｜ TABLE  
> REF → REFERENCE ｜ PROPERTY  
> EVAL → EVALUATE ｜ UNARYEVALUATE ｜ BLOCK  
> DEFINITION → FUNCTION ｜ STRUCTURE ｜ CONVERSION  
> CHECK → CHANGED ｜ IS  
> QUERY → INSERT ｜ UPDATE ｜ SELECT ｜ DELETE  
> LOCALIZED → ATOMIC LANGUAGE

A `LOCALIZED` expression is an atomic expression immediately followed (no space) by a `LANGUAGE` tag, e.g. `(greeting + name)/en`. It applies the locale to the computed text value, overriding any locale the text would otherwise carry. The tag binds tightly to the atomic expression, so `a + b/en` tags only `b`; wrap a binary expression in parentheses to tag the whole. It is only valid on `Text` or formatted (`Markup`) values; applying it to any other type is a conflict. (Text and number literals consume their own trailing `/` tag and unit, so `LOCALIZED` applies only to computed expressions.)

If any sequences of tokens cannot be parsed according to this grammar, all of the tokens on the line are converted into an `UNPARSABLE` node.

#### _conflicts_

- There are no expressions to evaluate.

#### _evaluation_

Programs create an evaluation scope, evaluate their binds and expressions in reading order, and then evaluate to their non-bind expressions' values: that expression's value if there is one, or a list of them in reading order if there are several.

## Project files

A program is one source. A project is several, and `.wp` is the plain-text file that holds one — the format the examples in `static/examples/` are written in, read by `parseSerializedProject`:

> FILE → PREVIEW？ NAMES SOURCE＊  
> PREVIEW → grapheme `\n`  
> SOURCE → `===` `‹space›` NAMES？ `\n` PROGRAM

The optional first line is a **preview glyph**: exactly one grapheme (`🧶`, `📏`, `W`), shown as the project's thumbnail. A first line that isn't a single grapheme is read as the project's name instead.

The next line is the project's **name**, parsed with the same `NAMES` rule as any other name, so it may carry localized aliases: `"Pounce"/en"扑击"/zh-CN"撲擊"/zh-TW`. A bare name (`Between`) is equally valid.

Every following line beginning `===` followed by a space starts a new **source**, whose name is the rest of that line and whose program is everything up to the next such line. The `/lang` tags in those names determine the project's locales, defaulting to `en-US`. Sources refer to each other with `BORROW`, so `↓ words` in one source binds a name shared by a source named `words`. The space after `===` is required; without it the line is not a source boundary and is read as part of the preceding program.

There is no writer: `.wp` is a format the tooling reads, and a project's own persisted form is its database record.

## Documentation

> DOC → `¶` MARKUP `¶` LANGUAGE？  
> DOCS → DOC＊  
> DOCUMENTED → DOCS EXPRESSION

There are three places that comments can appear in code: just before programs, just before definitions of functions, structures, and conversions, and before expressions:

```
¶hi bind¶a: 1
¶hi function¶ ƒ hello() 'hi'
¶hi structure¶ •food(calories•#cal)
¶hi conversion¶ → #cal #kcal . · 0.001kcal/cal
¶hi expression¶1 + 1
```

Documentation is part of the grammar, not just discarded text in parsing. This allows for unambiguous association between text and documentation.

#### _evaluation_

Documented expressions simply evaluate to their expression's value.

## Types

> TYPE → `_` ｜ BOOLEANTYPE ｜ NUMBERTYPE ｜ TEXTTYPE ｜ NONETYPE ｜ LISTTYPE ｜ SETTYPE ｜ MAPTYPE ｜ TABLETYPE ｜ NAMETYPE ｜ FUNCTIONTYPE ｜ STREAMTYPE ｜ FORMATTEDTYPE ｜ CONVERSIONTYPE ｜ UNION  
> BOOLEANTYPE → `?`  
> NUMBERTYPE → （`#` （`!` ｜ UNIT）？） ｜ numeral  
> TEXTTYPE → （textopen textclose LANGUAGE？） ｜ TEXT  
> NONETYPE → `ø`  
> LISTTYPE → `[` TYPE＊ `]`  
> SETTYPE → `{` TYPE `}`  
> MAPTYPE → `{` TYPE `:` TYPE `}`  
> STREAMTYPE → `…` TYPE  
> CONVERSIONTYPE → TYPE `→` TYPE  
> NAMETYPE → name  
> FUNCTIONTYPE → `ƒ` TYPEVARIABLES？ `(` BIND＊ `)` TYPE  
> FORMATTEDTYPE → （`\…\` ｜ `\...\`） LANGUAGE？  
> UNION → TYPE `|` TYPE

The final part of the language is type declarations. These mostly mirror the syntax of the rest of the langauge, with the exception of numbers. Here are binds with type declarations demonstrating all of the above:

```
bool•?
num•#m
num•1
text•''
text•'hello'
none•ø
list•[]
list•[#]
pair•[# '']
set•{''}
map•{'':#}
stream•…#
conversion•#m→#mi
name•Kitty
function•ƒ(message•'')•#
union•#|''
```

A list type says how many types it has, and that means three different things:

- No type (`[]`) is a list of anything, of any length.
- One type (`[#]`) is a list of any length whose every item is that type.
- Several types (`[# '']`) is a list of exactly that many items, with a type for each position: `[# '']` is a list of two items, a number then some text.

When a list type says what's at each position, a list access with a constant index in range has the type of that position, so `pair[1]` is a `#` and `pair[2]` is a `''` for `pair•[# '']`. Any other index (out of range, negative, or not a constant) could be any item, because indices wrap around.

A list of values takes a type per position only where a type declares them — as the value of a bind, an input to an evaluation, the body of a function with a declared output type, or an item of another such list. So `[1 'hi']` on its own is a `[#|'']`, and `pair•[# '']: [1 'hi']` is a `[# '']`. That's why the order of a list is only checked where a declaration says what the order should be.

Types are also used in "is" expressions:

> IS → EXPRESSION `•` TYPE

For example, this expression checks whether `1` is a number, and it is, so it evaluates to `⊤`.

```
1•#
```

Type compatibility is defined as follows:

- Boolean types are only compatible with other boolean types
- Number types are compatible if they are a concrete number and the other number type is the same concrete number, or they have equivalent units
- Text types are compatible if they are concrete text and the other text type is the same text and language, or they are both generic text with the same language
- List types are only compatible if their element types are compatible. A list type with no element type accepts any list. A list type with a type per position additionally requires a matching length, and accepts another such type only if every position accepts the corresponding one. When only one of the two types says what's at each position, only their element types are compared, since the order of the other list can't be known until it's evaluated — an `is` expression checks the items of the value itself, so `['hi' 1]•[# '']` is `⊥`.
- Set types are only compatible if their element types are compatible
- Map types are only compatible if their key types are compatible and their value types are compatible
- Stream types are only compatible if their element types are compatible; a stream type additionally accepts its element type (a stream dereferences to its latest value), and accepts a value whose type is known to come from a stream (which is how stream-ness passes into a function through a `•…T` parameter)
- Conversions are only compatible if their respective input and output types are compatible
- Name types are only compatible if they resolve to the same structure definition
- Function types are only compatible if they have the compatible corresponding inputs and compatible output types
- Union types are only compatible if all of the possible types given are compatible with at least one of the union's types

Any violation of the rules above is a type error.

## Evaluation

While we've generally alluded to how Wordplay programs evaluate through examples, and provided detailed rules for how each kind of expression is evaluated in sections above, here we provide a step by step explanation of how programs are evaluated in response to input and in exceptional circumstancs.

- Each type of expression defines its own evaluation order, as we specified in the sections above.
- A program is evaluated first by:
    - Evaluating any borrowed source and binding the borrowed names, blocking until borrowed source is evaluated using this same procedure, and the borrowed names are imported into the program's scope.
    - Evaluating the Program node
    - Returning the resulting value to the environment for display
- Each function creates a new name scope. Closures are supported: scopes are linked to function and structure definitions.
- Each `Block` defines a new name scope within a function, creating a stack of scopes.
- When a stream value changes values due to an external event
    - If the stream is temporal, it is pooled with other temporal changes, allowing the program to reevaluate once per frame. The frame frequency is determined by the system evaluating the program, but on the web, is run by the [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame) callback, which is usually linked to 60hz operating system display refresh rates.
    - Otherwise, the program is evaluated immediately.
- Evaluation can halt with an exception value for any of these reasons:
    - The program had no expressions
    - A value is expected by an expression but not given
    - A value of a particular type is expected, but an incompatible type was given
    - A placeholder expression is evaluated
    - A requested conversion between types couldn't be found
    - A function couldn't be found
    - A name couldn't be resolved
    - An unparsable sequence of tokens was found
    - The evaluator evaluated too many steps within a single function
    - The evaluator evaluated too many functions (stack overflow)

## What a program shows

A program evaluates to one value, or to a list of them when it has more than one non-`Bind` result expression. That value becomes what is shown:

- A `Stage` is shown as itself.
- Any other single output — a `Phrase`, `Group`, `Shape`, `Say`, or `Music` — is placed on a default `Stage`.
- A **list** is placed on one `Stage`, in source order, each element a direct child of it. If the list contains a `Stage`, that one is the stage — it names the background, frame, camera, and gravity, which nothing else in the list can — and everything else in the list joins its content. Values that aren't output at all are dropped.

A `Shape` is drawn from a **form**: a `Rectangle`, a `Circle`, a regular `Polygon`, or a `Path` drawn through a list of `Place`. A path is the only form that need not enclose an area, and that difference decides how it is both drawn and collided with. Its `closed` joins its last place back to its first; its `smooth` curves through the places it was given without moving any of them, so smoothing is a way of drawing the same list rather than a different kind of point; and its `thickness` is how wide it is drawn, since an open path has no interior to fill. A path lies flat, at its own `z` rather than at any of its places'. Two flags on `Shape` itself say whether a form is painted at all: `filled` paints its interior, which an open path never has whatever the flag says, and `stroked` paints its outline. Both default to true; with neither, a shape draws nothing and is still a barrier, which is how a program makes a wall or a floor that is not seen. A `Shape` may also be given `glyphs`, text drawn along its form's outline and repeated until it fills — around a `Circle` or a `Polygon` as readily as along a `Path`, since every form has an outline. Text past the end of the outline is not drawn.

A `Phrase` may carry a **speech bubble**, so a line of dialog belongs to whoever says it rather than being a second phrase placed near them. Its `bubble` takes text or markup, a `Say`, or a `Bubble` naming all of it. A bubble is a decoration rather than layout: like an `Aura` it is absent from the phrase's measured box, so an arrangement makes no room for one and the automatic camera does not widen to keep one in view — a bubble near the edge of the stage is clipped by it. It is drawn beside the phrase on the `side` it names (`'↑'`, `'↓'`, `'←'`, `'→'`, defaulting to up), with a tail pointing back at the speaker. Its `kind` is either said (`'💬'`) or thought (`'💭'`), which draws the tail as a point or as a trail of circles. Its `color` defaults to the phrase's own, its `size` to the size text ordinarily is on the stage rather than the speaker's — a character is often several metres tall, and dialog set at that size is a wall rather than a line — and its words change with the phrase's own `changing` effect, so one setting paces both the character and what it says. Given a `Say`, a bubble is spoken aloud as well as shown, and it then stands in for the caption a bare `Say` puts at the foot of the stage, since the words are already on screen attached to whoever said them.

Every child of the stage is placed where its own `place` says, and a child with no `place` is centred. Several placeless outputs therefore land on top of one another, which is what `place` is for. Nothing is grouped implicitly: a `Group` appears only where a program writes one, so a program's output is never given an arrangement it did not ask for, is never shifted by one, and every top-level output takes part in the stage's physical world (see Collision above, which excludes only what is inside a `Group`).

## Stage camera

A `Stage`'s optional `place` (`📍|ø`, defaulting to `ø`) is a camera rather than a position: it says where the stage is viewed from, and its `z` is the zoom, since output is scaled by its distance in front of the focus. Its `x` is negated relative to output places, so a camera moving right slides the world left.

Three things decide what is finally seen, and they compose rather than override one another:

- **The program.** When `place` is set, it is the camera. A camera whose `place` changes over time eases toward each new value over the stage's `duration`, so it pans rather than snaps. A `z` at or beyond `0` would put the camera in the output's own plane, where nothing draws and the scene inverts, so keep it comfortably negative.
- **The platform.** When `place` is `ø`, the stage is framed automatically so its content fits the view. The frame expands immediately to cover content and tightens back in only after content has stayed well inside it, so a stage whose content moves settles into a still frame instead of following the motion. A program-set camera is additionally pulled back on viewports smaller than it was authored for, so a narrow screen still shows what the creator framed; it is never pulled closer, so larger screens see exactly what was written.
- **The audience.** Panning and zooming (scroll, pinch, two-finger drag, the zoom controls) apply as an offset on top of whichever of the two above is in play. Because it is an offset and not a replacement, a viewer may zoom out of a project that moves its own camera without freezing it. Zooming out is unbounded; zooming in stops before the camera would reach the output plane.

A stage's `overlay` is exempt from all of this: it is pinned flat to the screen and is unaffected by the camera.
