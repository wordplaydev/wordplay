import type Context from '@nodes/Context';
import type UnknownType from '@nodes/UnknownType';
import type Locale from '../Locale';
import type ListType from '@nodes/ListType';
import type MapType from '@nodes/MapType';
import type MeasurementLiteral from '@nodes/MeasurementLiteral';
import type NameType from '@nodes/NameType';
import type Reference from '@nodes/Reference';
import type SetType from '@nodes/SetType';
import type StreamType from '@nodes/StreamType';
import type UnionType from '@nodes/UnionType';
import type CycleType from '@nodes/CycleType';
import NeverType from '@nodes/NeverType';
import type UnknownNameType from '@nodes/UnknownNameType';
import Unit from '@nodes/Unit';
import {
    AND_SYMBOL,
    OR_SYMBOL,
    NOT_SYMBOL,
    PRODUCT_SYMBOL,
    COMMA_SYMBOL,
    TRUE_SYMBOL,
    FALSE_SYMBOL,
    SUM_SYMBOL,
    QUOTIENT_SYMBOL,
} from '@parser/Symbols';
import {
    getDimensionDescription,
    getEvaluateDescription,
    getLanguageDescription,
    getPlaceholderDescription,
    getTokenDescription,
    type Description,
} from '../Locale';
import Explanation from '../Explanation';
import type NodeLink from '../NodeLink';
import type StreamDefinitionType from '@nodes/StreamDefinitionType';
import Emotion from '../../lore/Emotion';
import { TEXT_DELIMITERS } from '../../parser/Tokenizer';
import tutorial from './en-tutorial';

export const WRITE_DOC = 'TBD';

const SOURCE = 'source';
const PROGRAM = 'program';
const NAME = 'name';
const STRUCTURE = 'structure';
const CONVERSION = 'conversion';
const REACTION = 'reaction';

