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

Wordplay's lexical grammar contains no keywords, in order to avoid privileging any particular natural language. Instead, it uses a set of single character Unicode symbols, each associated with a particular kind of value or expression (and sometimes two, since we support a markup notation within comments and markup values).

Some tokens are associated with basic values:

> none → `ø`  
> true → `⊤`  
> false → `⊥`

Numbers can be:

> arabic → `/-?[0-9]+([.,][0-9]+)?%?/`  
> arabicbase → `/-?([2-9]|1[0-6]);[0-9A-F]+([.,][0-9A-F]+)?%?/`  
> roman → `/(Ⅰ|Ⅱ|Ⅲ|Ⅳ|Ⅴ|Ⅵ|Ⅶ|Ⅷ|Ⅸ|Ⅹ|Ⅺ|Ⅻ|Ⅼ|Ⅽ|Ⅾ|Ⅿ)+/`  
> japanese → `/-?[0-9]*[一二三四五六七八九十百千万]+(・[一二三四五六七八九分厘毛糸忽]+)?/`  
> pi → `π`  
> infinity → `∞`  
> numeral → arabic | arabicbase | roman | japanese | pi | infinity

We hope to add other numerals as we localize other languages.

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
> mention → `$`  
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
> access → `.`

Some are operators, including arithetmic, inequalities, logical, and unicode math, supplemental, and arrows:

> operator → `+` | `-` | `×` | `·` | `÷` | `%` | `^` | `<` | `≤` | `=` | `≠` | `≥` | `>` | `~` | `&` | `|` | `/[\u2200-\u22FF\u2A00-\u2AFF\u2190-\u21FF\u27F0-\u27FF\u2900-\\u297F]/`

Some are associated with type declarations:

> numbertype → `#`  
> or → `|`  
> markuptype → `\…\`, `\...\`  
> literaltype → `!`  
> typevariableopen → `⸨`  
> typevariableclose → `⸩`

Some are associated with importing and exporting values from source:

> borrow → `↓`  
> share → `↑`

Every other possible sequence of Unicode characters is interpreted as a `name`, separated by space or one of the tokens above.

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

#### _evaluation_

Number literals evaluate to a number value that stores an immutable [decimal.js](https://mikemcl.github.io/decimal.js/) value and immutable unit.

#### _equality_

Numbers are only equal to other numbers that have identical decimal values and equivalent units. Units are only equivalent when the set of dimensions specified on each unit are equivalent and the power of each dimension specified is equivalent.

### Text

> TEXT → TRANSLATION＊  
> TRANSLATION → textopen text textclose LOCALE  
> LOCALE → LANGUAGE （`-` REGION）？  
> LANGUAGE → _any valid ISO 639 language code_  
> REGION → _any valid ISO 3166 country code_

Text values, unlike in other programming languages, are not a single sequence of Unicode code points. Rather, they are unique in a few ways:

- They are interpreted as a sequence of graphemes, using a grapheme segmentation algorithm. That means that emojis comprised of multiple Unicode code points are treated as a single symbol when indexing text.
- They can be language tagged, indicating what language and optional region they are written in
- They can have multiple translations, allowing for one to be selected at runtime using the environment's list of preferred locales.
- Language tags are a language

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

> MARKUP → FORMATTED＊  
> FORMATTED → `` ` `` CONTENT `` ` `` LANGUAGE  
> CONTENT → PARAGRAPH＊  
> PARAGRAPH → SEGMENT＊  
> SEGMENT → words ｜ LINK ｜ concept ｜ CODE ｜ MENTION  
> LINK → `<` words `@` words `>`  
> CODE → `\` PROGRAM `\`

The final basic value is markup, which behaves identically to text values aside from their delimiters, and the meaning of the delimiters internal to text:

```
`<wordplay@https://wordlay.dev>`
`_hello_ /world/^!^`
`my code \1 + 1 = 2\`
```

These three values are 1) a link, 2) a hello world with underscores, italics, and extra bold, and 3) a sentence with an embedded code example.

#### _evaluation_

Formatted literals first get the environment's list of preferred locales and then select the first translation in the list of translations that match the exact language and region, and if there isn't one, then the first translation that matches the language, and if there isn't one, then the first translation.

#### _equality_

Markup values follow the same equality rules as text: but also must have the exact same markup structure.

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

The only index that doesn't result in one of the list's values is 0; that evaluates to `ø`. For convenience, however, this possibility isn't included in a list access's type, as it would require pervasive, and mostly unhelpful checking for `ø`. This does let type errors slip through as runtime errors, but was chosen to avoid imposing type gymnastics on learners.

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

### _conflicts_

- The function expression given is not a function type
- The function type resolved does not match the inputs given (missing required values, extra values, values of the wrong type)
- The function expression could resolve to many different functions that take different inputs

#### _evaluation_

Evaluation expressions first evaluate their function value, and if one was not found, then generate a value exception, halting the program. Next, they evaluate their inputs, in reading order. If required inputs were not provided, a value exception is generated and the program halts. If an input is not of the required type, then a type exception is generated and the program halts. Otherwise, a new evaluation is added to the evaluator's evaluation stack, the inputs are bound to all of the names given in the function's binds, and the function's expression is evaluated in the context of the new evaluation scope. After the function's expression is done evaluating, then the evaluation finishes evaluating, evaluating to the value of the evaluated function.

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

