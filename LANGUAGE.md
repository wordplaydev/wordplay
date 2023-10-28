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

> CONDITIONAL → EXPRESSION ? EXPRESSION EXPRESSION

Conditions are a special kind of evaluation that evaluates to one of two expressions depending on a Boolean condition's value. This is much like an `if` statement in other languages, but functional, and like the tertiary conditional operators found in many imperative languages.

```
1 > 0 ? 'math works!' 'math broke'
```

Conditionals have operator precedence over all other expressions. Unlike all other evaluations, only one of the two expressions is evaluated at runtime, depending on the value of the condition. It's best to think of it like a special function on Boolean values.

Note that there's no separator between the true anf false cases in this synatax (e.g., `:` in JavaScript, for example). This was partly to reduce overloading of other symbols, but also to encourage use of new lines to convey structure.

### Convert

> CONVERT → EXPRESSION convert TYPE  
> CONVERSION → DOCS convert TYPE TYPE EXPRESSION

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

The same works for numbers with units, as numerous conversion functions are defined for numbers with different units:

```
1km → #m
```

Conversions can be extended with conversion definitions. Thi defines a global conversion from kitty counts to cat counts, where the `.` refers to the input value:

```
→ #kitty #cat . ÷ 2
```

## Names

There are numerous ways that names are used in Wordplay, some of which have already been mentioned (function names, unit names, column names).

### Bind

> BIND → DOCS? share? NAMES reaction? (•TYPE)? (:EXPRESSION)?  
> NAMES → NAME(alias NAME)\*
> NAME → (name | operator | placeholder) LANUGAGE?
> REFERENCE → name | operator

Bindings are used throughout the language to declare names for things like values, table colums, function inputs, and more. They all use the same syntax, and can have a things like documentation, language tags, aliases, type declarations, and optional values. These are all syntatically valid bindings:

```
sum
sum: 1
sum•#: 1
sum/en
sum/en-US
sum/en-US,suma/es
sum/en-US,suma/es-MX
``Sum of values``/en sum/en-US,suma/es-MX
``Sum of values``/en sum/en-US,suma/es-MX: 1
```

All of those examples define a name `sum`; some of them specify its type, some provide a value, some provide documentation, some have multiple language tagged aliases to enable localization of the program. Context determines whether these are semantically valid; for example, table columns require binds to specify a type; bindings in blocks (described below) have to have values.

Scoping of names is static and lexical, and duplicates and shadowing are not allowed.

Referring to beindings is a simple matter of using one of their names. Here we define sum to `1`, then refer to it, and get back `1`:

```
sum: 1
sum
```

Bindings declare all provided names in scope, so they can be referred to by any of their aliases, without using a matching language tag.

### Block

> BLOCK → DOCS? evalopen (BIND|EXPRESSION)+ evalclose

Blocks are a sequence of zero or more bindings, followed by an expression, and evaluate to the expression's value. They serve two purposes: to help define evaluation order for infix expressions as we saw earlier, and to help break up complex computation into named substeps, as in this example:

```
base: 2
1 + (
        score: base + 5
        weight: 18
        score · weight
    )
```

Blocks that have intermediate non-bind expressions ignore the values of those expressions and generate a conflict.

Programs are also blocks, but with required open and close parentheses.

### Functions

> FUNCTION → DOCS? share? function NAMES TYPEVARIABLES? evalopen BIND* evalclose (type TYPE)? EXPRESSION  
> TYPEVARIABLES → typevariableopen NAME* typevariableclose

Function definitions, like binds, can have zero or more names, optional documentation, and take a series of binds specifying their inputs, and an expression defining its outputs. Binds can optionally specify types, default values, and an optional evaluation type can be provided as well. If they're not, types are inferred, if possible. Functions are values, like everything else.

Here are some example function definitions:

```
ƒ () 'secret'
ƒ sum(a•# b•#) a + b
ƒ sum(a•#:0 b•#:0) a + b
ƒ sum(a•#:0 b•#:0)•# a + b
``Add some numbers`` ƒ sum(a•# b•#) a + b
ƒ kind(num•#) (
    odd: (num % 2) = 1
    odd ? 'odd' 'even'
)
ƒ accumulate(numbers…•#) numbers.combine(1 ƒ(sum num) sum + num)
```

### Structures

> STRUCTURE → DOCS? share? type NAMES NAME+ TYPEVARIABLES? evalopen BIND\* evalclose BLOCK
> PROPERTY → EXPRESSION access NAME
> PROPERTYBIND → EXPRESSION

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

## Streams

As noted earlier, Wordplay has special values that are streams of values that change over time.

### Built-In

These are created by evaluating their pre-defined stream definitions. Some streams tick continuously based on time:

```
Volume()
Pitch()
Camera()
Motion()
Time()
```

Some streams evaluate based on events from user activity:

```
Button()
Chat()
Choice()
Key()
Placement()
Pointer()
```

Some are events from the physics engine:

```
Collision()
```

And some are events from network activity

```
Webpage()
```

All of these essentially boil down to stream definitions define names, a sequence of binds defining initialization inputs to the stream, a value type, an expression that updates a stream upon each evaluation. The update expressions, defined internally, essentially update configuration details, allowing for stream behavior to change over time.

Streams are treated like any other values, except that they all have a starting value, and a sequence of later values. Referring to a stream value always evaluates to its latest value (unless time travel debugging, in which caes it evaluates to its value at the current time).

### Reaction

> REACTION → EXPRESSION reaction condition reaction EXPRESSION
> CHANGE → change EXPRESSION

It's possible to derive new streams from existing streams. For example, here we take `Time()` and convert it to stream of even and odd values:

```
time: Time()
'-' … ∆ time … time > 2000ms ? 'dingdingding' '-'
```

This can be read "start as a dash, and when time changes, if time is greater than 2 seconds, be 'dingdingding', otherwise stay a dash.

This uses a change expression, which evaluates to ⊤ when the stream referred to was the one of the streams that caused the current evaluation.

Reactions can be bound, and their names can be referred to in order to create recurrence relations. For example, here we increment a number every time a mouse button is clicked:

```
clicks: 1 … ∆ Button() clicks + 1
```

This looks like a circular definition of `clicks`, but it's not: the clicks in the reaction's next expression refers to the previous value in the reaction's value stream.

Reactions don't have to be named to refer to their previous values. We can use `.` to refer to the reaction's value, just like we use it to refer to a value in a conversion definition.

```
1 … ∆ Button() … . + 1
```

Reactions are the standard way to do event-driven programming declaratively and functionally: they're how programs respond to changes in input.

### Initial

> INITIAL → initial

The initial predict is a single token that evaluates to `⊤` if the program is evaluating for the first time. This is helpful to only do something once in a program, and never again, such as during stream initialization. For example, in this program, time ticks continuously, but evaluates to `'first'` on the first tick, then `'next'` for all others.

```
Time()
◆ ? 'first' 'next'
```

### Previous

> PREVIOUS → previous previous? number EXPRESSION

It's also sometimes helpful to get previous values in a stream, to build programs that have some window back into time. Previous expressions can get a previous value a particular number of evaluations ago, as here, where we get the previous time:

```
← 1 Time()
```

Or it can get a list of values looking back a particular number evaluations, as here, where we get the last 10 times:

```
←← 10 Time()
```

### This

## Documentation

### Placeholder

### Documented

## Types

Boolean, Formatted, Text, Function, List, Map, Number, Name, None, Set, Stream, Table, Text, Placeholder, Union

### Is

## Evaluation
