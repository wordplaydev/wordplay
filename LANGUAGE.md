# Wordplay

_Amy J. Ko_

Hello! You must be here looking for the Wordplay programming language's specification. That means you're probably a programmer or computer scientist, or you prefer to read a more formal explanation of the programming language instead of going through the tutorial to learn. Welcome! We'll try to make this somewhat painless.

This guide will be a complete overview of Wordplay's syntax and semantics. e'll eschew formal semantics for now, unless someone wants to contribute them. That does mean that We've yet to prove the program's semantics sound. (Perhaps that's a contribution you'd like to make to?). And in general, consider this a work in progress, so if you find sections missing, it means are still working on them.

## History

Wordplay started as Amy Ko's sabbatical project in 2022. Her primary goals were to spend the year away from teaching and service creating art, and she wanted that art to be a programmable medium interactive typography, but also a context for adolescents to learn about computing, particularly those who are not fluent in English and/or are disabled. This led to a language design that is free of English keywords, a functional design that simplifies debugging and comprehension, several other language features that integrate localiziation and rich description. You might be interested in reading the [design specification](docs.google.com/document/d/1pTAuU0qyfp09SifNUaZ_tbQXbSgunSLfZLBRkeWf_Fo) she wrote for herself prior to the 16 months she spent building it; the design roughly follows the ideas and vision laid out in that document.

## Formatting

Throughout this guide, we'll use a few formatting conventions:

-   Content in quote blocks are language grammar specifications, and will be formatted with an upper-case non-terminal name, followed by a `→`, and then an expression composed of:
    -   Non-terminal names,
    -   `|` for options,
    -   `()` for groups,
    -   `?` for optional,
    -   `*` for zero or more repetitions,
    -   `+` for one or more repetitions,
    -   `//` for POSIX regular expresssions, formatted as code
    -   Any text in code format is a literal text string
    -   Any text in italics is a comment
-   We'll use the same syntax for the lexical grammar. All lexical non-terminals are in lower case.
-   Code examples are presented in code blocks. All examples are syntactically valid programs, but may not all be conflict free.

## Overview

Wordplay's design is inspired by aspects of Smalltalk, Lisp, APL, TypeScript, and Elm. Here are a few key concepts about Wordplay's language design:

-   It's **purely functional**, which means there are no side effects and no mutable values. All expressions and all functions evaluate to values that are purely computation on inputs.
-   It's **reactive** in that some values are _streams_ of values that change to external events, which cause data dependent expressions to reevaluate with the stream's new values. This is what allows for interactivity.
-   It's **strongly typed** with optional static typing and type inference, but it's type system is relatively basic, with support for unions and some constant type assertions, but not much more.
-   It's **single-threaded**, in that a program starts and finishes evaluating, and all changes to stream values cause serial reevaluation, though stream value changes can pool causing a single reevaluation.
-   It's **lexically scoped**, of course. I'm not an anarchist.
-   It's **object oriented** in that all values are like objects that contain functions and conversions, and when creator-defined, can also contain named values.
-   It's **localized**. This means that bindings and text values can have an arbitrary number of language-tagged aliases. Text values are selected based on selected locales in the environment.

These will all be clearer with examples, so let's start with the basics.

## Lexical design

Wordplay's lexical grammar contains no keywords, in order to avoid privileging any particular natural language. Instead, it uses a set of single glyph Unicode symbols, each associated with a particular kind of value or expression (and sometimes two, since we support a markup notation within comments and markup values).

Some tokens are associated with basic values:

> none → `ø`
> true → `⊤`
> false → `⊥`

Numbers can be:

> arabic → `/-?[0-9]+([.,][0-9]+)?%?/`
> arabicbase → `/-?([2-9]|1[0-6]);[0-9A-F]+([.,][0-9A-F]+)?%?/`
> roman → `/(ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫⅬⅭⅮⅯ)+/`
> japanese → `/-?[0-9]*[一二三四五六七八九十百千万]+(・[一二三四五六七八九分厘毛糸忽]+)?/`
> pi → `π`
> infinity → `∞`
> number → arabic | arabicbase | roman | japanese | pi | infinity

We hope to add other numerals as we localize other languages.

Text literals can be opened and closed with numerous delimiters:

> textopen → `"` | `“` | `„` | `'` | `‘` | `‹` | `«` | `「` | `『`
> textclose → `"` | `„` | `'` | `”` | `„` | `’` | `›` | `»`,, `」`, `』`
> markup → `\`
> text → _any sequence of characters between open/close delimiters_

Wordplay has a secondary notation for markup, entered with `\`\``, in which these tokens are valid:

