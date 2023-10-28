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
> locale → `🌎` | `🌍` | `🌏`

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

None is only equal to itself.

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

⊤ is only equal to itself; ⊥ is only equal to itself.

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

Numbers are only equal to other numbers that have identical decimal values and equivalent units. Units are only equivalent when the set of dimensions specified on each unit are equivalent and the power of each dimension specified is equivalent.

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

It's possible to check whether an environment has a particular locale selected with the locale predicate:

```
🌎/en
```

This will return `⊤` if the locale is in the preferred list, and, `⊥` otherwise.

Text is equal to other text with an identical sequence of graphemes and equivalent locale.

Two text values with different text delimiters are considered equivalent:

```
'hi' = 『hi』
```

Two text values with different language declarations, however, are not equivalent, even if they have the same graphemes:

```
'hi'/en = 『hi』/ja
```

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

Markup values follow the same equality rules as text: but also must have the exact same markup structure.

## Compound Values

Now let's talk about the four built-in compound values (and how to get values out of them).

### List

> LIST → listopen (EXPRESSION | SPREAD)\* listclose  
> SPREAD → : EXPRESSION

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

The only index that doesn't result in one of the list's values is 0; that evaluates to `ø`. For convenience, however, this possibility isn't included in a list access's type, as it would require pervasive, and mostly unhelpful checking for `ø`. This does let type errors slip through as runtime errors, but was chosen to avoid imposing type gymnastics on learners.

Lists have a wide range of higher order functions. For example, `translate` can map a list's values to different values, and `combine` can reduce a list of values into some value:

```
[1 2 3 4 5 6 7 8].translate(ƒ(num) 2.power(num))
[1 2 3 4 5 6 7 8].combine(1 ƒ(num sum) num + sum)
```

List are equalivent to other lists when they have the same number of values and each pair of corresponding values in the sequence are equal.

Because all values in Wordplay are immutable, all of these operations produce new lists.

### Set

> SET → setopen EXPRESSION\* setclose  
> SETCHECK → EXPRESSION{EXPRESSION}

Sets are non-ordered collections of unique values, where unique is defined by value equality. Here's are some examples of sets:

```
{}
{'hi'}
{1 ø ['pony' 'horse' 'dog]}
```

Sets are equal when they have the same size and equivalent values.

Because sets do not have duplicates, these two sets are equivalent.

```
{1 2 3 4}
{1 1 2 2 3 3 4 4}
```

Set membership can be checked by following a set with a value as a key. For example, this evaluates to ⊥.

```
{1 2 3}{4}
```

### Map

> MAP → setopen (bind | KEYVALUE\*) setopen  
> KEYVALUE → EXPRESSION bind VALUE

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

Maps are equivalent when they are the same size, and every key/value pair that occurs in one has a corresponding equivalent key value pair in the other.

### Table

> TABLE → TABLETYPE ROWS*  
> TABLETYPE → tableopen BIND* tableclose  
> ROW → tableopen (BIND|EXPRESSION)\* tableclose  
> SELECT → EXPRESSION select ROW EXPRESSION  
> INSERT → EXPRESSION insert ROW  
> UPDATE → EXPRESSION update ROW EXPRESSION  
> DELETE → EXPRESSION delete EXPRESSION

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

Tables are equivalent when they have the same number of rows, and each row in one table corresponds to an equivalent row in the other table. Rows are equivalent if all of their column values are equvalient.

Tables can be converted to lists of data structures, where each row name is a property. (More on structures later).

## Evaluations

There three different syntaxes for evaluating functions on values.

### Evaluate

> EVALUTE → EXPRESSION evalopen EXPRESSION evalclose

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

### Binary Evaluate

> BINARYEVALUATE → EXPRESSION operator EXPRESSION

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

Because binary evaluations are just syntactic sugar on regular evaluation, it's important to note that the left side of a binary evaluate is always the value on which the operator name is searched for a function definition.

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
1-+2
```

This tiny bit of space-sensitive parsing aligns with mathematical syntax, but also imposes some consistency in formatting.

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