### _conflicts_

- The condition is not boolean typed

#### _evaluation_

Conditions first evaluate their condition. If the condition does not evaluate to a boolean value, a type exception is generated, and the program halts. If the condition was true, it evaluates the true expression, otherwise it evaluates the false expression. The conditional then evaluates to the result.

### Otherwise

> OTHERWISE → EXPRESSION `??` EXPRESSION

The otherwise (`??`) operator is a none-coalescing shorthand: it evaluates to its left expression unless that expression is `ø`, in which case it evaluates to its right expression. It's useful when working with values that might be `ø`, such as list accesses out of range or map lookups for missing keys:

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

The same works for numbers with units, as numerous conversion functions are defined for numbers with different units:

```
1km → #m
```

Conversions can be extended with conversion definitions. Thi defines a global conversion from kitty counts to cat counts, where the `.` refers to the input value:

```
→ #kitty #cat . ÷ 2
```

### _conflicts_

- There is no conversion in scope that matches the request

#### _evaluation_

Conversions first evaluate their input value. Then, all conversions in scope are retrieved, including all of the conversions defined on the input value, and any defined external to the value. Finally, a graph is built of all of the conversion paths, the shortest path is found betwen the input and output types. If no path is found, a conversion exception is generated, halting the program. Otherwise, the conversion function is evaluated on the input, and its result is provided as the convert's value.

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

Blocks that have intermediate non-bind expressions ignore the values of those expressions and generate a conflict.

Programs are also blocks, but with required open and close parentheses.

#### _conflicts_

- An expression's value will be discard
- There are no expressions

#### _evaluation_

Blocks create a scope in which to bind names, then evaluate each of their statements in reading order, and the evaluate to their final expression's value, discarding all other values, and their scope.

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
Speech()
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

#### _evaluation_

When a built in stream definition is evaluated, the evaluator keeps track of which stream creation expressions have evaluated, and how many times they have evaluated in this evaluation of the program. If the particular expression has not been evaluated this number of times yet, a new stream is created and indicated by its expression and evaluation count. If it has been created in the past, then the existing stream is retrieved. Finally, the stream creation expression evaluates to the current value of the stream.

### Reaction

> REACTION → EXPRESSION `…` EXPRESSION （`…` EXPRESSION）？  
> CHANGED → `∆` EXPRESSION

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

Reactions also have precedence, like conditionals.

#### _conflicts_

- The condition does not refer to a stream, and so will always or never be true

#### _evaluation_

Reactions are evaluated in the same way as built-in stream evaluations. When created, their initial value is created, the stream is initialized with the initial value, and then the value is evaluated to. When the reaction exists already, its conditional is evaluated. If true, its next expression is evaluated, added to the stream, and then evaluated to. If false, the the reaction evaluates to the reaction stream's current value.

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
> ATOMIC → LITERAL ｜ REF ｜ `_` ｜ EVAL ｜ DEFINITION ｜ PROPERTYBIND ｜ CONVERT ｜ CHECK ｜ QUERY ｜ DOCUMENTED ｜ PREVIOUS ｜ INITIAL ｜ ISLOCALE  
> LITERAL → NONE ｜ NUMBER ｜ BOOLEAN ｜ TEXT ｜ MARKUP ｜ LIST ｜ SET ｜ MAP ｜ TABLE  
> REF → REFERENCE ｜ PROPERTY  
> EVAL → EVALUATE ｜ UNARYEVALUATE ｜ BLOCK  
> DEFINITION → FUNCTION ｜ STRUCTURE ｜ CONVERSION  
> CHECK → CHANGED ｜ IS  
> QUERY → INSERT ｜ UPDATE ｜ SELECT ｜ DELETE

If any sequences of tokens cannot be parsed according to this grammar, all of the tokens on the line are converted into an `UNPARSABLE` node.

#### _conflicts_

- There are no expressions to evaluate.

#### _evaluation_

Programs create an evaluation scope, evaluate their binds and expressions in reading order, and then evaluate to their final expressions value, discarding all others.

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
> NUMBERTYPE → （`#` UNIT？） ｜ numeral  
> TEXTTYPE → （textopen textclose LANGUAGE？） ｜ TEXT  
> NONETYPE → `ø`  
> LISTTYPE → `[` TYPE `]`  
> SETTYPE → `{` TYPE `}`  
> MAPTYPE → `{` TYPE `:` TYPE `}`  
> STREAMTYPE → `…` TYPE  
> CONVERSIONTYPE → TYPE `→` TYPE  
> NAMETYPE → name  
> FUNCTIONTYPE → `ƒ` TYPEVARIABLES？ `(` BIND＊ `)` TYPE  
> FORMATTEDTYPE → `\…\` ｜ `\...\`  
> UNION → TYPE `|` TYPE

The final part of the language is type declarations. These mostly mirror the syntax of the rest of the langauge, with the exception of numbers. Here are binds with type declarations demonstrating all of the above:

```
bool•?
num•#m
num•1
text•''
text•'hello'
none•ø
list•[#]
set•{''}
map•{'':#}
stream•…#
conversion•#m→#mi
name•Kitty
function•ƒ(message•'')•#
union•#|''
```

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
- List types are only compatible if their element types are compatible
- Set types are only compatible if their element types are compatible
- Map types are only compatible if their key types are compatible and their value types are compatible
- Stream types are only compatible if their element types are compatible
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