> linkopen → `<`
> linkclose → `>`
> italics → language
> code → `\`
> light → `~`
> underscore → `_`
> bold → `*`
> extrabold → `^`
> link → `@`
> concept → `/@(?!(https?)?://)[a-zA-Z/]*`
> words → _any sequence of characters between `markup` that aren't markup delimeters above_

Compound data structures have several delimiters:

> listopen → `[`
> listclose → `]`
> setmapopen → `{`
> setmapclose → `}`
> tableopen → `⎡`
> tableclose → `⎦`
> select → `⎡?`
> insert → `⎡+`
> delete → `⎡-`
> update → `⎡:`

Some are associated with reactive values:

> reaction → `…` | `...`
> initial → `◆`
> change → `∆`
> previous → `←`

The language uses a placeholder token extensively to allow for unifinished syntactially valid code.

> placeholder → `_`

Some tokens are associated with names:

> nameseparator → `,`
> bind → `:`

Some are associated with localization:

> language-italic → `/`
> region → `-`
> locale → ``🌎` | `🌍` | `🌏`

Some are associated with declarations:

> function → `ƒ`
> type → `•`

Some are associated with particular types of expressions:

> evalopen → `(`
> evalclose → `)`
> condition → `?` | `¿`
> conversion → `→` | `->` | `=>`
> access → `.`

Some are operators, including arithetmic, inequalities, logical, and unicode math, supplemental, and arrows:

> operator → `+` | `-` | `×` | `·` | `÷` | `%` | `^` | `<` | `≤` | `=` | `≠` | `≥` | `>` | `~` | `&` | `|` | `/[\u2200-\u22FF\u2A00-\u2AFF\u2190-\u21FF\u27F0-\u27FF\u2900-\\u297F]/`

Some are associated with type declarations:

> numbertype → `#`
> booleantype → condition
> or → `|`
> markuptype → `\…\`, `\...\`
> literaltype → `!`
> typevariableopen → `⸨`
> typevariableclose → `⸩`

Some are associated with importing and exporting values from source:

> borrow → `↓`
> share → `↑`

Every other possible sequence of Unicode glyphs is interpreted as a `name`, separated by space or one of the tokens above.

Three kinds of space are meaningful during tokenization: space ` ` (U+0020), `\t` (U+0009), and the line feed character `\n` (U+000A). Spaces segment names, and are preserved and associated as preceding space for each tokens. This preceding space is used during parsing in limited ways to distinguish the role of names. All other forms of Unicode spaces (e.g., zero width spaces, non-breaking spaces, etc.) are interpreted as part of names. (Probably a questionable design choice, and maybe one we'll return to.).

## Basic Values

Okay! Now that we've got tokens out of the way, let's talk about values. Conceptually, all values are immutable, and each contain some number of built in functions from which to derive other values. All values contain some number of built in conversion functions as well, accessed with `→`.

### None

> NONE → none

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

### Booleans

> BOOLEAN_LITERAL → true | false

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

### Numbers

> NUMBER → number UNIT?
> UNIT → DIMENSION (·DIMENSION)_ (/ DIMENSION (·DIMENSION_))?
> DIMENSION → name (^arabic)?

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

### Text

> TEXT → TRANSLATION\*
> TRANSLATION → textopen text textclose LANGUAGE
> LANGUAGE → language name

Text values, unlike in other programming languages, are not a single sequence of Unicode code points. Rather, they are unique in two ways:

-   They are interpreted as a sequence of graphemes, using a grapheme segmentation algorithm. That means that emojis comprised of multiple Unicode code points are treated as a single symbol when indexing text.
-   They can be language tagged, indicating what language and optional region they are written in
-   They can have multiple translations, allowing for one to be selected at runtime using the environment's list of preferred locales.

For example, these are all valid text values:

```
'hi'
'hi'/en
'hi'/en-US
'hi'/en-US'hola'/es-MX
'hi'/en-US'hola'/es-MX『こんにちは』/ja
```

If `en-US` were the preferred locale, they would all evaluate to `'hi'`. But in the latter case, if Spanish or Japanese were selected, they would evaluate to `'hola'` or `『こんにちは』`'

Two text values with different text delimiters are considered equivalent:

```
'hi' = 『hi』
```

Two text values with different language declarations, however, are not equivalent, even if they have the same graphemes:

```
'hi'/en = 『hi』/ja
```

It's possible to check whether an environment has a particular locale selected with the locale predicate:

```
🌎/en
```

This will return `⊤` if the locale is in the preferred list, and, `⊥` otherwise.

### Markup

> MARKUP → FORMATTED\*
> FORMATTED → markup CONTENT markup LANGUAGE
> CONTENT → PARAGRAPH*
> PARAGRAPH → SEGMENT*
> SEGMENT → words | LINK | concept | CODE | MENTION
> LINK → linkopen words link words linkclose
> CODE → code PROGRAM code

The final basic value is markup, which behaves identically to text values aside from their delimiters, and the meaning of the delimiters internal to text:

```
`<wordplay@https://wordlay.dev>`
`_hello_ /world/^!^`
`my code \1 + 1 = 2\`
```

These three values are 1) a link, 2) a hello world with underscores, italics, and extra bold, and 3) a sentence with an embedded code example.

## Compound Values

Okay, those were the basic values. Now let's talk about the four built-in compound values (and how to get values out of them).

### List

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

The only index that doesn't result in one of the list's values is 0; that evaluates to `ø`. (For convenience, however, this possibility isn't included in a list access's type, as it would require pervasive, and mostly unhelpful checking for `ø`).

### Set

### Set/Map Access

### Map

### Table

### Select

### Update

### Insert

### Delete

## Evaluations

### Unary Operator

### Binary Operators

### Evaluate

### Conditional

### Convert

## Named Values

### Bind

### Reference

### Block

### Definitions

There are two kinds of definitions that allow creators to define their own functions and data types: functions and structures.

### Functions

### Structures

### Property Bind

### Property Reference

### Conversions

## Reactions

### Initial

### Previous

### Reaction

### This

## Documentation

### Placeholder

### Documented

## Types

Boolean, Formatted, Text, Function, List, Map, Number, Name, None, Set, Stream, Table, Text, Placeholder, Union

### Is

## Evaluation