const en: Locale = {
    language: 'en',
    wordplay: 'Wordplay',
    welcome: 'hello',
    motto: 'Where words come to life',
    terminology: {
        store: 'store',
        code: 'compute',
        decide: 'decide',
        project: 'performance',
        source: SOURCE,
        input: 'input',
        output: 'output',
        act: 'act',
        scene: 'scene',
        phrase: 'phrase',
        group: 'group',
        verse: 'verse',
        type: 'type',
        start: 'start',
        entered: 'new',
        changed: 'changed',
    },
    caret: {
        before: (description) => `before ${description}`,
        inside: (description) => `inside ${description}`,
    },
    data: {
        value: 'value',
        text: 'text',
        boolean: 'boolean',
        map: 'map',
        measurement: 'number',
        function: 'function',
        exception: 'exception',
        table: 'table',
        none: 'none',
        list: 'list',
        stream: 'stream',
        structure: STRUCTURE,
        streamdefinition: 'stream definition',
        index: 'index',
        query: 'query',
        row: 'row',
        set: 'set',
        key: 'key',
    },
    evaluation: {
        unevaluated: 'the selected node did not evaluate',
        done: 'done evaluating',
    },
    token: {
        EvalOpen: 'evaluation open',
        EvalClose: 'evaluation close',
        SetOpen: 'set/map open',
        SetClose: 'set/map close',
        ListOpen: 'list open',
        ListClose: 'list close',
        TagOpen: 'tag open',
        TagClose: 'tag close',
        Bind: 'bind',
        Access: 'property access',
        Function: 'function',
        Borrow: 'borrow',
        Share: 'share',
        Convert: 'convert',
        Doc: 'documentation',
        Words: 'words',
        Link: 'web link',
        Italic: 'italic',
        Underline: 'underline',
        Light: 'light',
        Bold: 'bold',
        Extra: 'extra',
        Concept: 'concept link',
        URL: 'URL',
        ExampleOpen: 'example open',
        ExampleClose: 'example close',
        None: 'nothing',
        Type: 'type',
        TypeOperator: 'is',
        TypeOpen: 'type input open',
        TypeClose: 'type input close',
        Separator: `${NAME} separator`,
        Language: 'language tag',
        BooleanType: 'boolean type',
        NumberType: 'number type',
        JapaneseNumeral: 'japanese numeral',
        RomanNumeral: 'roman numeral',
        Pi: 'pi',
        Infinity: 'infinity',
        NoneType: 'none type',
        TableOpen: 'table open',
        TableClose: 'table close',
        Select: 'select',
        Insert: 'insert',
        Update: 'update',
        Delete: 'delete',
        Union: 'union',
        Stream: 'next',
        Change: 'change',
        Initial: 'first evaluation',
        Previous: 'previous',
        Placeholder: 'placeholder',
        Etc: 'et cetera',
        This: 'this',
        UnaryOperator: 'unary operator',
        BinaryOperator: 'binary operator',
        Conditional: 'conditional',
        Text: 'text',
        TemplateOpen: 'template open',
        TemplateBetween: 'template between',
        TemplateClose: 'template close',
        Number: 'number',
        Decimal: 'decimal numeral',
        Base: 'base numeral',
        Boolean: 'boolean',
        Name: NAME,
        Unknown: 'unknown',
        End: 'end',
    },
    node: {
        Program: {
            name: PROGRAM,
            description: PROGRAM,
            emotion: Emotion.Serious,
            doc: `You know how @Block evaluates a list of expressions, and evaluates to the last one in its list? 
                
                I'm the same, but rather than giving my value to whatever expression I'm in, I put the value on stage.
                
                The value can be anything: a @MeasurementLiteral, @TextLiteral, or @BooleanLiteral, a @ListLiteral, @SetLiteral, @MapLiteral, or even something more complex, like a @Phrase, @Group, or @Stage.

                If you don't give me a value to show on stage, I'll probably ask you for one.
                `,
            start: (changes) =>
                changes.length === 0
                    ? 'evaluating for the first time'
                    : changes.length === 1
                    ? Explanation.as(
                          changes[0].stream,
                          ' evaluated to ',
                          changes[0].value,
                          ' revaluating'
                      )
                    : Explanation.as(
                          `${changes.length} streams changed (e.g., `,
                          changes[0].stream,
                          ' → ',
                          changes[0].value,
                          '); revaluating'
                      ),
            finish: (value) =>
                Explanation.as('I evaluated to ', value ?? 'nothing'),
        },
        Dimension: {
            name: 'dimension',
            description: getDimensionDescription,
            emotion: Emotion.Serious,
            doc: `I am a *unit of measurement*, like ⧼1m⧽, ⧼10s⧽, ⧼100g⧽, or any other scientific unit. I'm happy to be any unit want to make up too, like (17apple).
            
                I can be combined with other symbols to make compound units like ⧼9.8m/s^2⧽ or ⧼17apple/day⧽.
                
                I must always follow a number. If I don't, I might be mistaken for a ${NAME}, which would be quite embarassing, because I name units, not values.`,
        },
        Doc: {
            name: 'documentation',
            description: 'documentation',
            emotion: Emotion.Serious,
            doc:
                WRITE_DOC +
                `Describes the purpose of some code.
                
                It can precede any expression, but is most useful before definitions to explain how to use them. 
                Documentation can be tagged with a language`,
        },
        Docs: {
            name: 'documentation list',
            description: 'documentation list',
            emotion: Emotion.Serious,
            doc: WRITE_DOC + `a list of documentation`,
        },
        KeyValue: {
            name: 'key/value pair',
            description: 'key/value pair',
            emotion: Emotion.Kind,
            doc:
                WRITE_DOC +
                `represents a single mapping in a map between a key and a value.`,
        },
        Language: {
            name: 'language tag',
            description: getLanguageDescription,
            emotion: Emotion.Eager,
            doc: `
                Why hello! 
                Have you ever wanted to make it *crystal clear* what lanugage something is? 
                That's what I do. Just a little slash, and a couple letters, and no one will ever be confused about what language some text is in.
                For example, let's say you wanted to say my ${NAME}, but make it clear I'm in English:
                
                ⧼"Language"/en⧽
                
                Or, suppose you wanted to do this for a @Name.

                ⧼sound/en: "meow"⧽

                Or even @Doc!

                There are lots of different two letter language codes.
                `,
        },
        Name: {
            name: NAME,
            description: (name) => name.name?.getText(),
            emotion: Emotion.Kind,
            doc:
                WRITE_DOC +
                `
                Identifies code.
                
                names are used to represent some value in a ${PROGRAM}, such as a function, ${STRUCTURE} type, or a binding in a block. 
                They're a helpful way of giving a shorthand label to some value or way of computing or storing values. 
                Names can be optionally tagged with a language; this is helpful when sharing code, since the language might use to name a function might not be known to people who want to use it. 
                Translating names makes shared code more globally useful.`,
        },
        Names: {
            name: `${NAME} list`,
            description: (names) => `${names.names.length} names`,
            emotion: Emotion.Kind,
            doc:
                WRITE_DOC +
                `
                Defines a list of names some code is known by.
                
                Names are separated by ${COMMA_SYMBOL} symbols. 
                Having multiple names is most helpful when you want to use multiple languages.
                `,
        },
        Row: {
            name: 'row',
            description: 'row',
            emotion: Emotion.Angry,
            doc: WRITE_DOC + `a row of values, matching a table definition`,
        },
        Token: {
            name: 'token',
            description: getTokenDescription,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC + 'the smallest group of symbols in a performance',
        },
        TypeInputs: {
            name: 'type inputs',
            description: 'type inputs',
            emotion: Emotion.Curious,
            doc:
                WRITE_DOC +
                `a list of types given to a @FunctionDefinition or @StructureDefinition`,
        },
        TypeVariable: {
            name: 'type variable',
            description: 'type variable',
            emotion: Emotion.Curious,
            doc:
                WRITE_DOC +
                `a placeholder for a type used in a @FunctionDefinition or @StructureDefinition`,
        },
        TypeVariables: {
            name: 'type variables',
            description: 'type variables',
            emotion: Emotion.Curious,
            doc: WRITE_DOC + `a list of @TypeVariable`,
        },
        Paragraph: {
            name: 'paragraph',
            description: 'paragraph',
            emotion: Emotion.Serious,
            doc:
                WRITE_DOC +
                `a formatted list of words, links, and example code`,
        },
        WebLink: {
            name: 'link',
            description: 'link',
            emotion: Emotion.Serious,
            doc: WRITE_DOC + `a link to something on the web`,
        },
        ConceptLink: {
            name: 'concept',
            description: 'concept',
            emotion: Emotion.Serious,
            doc: WRITE_DOC + `a link to a concept in Wordplay`,
        },
        Words: {
            name: 'words',
            description: 'words',
            emotion: Emotion.Serious,
            doc: WRITE_DOC + `words that are part of @Doc`,
        },
        Example: {
            name: 'example',
            description: 'example',
            emotion: Emotion.Serious,
            doc: `You can put a ${PROGRAM} in any documentation to format some text as ${PROGRAM}, or to illustrate how to use some code. 
If you put it on it's own line, it will be displayed in a fancy box and show the result of evaluating the ${PROGRAM}.
Like this:

⧼"My example is cute"⧽

`,
        },
        BinaryOperation: {
            name: 'binary operation',
            description: (op) => op.operator.getText(),
            emotion: Emotion.Insecure,
            doc: `Sometimes when I'm evaluating a @FunctionDefinition with just one value on the left and one value on the right, I like to use this form, instead of @Evaluate.
                
                ⧼1 + 1⧽ is just so much simpler than ⧼1.+(1)⧽ or ⧼1.add(1)⧽. It makes everything a bit tidier, even though its basically the same thing.
                `,
            right: 'input',
            start: (left) =>
                Explanation.as('left first ', left, ', then right.'),
            finish: (result) =>
                Explanation.as('look, I made ', result ?? ' nothing'),
        },
        Bind: {
            name: 'bind',
            description: (bind) => bind.names.getNames().join(', '),
            emotion: Emotion.Bored,
            doc: `Hello!
                I love names. 
                I name things. 
                Can I name you? 
                Do you have something I can name? 
                Give me an expression and I'll name it!
                I name inputs to @FunctionDefinition and @StructureDefinition, I name values in @Block. I name everything!

                Why name something?
                Well, some of us are fine without a name because we collaborate so closely.
                But sometimes its helpful to give us names so you can refer to us by name instead.
                
                Be careful with names though: once I name a value, it will *always* have that value.
                And also don't like it when multiple things have the same name.
                That just gets confusing.
                One name, one value!

                Oh, but did you know you can have one value *many names*?
                I'm s excited to tell you about this!
                One value, many names. For example:

                ⧼joe,tess,amy: 5⧽

                See what I did there? 
                One value, three names.
                You can refer to that five by *any* of those names.
                This is especially when you want to give names in many languages:

                ⧼joe/en,aimee/fr,明/zh: 5⧽

                See what I did *there*? 
                Three names for one value, just in different languages!

                Okay, I have one last secret.
                Did you know that you can tell me what kind of value a name should have, and if it doesn't have it, I will tell you?
                Like this:

                ⧼bignumber•#: "one zillion"⧽

                See, I said (bignumber) should be a number, but it's text, and those aren't compatible and so BOOM!
                I'll let you know if they disagree.
                Sometimes you might *have* to tell me what kind of data something else because I can't figure it out myself.
                `,
            start: (value) =>
                value
                    ? Explanation.as(
                          `Let's see what value we get from `,
                          value,
                          `!`
                      )
                    : 'Mm, no value. I hope I`m in a @FunctionDefinition',
            finish: (value, names) =>
                value
                    ? Explanation.as(
                          'Oh nice, I got ',
                          value,
                          `! Let's name it `,
                          names
                      )
                    : 'Uh oh, no value. How am I suppose to name nothing?',
        },
        Block: {
            name: 'block',
            description: (block) => `${block.statements.length} statements`,
            emotion: Emotion.Grumpy,
            doc: `Have you met my friend @Bind?
                I think you'd know if you had.
                Sometimes they are so annoying.
                They're always like 'name this', 'name that'
                We work together a lot, because my job is to make a
                space to temporarily name complicated things.
                @Bind names them, and I keep track of all the names
                and evaluate to whatever value was last.
                And that makes your job as director easier, right?
                So you can calculate things?

                Well @Bind does *not* make my job easier!
                This happened last week:

                (
                    (
                    a: 1
                    b: 2
                    c: 3
                    d: 4
                    e: 5
                    f: 6
                    g: 7
                    h: 8
                    i: 9
                    j: 10
                    k: 11
                    l: 12
                    m: 13
                    n: 14
                    o: 15
                    p: 16
                    q: 17
                    r: 18
                    s: 19
                    t: 20
                    u: 21
                    v: 22
                    w: 23
                    x: 24
                    y: 25
                    z: 26
                    )
                )

                @Bind just went on and on and on, spelling out the whole alphabet and numbering
                them and I was just like "*Can you just give me 26? You didn't even use any of those names. I could have just passed on 26 and we would have been done.*" 
                Why do you have to name them all?

                This is is why I like working with @FunctionDefinition.
                They put @Bind up there with all the @Name
                I can just focus on my business.
                Of course, @Bind always shows up there too.

                Okay, I think I'm done venting.
                I really do like @Bind.
                They are my friend.
                Their love of names is cute sometimes.
                Sometimes I just need some quiet.`,
            statement: 'statement',
            start: `Here we go with @Bind again, getting all excited about naming things`,
            finish: (value) =>
                Explanation.as(
                    `Finally done. The last thing I got was `,
                    value ?? 'nothing'
                ),
        },
        BooleanLiteral: {
            name: 'boolean',
            description: (literal) => (literal.bool() ? 'true' : 'false'),
            emotion: Emotion.Precise,
            doc: `
                We are ⧼${TRUE_SYMBOL}⧽ and ⧼${FALSE_SYMBOL}⧽.
                
                We represent true and false.

                True is not false and false is not true.

                Use our functions to reason about truth.

                But leave ambiguity out of it.
                `,
            start: (value) => Explanation.as(value, '!'),
        },
        Borrow: {
            name: 'borrow',
            description: 'borrow',
            emotion: Emotion.Excited,
            doc:
                WRITE_DOC +
                `Use a binding from another ${SOURCE} or performance.`,
            start: (source, name) =>
                name === undefined && source === undefined
                    ? 'borrowing nothing'
                    : name === undefined && source !== undefined
                    ? Explanation.as('borrow ', source)
                    : Explanation.as(
                          'borrow ',
                          name ?? ' unspecified name ',
                          ' from ',
                          source ?? ` unspecified ${SOURCE}`
                      ),
            source: SOURCE,
            bind: 'name',
            version: 'version',
        },
        Changed: {
            name: 'changed',
            description: 'changed',
            emotion: Emotion.Curious,
            doc:
                WRITE_DOC +
                `true if a stream caused a ${PROGRAM} to re-evaluate`,
            start: (stream: NodeLink) =>
                Explanation.as(
                    'check if ',
                    stream,
                    ` caused this ${PROGRAM} to reevaluate`
                ),
            stream: 'stream',
        },
        Conditional: {
            name: 'conditional',
            description: '',
            emotion: Emotion.Curious,
            doc: `
            Did you ever think about how we decide? 
            I think about that a lot. 
            So many decisions in life can be so complicated. 
            Sometimes I feel a lot of pressure to decide, since I'm the only one in this world who gets to decide.
            
            I get overwhelmed, and so I've tried to simplify things. 
            @BooleanLiteral helps see that I could reduce everything to just two options: (${TRUE_SYMBOL}) and (${FALSE_SYMBOL}).
            If it's (${TRUE_SYMBOL}), then I evaluate my *yes* code. If it's (${FALSE_SYMBOL}), then I evaluate my *no* code.

            I know that decisions are rarely this simple, but breaking down the world into these two options makes things easier for me.
            It's my little way of keeping things organized, even in the face of so much complexity.
            Yes, no, if, else, this, that.
            Hm, I'm starting to sound like @BooleanLiteral...
            `,
            start: (condition) =>
                Explanation.as(
                    `let's see if `,
                    condition,
                    ` is ${TRUE_SYMBOL} or ${FALSE_SYMBOL}`
                ),
            finish: (value) =>
                Explanation.as(`it's `, value ?? ' nothing', '!'),
            condition: 'condition',
            yes: 'yes',
            no: 'no',
        },
        ConversionDefinition: {
            name: CONVERSION,
            description: CONVERSION,
            emotion: Emotion.Excited,
            doc:
                WRITE_DOC +
                `define a ${CONVERSION} from one value type to another`,
            start: `define this ${CONVERSION}`,
        },
        Convert: {
            name: 'convert',
            description: 'converts a value to a different type',
            emotion: Emotion.Cheerful,
            doc: `
                Yo. I turn values from one type to another. Check it out:
                
                ⧼1 → ""⧽
                
                ⧼5s → #ms⧽

                ⧼"hello" → []⧽
                
                You can even chain these together:

                ⧼"hello" → [] → {}⧽

                Values have a set of @ConversionDefinition that are predefined, but if you make a @StructureDefinition for a new type of value, you can define your own.
                `,
            start: (expr) =>
                Explanation.as("let's get the value to convert", expr),
            finish: (value) =>
                Explanation.as('I converted this to ', value ?? 'nothing'),
        },
        Delete: {
            name: 'delete',
            description: 'delete',
            emotion: Emotion.Angry,
            doc: WRITE_DOC + `delete rows from a table`,
            start: (table) => Explanation.as('evaluate ', table, ' first'),
            finish: (value) =>
                Explanation.as(
                    'evaluated to table without rows, ',
                    value ?? 'nothing'
                ),
        },
        DocumentedExpression: {
            name: 'documented expression',
            description: 'documented expression',
            emotion: Emotion.Serious,
            doc: WRITE_DOC,
            start: 'evaluate the documented expression',
        },
        Evaluate: {
            name: 'evaluate',
            description: getEvaluateDescription,
            emotion: Emotion.Shy,
            doc: `
            Hi. Are you looking for me? I evaluate @FunctionDefinition.

            For example, if you had this function, I could evaluate it like this:

⧼ƒ greeting(message•"")
  "Hello " + message

greeting('kitty')⧽
            
            Your function can come from anywhere. For example, @TextLiteral has functions. Like this:

⧼'kitty'.length()⧽

            If a function has a single symbol name, you can work with @BinaryOperation.

⧼'kitty' ⊆ 'itty'⧽

            That does the same thing as :

            ⧼'kitty'.⊆('itty')⧽
            `,
            start: (inputs) =>
                inputs
                    ? "let's get the inputs first"
                    : "now let's get the function to evaluate",
            finish: (result) =>
                Explanation.as(
                    'the function evaluated to ',
                    result ?? 'nothing'
                ),
            function: 'function',
            input: 'input',
        },
        ExpressionPlaceholder: {
            name: 'expression placeholder',
            description: getPlaceholderDescription,
            emotion: Emotion.Scared,
            doc: `
                I'm supposed to be an **expression**, but I really don't know how to do anything.
                
                Directors usually use me to temporarily hold some space in a performance while they figure out what they want to do.
                
                Like, if we were adding some numbers, I might take the place of a number (1 + _), or if someone was evaluating a function with @Evaluate, I might stand in for the function (_(1 2 3)).
                
                But as soon as someone decides what to replace me with, I'm out.
                Which is good, because I'm terrified of being on stage, let alone in @Program!
                `,
            start: "Stop the performance, I don't know what to do!",
            placeholder: 'expression',
        },
        FunctionDefinition: {
            name: 'function',
            description: (fun, translation) =>
                fun.names.getLocaleText(translation.language),
            emotion: Emotion.Kind,
            doc:
                WRITE_DOC +
                `define a function that maps input values to an output value`,
            start: 'define this function',
        },
        HOF: {
            name: 'higher order function',
            description: 'higher order function',
            emotion: Emotion.Kind,
            doc: WRITE_DOC,
            start: 'evaluating the function given',
            finish: (value) =>
                Explanation.as('evaluated to ', value ?? 'nothing'),
        },
        Initial: {
            name: 'initial evaluation',
            description: 'initial evaluation',
            emotion: Emotion.Curious,
            doc: WRITE_DOC,
        },
        Insert: {
            name: 'insert',
            description: 'insert',
            emotion: Emotion.Angry,
            doc: WRITE_DOC,
            start: (table) => Explanation.as('evaluate ', table, ' first'),
            finish: (value) =>
                Explanation.as(
                    'evaluated to table new rows, ',
                    value ?? 'nothing'
                ),
        },
        Is: {
            name: 'is',
            description: 'is',
            emotion: Emotion.Curious,
            doc: WRITE_DOC,
            start: (value) => Explanation.as('evaluate ', value, ' first'),
            finish: (is, type) =>
                is
                    ? Explanation.as('value is ', type, ', evaluating to true')
                    : Explanation.as(
                          'value is not ',
                          type,
                          ' evaluating to false'
                      ),
        },
        ListAccess: {
            name: 'list access',
            description: '',
            emotion: Emotion.Cheerful,
            doc: WRITE_DOC,
            start: (list) => Explanation.as('evaluate ', list, ' first'),
            finish: (value) =>
                Explanation.as('item at index is ', value ?? 'nothing'),
        },
        ListLiteral: {
            name: 'list',
            description: (literal) =>
                literal.values.length === 1
                    ? '1 item'
                    : `${literal.values.length} items`,
            emotion: Emotion.Eager,
            doc: `I'm a list of expressions! You can put anything in me: @BooleanLiteral, @MeasurementLiteral, @TextLiteral, @NoneLiteral, even other @ListLiteral, @SetLiteral, @MapLiteral, and more.

            What makes me special is that I keep things in order and I number everything from 1 to however many items are in me.

            For example, the three words in this list are numbered 1, 2, and 3.

            ⧼['apple' 'banana' 'mango']⧽
            
            You can get values that I'm storing by their number.
            For example, the second value in this list is ⧼['banana']⧽

            ⧼['apple' 'banana' 'mango'][2]⧽

            `,
            start: "let's evaluate the items first",
            finish: (value) =>
                Explanation.as('evaluated to list ', value ?? 'nothing'),
            item: 'item',
        },
        MapLiteral: {
            name: 'map',
            description: (literal) =>
                literal.values.length === 1
                    ? '1 item'
                    : `${literal.values.length} items`,
            emotion: Emotion.Excited,
            doc: `I'm a mapping from keys to values. 
                My keys can be any kind of value, and my values can be any kind of value. 
                I work with @Bind to connect values.
                Some people like to think of my like an index, or a dictionary, where you give me something, and I give you what it's mapped to.

                For example, here's a mapping from numbers to their number words:

                ⧼{1: 'one' 2: 'two' 3: 'three'}⧽

                If you wanted to check what something is mapped to, just give me the key and I'll give you the value:

                ⧼{1: 'one' 2: 'two' 3: 'three'}{1}⧽

                If I don't have it, I'll give you @NoneLiteral.

                ⧼{1: 'one' 2: 'two' 3: 'three'}{0}⧽

                I have many, many @FunctionDefinition for adding things to a mapping, removing things, getting the set of keys or values, and more.
                `,
            start: 'evaluate each key and value first',
            finish: (value) =>
                Explanation.as('evaluated to map ', value ?? 'nothing'),
        },
        MeasurementLiteral: {
            name: 'number',
            description: (node: MeasurementLiteral) =>
                node.number.getText() === 'π'
                    ? 'pi'
                    : node.number.getText() === '∞'
                    ? 'infinity'
                    : node.unit.isUnitless()
                    ? node.number.getText()
                    : `${node.number.getText()} ${node.unit.toWordplay()}`,
            emotion: Emotion.Excited,
            doc: `I can be any number you like and even a number with units, if you like.
                That's basically an infinite number of numbers.
                And an infinite number of units!
                And an infinite number of number/unit pairs…

                Here are my top 5:

                ⧼0⧽
                
                ⧼1story⧽

                ⧼πpie⧽

                ⧼∞rock⧽

                ⧼1000000dollar⧽
                
                Just know that if you try to use my @FunctionDefinition on numbers with different units, I won't know what to do.
                If they don't match, that might be a sign that there's something wrong with your performance.`,
            start: (value) => Explanation.as('evaluate to ', value),
        },
        NativeExpression: {
            name: 'built-in expression',
            description: 'built-in expression',
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: 'evaluate the built-in expression',
        },
        NoneLiteral: {
            name: 'nothing',
            description: 'nothing',
            emotion: Emotion.Neutral,
            doc: `Hi, @FunctionDefinition here. @NoneLiteral doesn't like to say much, so I'll translate.
                
                @NoneLiteral represents the absence of anything. 
                It's a way of saying "There is no value". 
                You'll find it in many @FunctionDefinition that have optional inputs, such as @Phrase.

                It's only equal to itself.            
                `,
            start: '…',
        },
        Previous: {
            name: 'previous',
            description: 'previous',
            emotion: Emotion.Curious,
            doc: WRITE_DOC,
            start: (stream) => Explanation.as('first get ', stream),
            finish: (value) =>
                Explanation.as(
                    'evaluated to stream value ',
                    value ?? 'nothing'
                ),
        },
        PropertyBind: {
            name: 'refine',
            description: 'refine',
            emotion: Emotion.Kind,
            doc: WRITE_DOC,
            start: `get the ${STRUCTURE}`,
            finish: (structure) =>
                structure
                    ? Explanation.as(`created new ${STRUCTURE} `, structure)
                    : `no ${STRUCTURE} created`,
        },
        PropertyReference: {
            name: 'property access',
            description: 'property access',
            emotion: Emotion.Kind,
            doc: WRITE_DOC,
            start: 'first get the value',
            finish: (property, value) =>
                property
                    ? Explanation.as(
                          'property ',
                          property,
                          ' is ',
                          value ?? 'nothing'
                      )
                    : 'no property name given, no value',
            property: 'property',
        },
        Reaction: {
            name: REACTION,
            description: REACTION,
            emotion: Emotion.Excited,
            doc: `A ${REACTION} to a stream change.`,
            start: 'first check if the stream has changed',
            finish: (value) =>
                Explanation.as(
                    'the stream value is currently ',
                    value ?? 'nothing'
                ),
            initial: 'initial',
            condition: 'condition',
            next: 'next',
        },
        Reference: {
            name: 'reference',
            description: (node: Reference) => node.getName(),
            emotion: Emotion.Kind,
            doc: WRITE_DOC,
            start: (name) => Explanation.as('get the value of ', name),
        },
        Select: {
            name: 'select',
            description: 'select',
            emotion: Emotion.Angry,
            doc: WRITE_DOC,
            start: (table) => Explanation.as('evaluate ', table, ' first'),
            finish: (value) =>
                Explanation.as(
                    'evaluated to a new table with the selected rows, ',
                    value ?? 'nothing'
                ),
        },
        SetLiteral: {
            name: 'set',
            description: (literal) =>
                literal.values.length === 1
                    ? '1 item'
                    : `${literal.values.length} items`,
            emotion: Emotion.Eager,
            doc: `I'm a set. That means I can contain any number of values, including zero values. You can make me like this:
            
                ⧼{1 2 3}⧽

                I'm really good if you want to keep a collection of things without duplicates.
                That means I only contain one of each value. If you give me values I already have, I'll ignore the extras.
                For example, this set has many duplicates:

                ⧼{1 1 2 2 3 3}⧽

                I evaluate it to just ⧼{1 2 3}⧽.

                If you want to see if I have a value, you can check like this:

                ⧼mysterySet{3}⧽

                I also have so many @FunctionDefinition to add, remove, combine, analyze, and convert my collection of values.
                You should be able to find whatever you need amo
                `,
            start: "let's evaluate the values first",
            finish: (value) =>
                Explanation.as('I created a set', value ?? 'nothing'),
        },
        SetOrMapAccess: {
            name: 'set/map access',
            description: 'set/map access',
            emotion: Emotion.Kind,
            doc: WRITE_DOC,
            start: (set) => Explanation.as('evaluate ', set, ' first'),
            finish: (value) =>
                Explanation.as('item in  with key is ', value ?? 'nothing'),
        },
        Source: {
            name: 'document',
            description: 'document',
            emotion: Emotion.Serious,
            doc: WRITE_DOC,
        },
        StreamDefinition: {
            name: 'stream',
            description: 'stream',
            emotion: Emotion.Curious,
            doc: WRITE_DOC + `defines a stream of values.`,
            start: 'define this stream type',
        },
        StructureDefinition: {
            name: STRUCTURE,
            description: (structure, translation) =>
                structure.names.getLocaleText(translation.language),
            emotion: Emotion.Kind,
            doc:
                WRITE_DOC +
                `define a structure that stores values and functions on those values.`,
            start: `define this ${STRUCTURE}`,
        },
        TableLiteral: {
            name: 'table',
            description: 'table',
            emotion: Emotion.Angry,
            doc: WRITE_DOC,
            item: 'row',
            start: 'first evaluate the rows',
            finish: (table) =>
                Explanation.as('evaluated to new table ', table ?? 'nothing'),
        },
        Template: {
            name: 'text template',
            description: 'text template',
            emotion: Emotion.Serious,
            doc: `I can be placed inside @TextLiteral to combine text and other values into a larger text value.

                For instance, consider this:

                ⧼"Here are some sums \\1 + 2\\, \\2 + 3\\, \\3 + 4\\"⧽
                
                See how elegantly I just evaluated those sums, and placed them inside the @TextLiteral?
                You can use me instead of adding @TextType together.
                `,
            start: `let us evaluate each expression in the text`,
            finish: 'let us combine the text',
        },
        TextLiteral: {
            name: 'text',
            description: (text) => text.getText(),
            emotion: Emotion.Serious,
            doc: `I can be any text you like, and use any of these text symbols: ${Object.keys(
                TEXT_DELIMITERS
            ).map((left) => `⧼${left}${TEXT_DELIMITERS[left]}⧽`)}.
                
                Just remember to close me if you open me, and use the matching symbol.
                Otherwise I won't know that you're done with your words.`,
            start: `let's make text`,
        },
        This: {
            name: 'this',
            description: 'this',
            emotion: Emotion.Kind,
            doc: WRITE_DOC,
            start: (value) =>
                Explanation.as('evaluated to ', value ?? 'nothing'),
        },
        UnaryOperation: {
            name: 'unary operation',
            description: (op) => op.operator.getText(),
            emotion: Emotion.Insecure,
            doc: `Did you know that when I'm evaluating a @FunctionDefinition with just one value, and the name of the @FunctionDefinition is just a single symbol, you can put the name before the input?
                
                Like, ⧼-(1 + 1)⧽ or ⧼~⊥⧽, for example. Those are much easier to read than ⧼(1 + 1).negate()⧽ or ⧼⊥.not()⧽.
                You don't have to write me that way, but it might be easier overall.

                There's only one rule: you can't put any space between the name and the value. Otherwise you might be making a @Reference or @BinaryOperation.
                `,
            start: (value) => Explanation.as('what are you ', value),
            finish: (value) => Explanation.as('I made it ', value ?? 'nothing'),
        },
        UnparsableExpression: {
            name: 'unparsable',
            description: 'unparseable',
            emotion: Emotion.Excited,
            doc: `
                (Hi @FunctionDefinition here. I'm translating for @UnparsableExpression, since they're often hard to interpret.)

                Not every expression has meaning on stage.

                In fact, there are all kinds of things you can say that don't make any sense at all.

                When you do, I show up. I'll try to guess what you might have meant, but it's up to you to fix it.
                You are the director after all, so only you know what you might have meant!
                `,
            start: '???',
        },
        Update: {
            name: 'update rows',
            description: 'update rows',
            emotion: Emotion.Angry,
            doc: WRITE_DOC,
            start: (table) => Explanation.as('evaluate ', table, ' first'),
            finish: (value) =>
                Explanation.as(
                    'evaluated to a new table with revised rows, ',
                    value ?? 'nothing'
                ),
        },
        AnyType: {
            name: 'any type',
            description: 'any',
            emotion: Emotion.Curious,
            doc: `represents any possible type`,
        },
        BooleanType: {
            name: 'boolean type',
            description: 'boolean',
            emotion: Emotion.Precise,
            doc: `a true or false value`,
        },
        ConversionType: {
            name: `${CONVERSION} type`,
            description: CONVERSION,
            emotion: Emotion.Curious,
            doc: `a type of function that converts values of one type to another `,
        },
        ExceptionType: {
            name: 'exception type',
            description: 'exception',
            emotion: Emotion.Curious,
            doc: WRITE_DOC,
        },
        FunctionDefinitionType: {
            name: 'function type',
            description: 'function',
            emotion: Emotion.Curious,
            doc: WRITE_DOC,
        },
        FunctionType: {
            name: 'function type',
            description: 'function',
            emotion: Emotion.Curious,
            doc: WRITE_DOC,
        },
        ListType: {
            name: 'list type',
            description: (
                node: ListType,
                translation: Locale,
                context: Context
            ) =>
                node.type === undefined
                    ? 'list'
                    : `list of ${node.type.getDescription(
                          translation,
                          context
                      )}`,
            emotion: Emotion.Cheerful,
            doc: WRITE_DOC,
        },
        MapType: {
            name: 'map type',
            description: (
                node: MapType,
                translation: Locale,
                context: Context
            ) =>
                node.key instanceof NeverType && node.value instanceof NeverType
                    ? 'empty map'
                    : node.key === undefined || node.value === undefined
                    ? 'map'
                    : `map of ${node.key.getDescription(
                          translation,
                          context
                      )} to ${node.value.getDescription(translation, context)}`,
            emotion: Emotion.Kind,
            doc: WRITE_DOC,
        },
        MeasurementType: {
            name: 'number type',
            description: (node, translation, context) =>
                node.unit instanceof Unit
                    ? node.unit.getDescription(translation, context)
                    : 'number',
            emotion: Emotion.Precise,
            doc: WRITE_DOC,
        },
        NameType: {
            name: 'name type',
            description: (node: NameType) => `${node.name.getText()}`,
            emotion: Emotion.Curious,
            doc: WRITE_DOC,
        },
        NeverType: {
            name: 'never type',
            description: '',
            emotion: Emotion.Curious,
            doc: WRITE_DOC,
        },
        NoneType: {
            name: 'nothing type',
            description: '',
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        SetType: {
            name: 'set type',
            description: (node: SetType, translation: Locale) =>
                node.key === undefined
                    ? 'anything'
                    : node.key.getLabel(translation),
            emotion: Emotion.Kind,
            doc: WRITE_DOC,
        },
        StreamDefinitionType: {
            name: 'stream type',
            description: (node: StreamDefinitionType, translation: Locale) =>
                `a ${node.definition.names.getLocaleText(
                    translation.language
                )} stream`,
            emotion: Emotion.Curious,
            doc: WRITE_DOC,
        },
        StreamType: {
            name: 'stream type',
            description: (
                node: StreamType,
                translation: Locale,
                context: Context
            ) =>
                `a type of stream of ${node.type.getDescription(
                    translation,
                    context
                )}`,
            emotion: Emotion.Curious,
            doc: WRITE_DOC,
        },
        StructureDefinitionType: {
            name: `${STRUCTURE} type`,
            description: 'structure type',
            emotion: Emotion.Kind,
            doc: WRITE_DOC,
        },
        UnknownType: {
            name: 'unknown type',
            description: (
                node: UnknownType<any>,
                translation: Locale,
                context: Context
            ) => {
                return `unknown, because ${node
                    .getReasons()
                    .map((unknown) => unknown.getReason(translation, context))
                    .join(', because ')}`;
            },
            emotion: Emotion.Curious,
            doc: WRITE_DOC,
        },
        TableType: {
            name: 'table type',
            description: '',
            emotion: Emotion.Angry,
            doc: WRITE_DOC,
        },
        TextType: {
            name: 'text type',
            description: (node) =>
                node.isLiteral() ? node.text.getText() : 'text',
            emotion: Emotion.Happy,
            doc: WRITE_DOC,
        },
        TypePlaceholder: {
            name: 'placeholder type',
            description: 'placeholder type',
            emotion: Emotion.Curious,
            doc: WRITE_DOC,
        },
        UnionType: {
            name: 'option type',
            description: (
                node: UnionType,
                translation: Locale,
                context: Context
            ) =>
                `${node.left.getDescription(
                    translation,
                    context
                )}${OR_SYMBOL}${node.right.getDescription(
                    translation,
                    context
                )}`,
            emotion: Emotion.Curious,
            doc: WRITE_DOC,
        },
        Unit: {
            name: 'unit',
            description: (node, translation, context) =>
                node.exponents.size === 0
                    ? 'number'
                    : node.numerator.length === 1 &&
                      node.denominator.length === 0
                    ? node.numerator[0].getDescription(translation, context)
                    : node.toWordplay() === 'm/s'
                    ? 'velocity'
                    : node.toWordplay(),
            emotion: Emotion.Precise,
            doc: WRITE_DOC,
        },
        UnparsableType: {
            name: 'unparsable type',
            description: '',
            emotion: Emotion.Curious,
            doc: WRITE_DOC,
        },
        VariableType: {
            name: 'variable type',
            description: '',
            emotion: Emotion.Curious,
            doc: WRITE_DOC,
        },
        CycleType: {
            name: 'cycle type',
            description: (node: CycleType) =>
                `${node.expression.toWordplay()} depends on itself`,
            emotion: Emotion.Curious,
            doc: WRITE_DOC,
        },
        UnknownVariableType: {
            name: 'unknown variable type',
            description: '',
            emotion: Emotion.Curious,
            doc: WRITE_DOC,
        },
        NotAType: {
            name: 'not a type',
            description: (expected, locale, context) =>
                `not a ${expected.getDescription(locale, context)}`,
            emotion: Emotion.Curious,
            doc: WRITE_DOC,
        },
        NoExpressionType: {
            name: 'non-expression type',
            description: '',
            emotion: Emotion.Curious,
            doc: WRITE_DOC,
        },
        NotEnclosedType: {
            name: `not in ${STRUCTURE}, ${CONVERSION}, or ${REACTION}`,
            description: '',
            emotion: Emotion.Curious,
            doc: WRITE_DOC,
        },
        NotImplementedType: {
            name: 'unimplemented type',
            description: '',
            emotion: Emotion.Curious,
            doc: WRITE_DOC,
        },
        UnknownNameType: {
            name: 'unknown name type',
            description: (node: UnknownNameType) =>
                node.name === undefined
                    ? "a name wasn't given"
                    : `${node.name.getText()} isn't defined on ${node.why?.toWordplay()}`,
            emotion: Emotion.Curious,
            doc: WRITE_DOC,
        },
    },
    native: {
        bool: {
            doc: `We are single true or false value.
            
            We are the simplest value type, since we can only be one of two values, (⊤) and (⊥).`,
            name: 'boolean type',
            function: {
                and: {
                    doc: WRITE_DOC,
                    name: [AND_SYMBOL, 'and'],
                    inputs: [{ doc: WRITE_DOC, names: 'value' }],
                },
                or: {
                    doc: WRITE_DOC,
                    name: [OR_SYMBOL, 'or'],
                    inputs: [{ doc: WRITE_DOC, names: 'value' }],
                },
                not: {
                    doc: WRITE_DOC,
                    name: [NOT_SYMBOL, 'not'],
                    inputs: [],
                },
                equals: {
                    doc: WRITE_DOC,
                    name: ['=', 'equals'],
                    inputs: [{ doc: WRITE_DOC, names: 'value' }],
                },
                notequal: {
                    doc: WRITE_DOC,
                    name: ['≠'],
                    inputs: [{ doc: WRITE_DOC, names: 'value' }],
                },
            },
            conversion: {
                text: WRITE_DOC,
            },
        },
        none: {
            doc: `I am nothing
            
            I am special because I am only equal to me.
            I can only ever be me and only ever want to be me!`,
            name: 'none type',
            function: {
                equals: {
                    doc: WRITE_DOC,
                    name: ['=', 'equals'],
                    inputs: [{ doc: WRITE_DOC, names: 'value' }],
                },
                notequals: {
                    doc: WRITE_DOC,
                    name: '≠',
                    inputs: [{ doc: WRITE_DOC, names: 'value' }],
                },
            },
            conversion: {
                text: WRITE_DOC,
            },
        },
        text: {
            doc: `We are any words imaginable.
            
            We can represent ideas, stories, words, and more, and even represent other types of values, but as text.`,
            name: 'text type',
            function: {
                length: {
                    doc: WRITE_DOC,
                    name: ['📏', 'length'],
                    inputs: [],
                },
                equals: {
                    doc: WRITE_DOC,
                    name: ['=', 'equals'],
                    inputs: [{ doc: WRITE_DOC, names: 'value' }],
                },
                notequals: {
                    doc: WRITE_DOC,
                    name: '≠',
                    inputs: [{ doc: WRITE_DOC, names: 'value' }],
                },
                repeat: {
                    doc: WRITE_DOC,
                    name: [PRODUCT_SYMBOL, '🔁', 'repeat'],
                    inputs: [{ doc: WRITE_DOC, names: 'count' }],
                },
                segment: {
                    doc: WRITE_DOC,
                    name: [QUOTIENT_SYMBOL, 'segment'],
                    inputs: [{ doc: WRITE_DOC, names: 'delimiter' }],
                },
                combine: {
                    doc: WRITE_DOC,
                    name: [SUM_SYMBOL, 'combine'],
                    inputs: [{ doc: WRITE_DOC, names: 'text' }],
                },
                has: {
                    doc: WRITE_DOC,
                    name: ['⊆', 'has'],
                    inputs: [{ doc: WRITE_DOC, names: 'text' }],
                },
            },
            conversion: {
                text: WRITE_DOC,
                number: WRITE_DOC,
            },
        },
        measurement: {
            doc: `We are any number imaginable, even with units.
            
            We can be integers, real numbers, negative, positive, fractional, decimal. We can be Arabic numbers (123), Roman numerals (ⅩⅩⅩⅠⅩ), Japanese numerals (二十), and more.`,
            name: 'number type',
            function: {
                add: {
                    doc: WRITE_DOC,
                    name: ['+', 'add'],
                    inputs: [{ doc: WRITE_DOC, names: 'number' }],
                },
                subtract: {
                    doc: WRITE_DOC,
                    name: ['-', 'subtract'],
                    inputs: [{ doc: WRITE_DOC, names: 'number' }],
                },
                multiply: {
                    doc: WRITE_DOC,
                    name: [PRODUCT_SYMBOL, 'multiply'],
                    inputs: [{ doc: WRITE_DOC, names: 'number' }],
                },
                divide: {
                    doc: WRITE_DOC,
                    name: ['÷', 'divide'],
                    inputs: [{ doc: WRITE_DOC, names: 'number' }],
                },
                remainder: {
                    doc: WRITE_DOC,
                    name: ['%', 'remainder'],
                    inputs: [{ doc: WRITE_DOC, names: 'number' }],
                },
                truncate: {
                    doc: WRITE_DOC,
                    name: ['truncate'],
                    inputs: [{ doc: WRITE_DOC, names: 'number' }],
                },
                absolute: {
                    doc: WRITE_DOC,
                    name: ['absolute'],
                    inputs: [{ doc: WRITE_DOC, names: 'number' }],
                },
                power: {
                    doc: WRITE_DOC,
                    name: ['^', 'power'],
                    inputs: [{ doc: WRITE_DOC, names: 'number' }],
                },
                root: {
                    doc: WRITE_DOC,
                    name: ['√', 'root'],
                    inputs: [{ doc: WRITE_DOC, names: 'number' }],
                },
                lessThan: {
                    doc: WRITE_DOC,
                    name: ['<', 'lessthan'],
                    inputs: [{ doc: WRITE_DOC, names: 'number' }],
                },
                lessOrEqual: {
                    doc: WRITE_DOC,
                    name: ['≤', 'lessorequal'],
                    inputs: [{ doc: WRITE_DOC, names: 'number' }],
                },
                greaterThan: {
                    doc: WRITE_DOC,
                    name: ['>', 'greaterthan'],
                    inputs: [{ doc: WRITE_DOC, names: 'number' }],
                },
                greaterOrEqual: {
                    doc: WRITE_DOC,
                    name: ['≥', 'greaterorequal'],
                    inputs: [{ doc: WRITE_DOC, names: 'number' }],
                },
                equal: {
                    doc: WRITE_DOC,
                    name: ['=', 'equal'],
                    inputs: [{ doc: WRITE_DOC, names: 'number' }],
                },
                notequal: {
                    doc: WRITE_DOC,
                    name: '≠',
                    inputs: [{ doc: WRITE_DOC, names: 'number' }],
                },
                cos: {
                    doc: WRITE_DOC,
                    name: ['cos', 'cosine'],
                    inputs: [],
                },
                sin: {
                    doc: WRITE_DOC,
                    name: ['sin', 'sine'],
                    inputs: [],
                },
            },
            conversion: {
                text: WRITE_DOC,
                list: WRITE_DOC,
                s2m: WRITE_DOC,
                s2h: WRITE_DOC,
                s2day: WRITE_DOC,
                s2wk: WRITE_DOC,
                s2year: WRITE_DOC,
                s2ms: WRITE_DOC,
                ms2s: WRITE_DOC,
                min2s: WRITE_DOC,
                h2s: WRITE_DOC,
                day2s: WRITE_DOC,
                wk2s: WRITE_DOC,
                yr2s: WRITE_DOC,
                m2pm: WRITE_DOC,
                m2nm: WRITE_DOC,
                m2micro: WRITE_DOC,
                m2mm: WRITE_DOC,
                m2cm: WRITE_DOC,
                m2dm: WRITE_DOC,
                m2km: WRITE_DOC,
                m2Mm: WRITE_DOC,
                m2Gm: WRITE_DOC,
                m2Tm: WRITE_DOC,
                pm2m: WRITE_DOC,
                nm2m: WRITE_DOC,
                micro2m: WRITE_DOC,
                mm2m: WRITE_DOC,
                cm2m: WRITE_DOC,
                dm2m: WRITE_DOC,
                km2m: WRITE_DOC,
                Mm2m: WRITE_DOC,
                Gm2m: WRITE_DOC,
                Tm2m: WRITE_DOC,
                km2mi: WRITE_DOC,
                mi2km: WRITE_DOC,
                cm2in: WRITE_DOC,
                in2cm: WRITE_DOC,
                m2ft: WRITE_DOC,
                ft2m: WRITE_DOC,
                g2mg: WRITE_DOC,
                mg2g: WRITE_DOC,
                g2kg: WRITE_DOC,
                kg2g: WRITE_DOC,
                g2oz: WRITE_DOC,
                oz2g: WRITE_DOC,
                oz2lb: WRITE_DOC,
                lb2oz: WRITE_DOC,
            },
        },
        list: {
            doc: `We group values in sequence.
            
            Keeping this in order is our mission; but we can only do that if we stay together ([]).`,
            name: 'list type',
            kind: 'Kind',
            out: 'Result',
            outofbounds: 'outofbounds',
            function: {
                add: {
                    doc: WRITE_DOC,
                    name: 'add',
                    inputs: [{ doc: WRITE_DOC, names: 'item' }],
                },
                append: {
                    doc: WRITE_DOC,
                    name: [SUM_SYMBOL, 'append'],
                    inputs: [{ doc: WRITE_DOC, names: 'list' }],
                },
                replace: {
                    doc: WRITE_DOC,
                    name: ['replace'],
                    inputs: [
                        { doc: WRITE_DOC, names: 'index' },
                        { doc: WRITE_DOC, names: 'value' },
                    ],
                },
                length: {
                    doc: WRITE_DOC,
                    name: ['📏', 'length'],
                    inputs: [],
                },
                random: {
                    doc: WRITE_DOC,
                    name: 'random',
                    inputs: [],
                },
                first: {
                    doc: WRITE_DOC,
                    name: 'first',
                    inputs: [],
                },
                last: {
                    doc: WRITE_DOC,
                    name: 'last',
                    inputs: [],
                },
                has: {
                    doc: WRITE_DOC,
                    name: 'has',
                    inputs: [{ doc: WRITE_DOC, names: 'item' }],
                },
                join: {
                    doc: WRITE_DOC,
                    name: 'join',
                    inputs: [{ doc: WRITE_DOC, names: 'separator' }],
                },
                sansFirst: {
                    doc: WRITE_DOC,
                    name: 'sansFirst',
                    inputs: [],
                },
                sansLast: {
                    doc: WRITE_DOC,
                    name: 'sansLast',
                    inputs: [],
                },
                sans: {
                    doc: WRITE_DOC,
                    name: 'sans',
                    inputs: [{ doc: WRITE_DOC, names: 'value' }],
                },
                sansAll: {
                    doc: WRITE_DOC,
                    name: 'sansAll',
                    inputs: [{ doc: WRITE_DOC, names: 'value' }],
                },
                reverse: {
                    doc: WRITE_DOC,
                    name: 'reverse',
                    inputs: [],
                },
                equals: {
                    doc: WRITE_DOC,
                    name: ['=', 'equals'],
                    inputs: [{ doc: WRITE_DOC, names: 'list' }],
                },
                notequals: {
                    doc: WRITE_DOC,
                    name: '≠',
                    inputs: [{ doc: WRITE_DOC, names: 'list' }],
                },
                translate: {
                    doc: WRITE_DOC,
                    name: 'translate',
                    inputs: [{ doc: WRITE_DOC, names: 'translator' }],
                    value: { doc: WRITE_DOC, names: 'item' },
                    index: { doc: WRITE_DOC, names: 'index' },
                },
                filter: {
                    doc: WRITE_DOC,
                    name: 'filter',
                    inputs: [{ doc: WRITE_DOC, names: 'checker' }],
                    value: { doc: WRITE_DOC, names: 'item' },
                },
                all: {
                    doc: WRITE_DOC,
                    name: 'all',
                    inputs: [{ doc: WRITE_DOC, names: 'checker' }],
                    value: { doc: WRITE_DOC, names: 'item' },
                },
                until: {
                    doc: WRITE_DOC,
                    name: 'until',
                    inputs: [{ doc: WRITE_DOC, names: 'checker' }],
                    value: { doc: WRITE_DOC, names: 'item' },
                },
                find: {
                    doc: WRITE_DOC,
                    name: 'find',
                    inputs: [{ doc: WRITE_DOC, names: 'checker' }],
                    value: { doc: WRITE_DOC, names: 'item' },
                },
                combine: {
                    doc: WRITE_DOC,
                    name: 'combine',
                    inputs: [
                        { doc: WRITE_DOC, names: 'initial' },
                        { doc: WRITE_DOC, names: 'combiner' },
                    ],
                    combination: { doc: WRITE_DOC, names: 'combination' },
                    next: { doc: WRITE_DOC, names: 'next' },
                    index: { doc: WRITE_DOC, names: 'index' },
                },
            },
            conversion: {
                text: WRITE_DOC,
                set: WRITE_DOC,
            },
        },
        set: {
            doc: `We group unique values in no particular order.
            
            We don't like it when there's more than one value of a particular kind! Everything must be unique.`,
            name: 'set type',
            kind: 'Kind',
            function: {
                equals: {
                    doc: WRITE_DOC,
                    name: ['=', 'equals'],
                    inputs: [{ doc: WRITE_DOC, names: 'set' }],
                },
                notequals: {
                    doc: WRITE_DOC,
                    name: '≠',
                    inputs: [{ doc: WRITE_DOC, names: 'set' }],
                },
                add: {
                    doc: WRITE_DOC,
                    name: ['add', '+'],
                    inputs: [{ doc: WRITE_DOC, names: 'set' }],
                },
                remove: {
                    doc: WRITE_DOC,
                    name: ['remove', '-'],
                    inputs: [{ doc: WRITE_DOC, names: 'set' }],
                },
                union: {
                    doc: WRITE_DOC,
                    name: ['union', '∪'],
                    inputs: [{ doc: WRITE_DOC, names: 'set' }],
                },
                intersection: {
                    doc: WRITE_DOC,
                    name: ['intersection', '∩'],
                    inputs: [{ doc: WRITE_DOC, names: 'set' }],
                },
                difference: {
                    doc: WRITE_DOC,
                    name: 'difference',
                    inputs: [{ doc: WRITE_DOC, names: 'set' }],
                },
                filter: {
                    doc: WRITE_DOC,
                    name: 'filter',
                    inputs: [{ doc: WRITE_DOC, names: 'checker' }],
                    value: { doc: WRITE_DOC, names: 'value' },
                },
                translate: {
                    doc: WRITE_DOC,
                    name: 'translate',
                    inputs: [{ doc: WRITE_DOC, names: 'lisetst' }],
                    value: { doc: WRITE_DOC, names: 'value' },
                },
            },
            conversion: {
                text: WRITE_DOC,
                list: WRITE_DOC,
            },
        },
        map: {
            doc: `We map one set of values to another set of values.
            
            Everything inside us must be connected, but to only one thing.`,
            name: 'map type',
            key: 'Key',
            value: 'Value',
            result: 'Result',
            function: {
                equals: {
                    doc: WRITE_DOC,
                    name: ['=', 'equals'],
                    inputs: [{ doc: WRITE_DOC, names: 'value' }],
                },
                notequals: {
                    doc: WRITE_DOC,
                    name: '≠',
                    inputs: [{ doc: WRITE_DOC, names: 'value' }],
                },
                set: {
                    doc: WRITE_DOC,
                    name: 'set',
                    inputs: [
                        { doc: WRITE_DOC, names: 'key' },
                        { doc: WRITE_DOC, names: 'value' },
                    ],
                },
                unset: {
                    doc: WRITE_DOC,
                    name: 'unset',
                    inputs: [{ doc: WRITE_DOC, names: 'key' }],
                },
                remove: {
                    doc: WRITE_DOC,
                    name: 'remove',
                    inputs: [{ doc: WRITE_DOC, names: 'value' }],
                },
                filter: {
                    doc: WRITE_DOC,
                    name: 'filter',
                    inputs: [{ doc: WRITE_DOC, names: 'checker' }],
                    key: { doc: WRITE_DOC, names: 'key' },
                    value: { doc: WRITE_DOC, names: 'value' },
                },
                translate: {
                    doc: WRITE_DOC,
                    name: 'translate',
                    inputs: [{ doc: WRITE_DOC, names: 'translator' }],
                    key: { doc: WRITE_DOC, names: 'key' },
                    value: { doc: WRITE_DOC, names: 'value' },
                },
            },
            conversion: {
                text: WRITE_DOC,
                set: WRITE_DOC,
                list: WRITE_DOC,
            },
        },
    },
    exceptions: {
        blank: () =>
            "I'm so excited to put on a show with you! Where should we start?",
        function: (name) => Explanation.as("Oops, I don't know how to ", name),
        name: (node, scope) =>
            node
                ? Explanation.as(
                      'I feel... unbound, with no value. Am I supposed to have a value in ',
                      scope === undefined ? ' this @Block' : scope,
                      '?'
                  )
                : Explanation.as("Ack, I didn't get a name!"),
        cycle: (node) => Explanation.as(node, ' depends on itself'),
        functionlimit: (fun) =>
            Explanation.as('evaluated too many functions, especially ', fun),
        steplimit: 'evaluated too many steps in this function',
        type: (expected, given) =>
            Explanation.as('I expected a ', expected, ' but received ', given),
        placeholder: (node) => Explanation.as(`I don't know what to do here!!`),
        unparsable: () => Explanation.as('???'),
        value: () =>
            Explanation.as("Oh no! I expected a value, but I didn't get one"),
    },
    conflict: {
        BorrowCycle: {
            primary: (borrow) =>
                Explanation.as(
                    'this depends on ',
                    borrow,
                    ` which depends on this ${SOURCE}, so the ${PROGRAM} can't be evaluated`
                ),
        },
        ReferenceCycle: {
            primary: (ref) =>
                Explanation.as(
                    ref,
                    `this ${NAME} depends on itself, so there's no way to evaluate it.`
                ),
        },
        DisallowedInputs: {
            primary: `I can't have inputs because one of or more of my functions isn't implemented`,
        },
        DuplicateName: {
            primary: () => `Someone has my name, so I can't have this name.`,
            secondary: (name) =>
                Explanation.as('this is overwritten by ', name),
        },
        DuplicateShare: {
            primary: (bind) =>
                Explanation.as(
                    `I have the same name as `,
                    bind,
                    ', which makes what is shared ambiguous'
                ),
            secondary: (bind) =>
                Explanation.as(
                    `I have has the same name as `,
                    bind,
                    ', which makes what is shared ambiguous'
                ),
        },
        DuplicateTypeVariable: {
            primary: (dupe) => Explanation.as('I have the same name as ', dupe),
            secondary: (dupe) =>
                Explanation.as('I have the same name as ', dupe),
        },
        ExpectedBooleanCondition: {
            primary: (type: NodeLink) =>
                Explanation.as(
                    `I can't choose between yes and no with a `,
                    type,
                    `; can you give me a ${TRUE_SYMBOL} or ${FALSE_SYMBOL} value?`
                ),
            secondary: (type: NodeLink) =>
                Explanation.as(
                    `I wish I evaluated to a ${TRUE_SYMBOL} or ${FALSE_SYMBOL}, but I'm a `,
                    type
                ),
        },
        ExpectedColumnType: {
            primary: () => 'I need a column type',
        },
        ExpectedEndingExpression: {
            primary: 'I need at least one expression.',
        },
        ExpectedSelectName: {
            primary: (cell) =>
                Explanation.as(cell, 'I need at least one column names.'),
        },
        ExpectedUpdateBind: {
            primary: (cell) =>
                Explanation.as('I need a value for every column'),
        },
        IgnoredExpression: {
            primary: "I'm going to use this value and ignore other ones above.",
            secondary: 'Why are you ignoring me, I want to help!',
        },
        IncompleteImplementation: {
            primary: `My functions either need to all be implemented, or none be implemented. No messy mixtures!`,
        },
        IncompatibleBind: {
            primary: (expected) =>
                Explanation.as(`Uhh, I'm supposed to be `, expected),
            secondary: (given, expected) =>
                Explanation.as(
                    `Hey, I got a `,
                    given,
                    ` instead of a `,
                    expected
                ),
        },
        IncompatibleCellType: {
            primary: (expected) => Explanation.as('I needed a ', expected),
            secondary: (given) => Explanation.as('I got a ', given),
        },
        IncompatibleInput: {
            primary: (given, expected) =>
                Explanation.as(
                    `I'm supposed to be a `,
                    expected,
                    ", but I'm a ",
                    given
                ),
            secondary: (given, expected) =>
                Explanation.as(
                    `Umm, I got a `,
                    given,
                    ' instead of ',
                    expected
                ),
        },
        IncompatibleKey: {
            primary: (expected) =>
                Explanation.as('I expected a ', expected, ' key '),
            secondary: (given) => Explanation.as('I got a ', given),
        },
        ImpossibleType: {
            primary: 'this can never be this type',
        },
        InvalidLanguage: {
            primary: `I don't know this language`,
        },
        InvalidRow: {
            primary: `I'm missing one or more columns`,
        },
        InvalidTypeInput: {
            primary: () => `I wasn't expecting this type input`,
            secondary: () => 'Am I supposed to be here?',
        },
        MisplacedConversion: {
            primary: `I'm not allowed here, only in ${STRUCTURE}s`,
        },
        MisplacedInput: {
            primary: `I think this input is misplaced. Check the order?`,
        },
        MisplacedShare: {
            primary: `I can only be at the top level of a ${PROGRAM}, not inside anything.`,
        },
        MisplacedThis: {
            primary: `I'm only allowed in ${STRUCTURE}s, ${CONVERSION}s, or ${REACTION}s`,
        },
        MissingCell: {
            primary: (column) => Explanation.as(`I'm missing column`, column),
            secondary: (row) =>
                Explanation.as(`I'm required, but `, row, ` didn't provide it`),
        },
        MissingInput: {
            primary: (input) =>
                Explanation.as('I need ', input, ', can you add one?'),
            secondary: (evaluate) =>
                Explanation.as(
                    `this input is required, but `,
                    evaluate,
                    ' did not provide it'
                ),
        },
        MissingLanguage: {
            primary: `Don't forget to give me a language!`,
        },
        MissingShareLanguages: {
            primary: `If you want to share, say what language this is in, so others can find it if they know your language.`,
        },
        NoExpression: {
            primary: `What should my value be?`,
        },
        NotAMap: {
            primary: `I'm a map, so everything you give me has to be in pairs.`,
            secondary: () => `Oops, I'm in a map without a partner!`,
        },
        NotANumber: {
            primary: `I'm not formatted correctly to be a number`,
        },
        NotAnInterface: {
            primary: `I am not an interface; ${STRUCTURE}s can only implement interfaces, not other structures`,
        },
        NotInstantiable: {
            primary: `cannot make this ${STRUCTURE} because it refers to an interface`,
        },
        OrderOfOperations: {
            primary: `I'll evalute left to right, unlike math; do you want to use @Block to specify a different order?`,
        },
        Placeholder: {
            primary: `Can someone take my place? I don't know what to do.`,
        },
        RequiredAfterOptional: {
            primary: `required inputs can't come after optional ones`,
        },
        UnclosedDelimiter: {
            primary: (token, expected) =>
                Explanation.as(
                    'I expected ',
                    expected,
                    ' sometime after ',
                    token
                ),
        },
        UnexpectedEtc: {
            primary: 'only functions can have variable length inputs',
        },
        UnexpectedInput: {
            primary: (evaluation) =>
                Explanation.as(`I didn't expect this input `, evaluation),
            secondary: () => Explanation.as(`Am I supposed to be here?`),
        },
        UnexpectedTypeVariable: {
            primary: 'type inputs not allowed on type variables',
        },
        UnimplementedInterface: {
            primary: (inter, fun) =>
                Explanation.as(
                    `I implement `,
                    inter,
                    ' but still need to implement ',
                    fun
                ),
        },
        UnknownBorrow: {
            primary: `I don't know a ${SOURCE} by this name`,
        },
        UnknownColumn: {
            primary: `I don't know a column by this name`,
        },
        UnknownConversion: {
            primary: (from, to) =>
                Explanation.as(
                    `I couldn'tn find a way to make `,
                    from,
                    ' into a ',
                    to
                ),
        },
        UnknownInput: {
            primary: `I don't know of an input by this name`,
        },
        UnknownName: {
            primary: (_, type) =>
                Explanation.as(
                    `No one has this name in `,
                    type ? type : ' this @Block'
                ),
        },
        InvalidTypeName: {
            primary: (type) =>
                Explanation.as(
                    WRITE_DOC,
                    'type names can only refer to structures or type variables, but this refers to a ',
                    type
                ),
        },
        Unnamed: {
            primary: `ahh, I need a name!`,
        },
        UnparsableConflict: {
            primary: (expression) =>
                Explanation.as(
                    `(@FunctionDefinition here, @UnparsableExpression doesn't know what kind of `,
                    expression ? `expression` : `type`,
                    ` this is)`
                ),
        },
        UnusedBind: {
            primary: `Hey, can I help? No one is saying my name :(`,
        },
        InputListMustBeLast: {
            primary: 'list of inputs must be last',
        },
    },
    step: {
        stream: 'keeping the stream instead of getting its latest value',
        jump: 'jumping past code',
        jumpif: (yes) => (yes ? 'jumping over code' : 'not jumping over code'),
        halt: 'encountered exception, stopping',
        initialize: 'preparing to process items',
        evaluate: 'starting evaluation',
        next: 'apply the function to the next item',
        check: 'check the result',
    },
    transform: {
        add: (node: Description) => ` add ${node}`,
        append: (node: Description) => `append ${node}`,
        remove: (node: Description) => `remove ${node}`,
        replace: (node: Description | undefined) =>
            `replace with ${node ?? 'nothing'}`,
    },
    ui: {
        placeholders: {
            code: 'code',
            expression: 'value',
            type: 'type',
            percent: 'percent',
            name: 'name',
            project: 'untitled',
            email: 'email',
        },
        tooltip: {
            yes: 'confirm',
            no: 'cancel',
            play: `evaluate the ${PROGRAM} fully`,
            pause: `evaluate the ${PROGRAM} one step at a time`,
            back: 'back one step',
            backInput: 'back one input',
            out: 'step out of this function',
            forward: 'forward one step',
            forwardInput: 'forward one input',
            present: 'to the present',
            start: 'to the beginning',
            reset: 'restart the evaluation of the performance from the beginning.',
            home: 'return to the types menu',
            revert: 'revert to default',
            set: 'edit this property',
            fullscreen: 'fill the browser with this window',
            collapse: 'collapse window',
            expand: 'expand window',
            close: 'close this performance',
            language: 'change preferred languages',
            horizontal: 'switch to horizontal arrangement',
            vertical: 'switch to vertical arrangement',
            freeform: 'switch to free form arrangement',
            fit: 'fit to content',
            grid: 'show/hide grid',
            addPose: 'add pose',
            removePose: 'remove pose',
            movePoseUp: 'move pose up',
            movePoseDown: 'move pose down',
            addPhrase: 'add a phrase after this',
            addGroup: 'add a group after this',
            removeContent: 'remove this content',
            moveContentUp: 'move this content up',
            moveContentDown: 'move this content down',
            editContent: 'edit this content',
            sequence: 'convert to a sequence',
            animate: 'toggle animations on/off',
            addSource: `create a new ${SOURCE}`,
            deleteSource: `remove this ${SOURCE}`,
            deleteProject: 'delete this performance',
            editProject: 'edit this performance',
            settings: 'show settings',
            newProject: 'new performance',
            dark: 'toggle dark mode on, off, and default',
            chooserExpand: 'expand/collapse',
            place: 'place output',
            paint: 'paint output',
            nextLesson: 'next lesson',
            previousLesson: 'previous lesson',
            nextLessonStep: 'next step',
            previousLessonStep: 'previous step',
            revertProject: 'revert to original code',
        },
        prompt: {
            deleteSource: 'delete',
            deleteProject: 'delete',
        },
        labels: {
            learn: 'learn more …',
            nodoc: 'Who am I? What am I? What is my purpose?',
            mixed: 'mixed',
            computed: 'computed',
            default: 'default',
            inherited: 'inherited',
            notSequence: 'not a sequence',
            notContent: 'not a content list',
            anonymous: 'anonymous',
        },
        tiles: {
            output: '💬',
            docs: '📕',
            palette: '🎨',
        },
        headers: {
            learn: 'Learn',
            editing: 'edit me!',
            projects: 'Performances',
            examples: 'Examples',
        },
        section: {
            project: 'performance',
            conflicts: 'conflicts',
            timeline: 'timeline',
            toolbar: 'toolbar',
            output: 'output',
            palette: 'palette',
            editor: 'code editor',
        },
        feedback: {
            unknownProject: "There's no performance with this ID.",
        },
        login: {
            header: 'Login',
            prompt: 'Log in to access your performances.',
            anonymousPrompt:
                'Your performances are saved on this device. Create an account to save them online.',
            submit: 'send a login email',
            enterEmail:
                "It looks like you're logging in on a different device. Can you enter your email again?",
            sent: 'Check your email for a link.',
            success: 'Account created!',
            failure: "Couldn't reach the database",
            expiredFailure: 'This link expired.',
            invalidFailure: "This link isn't valid.",
            emailFailure: "This email wasn't valid.",
            logout: 'logout',
            offline: 'You appear to be offline.',
        },
        edit: {
            wrap: 'parentheize',
            unwrap: 'unwrap',
            bind: 'name this expression',
        },
    },
    input: {
        Random: {
            doc: WRITE_DOC,
            names: ['🎲', 'Random'],
            min: { names: 'min', doc: WRITE_DOC },
            max: { names: 'max', doc: WRITE_DOC },
        },
        Choice: {
            doc: WRITE_DOC,
            names: ['🔘', 'Choice'],
        },
        Button: {
            doc: WRITE_DOC,
            names: ['🖱️', 'Button'],
            down: { names: 'down', doc: WRITE_DOC },
        },
        Pointer: {
            doc: WRITE_DOC,
            names: ['👆🏻', 'Pointer'],
        },
        Key: {
            doc: WRITE_DOC,
            names: ['⌨️', 'Key'],
            key: { names: 'key', doc: WRITE_DOC },
            down: { names: 'down', doc: WRITE_DOC },
        },
        Time: {
            doc: WRITE_DOC,
            names: ['🕕', 'Time'],
            frequency: {
                names: ['frequency'],
                doc: WRITE_DOC,
            },
        },
        Mic: {
            doc: WRITE_DOC,
            names: ['🎤', 'Mic'],
            frequency: {
                names: ['frequency'],
                doc: WRITE_DOC,
            },
        },
        Camera: {
            doc: WRITE_DOC,
            names: ['🎥', 'Camera'],
            width: {
                names: ['width'],
                doc: WRITE_DOC,
            },
            height: {
                names: ['height'],
                doc: WRITE_DOC,
            },
            frequency: {
                names: ['frequency'],
                doc: WRITE_DOC,
            },
        },
        Reaction: {
            doc: WRITE_DOC,
            names: 'reaction',
        },
        Motion: {
            doc: WRITE_DOC,
            names: ['⚽️', 'Motion'],
            type: {
                doc: WRITE_DOC,
                names: 'type',
            },
            vx: {
                doc: WRITE_DOC,
                names: 'vx',
            },
            vy: {
                doc: WRITE_DOC,
                names: 'vy',
            },
            vz: {
                doc: WRITE_DOC,
                names: 'vz',
            },
            vangle: {
                doc: WRITE_DOC,
                names: 'vangle',
            },
            mass: {
                doc: WRITE_DOC,
                names: 'mass',
            },
            bounciness: {
                doc: WRITE_DOC,
                names: 'bounciness',
            },
            gravity: {
                doc: WRITE_DOC,
                names: 'gravity',
            },
        },
    },
    output: {
        Type: {
            names: 'Type',
            doc: WRITE_DOC,
            size: { doc: WRITE_DOC, names: 'size' },
            family: { doc: WRITE_DOC, names: 'font' },
            place: { doc: WRITE_DOC, names: 'place' },
            rotation: { doc: WRITE_DOC, names: 'rotation' },
            name: { doc: WRITE_DOC, names: 'name' },
            selectable: { doc: WRITE_DOC, names: 'selectable' },
            enter: { doc: WRITE_DOC, names: 'enter' },
            rest: { doc: WRITE_DOC, names: 'rest' },
            move: { doc: WRITE_DOC, names: 'move' },
            exit: { doc: WRITE_DOC, names: 'exit' },
            duration: { doc: WRITE_DOC, names: ['⏳', 'duration'] },
            style: { doc: WRITE_DOC, names: 'style' },
        },
        Group: {
            names: ['🔳', 'Group'],
            doc: WRITE_DOC,
            content: { doc: WRITE_DOC, names: 'content' },
            layout: { doc: WRITE_DOC, names: 'layout' },
        },
        Phrase: {
            doc: WRITE_DOC,
            names: ['💬', 'Phrase'],
            text: { doc: WRITE_DOC, names: 'text' },
        },
        Arrangement: {
            doc: WRITE_DOC,
            names: ['⠿', 'Arrangement'],
        },
        Row: {
            doc: WRITE_DOC,
            names: ['➡', 'Row'],
            description: (count, phrases, groups) =>
                `row of ${count} ${
                    count === phrases
                        ? 'phrases'
                        : count === groups
                        ? 'groups'
                        : 'phrases and groups'
                }`,
            padding: { doc: WRITE_DOC, names: 'padding' },
        },
        Stack: {
            doc: WRITE_DOC,
            names: ['⬇', 'Stack'],
            description: (count, phrases, groups) =>
                `stack of ${count} ${
                    count === phrases
                        ? 'phrases'
                        : count === groups
                        ? 'groups'
                        : 'phrases and groups'
                }`,
            padding: { doc: WRITE_DOC, names: 'padding' },
        },
        Grid: {
            doc: WRITE_DOC,
            names: ['▦', 'Grid'],
            description: (rows: number, columns: number) =>
                `${rows} row ${columns} column grid`,
            rows: { doc: WRITE_DOC, names: 'rows' },
            columns: { doc: WRITE_DOC, names: 'columns' },
            padding: { doc: WRITE_DOC, names: 'padding' },
            cellWidth: { doc: WRITE_DOC, names: 'cellwidth' },
            cellHeight: { doc: WRITE_DOC, names: 'cellpadding' },
        },
        Free: {
            doc: WRITE_DOC,
            names: ['Free'],
            description: (count: number) => `free-form, ${count} outputs`,
        },
        Shape: {
            doc: WRITE_DOC,
            names: 'Shape',
        },
        Rectangle: {
            doc: WRITE_DOC,
            names: ['Rectangle'],
            left: { doc: WRITE_DOC, names: 'left' },
            top: { doc: WRITE_DOC, names: 'top' },
            right: { doc: WRITE_DOC, names: 'right' },
            bottom: { doc: WRITE_DOC, names: 'bottom' },
        },
        Pose: {
            doc: WRITE_DOC,
            names: ['🤪', 'Pose'],
            duration: { doc: WRITE_DOC, names: 'duration' },
            style: { doc: WRITE_DOC, names: 'style' },
            color: { doc: WRITE_DOC, names: 'color' },
            opacity: { doc: WRITE_DOC, names: 'opacity' },
            offset: { doc: WRITE_DOC, names: 'offset' },
            tilt: { doc: WRITE_DOC, names: 'tilt' },
            scale: { doc: WRITE_DOC, names: 'scale' },
            flipx: { doc: WRITE_DOC, names: 'flipx' },
            flipy: { doc: WRITE_DOC, names: 'flipy' },
        },
        Color: {
            doc: WRITE_DOC,
            names: ['🌈', 'Color'],
            lightness: { doc: WRITE_DOC, names: ['lightness', 'l'] },
            chroma: { doc: WRITE_DOC, names: ['chroma', 'c'] },
            hue: { doc: WRITE_DOC, names: ['hue', 'h'] },
        },
        Sequence: {
            doc: WRITE_DOC,
            names: ['💃', 'Sequence'],
            count: { doc: WRITE_DOC, names: 'count' },
            timing: { doc: WRITE_DOC, names: 'timing' },
            poses: { doc: WRITE_DOC, names: 'poses' },
        },
        Place: {
            doc: WRITE_DOC,
            names: ['📍', 'Place'],
            x: { doc: WRITE_DOC, names: 'x' },
            y: { doc: WRITE_DOC, names: 'y' },
            z: { doc: WRITE_DOC, names: 'z' },
        },
        Stage: {
            doc: WRITE_DOC,
            names: ['🎭', 'Stage'],
            description: (count, phrases, groups) =>
                `verse of ${count} ${
                    count === phrases
                        ? 'phrases'
                        : count === groups
                        ? 'groups'
                        : 'phrases and groups'
                }`,
            content: { doc: WRITE_DOC, names: 'content' },
            background: { doc: WRITE_DOC, names: 'background' },
            frame: { doc: WRITE_DOC, names: 'frame' },
        },
        Easing: {
            straight: 'straight',
            cautious: 'cautious',
            pokey: 'pokey',
            zippy: 'zippy',
        },
    },
    animation: {
        sway: {
            doc: WRITE_DOC,
            names: ['sway'],
            angle: { doc: WRITE_DOC, names: ['angle'] },
        },
        bounce: {
            doc: WRITE_DOC,
            names: ['bounce'],
            height: { doc: WRITE_DOC, names: ['height'] },
        },
        spin: {
            doc: WRITE_DOC,
            names: ['spin'],
        },
        fadein: {
            doc: WRITE_DOC,
            names: ['fadein'],
        },
        popup: {
            doc: WRITE_DOC,
            names: ['popup'],
        },
        shake: {
            doc: WRITE_DOC,
            names: ['shake'],
        },
    },
    tutorial: tutorial,
};

export default en;
