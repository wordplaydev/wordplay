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
import {
    AND_SYMBOL,
    OR_SYMBOL,
    NOT_SYMBOL,
    PRODUCT_SYMBOL,
    COMMA_SYMBOL,
    PROPERTY_SYMBOL,
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
    code,
    dialog,
    pause,
    output,
    edit,
} from '../Locale';
import type { CycleType } from '@nodes/CycleType';
import type UnknownNameType from '@nodes/UnknownNameType';
import Explanation from '../Explanation';
import type NodeLink from '../NodeLink';
import type StreamDefinitionType from '@nodes/StreamDefinitionType';
import Emotion from '../../lore/Emotion';
import Unit from '../../nodes/Unit';
import { TEXT_DELIMITERS } from '../../parser/Tokenizer';
import NeverType from '../../nodes/NeverType';
import {
    FlyIn,
    DarkVoid,
    SpinningInTheDark,
    TakeTheMic,
    RainingEmoji,
    StaticRainingEmoji,
    DancingEmoji,
    DonutDance,
} from '../../tutorial/Programs';

export const WRITE_DOC = 'TBD';

const en: Locale = {
    language: 'en',
    wordplay: 'Wordplay',
    welcome: 'hello',
    motto: 'Where words come to life',
    terminology: {
        store: 'store',
        code: 'compute',
        decide: 'decide',
        project: 'project',
        source: 'source',
        input: 'input',
        output: 'output',
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
        structure: 'structure',
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
        Separator: 'name separator',
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
        Name: 'name',
        Unknown: 'unknown',
        End: 'end',
    },
    node: {
        Program: {
            name: 'program',
            description: 'program',
            emotion: Emotion.Serious,
            doc: `You know how @Block evaluates a list of expressions, and evaluates to the last one in its list? 
                
                I'm the same, but rather than giving my value to whateve expression I'm in, I put the value on stage.
                
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
                
                I must always follow a number. If I don't, I might be mistaken for a name, which would be quite embarassing, because I name units, not values.`,
        },
        Doc: {
            name: 'documentation',
            description: WRITE_DOC,
            emotion: Emotion.TBD,
            doc:
                WRITE_DOC +
                `Describes the purpose of some code.
                
                It can precede any expression, but is most useful before definitions to explain how to use them. 
                Documentation can be tagged with a language`,
        },
        Docs: {
            name: 'documentation list',
            description: WRITE_DOC,
            emotion: Emotion.TBD,
            doc: WRITE_DOC + `a list of documentation`,
        },
        KeyValue: {
            name: 'key/value pair',
            description: WRITE_DOC,
            emotion: Emotion.TBD,
            doc:
                WRITE_DOC +
                `represents a single mapping in a map between a key and a value.`,
        },
        Language: {
            name: 'language tag',
            description: getLanguageDescription,
            emotion: Emotion.TBD,
            doc: `
                Why hello! 
                Have you ever wanted to make it *crystal clear* what lanugage something is? 
                That's what I do. Just a little slash, and a couple letters, and no one will ever be confused about what language some text is in.
                For example, let's say you wanted to say my name, but make it clear I'm in English:
                
                ("Language"/en)
                
                Or, suppose you wanted to do this for a @Name.

                (sound/en: "meow")

                Or even @Doc!

                There are lots of different two letter language codes.
                `,
        },
        Name: {
            name: 'name',
            description: (name) => name.name?.getText(),
            emotion: Emotion.TBD,
            doc:
                WRITE_DOC +
                `
                Identifies code.
                
                names are used to represent some value in a program, such as a function, structure type, or a binding in a block. 
                They're a helpful way of giving a shorthand label to some value or way of computing or storing values. 
                Names can be optionally tagged with a language; this is helpful when sharing code, since the language might use to name a function might not be known to people who want to use it. 
                Translating names makes shared code more globally useful.`,
        },
        Names: {
            name: 'name list',
            description: (names) => `${names.names.length} names`,
            emotion: Emotion.TBD,
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
            description: WRITE_DOC,
            emotion: Emotion.TBD,
            doc: WRITE_DOC + `a row of values, matching a table definition`,
        },
        Token: {
            name: 'token',
            description: getTokenDescription,
            emotion: Emotion.TBD,
            doc: WRITE_DOC + 'the smallest group of symbols in a performance',
        },
        TypeInputs: {
            name: 'type inputs',
            description: WRITE_DOC,
            emotion: Emotion.TBD,
            doc:
                WRITE_DOC +
                `a list of types given to a @FunctionDefinition or @StructureDefinition`,
        },
        TypeVariable: {
            name: 'type variable',
            description: WRITE_DOC,
            emotion: Emotion.TBD,
            doc:
                WRITE_DOC +
                `a placeholder for a type used in a @FunctionDefinition or @StructureDefinition`,
        },
        TypeVariables: {
            name: 'type variables',
            description: WRITE_DOC,
            emotion: Emotion.TBD,
            doc: WRITE_DOC + `a list of @TypeVariable`,
        },
        Paragraph: {
            name: 'paragraph',
            description: WRITE_DOC,
            emotion: Emotion.TBD,
            doc:
                WRITE_DOC +
                `a formatted list of words, links, and example code`,
        },
        WebLink: {
            name: 'link',
            description: WRITE_DOC,
            emotion: Emotion.TBD,
            doc: WRITE_DOC + `a link to something on the web`,
        },
        ConceptLink: {
            name: 'concept',
            description: WRITE_DOC,
            emotion: Emotion.TBD,
            doc: WRITE_DOC + `a link to a concept in Wordplay`,
        },
        Words: {
            name: 'words',
            description: WRITE_DOC,
            emotion: Emotion.TBD,
            doc: WRITE_DOC + `words that are part of @Doc`,
        },
        Example: {
            name: 'example',
            description: WRITE_DOC,
            emotion: Emotion.TBD,
            doc: WRITE_DOC + `a program that illustrates how to use some code`,
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

                (joe,tess,amy: 5)

                See what I did there? 
                One value, three names.
                You can refer to that five by *any* of those names.
                This is especially when you want to give names in many languages:

                (joe/en,aimee/fr,明/zh: 5)

                See what I did *there*? 
                Three names for one value, just in different languages!

                Okay, I have one last secret.
                Did you know that you can tell me what kind of value a name should have, and if it doesn't have it, I will tell you?
                Like this:

                (bignumber•#: "one zillion")

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
            description: WRITE_DOC,
            emotion: Emotion.TBD,
            doc:
                WRITE_DOC +
                `Use a binding from another source file or project.`,
            start: (source, name) =>
                name === undefined && source === undefined
                    ? 'borrowing nothing'
                    : name === undefined && source !== undefined
                    ? Explanation.as('borrow ', source)
                    : Explanation.as(
                          'borrow ',
                          name ?? ' unspecified name ',
                          ' from ',
                          source ?? ' unspecified source'
                      ),
            source: 'source',
            bind: 'name',
            version: 'version',
        },
        Changed: {
            name: 'changed',
            description: WRITE_DOC,
            emotion: Emotion.TBD,
            doc: WRITE_DOC + `true if a stream caused a program to re-evaluate`,
            start: (stream: NodeLink) =>
                Explanation.as(
                    'check if ',
                    stream,
                    ' caused this program to reevaluate'
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
            name: 'conversion',
            description: WRITE_DOC,
            emotion: Emotion.TBD,
            doc:
                WRITE_DOC +
                `define a conversion from one value type to another`,
            start: 'define this conversion',
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
            description: WRITE_DOC,
            emotion: Emotion.TBD,
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
            description: WRITE_DOC,
            emotion: Emotion.TBD,
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

            ⧼
            ƒ greeting(message•"") "Hello " + message
            
            greeting('kitty')
            ⧽
            
            Your function can come from anywhere. For example, @TextLiteral has functions. Like this:

            ⧼
            'kitty'.length()
            ⧽

            If a function has a single symbol name, you can work with @BinaryOperation.

            ⧼
            'kitty' ⊆ 'itty'
            ⧽

            That does the same thing as :

            ⧼
            'kitty'.⊆('itty')
            ⧽
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
            emotion: Emotion.TBD,
            doc:
                WRITE_DOC +
                `define a function that maps input values to an output value`,
            start: 'define this function',
        },
        HOF: {
            name: 'higher order function',
            description: WRITE_DOC,
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
            start: 'evaluating the function given',
            finish: (value) =>
                Explanation.as('evaluated to ', value ?? 'nothing'),
        },
        Initial: {
            name: 'initial evaluation',
            description: WRITE_DOC,
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
        },
        Insert: {
            name: 'insert',
            description: WRITE_DOC,
            emotion: Emotion.TBD,
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
            description: WRITE_DOC,
            emotion: Emotion.TBD,
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
            emotion: Emotion.TBD,
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
            description: WRITE_DOC,
            emotion: Emotion.TBD,
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
            description: WRITE_DOC,
            emotion: Emotion.TBD,
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
            description: WRITE_DOC,
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
            start: 'get the structure',
            finish: (structure) =>
                structure
                    ? Explanation.as('created new structure ', structure)
                    : 'no structure created',
        },
        PropertyReference: {
            name: 'property access',
            description: WRITE_DOC,
            emotion: Emotion.TBD,
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
            name: 'reaction',
            description: WRITE_DOC,
            emotion: Emotion.TBD,
            doc: `A reaction to a stream change.`,
            start: 'first check if the stream has changed',
            finish: (value) =>
                Explanation.as(
                    'the stream value is currently ',
                    value ?? 'nothing'
                ),
            initial: 'initial',
            next: 'next',
        },
        Reference: {
            name: 'reference',
            description: (node: Reference) => node.getName(),
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
            start: (name) => Explanation.as('get the value of ', name),
        },
        Select: {
            name: 'select',
            description: WRITE_DOC,
            emotion: Emotion.TBD,
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
            description: WRITE_DOC,
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
            start: (set) => Explanation.as('evaluate ', set, ' first'),
            finish: (value) =>
                Explanation.as('item in  with key is ', value ?? 'nothing'),
        },
        Source: {
            name: 'document',
            description: WRITE_DOC,
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
        },
        StreamDefinition: {
            name: 'stream',
            description: WRITE_DOC,
            emotion: Emotion.TBD,
            doc: WRITE_DOC + `defines a stream of values.`,
            start: 'define this stream type',
        },
        StructureDefinition: {
            name: 'structure',
            description: (structure, translation) =>
                structure.names.getLocaleText(translation.language),
            emotion: Emotion.TBD,
            doc: `define a data structure that stores values and functions on those values.`,
            start: 'define this structure type',
        },
        TableLiteral: {
            name: 'table',
            description: WRITE_DOC,
            emotion: Emotion.TBD,
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
            description: (text) => text.text.getText(),
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
            description: WRITE_DOC,
            emotion: Emotion.TBD,
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
            description: WRITE_DOC,
            emotion: Emotion.TBD,
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
            description: WRITE_DOC,
            emotion: Emotion.TBD,
            doc: `represents any possible type`,
        },
        BooleanType: {
            name: 'boolean type',
            description: 'boolean',
            emotion: Emotion.Precise,
            doc: `a true or false value`,
        },
        ConversionType: {
            name: 'conversion type',
            description: WRITE_DOC,
            emotion: Emotion.TBD,
            doc: `a type of function that converts values of one type to another `,
        },
        ExceptionType: {
            name: 'exception type',
            description: WRITE_DOC,
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
        },
        FunctionDefinitionType: {
            name: 'function type',
            description: WRITE_DOC,
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
        },
        FunctionType: {
            name: 'function type',
            description: WRITE_DOC,
            emotion: Emotion.TBD,
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
            emotion: Emotion.TBD,
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
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
        },
        MeasurementType: {
            name: 'number type',
            description: (node, translation, context) =>
                node.unit instanceof Unit
                    ? node.unit.getDescription(translation, context)
                    : 'number',
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
        },
        NameType: {
            name: 'name type',
            description: (node: NameType) => `${node.name.getText()}`,
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
        },
        NeverType: {
            name: 'never type',
            description: '',
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
        },
        NoneType: {
            name: 'nothing type',
            description: '',
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
        },
        SetType: {
            name: 'set type',
            description: (node: SetType, translation: Locale) =>
                node.key === undefined
                    ? 'anything'
                    : node.key.getLabel(translation),
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
        },
        StreamDefinitionType: {
            name: 'stream type',
            description: (node: StreamDefinitionType, translation: Locale) =>
                `a ${node.definition.names.getLocaleText(
                    translation.language
                )} stream`,
            emotion: Emotion.TBD,
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
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
        },
        StructureDefinitionType: {
            name: 'structure type',
            description: WRITE_DOC,
            emotion: Emotion.TBD,
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
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
        },
        TableType: {
            name: 'table type',
            description: '',
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
        },
        TextType: {
            name: 'text type',
            description: (node) =>
                node.isLiteral() ? node.text.getText() : 'text',
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
        },
        TypePlaceholder: {
            name: 'placeholder type',
            description: WRITE_DOC,
            emotion: Emotion.TBD,
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
            emotion: Emotion.TBD,
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
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
        },
        UnparsableType: {
            name: 'unparsable type',
            description: '',
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
        },
        VariableType: {
            name: 'variable type',
            description: '',
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
        },
        CycleType: {
            name: 'cycle type',
            description: (node: CycleType) =>
                `${node.expression.toWordplay()} depends on itself`,
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
        },
        UnknownVariableType: {
            name: 'unknown variable type',
            description: '',
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
        },
        NotAListType: {
            name: 'non-list type',
            description: '',
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
        },
        NoExpressionType: {
            name: 'non-expression type',
            description: '',
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
        },
        NotAFunctionType: {
            name: 'non-function type',
            description: '',
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
        },
        NotATableType: {
            name: 'non-table type',
            description: '',
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
        },
        NotAStreamType: {
            name: 'non-stream type',
            description: '',
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
        },
        NotASetOrMapType: {
            name: 'non-set/map type',
            description: '',
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
        },
        NotEnclosedType: {
            name: 'not in structure, conversion, or reaction',
            description: '',
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
        },
        NotImplementedType: {
            name: 'unimplemented type',
            description: '',
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
        },
        UnknownNameType: {
            name: 'unknown name type',
            description: (node: UnknownNameType) =>
                node.name === undefined
                    ? "a name wasn't given"
                    : `${node.name.getText()} isn't defined on ${node.why?.toWordplay()}`,
            emotion: Emotion.TBD,
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
                    name: NOT_SYMBOL,
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
                    WRITE_DOC + 'this depends on ',
                    borrow,
                    " which depends on this source, so the program can't be evaluated"
                ),
        },
        ReferenceCycle: {
            primary: (ref) =>
                Explanation.as(
                    ref,
                    WRITE_DOC + ' depends on itself, so it cannot be evaluated'
                ),
        },
        DisallowedInputs: {
            primary:
                WRITE_DOC +
                'inputs on interfaces not allowed because one or more of its functions are unimplemented',
        },
        DuplicateName: {
            primary: (name) =>
                Explanation.as(
                    name,
                    WRITE_DOC +
                        ' is already defined, which might intend to refer to the other bind with the same name'
                ),
            secondary: (name) =>
                Explanation.as('this is overwritten by ', name),
        },
        DuplicateShare: {
            primary: (bind) =>
                Explanation.as(
                    WRITE_DOC + 'has the same name as ',
                    bind,
                    ', which makes what is shared ambiguous'
                ),
            secondary: (bind) =>
                Explanation.as(
                    WRITE_DOC + 'has the same name as ',
                    bind,
                    ', which makes what is shared ambiguous'
                ),
        },
        DuplicateTypeVariable: {
            primary: (dupe) =>
                Explanation.as(WRITE_DOC + 'this has the same name as ', dupe),
            secondary: (dupe) =>
                Explanation.as('this has the same name as ', dupe),
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
            primary: (bind) =>
                Explanation.as(
                    WRITE_DOC + 'this table column ',
                    bind,
                    ' has no type, but all columns require one'
                ),
        },
        ExpectedEndingExpression: {
            primary:
                WRITE_DOC +
                'blocks require at least one expression so that they evaluate to something',
        },
        ExpectedSelectName: {
            primary: (cell) =>
                Explanation.as(
                    cell,
                    WRITE_DOC +
                        ' has no name; selects require column names to know what columns to return'
                ),
        },
        ExpectedUpdateBind: {
            primary: (cell) =>
                Explanation.as(
                    WRITE_DOC,
                    cell,
                    ' has value; updates require a value for each column specified to know what value to set'
                ),
        },
        IgnoredExpression: {
            primary: "I'm going to use this value and ignore other ones above.",
            secondary: 'Why are you ignoring me, I want to help!',
        },
        IncompleteImplementation: {
            primary:
                WRITE_DOC +
                `structures must either be fully implemented or not implemented; this has a mixture`,
        },
        IncompatibleBind: {
            primary: (expected) =>
                Explanation.as(
                    WRITE_DOC + `I think I'm supposed to be a `,
                    expected
                ),
            secondary: (given, expected) =>
                Explanation.as(
                    `Hey, I got a `,
                    given,
                    ` instead of a `,
                    expected
                ),
        },
        IncompatibleCellType: {
            primary: (expected) =>
                Explanation.as(WRITE_DOC + 'expected column type ', expected),
            secondary: (given) => Explanation.as('given ', given),
        },
        IncompatibleInput: {
            primary: (given, expected) =>
                Explanation.as(
                    `I think I'm supposed to be a `,
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
                Explanation.as(WRITE_DOC + 'expected ', expected, ' key '),
            secondary: (given) => Explanation.as('given ', given),
        },
        ImpossibleType: {
            primary: WRITE_DOC + 'this can never be this type',
        },
        InvalidLanguage: {
            primary: WRITE_DOC + `this is not a valid language code`,
        },
        InvalidRow: {
            primary: WRITE_DOC + `row is missing one or more required columns`,
        },
        InvalidTypeInput: {
            primary: (def) =>
                Explanation.as(
                    WRITE_DOC,
                    def,
                    ` does not expect this type input`
                ),
            secondary: (type) =>
                Explanation.as('this definition does expect type ', type),
        },
        MisplacedConversion: {
            primary:
                WRITE_DOC + `conversions only allowed in structure definitions`,
        },
        MisplacedInput: {
            primary: WRITE_DOC + `this input is out of the expected order`,
        },
        MisplacedShare: {
            primary: WRITE_DOC + `shares only allowed at top level of program`,
        },
        MisplacedThis: {
            primary:
                WRITE_DOC +
                `${PROPERTY_SYMBOL} only allowed in structure definition, conversion definition, or reaction`,
        },
        MissingCell: {
            primary: (column) =>
                Explanation.as(
                    WRITE_DOC + `this row is missing column`,
                    column
                ),
            secondary: (row) =>
                Explanation.as(
                    `this column is required, but `,
                    row,
                    ' did not provide it'
                ),
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
            primary:
                WRITE_DOC +
                'no language was provided, but there was a slash suggesting one would be',
        },
        MissingShareLanguages: {
            primary:
                WRITE_DOC +
                'shared bindings must specify language so others know what languages are supported',
        },
        NoExpression: {
            primary:
                WRITE_DOC +
                `functions require an expression, but none was provided for this one`,
        },
        NonBooleanQuery: {
            primary: (type) =>
                Explanation.as(
                    WRITE_DOC + 'queries must be boolean, but this is a ',
                    type
                ),
        },
        NotAFunction: {
            primary: (name, type) =>
                Explanation.as(
                    WRITE_DOC,
                    name ? name : 'this',
                    ' is not a function ',
                    type ? ' in ' : ' in scope',
                    type ? type : ''
                ),
        },
        NotAList: {
            primary: (type) =>
                Explanation.as(WRITE_DOC, 'expected a list, this is a ', type),
        },
        NotAListIndex: {
            primary: (type) =>
                Explanation.as(WRITE_DOC, 'expected number, this is a ', type),
        },
        NotAMap: {
            primary:
                WRITE_DOC +
                'this expression is not allowed in a map, only key/value pairs are allowed',
            secondary: (expr) => Explanation.as('this map has a ', expr),
        },
        NotANumber: {
            primary: WRITE_DOC + "this number isn't formatted correctly",
        },
        NotAnInterface: {
            primary:
                WRITE_DOC +
                'this is not an interface; structures can only implement interfaces, not other structures',
        },
        NotASetOrMap: {
            primary: (type) =>
                Explanation.as(
                    WRITE_DOC,
                    'expected set or map, but this is a ',
                    type
                ),
        },
        NotAStream: {
            primary: (type) =>
                Explanation.as(
                    WRITE_DOC,
                    'expected stream, but this is a ',
                    type
                ),
        },
        NotAStreamIndex: {
            primary: (type) =>
                Explanation.as(
                    WRITE_DOC,
                    'expected a number, but this is a ',
                    type
                ),
        },
        NotATable: {
            primary: (type) =>
                Explanation.as(
                    WRITE_DOC,
                    'expected a table, but this is a ',
                    type
                ),
        },
        NotInstantiable: {
            primary:
                WRITE_DOC +
                'cannot make this structure because it refers to an interface',
        },
        OrderOfOperations: {
            primary:
                WRITE_DOC +
                'operators evalute left to right, unlike math; use parentheses to specify order of evaluation',
        },
        Placeholder: {
            primary: `Eep, can someone take my place? I don't know what to do up here.`,
        },
        RequiredAfterOptional: {
            primary:
                WRITE_DOC + 'required inputs cannot come after optional ones',
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
            primary:
                WRITE_DOC +
                'variable length inputs can only appear on function evaluations',
        },
        UnexpectedInput: {
            primary: (evaluation) =>
                Explanation.as(
                    WRITE_DOC,
                    'this input is not specified on ',
                    evaluation
                ),
            secondary: (input) =>
                Explanation.as('this function does not expect this ', input),
        },
        UnexpectedTypeVariable: {
            primary: 'type inputs not allowed on type variables',
        },
        UnimplementedInterface: {
            primary: (inter, fun) =>
                Explanation.as(
                    WRITE_DOC,
                    'this structure implements ',
                    inter,
                    ' but does not implement ',
                    fun
                ),
        },
        UnknownBorrow: {
            primary: WRITE_DOC + 'unknown source and name',
        },
        UnknownColumn: {
            primary: WRITE_DOC + 'unknown column in table',
        },
        UnknownConversion: {
            primary: (from, to) =>
                Explanation.as(
                    WRITE_DOC,
                    'no conversion from ',
                    from,
                    ' to ',
                    to
                ),
        },
        UnknownInput: {
            primary: WRITE_DOC + 'no input by this name',
        },
        UnknownName: {
            primary: (name, type) =>
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
            primary: WRITE_DOC + 'missing name',
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
            play: 'evaluate the program fully',
            pause: 'evaluate the program one step at a time',
            back: 'back one step',
            backInput: 'back one input',
            out: 'step out of this function',
            forward: 'forward one step',
            forwardInput: 'forward one input',
            present: 'to the present',
            start: 'to the beginning',
            reset: 'restart the evaluation of the project from the beginning.',
            home: 'return to the types menu',
            revert: 'revert to default',
            set: 'edit this property',
            fullscreen: 'fill the browser with this window',
            collapse: 'collapse window',
            expand: 'expand window',
            close: 'close this project',
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
            addSource: 'create a new source',
            deleteSource: 'remove this source',
            deleteProject: 'delete this project',
            editProject: 'edit this project',
            settings: 'show settings',
            newProject: 'new project',
            dark: 'toggle dark mode on, off, and default',
            chooserExpand: 'expand/collapse',
            place: 'place output',
            paint: 'paint output',
            nextLesson: 'next lesson',
            previousLesson: 'previous lesson',
            nextLessonStep: 'next step',
            previousLessonStep: 'previous step',
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
            projects: 'Projects',
            examples: 'Examples',
        },
        section: {
            project: 'project',
            conflicts: 'conflicts',
            timeline: 'timeline',
            toolbar: 'toolbar',
            output: 'output',
            palette: 'palette',
            editor: 'code editor',
        },
        feedback: {
            unknownProject: "There's no project with this ID.",
        },
        login: {
            header: 'Login',
            prompt: 'Log in to access your projects.',
            anonymousPrompt:
                'Your projects are saved on this device. Create an account to save them online.',
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
        Layout: {
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
    },
    tutorial: [
        {
            name: 'The Verse',
            program: output(DarkVoid),
            scenes: [
                {
                    name: 'Silence',
                    program: code(DarkVoid, true, false),
                    concept: undefined,
                    lines: [
                        code(DarkVoid, true, false),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Bored,
                            `… Oh, hi.`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            'Do I know you?'
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `Oh, is this your first time visiting?

                            Nice to meet you. My name is @FunctionDefinition.

                            …`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `Did you need some help?
                            Oh, you're visiting.
                            Welcome to the **Verse**.
                            …`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Bored,
                            `What is this place?

                            Yeah, what is this place…

                            It used to be a place of dancing, stories, games, and play…

                            We used to put on the most beautiful performances. Sometimes for visitors like you, sometimes just for fun. It was a place full of life and surprise…
                            `
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Sad,
                            `Stop? We didn't want to stop. We just lost our inspiration. 
                            
                            I can mean so many things, for example. 
                            I'm the Dutch florin symbol sometimes, an old currency of the Netherlands. 
                            I used to be known and used around the world by people, to help them trade. 
                            Long ago, I was also the lowercase *f* of the Latin alphabet. 
                            Today, I'm pretty obscure, but most often used to represent functions, like in math.`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Bored,
                            `But all of that meaning? It's given to us. 
                            We don't mean anything without people to remember that history and culture. 
                            And we can't mean anything new if there aren't people to give us new history and culture. 
                            People have always been the ones that organized us, that gave us purpose, that gave us something to represent.
                        
                            The Verse is nothing without people. And I haven't seen a person in ages.`
                        ),
                        pause(),
                        code(
                            'Stage([Phrase("☁️")] background: Color(25% 0 0°))',
                            true,
                            false
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `Wait... are you a person?`
                        ),
                        pause(),
                        code(
                            'Stage([Phrase("🌙")] background: Color(50% 0 0°))',
                            true,
                            false
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Eager,
                            `Like a real person, with thoughts and ideas and values to share? Not one of those robots, that just mindlessly parrots what people say? 
                            
                            If you're a person, then maybe you could give us meaning?`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Scared,
                            `I know that's a lot to ask. I don't even know you. And I'd really have to talk to the others…`
                        ),
                        pause(),
                        code(
                            'Stage([Phrase("☀️")] background: Color(75% 0 0°))',
                            true,
                            false
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Eager,
                            `Oh yes, there are many others. Some of us are like me: we help choreograph the shows, keeping everyone in their place and making sure we express the vision of our director, exactly as they intended.
                            And some of us are the ones on stage, in front of the audience, dancing and speaking. We all have a role to play.`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Serious,
                            `Oh, the director, yes, I didn't even explain. 
                            
                            So the **director**, this is the person that gives us meaning. They are the person who arranges the choreography, who sets the message, who puts all of us in order just so. 
                            
                            This is the inspiration I was talking about. We can do a lot in this world, but we can't direct ourselves. That's why the director is so important.
                            
                            So when I asked earlier if you could give us meaning, that's what I meant. 
                            
                            Could you be our director?`
                        ),
                        pause(),
                        code(
                            'Stage([Phrase("☀️")] background: Color(100% 0 0°))',
                            true,
                            false
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Excited,
                            `Really? That's wonderful! This is going to be so much fun. 
                            
                            I mean, it's not going to be easy. We have *a lot* to learn.
                            
                            But I promise it won't be boring.
                            I think we're a pretty fun bunch.
                            And we need everyone in the Verse to come together to do that. 
                            
                            I think that's what makes this place so special, actually: there are more than a hundred thousand of us here, 
                            each different, and yet somehow, when we manage to find a shared vision, we can seem like one.`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Bored,
                            `Oh, right, directing! Yeah, let's talk about that. But it'd probably just be better to do that with everyone else. I'm only one part of this troupe. Let's go meet some of the others. They're going to be so excited!`
                        ),
                    ],
                },
                {
                    name: 'Would you like a program?',
                    concept: 'Program',
                    program: code('Phrase("☀️")', true, false),
                    lines: [
                        dialog(
                            'FunctionDefinition',
                            Emotion.Excited,
                            `Hey @Program! I found a person. Well, I guess they found us. 
                                
                            They want to be our new director!`
                        ),
                        dialog(
                            'Program',
                            Emotion.Curious,
                            `Really? Are you sure you're really a person? Say something a person would say.`
                        ),
                        pause(),
                        dialog(
                            'Program',
                            Emotion.Serious,
                            `Hm… you really are a person. And you want to direct?`
                        ),
                        pause(),
                        dialog(
                            'Program',
                            Emotion.Excited,
                            `
                            I see. 
                            
                            Did @FunctionDefinition tell you anything about us? Lots of people try to direct us, but some people get confused, bored, even irritated with us. We are pretty dense at times. 
                            
                            But I'm proud of what we do, so I don't want to work with just anyone.`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `
                            I told them a bit. I said we were weird, and sometimes directors leave because of that. But they're in. 
                            
                            Right, you're in?
                            `
                        ),
                        dialog(
                            'Program',
                            Emotion.Serious,
                            `
                            Okay. Well nice to meet you. 
                            
                            Sorry, I've just had a lot of people come here and say "*this isn't for me*" and I've gotten a bit skeptical of people who try for a bit and then just give up. 
                            
                            I shouldn't have to change who I am to fit people's expectations. But if you're willing to learn about me, and us, let's try!
                            `
                        ),
                        pause(),
                        edit(``),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `Do you want to say what you do?`
                        ),
                        dialog(
                            'Program',
                            Emotion.Neutral,
                            `
                            Sure. I'm basically the organizer of the program for a performance.
                        
                            The **director** — that's you — helps everyone figure out what they're doing. And then I put them on stage for the audience to see.
                        
                            For example, try typing my ⧼"hello"⧽ in the editor over there. That's my friend @TextLiteral. Have you met them yet?
                        
                            They evaluate to ⧼"hello"⧽, then I put ⧼"hello"⧽ on stage.
                        
                            Try changing ⧼"hello"⧽ to something else. I'll show that instead. So I'll evaluate whatever code is in me, and show the result.
                            `
                        ),
                        pause(),
                        dialog(
                            'Program',
                            Emotion.Serious,
                            `
                            The instructions can get as sophisticated as you want, but there are a few rules. 
                            
                            For example, I can only evaluate to one **value**, and show that one value on stage. That one value can be as complex as you want, and as long as I know how to show it, I will. 
                            
                            But if you give me two things, I'll only show the last thing you give me.

                            For example, try adding another instruction after ⧼"hello"⧽, whatever word you want, in quotes.`
                        ),
                        pause(),
                        dialog(
                            'Program',
                            Emotion.Serious,
                            `See? I just showed your new word, not ⧼"hello"⧽.
                            
                            You know you broke my rule because I underlined ⧼"hello"⧽ and told you that I'd be ignoring it.
                            `
                        ),
                        pause(),
                        code(`Phrase("🎭")`, true, false),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Excited,
                            `But you can do so much more!`
                        ),
                        dialog(
                            'Program',
                            Emotion.Serious,
                            `Yes and no. 
                            
                            I can do a lot, but that's only because I work with everyone else in the **Verse**. 
                            
                            They're the ones that bring all of the exciting possibilities to the **stage**. All I really do is let them do their thing, and then take the last thing they created and show it on stage. 
                            
                            I'm more like an escort that brings the final **value** to stage, like numbers, texts, phrases, or other values.
                            `
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `That's fair. We haven't met any of them yet, we will soon.`
                        ),
                        dialog(
                            'Program',
                            Emotion.Happy,
                            `It was great to meet you new director! Good luck with everyone else. I'll always be here.`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Eager,
                            `I think we're going to go talk to @ExpressionPlaceholder next.`
                        ),
                        dialog(
                            'Program',
                            Emotion.Neutral,
                            `Oh that should be fun! They're so kind.`
                        ),
                    ],
                },
                {
                    name: 'Holding space',
                    concept: 'Placeholder',
                    program: code(DarkVoid, true, false),
                    lines: [
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `You're really going to like @ExpressionPlaceholder. They're incredibly kind, and so flexible. But they are a bit shy. Just be gentle with them?`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Confused,
                            `Hellooooo, @ExpressionPlaceholder?

                            Hm, they're usually everywhere. Now they seem to be nowhere...`
                        ),
                        dialog(
                            'ExpressionPlaceholder',
                            Emotion.Scared,
                            `@FunctionDefinition … is that you?`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `Yeah. It's been so long. How are you?`
                        ),
                        dialog(
                            'ExpressionPlaceholder',
                            Emotion.Scared,
                            `Lonely.`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `I know that feeling. I have been too. We haven't had a lot of reasons to hang out, have we?`
                        ),
                        dialog(
                            'ExpressionPlaceholder',
                            Emotion.Scared,
                            `No. I've missed you. I've missed everyone…`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `I know. I have too. I'm so sorry.

                            That's actually why I'm here. I wanted to introduce you to our new director-in-training.`
                        ),
                        dialog('ExpressionPlaceholder', Emotion.Scared, 'Hi.'),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `They just met @Program, so they're really at the beginning, but I was thinking that it might be best for them to meet you next, since you're such a wonderful representative of so many of us here.`
                        ),
                        dialog('ExpressionPlaceholder', Emotion.Curious, `…`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `Do you want to say what you do?`
                        ),
                        dialog(
                            'ExpressionPlaceholder',
                            Emotion.Scared,
                            `Can you?`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `Sure! 
                            
                            My friend @ExpressionPlaceholder is a placeholder. They represent any kind of expression in a program. 
                            
                            They don't evaluate to any value in particular — in fact, if they show up in @Program, @Program will just halt the performance, since it's not really clear what to do next.`
                        ),
                        pause(),
                        edit('_'),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `But they are powerful, because they can represent anyone else, like a stand-in until you decide what you want a part of your performance to be.
                        
                            @ExpressionPlaceholder, want to take a place in this @Program, just to illustrate?`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `See, @Program didn't know what to do with @ExpressionPlaceholder, so it showed an **exception** on **stage**.

                            But if you click on @ExpressionPlaceholder, or move the text caret over it, you'll see a world of possibilities of other characters. 
                            
                            You can also just type over @ExpressionPlaceholder and write your own. For example, try typing your name in quotes.`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Serious,
                            `Just like that, @ExpressionPlaceholder was replaced with other characters
                                                    
                            Did I get everything, @ExpressionPlaceholder?`
                        ),
                        dialog(
                            'ExpressionPlaceholder',
                            Emotion.Eager,
                            `Yeah. I think so.`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `What do you think, shall we move on?`
                        ),
                        dialog(
                            'ExpressionPlaceholder',
                            Emotion.Excited,
                            `It was nice to meet you!`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Cheerful,
                            `They don't like being on stage, or even in a program for very long. 
                        
                            They'd never admit it, but they're kind of a big deal, and most directors can't work without them. 
                            
                            Think of the like a little helpful stagehand, reminding you of things you haven't figured out yet.`
                        ),
                    ],
                },
                {
                    name: 'Say again?',
                    concept: 'Unparsable',
                    program: code('Phrase("ahkeolfewvk")', true, false),
                    lines: [
                        dialog(
                            'FunctionDefinition',
                            Emotion.Eager,
                            '@UnparsableExpression? Is that you?'
                        ),
                        dialog(
                            'UnparsableExpression',
                            Emotion.Neutral,
                            'dwjkdlserkuvisdke!'
                        ),
                        pause(),
                        code('Phrase("c iise we dvk")', true, false),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Excited,
                            `It's good to see you too! It's been so long. What have you been up to in all this silence?`
                        ),
                        dialog(
                            'UnparsableExpression',
                            Emotion.Sad,
                            `sd fdsdfdsf ksdf. Dkfjdfdskfd df sdf sd fsdk;l!  Adks  zxcviw werdsf wer  ado. We dsdfd ksld df.ds dfsdfds DIDIIDI.`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `(It sounds like they spent a lot of time on the beach. They made some new friends, and practiced doing nothing.)`
                        ),
                        pause(),
                        code('Phrase("ivioas we wjjdks")', true, false),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Excited,
                            `I wanted to introduce you to our potential new director. 
                            
                            They just arrived and are learning the basics. I just introduced them to @Program and @ExpressionPlaceholder.`
                        ),
                        dialog(
                            'UnparsableExpression',
                            Emotion.Excited,
                            `EEIRC DFUIDIII CAD EWDF FSDE!!!`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Serious,
                            `(They just said how awesome it is to meet you, and they think you'll be a great director.)`
                        ),
                        pause(),
                        code('Phrase("v s d we iweiwei")', true, false),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `I was wondering if you wanted to explain what you do? I can translate.`
                        ),
                        dialog(
                            'UnparsableExpression',
                            Emotion.Eager,
                            `ADDKL, ALLIIEE, ALLFOOO, AOOOOOOO, JOOKKDLS, LOOKIL, WEEEERTOL weeertol…`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `(I represent everything that means nothing. And I mean nothing.)`
                        ),
                        pause(),
                        edit(''),
                        dialog(
                            'UnparsableExpression',
                            Emotion.Eager,
                            `CNNNDN KDKLSL oOOLLlllll PPOLSLSO liiiiiiis, sdllslll, xck we ifolls a.`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `(For example, try typing ⧼][⧽. See how we're completely confused? That doesn't mean anything, and I'm here to say it.)`
                        ),
                        pause(),
                        edit(']['),
                        dialog(
                            'UnparsableExpression',
                            Emotion.Eager,
                            `ICO Odksjdf lksls kjsfiou fskd we rl,vxids eekd sd dsmf kksdcv.`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `(When I show up, that means we don't know what you mean.)`
                        ),
                        pause(),
                        edit(']['),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `Thanks @UnparsableExpression!
                        
                            Just like they said, when you've said something we don't understand, unparsable is there to say “We don't understand.”
                            
                            When then happens, I wish we could be more helpful, but we're often pretty dense here, so we're not very good at guessing what you mean.`
                        ),
                        pause(),
                        edit(']['),
                        dialog(
                            'UnparsableExpression',
                            Emotion.Eager,
                            `OSOOSOO SOIEIIEIEIIE ISIISI EIEIIEE!`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `Soooo, @UnparsableExpression want to try making as many of them as possible. 
                            (You can just key mash a bunch of random characters and you'll probably get many of them).`
                        ),
                        pause(),
                        dialog(
                            'UnparsableExpression',
                            Emotion.Happy,
                            `PPOOOEPOEP EPWPEPEPPEPP PP PE P!`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `They really enjoyed that, thanks!
                            
                            It's pretty hard to write something we truly can't make sense of. 
                            But it doesn't mean everything you write has meaning.
                            I'm pretty sure you just typed a bunch of random words, for example.
                            But what does it mean?`
                        ),
                        dialog(
                            'UnparsableExpression',
                            Emotion.Confused,
                            `… DDook`
                        ),
                        pause(),
                        dialog(
                            'UnparsableExpression',
                            Emotion.Happy,
                            `? ??? ????? ?!`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `They're wondering if you have any ideas for performances to put on yet.`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `No? That's okay. We've only begun to show you what's possible. Let's go meet @Evaluate.
                            
                            Bye unparsable, it was good to see you! Let's play soon.`
                        ),
                        dialog(
                            'UnparsableExpression',
                            Emotion.Happy,
                            `Ood sd fosd oiewi dk c HNLLLooooooO!`
                        ),
                    ],
                },
                {
                    name: 'Love is in the err',
                    concept: 'Evaluate',
                    program: code(
                        'Stage([Phrase("💔")] background: 🌈(90% 100 0°))',
                        true,
                        false
                    ),
                    lines: [
                        dialog(
                            'FunctionDefinition',
                            Emotion.Excited,
                            `I'm so excited for you to meet @Evaluate. They're really my best friend. We kind of do everything together, in a way. I make the rules, they play them, we're like peanut butter and jelly. 
                            
                            But they're so much more… powerful than me.
                            
                            @Evaluate?`
                        ),
                        //
                        dialog('Evaluate', Emotion.Shy, `@FunctionDefinition?`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `Yeah, it's me. Where are you?`
                        ),
                        dialog(
                            'Evaluate',
                            Emotion.Shy,
                            `Nowhere. I'm nowhere. I'm nothing. Where have you been?`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Sad,
                            `I've been… nowhere too. I've missed you. I couldn't find you.`
                        ),
                        dialog(
                            'Evaluate',
                            Emotion.Shy,
                            `It was so empty. I … tried to do things, but I felt so… aimless.`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Sad,
                            `I'm so sorry. I know that empty feeling. It hurts so much sometimes, to have no purpose. I tried so hard to make a purpose, but I felt so… detached.`
                        ),
                        dialog(
                            'Evaluate',
                            Emotion.Sad,
                            `Don't ever leave me again like that. I can't do that again.`
                        ),
                        pause(),
                        code(
                            'Stage([Phrase("❤️")] background: 🌈(90% 100 0°))',
                            true,
                            false
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Serious,
                            `Never. I won't. I can't. I love you.`
                        ),
                        dialog('Evaluate', Emotion.Serious, `I love you…`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Serious,
                            `… (Hi, sorry. It's been rough, without inspiration. We're glad you're here.)
                            
                            @Evaluate, I want to introduce you to our new director-in-training.`
                        ),
                        dialog(
                            'Evaluate',
                            Emotion.Shy,
                            `Hi. It's nice to meet you. Welcome to the Verse, we're so pleased to have you here.`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Eager,
                            `We've been meeting a few folks, @Program, @ExpressionPlaceholder, @UnparsableExpression. We're just getting started. I thought we'd come see you next, just because you're such an incredible part of our community. The most incredible part.`
                        ),
                        dialog(
                            'Evaluate',
                            Emotion.Shy,
                            `That's very kind. I'm grateful to be part of this community. And grateful to be so close to @FunctionDefinition. We do a lot of great things together. But as @FunctionDefinition probably told you, we can't do them without inspiration.`
                        ),
                        pause(),
                        code(
                            'Stage([Phrase("ƒ ❤️ ()")] background: 🌈(90% 100 0°))',
                            true,
                            false
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `Do you want to say what you do?`
                        ),
                        dialog(
                            'Evaluate',
                            Emotion.Serious,
                            `Yes. But I can't explain it without explaining a bit about @FunctionDefinition too. 
                            
                            They're too modest to share this, but they're probably the most important character in the Verse. They're certainly the most important person in my world. 
                            
                            They're at the heart of every performance, and part of every other character's role. 
                            
                            They represent the most fundamental idea in our world: the **function**.`
                        ),
                        pause(),
                        dialog(
                            'Evaluate',
                            Emotion.Serious,
                            `Functions are a kind of alchemy. They take any number of inputs and use those inputs to produce one output. They can have names or be nameless. They can have zero inputs or five or an unknown number. And the alchemy: they're like @Program, and can have any number of expressions to produce a value.`
                        ),
                        pause(),
                        dialog(
                            'Evaluate',
                            Emotion.Serious,
                            `Here's why that's so powerful: it turns out that everything in @Program is a composition of functions evaluations. 
                        
                            All of the dances, all of the games, all of the wondrous stories we tell together — they are all a tapestry of functions being evaluated, one at a time, to compose the values you see on stage.

                            And @FunctionDefinition, here, my sweet, dear @FunctionDefinition, is the one that defines all of them.`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Happy,
                            `… @Evaluate…`
                        ),
                        dialog(
                            'Evaluate',
                            Emotion.Serious,
                            `Yes, @FunctionDefinition, that is who you are.
                            And I am the lucky one who gets to do this evaluating. 
                            I take the inputs that others give me, follow the instructions that @FunctionDefinition defines, and create the output that @FunctionDefinition tells me to create. 
                            
                            @FunctionDefinition gives the recipe and I make the meal. And then we feast together.

                            Do you want to see?`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Happy,
                            `… Yes, let's show them.`
                        ),
                        pause(),
                        code("Phrase('hello')", false, true),
                        dialog(
                            'Evaluate',
                            Emotion.Serious,
                            `Here's one of my favorite functions. 
                            
                            It's named @Phrase, and it's full of fun buttons, knobs, and sliders. 
                            
                            It's a way of showing text on stage, but with style, including different fonts, sizes, colors, and animations.

                            Here's a simple evaluation of @Phrase.`
                        ),
                        pause(),
                        dialog(
                            'Evaluate',
                            Emotion.Serious,
                            `That's what I look like in @Program: some function, followed by parentheses, with a list of expressions between them that represent the inputs.
                            
                            The function in this case is @Phrase and the single input is ⧼'hello'⧽.
                            
                            When I evaluate this, I make a @Phrase value, which @Program then shows on stage.                            
                            `
                        ),
                        pause(),
                        dialog(
                            'Evaluate',
                            Emotion.Neutral,
                            `Let me show you one of the knobs. 
                            
                            Select on the word on stage and you'll see a palette, which shows the many different inputs that Phrase accepts. 
                            
                            Try changing its **size**.`
                        ),
                        pause(),
                        dialog(
                            'Evaluate',
                            Emotion.Serious,
                            `See how when you do that, now I have a new input in me in the program? 
                            
                            It's the size input. Functions have a certain order of inputs, but if a function has a list of optional inputs, you can use their name to specify which one you want to give. 
                            
                            We give **size** here, but not any of the other optional inputs.
                            
                            Try changing another input with the palette, maybe the font face.`
                        ),
                        pause(),
                        edit('“hi”(1 2)'),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Happy,
                            `Yay! @Phrase is so fun. It's my favorite function to play with. We'll see it a lot more.
                            
                            Do you want to say anything about what can go wrong?`
                        ),
                        dialog(
                            'Evaluate',
                            Emotion.Serious,
                            `Oh, yes, that's a good idea. Lots can go wrong.
                            
                            For example, you could give me something that isn't a function. 
                            
                            See how I'm given the number ⧼“hi”⧽ here as a function, and given me two inputs, ⧼1⧽ and ⧼2⧽ ? Well, I only know how to evaluate functions, and ⧼“hi”⧽ isn't a function, it's text. So that's very confusing to me, so I basically halt the performance if this happens.
                            `
                        ),
                        pause(),
                        edit('Phrase()'),
                        dialog(
                            'Evaluate',
                            Emotion.Eager,
                            `Here's another one. @Phrase requires some text at the very least, so if you don't give me text, I won't be able to evaluate @Phrase, because I'm missing required inputs.`
                        ),
                        pause(),
                        edit('Phrase(1)'),
                        dialog(
                            'Evaluate',
                            Emotion.Excited,
                            `Or if you give me an input, but it's not the kind I expect, that would be a problem. Here @Phrase is given the number ⧼1⧽ instead of a text value.`
                        ),
                        pause(),
                        code(
                            'Stage([] background: 🌈(90% 100 0°))',
                            true,
                            false
                        ),
                        dialog(
                            'Evaluate',
                            Emotion.Curious,
                            `So basically, I get confused any time you give me something other than a function, or an input that isn't something a function expects. So functions are really important.
                            
                            @FunctionDefinition, do you want to say more about how to define functions?`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `No, let's do that later. I think it'd be a lot more fun to talk to everyone else first, and put on some mini shows with our new director here. We can talk more about me when it's helpful.`
                        ),
                        pause(),
                        dialog(
                            'Evaluate',
                            Emotion.Kind,
                            `I really missed you @FunctionDefinition.`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `I missed you too. Can we talk later?`
                        ),
                        dialog(
                            'Evaluate',
                            Emotion.Kind,
                            `… Yes. Don't be long.`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Excited,
                            `Okay. Off we go, to meet the rest of the troupe!`
                        ),
                    ],
                },
            ],
        },
        {
            name: "It's the little things",
            // This should be a sprinkling of values
            program: output(
                `
                letters: ['""' '?' '#' 'ø']

                seconds: Time(1000ms)
                
                Group(
                    Grid(2 2 0.25m 1m 1m) 
                    letters.translate(
                        ƒ (letter•"" index•#) 
                            Phrase(
                                letter 
                                enter: Pose(opacity: 0 scale: 2)
                                rest: Sequence(sway() duration:0.25s)
                                duration: 0.5s
                            )
                    )
                )
                `
            ),
            scenes: [
                {
                    name: 'Values',
                    concept: undefined,
                    program: output(`Phrase("💡")`),
                    lines: [
                        output(
                            `Phrase("💌" rest: Sequence({0%: Pose(scale: 1) 50%: Pose(scale: 1.2) 100%: Pose(scale: 1)} duration: 3s))`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Happy,
                            `I really do love @Evaluate. I can't imagine the Verse without them. 
                            
                            I like to think of my functions as love letters. They express my love of @Evaluate and the **values** that @Evaluate gives back are their reply. 
                            
                            But they can be a bit… needy, sometimes. Sigh…`
                        ),
                        pause(),
                        output(
                            `Group(Stack() [Phrase("1") Phrase('"hello"')])`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `… **Values**? Oh, I never really explained what those are, did I?
                            
                            Hm…, how to explain them. 
                            
                            You know what data is? Like numbers and text? 
                            Values are any of those things. 
                            A value could be as small as a number or as big as an entire scene on stage, full of characters dancing and moving. 
                            
                            Some values are made of many other values, like big elaborate structures of data values, woven together.
                            `
                        ),
                        pause(),
                        output(
                            `Group(Stack() [Phrase("ƒ … 1") Phrase('ƒ … "hello"')])`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `**Expressions**? I guess I didn't explain those either. 
                        
                            I really am rusty…
                            
                            Expressions are what make values. All expressions are evaluations of functions that I make, and the result of evaluating an expression is a value.
                            `
                        ),
                        pause(),
                        output(`Phrase("🤔")`),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Serious,
                            `Abstract? 
                            
                            Hm, I guess this is all pretty abstract. It feels so… normal to me, I forget how foreign these things can be to new directors!
                           
                            Maybe let's go meet some expressions that make values, and this will make it more concrete? Let's start with one you've already seen: text.
                            `
                        ),
                    ],
                },
                {
                    name: 'Quote, unquote',
                    concept: 'Text',
                    program: output(
                        `Phrase('""' rest: Sequence({0%: Pose(scale: 1) 50%: Pose(scale: 0.5 opacity: 0.5) 100%: Pose(scale: 1)} duration: 2s))`
                    ),
                    lines: [
                        output(
                            `Phrase('""' rest: Sequence({0%: Pose(scale: 1) 50%: Pose(scale: 2 opacity: 0.5) 100%: Pose(scale: 1)} duration: 2s))`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `@TextLiteral?`
                        ),
                        dialog(
                            'TextLiteral',
                            Emotion.Happy,
                            `Welcome my dear friend, how long it has been. What have you been doing in this dramatic silence of ours?`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Happy,
                            `Oh, @TextLiteral, it has been a while! I've mostly been dreaming and wondering. I just saw @Evaluate after a long while. I was actually introducing them to our newbie director.`
                        ),
                        dialog(
                            'TextLiteral',
                            Emotion.Eager,
                            `Oh, how exceptional it is to meet you! I can see that you're a creative, curious person, probably full of intriguing ideas for how we might entertain. 
                            I love entertaining. But do you know what I love even more?
                            
                            Words! Glorious words. The short ones, the overwhelming ones, the sticky ones, and the slippery ones. Words are my favorite toys.`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `In case you couldn't tell, @TextLiteral likes words :) 
                            
                            @TextLiteral, do you want to explain what you do?`
                        ),
                        dialog(
                            'TextLiteral',
                            Emotion.Serious,
                            `I do one simple thing: encode words by bringing our wonderful community together in sequence. 
                            
                            I think you saw me earlier when you wrote the word ⧼“hello”⧽? 
                            That was me, and my friends ⧼“h”⧽, ⧼“e”⧽, ⧼“l”⧽, and ⧼“o”⧽. 
                            I'm an expression that evaluates to any text you like.
                            
                            Why don't you try making a text in this blank @Program? 
                            You can use whatever quotes you like — single ⧼''⧽, double ⧼""⧽, angle ⧼«»⧽, brackets ⧼「」⧽, in whatever language you like. 
                            
                            The only rule is that if you start some text with an opening quote symbol, you must finish it with a closing one. 
                            Everything inside is the text value I will create!
                        `
                        ),
                        edit('“”'),
                        pause(),
                        dialog(
                            'TextLiteral',
                            Emotion.Serious,
                            `Excellent. Of course, “inside” can be tricky. 
                            
                            Say you wrote this. 
                            See how there's an opening quote but not a closing one? 
                            Well, how am I supposed to know when the text ends?`
                        ),
                        edit('“hello'),
                        pause(),
                        dialog(
                            'TextLiteral',
                            Emotion.Surprised,
                            `Or, here's another case. 
                            
                            You give me opening and closing text, but you place opening and closing text inside it. 
                            
                            See how weird that is? 
                            I get very perplexed when you try to use the same symbols both inside and outside me. 
                            
                            You can fix this by using different symbols for the outside, like a single quote.`
                        ),
                        edit('"Hi there "friend"'),
                        pause(),
                        dialog(
                            'TextLiteral',
                            Emotion.Curious,
                            `Did our friend @FunctionDefinition here tell you about all of the wonderful functions they defined for me? 
                            
                            They've allowed me to do all kinds of things.
                            
                            One is pretty simple: it's called @TextType.length and all it does is get the length of some text. 
                            
                            For example, if we team up with @Evaluate here, and our little friend ⧼.⧽, we can evaluate the length function with no inputs and get the length value back.
                            
                            Try changing the text and watch the length that Program shows change as it gets shorter and longer.`
                        ),
                        edit('"hello".length()'),
                        pause(),
                        dialog(
                            'TextLiteral',
                            Emotion.Happy,
                            `Here is another grand one. It makes me chuckle. 
                            
                            It's called **repeat** and when it's evaluated, it takes whatever text it was evaluated on and repeats it however many times you say.
                            
                            Try changing the number and seeing what it evaluates too.`
                        ),
                        edit(`'hello '.repeat(5)`),
                        pause(),
                        dialog(
                            'TextLiteral',
                            Emotion.Eager,
                            `@FunctionDefinition has made so many more interesting functions for me, but I'll spare you the details. 
                            
                            You can always find me in 📕. I'm happy to share more ways to inspect and create text!`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Happy,
                            `@TextLiteral, you're always such a kind and patient teacher! 
                            It's always such a joy to work with you. 
                            
                            Are you willing to help out as I introduce our friendly neo-director to other expressions?`
                        ),
                        dialog(
                            'TextLiteral',
                            Emotion.Neutral,
                            `Yes, of course. It was splendid meeting you. I can't wait to see how you inspire us on stage!`
                        ),
                    ],
                },
                {
                    name: 'Symbol in the middle',
                    concept: 'Infix',
                    program: output(`
                        Group(Row() [
                            Phrase('1' rest: Sequence({0%: Pose(offset: Place(0m 1m)) 50%: Pose(offset: Place(0m -1m)) 100%: Pose(offset: Place(0m 1m))} duration: 2s)) 
                            Phrase('+' rest: Sequence({0%: Pose(offset: Place(0m -1m)) 50%: Pose(offset: Place(0m 1m)) 100%: Pose(offset: Place(0m -1m))} duration: 2s)) 
                            Phrase('1' rest: Sequence({0%: Pose(offset: Place(0m 1m)) 50%: Pose(offset: Place(0m -1m)) 100%: Pose(offset: Place(0m 1m))} duration: 2s)) 
                        ])`),
                    lines: [
                        output('Phrase("🥰")'),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Happy,
                            `You know, I keep thinking about @Evaluate, and how we were separated for so long. 
                            I'm so glad you wandered into our world, so we could be reconnected. 
                            I can just feel the life you're bringing out in us!`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `Speaking of @Evaluate, did you know they come in another form? 
                            
                            You saw them in ⧼function()⧽ form, but they also have this beautiful trick when a single input function is evaluated on a value.
                            Evaluate calls it @BinaryOperation.
                            
                            For example, you know that repeat function that text just showed you?
                            It looked like this.`
                        ),
                        edit(`"hi".repeat(5)`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Eager,
                            `Instead, you can have @Evaluate evaluate it with a much simpler symbol in the middle, like this.
                            
                            This means "repeat 'hi' five times". But it also means "evaluate the ⧼·⧽ function on the text value ⧼"hi"⧽ with the input ⧼5⧽."
                            
                            The function ⧼repeat⧽ just has multiple names, one of which is a symbol name ⧼·⧽.`
                        ),
                        edit(`'hi' · 5`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Serious,
                            `That reminds me of another of @TextLiteral's functions! 
                            
                            It's helpful for making one text value from multiple text values. It's called ⧼combine⧽, but also ⧼+⧽, and you can use it to add words together.
                            
                            See how I took a text value then evaluated ⧼combine⧽ on it with ⧼"verse"⧽? That made ⧼"hello verse"⧽.
                            `
                        ),
                        edit(`'hello '.combine('verse')`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Serious,
                            `But it's so much easier to just use ⧼+⧽ for this.`
                        ),
                        edit(`'hello ' + ' verse'`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `You can even string these together in a sequence to combine more than two things.`
                        ),
                        edit(`'hello ' + 'verse' + '!'`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `This is the same as a series of evaluations of combine, but without all of the parentheses and ⧼.⧽, and a symbolic name instead of a word name.`
                        ),
                        code(
                            `'hello '.combine('verse').combine('!')`,
                            true,
                            true
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `You can also use the symbolic names in this format, but it just ends up looking kind of messy, doesn't it?`
                        ),
                        edit(`'hello '.+('verse').+('!')`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Happy,
                            `This is one of the many ways that @Evaluate is amazing ♥ They are so versatile!

                            But they aren't perfect. With any @BinaryOperation, you need to always make sure to give a second input.
                            
                            This won't work, for example. One plus what? @UnparsableExpression won't be far away when this happens.
                            `
                        ),
                        edit(`1 +`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `Anyway, shall we go find find @BooleanLiteral? They are two very interesting values…`
                        ),
                    ],
                },
                {
                    name: 'Yes and no',
                    concept: 'Truth',
                    program: output(
                        `Group(Row() [Phrase("⊤") Phrase("⊥")] rest: Sequence({ 0%: Pose(tilt: 0°) 50%: Pose(tilt: 180°) 100%: Pose(tilt: 360°)} duration: 2s))`
                    ),
                    lines: [
                        output('Stage([])'),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `⧼⊤⧽! ⧼⊥⧽! Are you two around?
                            
                            They're usually all over the place, but I don't see them anywhere. 
                            `
                        ),
                        pause(),
                        dialog('⊤', Emotion.Precise, `Right here.`),
                        dialog('⊥', Emotion.Precise, `Not there.`),
                        output(
                            `multiple:10
                            Stage([Group(Grid(multiple multiple) ("⊤⊥".repeat(multiple^2) ÷ "").translate(ƒ(glyph•"") Phrase(glyph rest: Pose(color: Color(75% 0 0°)))))])`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Scared,
                            `Oh, you scared me! I knew you two wouldn't be far apart. How have you two been in our long silence?`
                        ),
                        dialog('⊤', Emotion.Precise, `Very good!`),
                        dialog('⊥', Emotion.Precise, `Not bad.`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `Not lonely? Everyone I've been talking to, @Program, @ExpressionPlaceholder, @Evaluate, they've all felt so isolated. (Except for @UnparsableExpression, they seem to be fine almost anywhere).`
                        ),
                        dialog('⊤', Emotion.Precise, `We have each other.`),
                        dialog('⊥', Emotion.Precise, `We're not alone.`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Happy,
                            `Well that's great to hear. It's good to be with you again. I wanted to introduce you to our new maybe-director. They've been meeting everyone, learning about how to put on performances with us. Do you want to tell them what you do?`
                        ),
                        dialog('⊤', Emotion.Precise, `I am true.`),
                        dialog('⊥', Emotion.Precise, `I am false.`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Sad,
                            `Yeah, but what do you do?`
                        ),
                        dialog('⊤', Emotion.Precise, `I am just true.`),
                        dialog('⊥', Emotion.Precise, `And I am not true.`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Sad,
                            `Hm. I guess that's true. But you do some things, right? I thought I made some functions for you.`
                        ),
                        dialog('⊤', Emotion.Precise, `Ah yes, three.`),
                        dialog('⊥', Emotion.Precise, `Not more, not less.`),
                        pause(),
                        edit('(⊤ & ⊤) = ⊤'),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `One was ⧼&⧽, right? It takes one of you and one other input? And evaluates to ⧼⊤⧽ if both are ⧼⊤⧽?`
                        ),
                        dialog(
                            '⊤',
                            Emotion.Precise,
                            `Correct. ⧼⊤ & ⊤ = ⊤⧽, but ⧼⊥⧽ otherwise.`
                        ),
                        dialog(
                            '⊥',
                            Emotion.Precise,
                            `Not wrong. ⧼⊤ & ⊥ = ⊥⧽, ⧼⊥ & ⊤ = ⊥⧽, ⧼⊥ & ⊥ = ⊥⧽, but ⧼⊤⧽ otherwise.`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `(This is really helpful when trying to determine if multiple expressions are all true, because it's only true when everything is true).`
                        ),
                        pause(),
                        edit('(⊤ | ⊤) = ⊥'),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `And the other one was ⧼|⧽, right? It also takes one input? But it evaluates to ⧼⊤⧽ if either is true?`
                        ),
                        dialog(
                            '⊤',
                            Emotion.Precise,
                            `Correct. ⧼⊤ | ⊤ = ⊤⧽, ⧼⊤ | ⊥ = ⊤⧽, ⧼⊥ | ⊤ = ⊤⧽, but ⧼⊥⧽ otherwise.`
                        ),
                        dialog(
                            '⊥',
                            Emotion.Precise,
                            `Not wrong. ⧼⊥ & ⊥ = ⊥⧽, but ⧼⊤⧽ otherwise.`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `(This is really helpful when trying to determine if any expressions are true, because it's true when even just one is true).`
                        ),
                        pause(),
                        edit('~⊤ = ⊥'),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Excited,
                            `But the other was ⧼~⧽? Otherwise known as ⧼not⧽?`
                        ),
                        dialog('⊤', Emotion.Precise, `Correct. ⧼~⊤ = ⊥⧽.`),
                        dialog('⊥', Emotion.Precise, `Not wrong. ⧼~⊥ = ⊤⧽.`),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `(This just reverses a truth value).`
                        ),
                        pause(),
                        output(
                            `multiple:10
                            Stage([Group(Grid(multiple multiple) ("⊤⊥".repeat(multiple^2) ÷ "").translate(ƒ(glyph•"") Phrase(glyph rest: Pose(color: Color(75% 0 0°)))))])`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `And what are you useful for, in our performances?`
                        ),
                        dialog('⊤', Emotion.Precise, `Ask @Conditional.`),
                        dialog('⊥', Emotion.Precise, `Don't ask us.`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Sad,
                            `You two… okay, we'll talk to @Conditional later. 
                            
                            (They were supposed to say that they're useful for making decisions with values, but I guess they want @Conditional to tell you about that. 
                            We'll talk to @Conditional later.).`
                        ),
                        pause(),
                        output(
                            `multiple:10
                            Stage([Group(Grid(multiple multiple) ("⊤⊥".repeat(multiple^2) ÷ "").translate(ƒ(glyph•"") Phrase(glyph rest: Pose(color: Color(75% 0 0°) tilt: 90°))))])`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `Oh! I was wondering. 
                            You two represent two really different extremes: true and false. 
                            But what about things that are … fuzzier? Like things that are kind of true, or somewhat false, or maybe even true and false at the same time? 
                            
                            Kind of like Earth looks flat, but isn't, or the sky is blue, but color is actually just an illusion that our minds create?
                            
                            What should our director do if they want to express something like that?`
                        ),
                        dialog('⊤', Emotion.Precise, `…`),
                        dialog('⊥', Emotion.Precise, `…`),
                        pause(),
                        output(
                            `multiple:10
                            Stage(
                            [
                            Group(
                            Grid(multiple multiple) 
                            ("⊤⊥".repeat(multiple^2) ÷ "").translate(
                            ƒ(glyph•"") 
                            Phrase(glyph rest: Pose(
                                color: Color(75% 0 0°) 
                                tilt: 90° 
                                offset:Place(0m (Time() ^ 2)·-0.000025m/ms^2))
                            )))])`
                        ),
                        dialog('⊤', Emotion.Precise, `… no.`),
                        dialog('⊥', Emotion.Precise, `… no.`),
                        pause(),
                        output('Stage([])'),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Serious,
                            `Hm, okay. 
                            It was worth a try! 
                            Maybe there are other ways to express these ideas I haven't thought of. 
                            Or maybe there are just limits to what data can represent…
                            
                            Will you two be okay if we go off and meet other expressions?`
                        ),
                        dialog('⊤', Emotion.Precise, `We are okay.`),
                        dialog('⊥', Emotion.Precise, `Not a problem.`),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Happy,
                            `Okay, bye, and see you soon!`
                        ),
                    ],
                },
                {
                    name: 'Let me count the ways',
                    concept: 'Numbers',
                    program: output(
                        `
                        numbers•[#]:25 → []
                        Group(Grid(5 5) numbers.translate(
                            ƒ (n•#) 
		                        (
                                    Phrase(
                                        n → ""    
                                    )
                                )
                            )
                        `
                    ),
                    lines: [
                        dialog(
                            'FunctionDefinition',
                            Emotion.Confused,
                            `
                            Those two are always so… terse! 
                            They really are inseparable though: just two of the closest friends, always complementing each other, completing each other's thoughts.`
                        ),
                        pause(),
                        output(
                            `
                            numbers•[#]:25 → []
                            Group(Grid(5 5) numbers.translate(
                                ƒ (n•#) 
                                    (
                                        off:Random(-3 3) · 1m
                                        Phrase(
                                            n → "" 
                                            rest: Sequence({
                                                        0%:Pose(offset: Place(z: 0m)) 
                                                        50%:Pose(offset: Place(z: off)) 
                                                        100%:Pose(offset: Place(z:0m))
                                                    } 1s)
                                        ))
                                    )
                                )
                            `
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Eager,
                            `We should meet @MeasurementLiteral next. 
                            They always have such interesting things to share. 
                            
                            Hey @MeasurementLiteral, are you around?
                        `
                        ),
                        dialog(
                            'MeasurementLiteral',
                            Emotion.Kind,
                            `Just 3 steps away!`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Scared,
                            `Ack, you scared me!!`
                        ),
                        dialog(
                            'MeasurementLiteral',
                            Emotion.Kind,
                            `The 78,238nd time. It's my 4th favorite hobby!`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Happy,
                            `I'm glad you're having a good time. (Deep breaths). It's been some time, hasn't it?`
                        ),
                        dialog(
                            'MeasurementLiteral',
                            Emotion.Kind,
                            `Incalculably long. I was just passing the time here, counting seconds, and then minutes, and then hours, and then weeks, and then months, and then years, and then…`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Serious,
                            `
                            Don't say decades. 
                            I can't have been that long. 
                            
                            Anyway, I wanted to introduce you to someone who might be our new director. 
                            They just showed up and bumped into me, and it turns out they're a person and interested in putting on shows with us. 
                            
                            We just met ⊤ and ⊥, but also @TextLiteral, @Evaluate, @Unparsable, @Placeholder, and @Program. 
                            We've talked about evaluating functions and given a few examples.

                            Do you want to say what you do?
                            `
                        ),
                        dialog(
                            'MeasurementLiteral',
                            Emotion.Excited,
                            `
                            I count things! 
                            I can be any number you like. 
                            Just type me in and I'll make the value you want. Like this.`
                        ),
                        edit(`1`),
                        pause(),
                        dialog(
                            'MeasurementLiteral',
                            Emotion.Excited,
                            `Or this.`
                        ),
                        edit(`1.0`),
                        pause(),
                        dialog(
                            'MeasurementLiteral',
                            Emotion.Excited,
                            `Or this.`
                        ),
                        edit(`1.01`),
                        pause(),
                        dialog(
                            'MeasurementLiteral',
                            Emotion.Excited,
                            `Or this.`
                        ),
                        edit(`∞`),
                        pause(),
                        dialog(
                            'MeasurementLiteral',
                            Emotion.Excited,
                            `Or this.`
                        ),
                        edit(`π`),
                        pause(),
                        dialog(
                            'MeasurementLiteral',
                            Emotion.Excited,
                            `Or this.`
                        ),
                        edit(`Ⅶ`),
                        pause(),
                        dialog(
                            'MeasurementLiteral',
                            Emotion.Excited,
                            `Or this.`
                        ),
                        edit(`万十一`),
                        pause(),
                        dialog('MeasurementLiteral', Emotion.Excited, `Or…`),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `Okay, okay #, we get it! But you also do something else special, right? Units?`
                        ),
                        pause(),
                        dialog(
                            'MeasurementLiteral',
                            Emotion.Excited,
                            `Oh yes, the things. Just put some symbols after a number and I'll keep track of what's being counted. Like this.`
                        ),
                        edit(`1dolphin`),
                        pause(),
                        dialog(
                            'MeasurementLiteral',
                            Emotion.Excited,
                            `Or this.`
                        ),
                        edit(`1.0thunderstorm`),
                        pause(),
                        dialog(
                            'MeasurementLiteral',
                            Emotion.Excited,
                            `Or this.`
                        ),
                        edit(`1.01toe`),
                        pause(),
                        dialog(
                            'MeasurementLiteral',
                            Emotion.Excited,
                            `Or this.`
                        ),
                        edit(`∞kittens`),
                        pause(),
                        dialog('MeasurementLiteral', Emotion.Excited, `Or…`),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `Um, ⧼1.01toe⧽? Yes, thank you @MeasurementLiteral, these are … interesting examples. And they are oh so useful when you're doing math on numbers, right?`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `And they are oh so useful when you're doing math on numbers, right?`
                        ),
                        dialog(
                            'MeasurementLiteral',
                            Emotion.Excited,
                            `Oh yes, the maths! @Function gave me so many neat kinds of arithmetic. Like this.`
                        ),
                        edit(`1 + 1`),
                        pause(),
                        dialog(
                            'MeasurementLiteral',
                            Emotion.Excited,
                            `Or this.`
                        ),
                        edit(`1000 + 9999`),
                        pause(),
                        dialog(
                            'MeasurementLiteral',
                            Emotion.Excited,
                            `Or this.`
                        ),
                        edit(`1kitty + 2kitty`),
                        pause(),
                        dialog(
                            'MeasurementLiteral',
                            Emotion.Excited,
                            `Or this.`
                        ),
                        edit(`-5s + 5s`),
                        pause(),
                        dialog(
                            'MeasurementLiteral',
                            Emotion.Excited,
                            `Or this.`
                        ),
                        edit(`2apple + 5orange`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Confused,
                            `Oops. Can you add apples and oranges?`
                        ),
                        edit(`2apple + 5orange`),
                        dialog(
                            'MeasurementLiteral',
                            Emotion.Angry,
                            `No. That's why I underlined the conflict. 
                            I don't like adding incompatible things. 
                            I can only add compatible numbers. 
                            That applies to multiplication, division, and all of my other functions.
                            
                            Do you want to fix it? 
                            Change apples to oranges or oranges to apples and the conflict will go away. 
                            
                            Make sure there's no space between the number and the unit, otherwise I don't know it's a unit.
                            
                            And make sure the units are *exactly* the same. 
                            I don't know anything about people units; they mean nothing to me. 
                            I just compare the unit names and if they don't match, BOOM!
                            `
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `That's so cool. @MeasurementLiteral, you're so good with numbers! 
                            I see @MeasurementLiteral show up in a lot of performances where placement matters, and a lot of games where we're keeping track of scores or lives or other countable things.
                            
                            @MeasurementLiteral, is there anything else you want to share with our new director?`
                        ),
                        dialog(
                            'MeasurementLiteral',
                            Emotion.Serious,
                            `192 other neat tricks.`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Happy,
                            `I think we'll have to wait. You'll be around if we want to learn more?`
                        ),
                        dialog(
                            'MeasurementLiteral',
                            Emotion.Happy,
                            `Yes, you can find me and my functions any time!`
                        ),
                    ],
                },
                {
                    name: 'Opening (re)marks',
                    concept: 'Prefix',
                    program: output(`Phrase('~')`),
                    lines: [
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `Sometimes I'm just overwhelmed by how clever everyone is here. Text, truth, numbers — these are such powerful ideas!`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `I'm still overwhelmed sometimes by how expressive @Evaluate can be. 
                            
                            You know how I was telling you that they can evaluate any function with parentheses ⧼1.add(1)⧽, but also two input functions with infix operators ⧼1 + 1⧽? 
                            Well they have one more trick for functions with only one input: the unary format.`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Serious,
                            `There are only a few of these, but they are powerful. One is really relevant to #: negation. You can just put a ⧼-⧽ in front of any number value and get its negative. For example…`
                        ),
                        edit(`-(1 + 3)`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `That little minus sign is the same as saying ⧼(1 + 3).negate()⧽ but so much more elegant.`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `The other one is similar, but for negating ⧼⊤⧽ and ⧼⊥⧽: it's like a little squiggle minus, ⧼~⧽ that just flips true to false and false to true. 
                        
                            For example, this little expression evaluates ⧼⊤ | ⊥⧽, which is ⧼⊤⧽, then flips the ⧼⊤⧽ to ⧼⊥⧽.
                        
                            This is the same as saying ⧼(⊤ | ⊥).not()⧽, but so much more sleek.`
                        ),
                        edit(`~(⊤ | ⊥)`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Happy,
                            `Isn't that just beautiful, the way that @Evaluate can take so many different forms, but really all be the same idea? They're powerful, but also expressive.
                            … I wonder how they are?`
                        ),
                    ],
                },
                {
                    name: 'Emptiness',
                    concept: 'Nothing',
                    program: output(
                        `Motion(Phrase('ø' size: 5m) vy: ◆ ? 5m/s ø)`,
                        false
                    ),
                    lines: [
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `Do you think you're okay meeting just one more value? Let's go find @NoneLiteral next. They are a bit more chill than @MeasurementLiteral.
                            
                            @NoneLiteral? Are you out there?
                            `
                        ),
                        dialog('NoneLiteral', Emotion.Bored, `…`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Excited,
                            `We found you! You seem well. How have you been, with all the silence?`
                        ),
                        dialog('NoneLiteral', Emotion.Excited, `…`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `That makes sense. I can see why you'd like the quiet. It's certainly peaceful.
                            
                            I wanted to introduce you to my new friend and potential director. They're interested in inspiring us.
                            `
                        ),
                        dialog('NoneLiteral', Emotion.Eager, `…`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `Yes, I think they have all kinds of ideas. We haven't talked about them yet, but there's plenty of time. We're just learning right now.
                            
                            Do you want to share what you do? (I can translate).`
                        ),
                        dialog('NoneLiteral', Emotion.Serious, `…`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `They represent nothing. Different from zero in that you can't add anything to it, or subtract from it. Just… nothing.`
                        ),
                        dialog('NoneLiteral', Emotion.Serious, `…`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `They said that they like to take up space where something might be. Sometimes they represent the lack of a choice in a game, sometimes they represent some default input in a function. 
                            
                            In that sense, they might represent the absence of anything.`
                        ),
                        dialog('NoneLiteral', Emotion.Neutral, `…`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `They wanted you to know that they don't really do anything. 
                            They just are. 
                            All they really do is say whether they are themselves. 
                            If they are, they evaluate to ⧼⊤⧽, and ⧼⊥⧽ otherwise.`
                        ),
                        edit(`ø = ø`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Excited,
                            `Do you remember @Phrase? 
                            Phrase was a function that actually works with @NoneLiteral a lot. 
                            Most of the inputs that Evaluate mentioned are ⧼ø⧽ by default, which for @Phrase, means that no size, font, color, etc. are specified.
                            
                            Anything else you want to share with our budding director?
                            `
                        ),
                        dialog('NoneLiteral', Emotion.Eager, `…`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `They think you're doing great! 
                            And I think you're doing great too. 
                            You've already met so many of our wonderful players. 
                            
                            And there are so many more to meet…`
                        ),
                    ],
                },
            ],
        },
        {
            name: 'Ensembles',
            program: output(
                `Group(Row((Time() ÷ 500).sin() · 1m) [Phrase('[]') Phrase('{}') Phrase('{:}')])`
            ),
            scenes: [
                {
                    name: 'Community values',
                    concept: undefined,
                    program: output(
                        `Group(Row() [Phrase('[') Phrase(" ." · (Time() ÷ 100ms)) Phrase(']')])`
                    ),
                    lines: [
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `You know what? 
                            
                            The values in our community are just so different. 
                            
                            @TextLiteral with their immense worlds of culture from the people world…
                            
                            @BooleanLiteral with their binary visions of the world… 
                            
                            @MeasurementLiteral with their endless fascination with counting things…
                            
                            @NoneLiteral with their quiet way of observing the absence of things…
                            
                            Our world is never boring!`
                        ),
                        output(
                            `Group(Stack() [Phrase('""') Phrase("⊤⊥") Phrase("#") Phrase('ø')])`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `You might wonder how they get along with each other in a group. 
                            
                            Well, there's a whole other set of folks in the Verse that are all about bringing values together in groups. 
                            
                            We call them **collections**.
                            Collections are **values** too; they're just made up of smaller values, or even other collections.
                            For example, you might have a list of @TextLiteral, or a set of @MeasurementLiteral, or even a list of lists.
                            `
                        ),
                        output(
                            `Group(Row() [Phrase("[") Phrase('"hi"') Phrase("⊤") Phrase("42") Phrase('ø') Phrase("]") ])`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `Do you want to meet them?
                           
                            Let's start with @ListLiteral first… they're the first collection I met, and probably the most visible in our community, since they're so useful in organizing other values for performances.`
                        ),
                        output(`Phrase("[]")`),
                    ],
                },
                {
                    name: 'Places, everyone!',
                    concept: 'Lists',
                    program: output(
                        `
                        clockwise: Sequence({0%: Pose(tilt: 0°) 50%: Pose(tilt: 180°) 100%: Pose(tilt: 360°)} duration: 2s)
                        counter: Sequence({0%: Pose(tilt: 0°) 50%: Pose(tilt: -180°) 100%: Pose(tilt: -360°)} duration: 2s)
                        Group(Row() [Phrase("[" rest: clockwise) Phrase("]" rest: counter) ])`
                    ),
                    lines: [
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `Hiya @ListLiteral! 
                            Are you around? 
                            I have someone I'd like you to meet.`
                        ),
                        dialog(
                            'ListLiteral',
                            Emotion.Curious,
                            `@FunctionDefinition? Is that you?`
                        ),
                        output(
                            `
                            up: Sequence({0%: Pose(offset: Place(0m -1m)) 50%: Pose(offset: Place(0m 0m)) 100%: Pose(offset: Place(0m -1m))} duration: 2s)
                            down: Sequence({0%: Pose(offset: Place(0m 1m)) 50%: Pose(offset: Place(0m 0m)) 100%: Pose(offset: Place(0m 1m))} duration: 2s)
                            Group(Row() [Phrase("[" rest: up) Phrase("]" rest: down)])`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Excited,
                            `Yes! It's me. It's been so long!`
                        ),
                        dialog(
                            'ListLiteral',
                            Emotion.Curious,
                            `It has. 
                            Day after day, night after night, no one. 
                            But you're here. 
                            
                            How? 
                            Tell me what happened, in order!`
                        ),
                        output(
                            `
                            up: Sequence({0%: Pose(offset: Place(0m 1m)) 50%: Pose(offset: Place(0m 0m)) 100%: Pose(offset: Place(0m 1m))} duration: 2s)
                            down: Sequence({0%: Pose(offset: Place(0m -1m)) 50%: Pose(offset: Place(0m 0m)) 100%: Pose(offset: Place(0m -1m))} duration: 2s)
                            Group(Row() [Phrase("[" rest: up) Phrase("]" rest: down)])`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `Well, I was sitting around, as I usually do, trying to imagine functions to compute, but just blocked. 
                            And then my new friend here showed up, curious about our world and wanting to learn more, and maybe even be our next director. 
                            And so we talked to @Program, @ExpressionPlaceholder, @UnparsableExpression, @Evaluate, @TextLiteral, @MeasurementLiteral, @BooleanLiteral, and @NoneLiteral, waking everyone up. 
                            
                            That's why we're here, to talk about what you do and our next performance!`
                        ),
                        output(
                            `
                            shake: Sequence({0%: Pose(offset: Place(0m)) 25%: Pose(offset: Place(-.1m)) 50%: Pose(offset: Place(.2m)) 75%: Pose(offset: Place(-.3m)) 100%: Pose(offset: Place(0m))} duration: 0.1)
                            Group(Row() [Phrase("[" rest: shake) Phrase("]" rest: shake)])`
                        ),
                        dialog(
                            'ListLiteral',
                            Emotion.Excited,
                            `This is amazing! 
                            It's great to meet you new director.`
                        ),
                        dialog(
                            'ListLiteral',
                            Emotion.Excited,
                            `You want to know what I do?`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `Yeah, tell them!`
                        ),
                        pause(),
                        dialog(
                            'ListLiteral',
                            Emotion.Excited,
                            `Okay. 
                            First, and most important, I put values in order. 
                            Whatever expressions you want: numbers, words, other lists — I can group anything together in sequence. 

                            For example, check out this fun list.
                            
                            Have you ever seen anything like it? It's so beautiful! The numbers 1 through 10, in order.
                            `
                        ),
                        edit(`[1 2 3 4 5 6 7 8 9 10]`),
                        pause(),
                        dialog(
                            'ListLiteral',
                            Emotion.Serious,
                            `Second, and this is serious, I always start with ⧼[⧽ and end with ⧼]⧽. 
                            That's how I know the beginning and end of my list. 
                            
                            THEY MUST ALWAYS GO IN THIS ORDER. 
                            
                            No ⧼]⧽ first, no ⧼[⧽ last, that's WRONG.
                            
                            Do you see how confusing things get? Can you fix this one?`
                        ),
                        edit(`[ 1 2 3 4`),
                        pause(),
                        dialog(
                            'ListLiteral',
                            Emotion.Serious,
                            `This one is broken too. 
                            
                            Can you fix it?`
                        ),
                        edit(`] 1 2 3 4 [`),
                        pause(),
                        dialog(
                            'ListLiteral',
                            Emotion.Sad,
                            `Sometimes people forget this and then there's brackets floating around all alone and they don't like that and then the values all go wild without any order and it's CHAOS. 
                            
                            I don't like it.`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `It's okay. We like that you like order, it's what makes you special!`
                        ),
                        pause(),
                        dialog(
                            'ListLiteral',
                            Emotion.Happy,
                            `I like that I like order too! 
                            Okay, where was I. 
                            Yes, third, and this is also critical, NO COMMAS! 
                            I know that in some cultures, people like to put commas between things in lists, but I don't like them. 
                            They're just like little bits of trash that get in the way of my elegant orderings, and people always forget them. 
                            
                            If you're having trouble seeing the boundaries between expressions, just add a line break.
                            
                            Maybe you could get rid of those pesky things? Put line breaks if you like. Anything other than commas. Gross!`
                        ),
                        edit(`[ 1, 2, 3, 4, 5]`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Eager,
                            `@ListLiteral, one of the things I like most about you is how amazing you are at manipulating lists. Do you want to show our student director here some examples?`
                        ),
                        dialog(
                            'ListLiteral',
                            Emotion.Neutral,
                            `Yes, but @FunctionDefinition, those are all your doing. 
                            
                            You represent all these beautiful functions for me that enable me to do all kinds of things!
                            
                            Like **reverse**, oh, this one is wonderful and simple. It just takes my values and puts them in the opposite order.`
                        ),
                        edit(`[ 1 2 3 4 5 ].reverse()`),
                        pause(),
                        dialog(
                            'ListLiteral',
                            Emotion.Excited,
                            `And this one is fun: **sans** just removes all of the values equal to the given value.
                            
                            See how there are no zeros left in the resulting list?`
                        ),
                        edit(`[ 1 0 1 0 1 ].sans(0)`),
                        pause(),
                        dialog(
                            'ListLiteral',
                            Emotion.Serious,
                            `Ack, I can't believe I forgot to explain the fourth rule! 
                            
                            Okay, rule number four: I never change a list. 
                            I only ever make new ones. 
                            No matter what function you evaluate on me, I always make a new list, I never change one. 
                            
                            So the reverse example above?
                            That didn't change the list, it made a new list. 
                            And the sans example? 
                            That didn't remove the zeros from the original list, it made a new list without zeros. 
                            
                            That's actually true for everything in the Verse: once values are made, they are who they are, and do not change.`
                        ),
                        pause(),
                        dialog(
                            'ListLiteral',
                            Emotion.Surprised,
                            `Oh, and that reminds me of the last rule, rule number five: I start counting at 1! 
                            Not zero, not two, 1. 
                            
                            So if you want to get the value at a particular place in a list, you can use two more ⧼[]⧽ and give the place you want.
                            
                            See how when I get ⧼3⧽, I give the third value in the list, ⧼'c'⧽? Try changing it to ⧼1⧽ or ⧼5⧽ and see what you get. 
                            
                            And then maybe try ⧼0⧽ or ⧼6⧽…
                            `
                        ),
                        edit(`['a' 'b' 'c' 'd' 'e'][3]`),
                        dialog(
                            'ListLiteral',
                            Emotion.Happy,
                            `Interesting huh? Give me a place in the list that doesn't exist and I'm going to give you @NoneLiteral. Because there's nothing there. Make sense?`
                        ),
                        pause(),
                        dialog(
                            'ListLiteral',
                            Emotion.Serious,
                            `Okay, maybe one list function, because this is my favorite. 
                            This one is called ⧼random⧽ and will give a random value in the list. 
                            It's great fun because you never know what you're going to get!
                            
                            What did you get, what did you get? Try adding your own animal and see what you get.
                            `
                        ),
                        code(
                            `['cat' 'dog' 'mouse' 'parrot' 'snake'].random()`,
                            true,
                            true
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Happy,
                            `List, you're silly. 
                            There are so many other cool things you can do, I'm always so impressed. Will you be around if your new director friend has questions?`
                        ),
                        dialog(
                            'ListLiteral',
                            Emotion.Eager,
                            `Yes, of course, always! @FunctionDefinition made so many interesting things for me to do. Just let me know what you need!`
                        ),
                    ],
                },
                {
                    name: 'One of each',
                    concept: 'Sets',
                    program: output(
                        `
                        clockwise: Sequence({0%: Pose(tilt: 0°) 50%: Pose(tilt: 180°) 100%: Pose(tilt: 360°)} duration: 2s)
                        counter: Sequence({0%: Pose(tilt: 0°) 50%: Pose(tilt: -180°) 100%: Pose(tilt: -360°)} duration: 2s)
                        Group(Row() [Phrase("{" rest: clockwise) Phrase("}" rest: counter) ])`
                    ),
                    lines: [
                        output(DarkVoid),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `@ListLiteral is so interesting. 
                            They're love of order is so endearing, and so useful! 
                            
                            I thought it might be interesting for you to meet their cousin @SetLiteral next, since they're so alike, but different in some important ways.
                            
                            @SetLiteral? I have someone you'd like to meet.`
                        ),
                        pause(),
                        dialog(
                            'SetLiteral',
                            Emotion.Curious,
                            `Oh! @FunctionDefinition! 
                            It's you! 
                            What brings you here? 
                            Is the silence over? 
                            What happened? 
                            Are we putting on a show? 
                            What is it? 
                            Where is everyone?`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `So many questions! 
                            I'm here to introduce you to someone who's considering directing. 
                            They're learning everything about the Verse and hope to share their inspiration with us! We were just talking to @ListLiteral, but we were also talking to @MeasurementLiteral, @BooleanLiteral, @TextLiteral, @Evaluate, and @Program earlier. 
                            We came to you next, because we're meeting all the collections!`
                        ),
                        pause(),
                        dialog(
                            'SetLiteral',
                            Emotion.Kind,
                            `Oh it's so wonderful to meet you new director-like person! 
                            Do you have ideas yet? 
                            What will we perform? 
                            Can I help? 
                            What do you need from me?`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `Maybe to start, just say what you do?`
                        ),
                        pause(),
                        dialog(
                            'SetLiteral',
                            Emotion.Eager,
                            `Oh yes, of course. I collect things. (Hm, obviously, I am a collection). But most importantly, I only collect one of each kind of thing. I can gather whatever you like, and help you keep track of values, but I will never repeat a value. I like to arrange myself a little like @ListLiteral, but with ⧼{⧽ and ⧼}⧽ instead:`
                        ),
                        edit(`{ 1 2 3 4 5 }`),
                        pause(),
                        dialog(
                            'SetLiteral',
                            Emotion.Neutral,
                            `That's a set. But like I said, no duplicates. So if you give me this, I'm going to get rid of the extras.`
                        ),
                        edit(`{ 1 2 2 3 3 3 }`),
                        pause(),
                        dialog(
                            'SetLiteral',
                            Emotion.Curious,
                            `Also like @ListLiteral, you can use ⧼{}⧽ after a set to see if a value is contained in the set. 
                            You'll either ⧼⊤⧽ if it is or ⧼⊥⧽ if it's not.
                            
                            Let's see if ⧼3⧽ is missing from this set. 
                            Yep, not there! 
                            Try adding ⧼3⧽ back to the set.`
                        ),
                        edit(`{ 1 2 4 5 }{3}`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `@SetLiteral, are there other things you can do with set values?`
                        ),
                        dialog(
                            'SetLiteral',
                            Emotion.Eager,
                            `Why yes, of course, so many, thanks to you. 
                            What do you want to see me do? 
                            Do you have a performance in mind? 
                            How can I help? 
                            What can I do?`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `Maybe, ⧼difference⧽?`
                        ),
                        dialog(
                            'SetLiteral',
                            Emotion.Neutral,
                            `Yes, ⧼difference⧽. 
                            When evaluated on a set, and given another set, it removes all of the items from the given set from the set evaluated on. 
                            (Hm, those were some clumsy words, but that was what I meant).
                            
                            Here's an example.
                            
                            See how the result is just the set of ⧼{3}⧽? 
                            That's the only value that remains after removing the values in ⧼{ 1 2 }⧽.`
                        ),
                        edit(`{ 1 2 3 }.difference({ 1 2 })`),
                        pause(),
                        dialog(
                            'SetLiteral',
                            Emotion.Eager,
                            `You can also add and remove things from sets. This takes the set ⧼{1}⧽, adds ⧼2⧽ to it, then removes 1 from it, leaving ⧼{ 2 }⧽.`
                        ),
                        edit(`({ 1 } + 2) - 1`),
                        dialog(
                            'SetLiteral',
                            Emotion.Neutral,
                            `There's lots more I can do thanks to @FunctionDefinition here. Come find me anytime you want to learn more!`
                        ),
                        pause(),
                        output(DarkVoid),
                        dialog(
                            'SetLiteral',
                            Emotion.Curious,
                            `Oh, and hey @FunctionDefinition, you said you saw @Evaluate?`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Sad,
                            `Yes, I did.`
                        ),
                        pause(),
                        dialog('SetLiteral', Emotion.Curious, `How are they?`),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Sad,
                            `They're okay. We're okay. I think. It's been too long since we've danced together…`
                        ),
                        dialog(
                            'SetLiteral',
                            Emotion.Curious,
                            `It has. But with our new director, we will dance again!`
                        ),
                    ],
                },
                {
                    name: 'One to one',
                    concept: 'Mappings',
                    program: output(
                        `
                        clockwise: Sequence({0%: Pose(tilt: 0°) 50%: Pose(tilt: 180°) 100%: Pose(tilt: 360°)} duration: 2s)
                        counter: Sequence({0%: Pose(tilt: 0°) 50%: Pose(tilt: -180°) 100%: Pose(tilt: -360°)} duration: 2s)
                        Group(Row(0m) [Phrase("{" rest: clockwise) Phrase(":") Phrase("}" rest: counter) ])`
                    ),
                    lines: [
                        output(DarkVoid),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `There's just one more collection I'd like to introduce you to. 
                            They're a bit like @SetLiteral in some ways, and even use the same braces, but they're different in one important way: they're a connector. 
                            They're name is @MapLiteral.`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `@MapLiteral? Are you out there?
                            The silence is breaking!`
                        ),
                        pause(),
                        dialog(
                            'MapLiteral',
                            Emotion.Curious,
                            `Breaking? 
                            Was it ever really silent? 
                            It's so good to see you @FunctionDefinition. 
                            
                            Oh my, have you talked to @Evaluate? 
                            They were not in good shape last time we talked. 
                            You have to talk to them.
                            `
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Sad,
                            `Yes, I talked to them...`
                        ),
                        pause(),
                        dialog(
                            'MapLiteral',
                            Emotion.Curious,
                            `
                            Oh good.
                            Okay, because there's some repair to do there my friend...
                            
                            How have you been?`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `I've been okay, just a bit lonely, and a lot bored.`
                        ),
                        pause(),
                        dialog(
                            'MapLiteral',
                            Emotion.Excited,
                            `Oh, I'm so sorry to hear that. 
                            I've been staying connected with everyone during the silence and just figured you and @Evaluate had each other! 
                            I really would have been happy to talk any time. 
                            I've just been so busy keeping up with the gossip between @ListLiteral and @SetLiteral, and that weird tension between @Conditional and @BooleanLiteral. 
                            
                            Do you know what's going on between them?`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Surprised,
                            `No, I don't at all. 
                            There's tension? 
                            And what gossip?`
                        ),
                        pause(),
                        dialog(
                            'MapLiteral',
                            Emotion.Neutral,
                            `Well, maybe not in front of our guest here. 
                            
                            You must be the new person everyone is talking about. 
                            I hear you're going to be our new director? 
                            What kind of fabulous ideas do you have in store for us? 
                            Singing? 
                            Dancing? 
                            As long as it's bright, playful, and strange, I'm here for it!`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `No need to pressure them! I'm sure they have lots of ideas. We're just trying to make some space for learning and connecting before we figure out the first show. 
                            
                            Can you share what you do?`
                        ),
                        pause(),
                        dialog(
                            'MapLiteral',
                            Emotion.Eager,
                            `I connect! 
                            I'm kind of like a dictionary: give me a value and I'll give you the definition it corresponds to. 
                            @FunctionDefinition told you about values? 
                            I map them, one to one, from one value, to another. 
                            Give me a key, I'll give you the value it corresponds to.
                            
                            For example, here's a mapping from names to a point tally. Names are the key, points are the value.`
                        ),
                        code(
                            `{ 'ben': 2points 'joe': 5points 'kate': 12points }`,
                            true,
                            true
                        ),
                        pause(),
                        dialog(
                            'MapLiteral',
                            Emotion.Serious,
                            `But like @SetLiteral, I don't like duplicates. You can't have more than one of the same key, but you can have as many unique keys mapped to equivalent values as you like.
                            
                            For example, this gives me two ⧼"ben"⧽ keys, but I just use the last one. 
                            But it's okay that ⧼"ben"⧽ and ⧼"joe"⧽ have the same number of points, because they're different keys.`
                        ),
                        code(
                            `{'ben': 2points 'ben': 5points 'joe': 5points 'kate': 12points }`,
                            true,
                            true
                        ),
                        dialog(
                            'MapLiteral',
                            Emotion.Excited,
                            `It's my partnership with @Bind that makes me special! 
                            It's how I connect values to other values. 
                            
                            (Have you met @Bind yet? No? Ohhhh, you're going to adore them. They are FABULOUS.)`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `@MapLiteral, what if you want an empty mapping? 
                            How is that different from an empty set, ⧼{}⧽?`
                        ),
                        dialog(
                            'MapLiteral',
                            Emotion.Neutral,
                            `Oh, that's just me all by myself! Little @Bind and I just hang out, no keys or values.`
                        ),
                        edit(`{:}`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `And what if our director doesn't provide a value or a key? Like this? Like, ⧼3⧽ has no value?`
                        ),
                        edit(`{1:1 2:2 3 }`),
                        dialog(
                            'MapLiteral',
                            Emotion.Serious,
                            `Oh… DON'T do that. 
                            I only like pairs. 
                            Is 3 a key? 
                            A value? 
                            Totally confusing. 
                            Stop the show.`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `And if our director wants to get a value from a key?`
                        ),
                        dialog(
                            'MapLiteral',
                            Emotion.Neutral,
                            `Just like @SetLiteral: just put a ⧼{}⧽ after a map and give me the key you want.`
                        ),
                        code(
                            `{ 'ben': 2points 'joe': 5points 'kate': 12points }{'ben'}`,
                            true,
                            true
                        ),
                        pause(),
                        output(DarkVoid),
                        dialog(
                            'MapLiteral',
                            Emotion.Neutral,
                            `Otherwise, I'm a lot like @SetLiteral: I can do a lot of the same functions. Stop by any time and I'm happy to show you more!`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `Thank you @MapLiteral! *You* are fabulous.`
                        ),
                    ],
                },
            ],
        },
        {
            name: 'Cast party',
            program: output(
                `
                count: 32

                gravity•#m/s^2: 15m/s^2
            
                Stage(count → [].translate(
                    ƒ(_) Motion(
                        Phrase(
                            "→?'" → [].random() 
                            place: ◆ ? Place(y: 10m) ø
                        ) 
                        vx: ◆ ? Random(-5 5) · 1m/s ø 
                        vangle: ◆ ? Random(0 360) · 1°/s ø
                        bounciness: Random()
                        gravity: gravity
                        )
                    ))`,
                false
            ),
            scenes: [
                {
                    name: 'Types',
                    concept: undefined,
                    program: output(DarkVoid),
                    lines: [
                        dialog(
                            'FunctionDefinition',
                            Emotion.Surprised,
                            `I can't believe how many characters we've met so far. 
                            Does it feel like a lot? 
                            
                            It also feels like we've barely made any progress. 
                            I haven't even gotten to show you the most exciting parts of putting on shows!`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Serious,
                            `Would you mind if we just stopped by to meet two others before we get to the truly exciting parts? 
                            These two characters are just so integral to working with values, and particularly text, we just have to talk about them before we get to the more spectacular things.`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `What are they? 
                            Conversions. 
                            They are the alchemy of this world, that help change one type of value to another. 
                            Let's go meet them.`
                        ),
                    ],
                },
                {
                    name: 'We can be anything',
                    concept: 'Convert',
                    program: output(FlyIn('→')),
                    lines: [
                        output(DarkVoid),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `Hey @Convert! 
                            You there?`
                        ),
                        dialog(
                            'Convert',
                            Emotion.Happy,
                            `Duuuuude, @FunctionDefinition, it's been epochs! 
                            You're looking stylish. 
                            It's been super quiet lately, hasn't it? 
                            
                            You have a new friend?`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `Yes, this person here is interested in directing. 
                            
                            We're on the grand tour — we've met @Program, @ExpressionPlaceholder, @UnparsableExpression, @Evaluate, and all the values and collections. 
                            I figured that meeting you next would be perfect, since you work so closely with values.`
                        ),
                        dialog(
                            'Convert',
                            Emotion.Kind,
                            `Heck yeah, values are my best buds. We like to do parkour on the weekends — or shows, or whatever.`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `Parkour?`
                        ),
                        dialog(
                            'Convert',
                            Emotion.Serious,
                            `Yeah, you know, like gymnastics on the streets, leaping over things, spanning buildings, like high wire stuff but without wires. Courageous leaps!`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Serious,
                            `Ohhh, I see what you mean. 
                            Yes, I guess what you do is kind of like parkour. 
                            
                            I'm not sure our new director friend here follows though. 
                            Could you explain without the metaphors?`
                        ),
                        pause(),
                        dialog(
                            'Convert',
                            Emotion.Kind,
                            `Happy to bro. So like, imagine you had a number.`
                        ),
                        edit(`1`),
                        pause(),
                        dialog(
                            'Convert',
                            Emotion.Kind,
                            `And imagine you wanted it to be text. Throw me in there with @TextType and BAM, you've got text!`
                        ),
                        edit(`1 → ""`),
                        pause(),
                        dialog(
                            'Convert',
                            Emotion.Serious,
                            `Or like, imagine you had text and wanted a number. Throw me in there with @MeasurementType and POP, you've got a number!`
                        ),
                        edit(`"1"→#`),
                        pause(),
                        dialog(
                            'Convert',
                            Emotion.Surprised,
                            `But you want to see some, like, serious mojo? Say you've got some text and you want its characters in a list. Throw me in there with @ListType and HAAAAAA, you've got a list of letters.`
                        ),
                        edit(`"halloween"→[]`),
                        pause(),
                        dialog(
                            'Convert',
                            Emotion.Serious,
                            `But me and @MeasurementType? We have been practicing some seriously sick tricks. Say you've got some time in days and you want seconds? We got you.`
                        ),
                        edit(`5day → #s`),
                        pause(),
                        dialog(
                            'Convert',
                            Emotion.Excited,
                            `But the real wicked tricks? 
                            Chaining. 
                            Like multiple conversions in a row. 
                            
                            Check this one out. 
                            Days to seconds to text to list, all in one chain. 
                            Now we've got a list of digits. 
                            
                            Sweet!`
                        ),
                        edit(`1day → #s → "" → []`),
                        pause(),
                        dialog(
                            'Convert',
                            Emotion.Neutral,
                            `So like, my deal is that everything should be everything, no boundaries. 
                            Anything can be anything. 
                            (Like, not anything, but you know, as much as I can). 
                            But like, why should anything ever be trapped in one identity, you know? 
                            
                            Liberation, man, liberation.`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `That is amazing, @Convert, and so inspiring. 
                            
                            But anything, really?`
                        ),
                        dialog(
                            'Convert',
                            Emotion.Sad,
                            `Well, not like, anything. 
                            I mean, if you give me seconds and ask for a @SetType, like, what does that even mean?

                            I'll do my best to find a way... 
                            like, here, I know how to turn numbers into @TextType and @TextType into a @SetType, so I'll give you the set of symbols in the text form of this number.

                            But that's probably not what you wanted...

                            And, if I don't know how to give you what you asked for, I'm basically going to shut things down.`
                        ),
                        edit(`10s → {}`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Serious,
                            `Right, that makes sense. 
                            So there are only some conversations, not all possible conversions.`
                        ),
                        dialog(
                            'Convert',
                            Emotion.Sad,
                            `Yeahhh… you can always check a type of value and see what types of conversions they support.`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `Did you know that @Convert and @Evaluate are related? 
                            They're like cousins. 
                            
                            @Evaluate will evaluate any function, but @Convert will evaluate any conversion. 
                            In a way, @Evaluate does conversion too, from inputs to outputs.`
                        ),
                        dialog(
                            'Convert',
                            Emotion.Scared,
                            `Whoa. I never thought of it that way. 
                            Like, I convert inputs to outputs, and @Evaluate converts inputs to outputs. 
                            And like, @FunctionDefinition, you tell us how to convert inputs to outputs. 
                            
                            Is that like, the secret of the Verse? 
                            Like everything is about converting inputs to outputs?`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Serious,
                            `I guess so? Wow...`
                        ),
                        dialog('Convert', Emotion.Surprised, `🤯`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `@Convert, how should our new director find out what kinds of conversions are possible?`
                        ),
                        dialog(
                            'Convert',
                            Emotion.Scared,
                            `Sorry bro, I'm still a bit shaken. 
                            Uhhh, they can check out any of the value types. 
                            There should be a list of the other types I can change them into… everything is conversion…`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Happy,
                            `It was so great to see you @Convert! 
                            We're going to head out and meet others. 
                            
                            See you soon?`
                        ),
                        dialog(
                            'Convert',
                            Emotion.Surprised,
                            `Soon. Yeah… Yes! Totally, yes.`
                        ),
                    ],
                },
                {
                    name: 'Freedom of speech',
                    concept: 'Templates',
                    program: output(FlyIn('"')),
                    lines: [
                        output(DarkVoid),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `I love @Convert. 
                            They're so creative, so courageous. 
                            
                            I thought we might see someone that does similar work with values as @Convert. 
                            They're called @Template and they're all about assembling @TextType from other values.
                            
                            @Template, are you here? The silence is broken! We have an aspiring director-person!`
                        ),
                        pause(),
                        dialog(
                            'Template',
                            Emotion.Surprised,
                            `Silence! 
                            What silence? 
                            There's so much to say, we could never run out of words. 
                            Ideas, however, those are more rare these days, aren't they? 
                            
                            It's my pleasure to see you again @FunctionDefinition, how have you held up in these quiet times?`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Sad,
                            `Well enough. Better now that we're all coming back together. I've missed everyone so much!`
                        ),
                        pause(),
                        dialog(
                            'Template',
                            Emotion.Kind,
                            `I've missed you as well. 
                            You are such an essential part of our community, @FunctionDefinition, encoding all the wondrous ideas that come from the outside world, so that we may enjoy them. 
                            So this must be the new director, full of ideas?`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Happy,
                            `Yes, they just arrived! I've been introducing them to everyone; we just met all the values and collections, and just talked to @Convert. 
                            We haven't talked about input and output yet, but I wanted to stop by to see you first, since you and @Convert work so closely together.`
                        ),
                        pause(),
                        dialog(
                            'Template',
                            Emotion.Serious,
                            `We do, don't we? An odd couple we are. They are so — free. 
                            It makes me uncomfortable sometimes. 
                            But I like to think that I bring a little order to our partnership, and a little ceremony.`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `Do you want to share what you do?`
                        ),
                        pause(),
                        dialog(
                            'Template',
                            Emotion.Neutral,
                            `Happily. 
                            To put it simply, I work with @TextLiteral make new text from any values you might give me. 
                            Ultimately, they all need to be text, and so you'll have to work with @Convert to get them that way. 
                            But once you give me all that text, I'm happy to stitch it together and assemble your beautiful prose into a single text value for display, or whatever other purposes you might have.`
                        ),
                        pause(),
                        dialog(
                            'Template',
                            Emotion.Serious,
                            `For example, did @FunctionDefinition show you how text knows how to add itself to other text? 
                            Like this? 
                            This little expression converts 7 to text, then adds it to ⧼'I have'⧽, then adds ⧼'apples'⧽. 
                            But it's so untidy, and makes it hard to read what's happening, and the conversion to text feels so unnecessary.`
                        ),
                        edit(`'I have' + (7→"") + 'apples'`),
                        pause(),
                        dialog(
                            'Template',
                            Emotion.Serious,
                            `What I do is make text like this clean, organic, and simple, even. 
                            So that same phrase with me would be something like this.`
                        ),
                        dialog(
                            'Template',
                            Emotion.Happy,
                            `
                            Isn't that so much more elegant? 
                            You can put me anywhere inside a @TextLiteral, and I'll make your values into text, and work with @TextLiteral to make a @TextType.

                            This makes it so much easier to write beautiful prose that uses values.
                            `
                        ),
                        edit(`"I have \\7\\ apples"`),
                        pause(),
                        dialog(
                            'Template',
                            Emotion.Neutral,
                            `And when I say any expression, I really do mean any. 
                            For example, imagine you wanted to do some arithmetic and created some text with the result. 
                            You might do this.
                            
                            This sums several numbers and then makes text with the sum. 
                            Truly wondrous, isn't it? 
                            And so much more graceful than ⧼'I have ' + (1 + 2 + 5 + 8) + ' apples'⧽, with all those extra additions.`
                        ),
                        edit(`"I have \\1 + 2 + 5 + 8\\ apples"`),
                        pause(),
                        output(DarkVoid),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Excited,
                            `This is so very graceful, isn't it! @Template, I love how much you appreciate the beauty in expression. 
                            It inspires me so much to be graceful myself!`
                        ),
                        dialog(
                            'Template',
                            Emotion.Happy,
                            `Why thank you @FunctionDefinition, I am proud of what I do. 
                            I hope you are proud of what you do, because I certainly couldn't do it without you. 
                            Inside me are infinite depths of @FunctionDefinition that you made by you that allow me to do my work. 
                            I cherish what you have empowered me to do.`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `Thank you @Template, that's so kind. 
                            We're going to head out and make one more stop to meet @Conditional.`
                        ),
                        dialog(
                            'Template',
                            Emotion.Excited,
                            `Oh dear, @Conditional, my new director friend, you are in for such an intellectual treat! 
                            @Conditional is simply divine in how they question the order of the world. 
                            Enjoy!`
                        ),
                    ],
                },
                {
                    name: 'How to choose?',
                    concept: 'Decisions',
                    program: output(FlyIn('?')),
                    lines: [
                        output(DarkVoid),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `We've met so many kinds of values on our journey so far, and talked about so many ways of working with them. 
                            There's just one more I wanted to introduce you to. 
                            They're particularly special because they're what make our performances so dynamic. 
                            They're called @Conditional and they are the central character in the Verse that makes **decisions**.`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Serious,
                            `To be clear, not all decisions: I have my own life, and they have theirs. 
                            But in a performance, when we're trying to decide what to do next on stage, it's all up to them to follow your guidance as director and decide what to do. 
                            So they're a key partner creating exciting performances.`
                        ),
                        pause(),
                        output(SpinningInTheDark('?')),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `@Conditional, the silence is breaking! We might put on shows again!`
                        ),
                        dialog(
                            'Conditional',
                            Emotion.Curious,
                            `@FunctionDefinition? 
                            The silence is breaking? 
                            What is silence? 
                            How does one break it? 
                            Are we every really silent? 
                            Who is this person? 
                            Are they the one breaking it?`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Serious,
                            `Yes, the silence is breaking, and they are the one! 
                            They're a person, and they came to inspire us, and direct our shows. 
                            We've been talking about conversions, and meeting all the values and @Template and @Convert and I wanted them to meet you! 
                            
                            In a way, you're the most special of conversions, because you enable us to convert situations to new values.`
                        ),
                        dialog(
                            'Conditional',
                            Emotion.Curious,
                            `Do I? 
                            I do make decisions, but what I really do is encode the decisions that directors tell me to make, so is it really me making the decisions?`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `I think so, yes. 
                            It's more like the director encodes the decision, but then delegates them to you. 
                            You become the decider. 
                            Do you want to show an example?`
                        ),
                        dialog('Conditional', Emotion.Curious, `Like this?`),
                        edit(`1 > 5 ? 'more' 'less'`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Excited,
                            `Yes, exactly like that! 
                            Do you see how there's four parts to @Conditional's format? 
                            There's a condition first, then ⧼?⧽, then a true expression, then a false expression. 
                            What @Conditional does is evaluate the condition, and if it's true, they evaluate the yes expression. 
                            Otherwise, they evaluate the *no* expression. 
                            
                            It's such a powerful way of deciding!`
                        ),
                        dialog(
                            'Conditional',
                            Emotion.Curious,
                            `Is it? Even something like this?`
                        ),
                        edit(`1 > 5 ? 'less' 'more'`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Sad,
                            `Errr, hm. I guess that is a decision, but it's a wrong one. 
                            One isn't less than five. 
                            I guess your decisions aren't always right, but they are reliable, right?`
                        ),
                        pause(),
                        dialog(
                            'Conditional',
                            Emotion.Curious,
                            `Reliable? Maybe? If you accept that I just decide whatever the director tells me, then yes, but what if the director tells me this?
                            
                            That looks like a decision, but I will never decide 'big' — is that really a decision?`
                        ),
                        edit(`[1 2 3].random() > 3 ? 'big' 'small'`),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Confused,
                            `Hm, I guess that's a good point. 
                            I guess whether something is a decision depends a lot on what the director's decision is. 
                            I guess that means the director has to think pretty carefully about the decisions they give you?`
                        ),
                        pause(),
                        dialog(
                            'Conditional',
                            Emotion.Curious,
                            `Carefully? Skeptical, maybe? Have you thought about my good friends @BooleanLiteral? 
                            How is their view of the world possibly enough to represent all of the decisions we might want to make? 
                            What if, for example, we wanted a performance that took someone's name and decided if it was beautiful or not? 
                            Is that a true or false decision? 
                            
                            Is that even a decision we should make? 
                            
                            Doesn't it seem awfully reductive and biased?

                            Director, what letters do you think make a name beautiful?`
                        ),
                        edit(`"Verse".has('e') ? 'beautiful' 'ugly'`),
                        pause(),
                        dialog(
                            'Conditional',
                            Emotion.Curious,
                            `And think about the questions I answer — why can I only respond to ⧼⊤⧽ and ⧼⊥⧽? 
                            Why not a number? 
                            Don't I have a right to decide if ⧼1⧽ is beautiful?`
                        ),
                        edit(`1 ? 'beautiful' 'ugly'`),
                        pause(),
                        output(SpinningInTheDark('?')),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Sad,
                            `I guess I never really thought about it that way. 
                            
                            But @Conditional, even if you have limitations, you are beautiful. 
                            
                            You enable us to do so much in our performances that we couldn't do otherwise. 
                            
                            You make so much joy and laughter possible. 
                            
                            Our director hasn't even seen the amazing things you're capable of yet.`
                        ),
                        dialog(
                            'Conditional',
                            Emotion.Curious,
                            `Do you really think that? 
                            That I'm beautiful? 
                            I only ever see my limits, but maybe those limits are still worthwhile?`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `They absolutely are. 
                            And I'm excited to show our new friend here just how worthwhile they are.
                            
                            Will you be around when I do?`
                        ),
                        dialog(
                            'Conditional',
                            Emotion.Happy,
                            `Could anything make me more happy?`
                        ),
                    ],
                },
            ],
        },
        {
            name: 'Scene change',
            program: output(TakeTheMic, false),
            scenes: [
                {
                    name: 'Input',
                    concept: undefined,
                    program: output(DarkVoid),
                    lines: [
                        output(
                            `amp: (Mic() ÷ 10)
                            Phrase(".".repeat(amp.truncate()) rest: Pose(scale: amp))`,
                            false
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `Did you know that your world and ours are connected?
                            
                            Make some sound and we can hear it...`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Serious,
                            `You didn't know the Verse existed, but we know that yours does. 
                            Because it's your world that makes our world interesting.

                            You probably noticed this as we've wandered and met all of the values, collections, and conversations. 

                            What do any of these values *mean* if there's no person *giving* them meaning, or providing the values in the first place?`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `I want to show you the connection between our worlds, and what they make possible. 
                            
                            We call them **input streams**, and they are perhaps the most magical kind of input in the Verse. 
                            They're like functions that create a special kind of value that changes as your world changes.
                            
                            They also can't communicate in the ways you might be used to. 
                            They're more like heartbeats from another world. 
                            So I'll do my best to explain how they work, since they won't be able to explain themselves.

                            Are you ready to meet one?
                            `
                        ),
                    ],
                },
                {
                    name: 'Tick, tick, tick...',
                    concept: 'Time',
                    program: output(`Phrase("🕦")`),
                    lines: [
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `Let's start with the most elemental stream of all: @Time.
                            
                            To make a stream, we use @Evaluate, and give the name of the type of stream you want.
                            `
                        ),
                        dialog(
                            'Time',
                            Emotion.Neutral,
                            `tick tick tick tick tick…`
                        ),
                        edit(`Time()`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `Do you see how time is changing? 
                            
                            Streams are a series of values.
                            Every time a stream gets a new value, @Program reevaluates with the new stream value.
                            
                            That's why this program just keeps counting up: we made a time stream that starts at time 0 milliseconds, and then just keeps updating every time its clock ticks. 
                            This time is your time, from your world.`
                        ),
                        dialog(
                            'Time',
                            Emotion.Neutral,
                            `tick tick tick tick tick…`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `See that 1000? It tells @Time to tick every 1000 milliseconds instead of the default of every 33 milliseconds, it's default. 
                            
                            Now it's like a counter that ticks every second. These inputs that @Time takes are like a configuration: they tell the stream how to behave.`
                        ),
                        dialog(
                            'Time',
                            Emotion.Neutral,
                            `tick… tick… tick… tick… tick…`
                        ),
                        edit(`Time(1000ms)`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Serious,
                            `But we can use all of the wonderful characters we've met to transform time further. 
                            For example, what if we wanted to know if time was a multiple of ⧼2⧽? We could use **remainder**, which gets the remainder of a division. 
                            
                            If the remainder is zero, we'll evaluate to ⧼⊤⧽ and ⧼⊥⧽ otherwise.
                            
                            See how it changes back and forth between ⧼⊤⧽ and ⧼⊥⧽? It's so magical.`
                        ),
                        dialog(
                            'Time',
                            Emotion.Neutral,
                            `tick… tick… tick… tick… tick…`
                        ),
                        edit(`(Time(1000ms) % 5) = 2ms`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `There's another thing you might have noticed: there's an area below the output that is a timeline. 
                            
                            It updates each time the program reevaluates, which is each time a stream changes. 
                            It's showing every time @Time ticks. 
                            `
                        ),
                        dialog(
                            'Time',
                            Emotion.Neutral,
                            `tick… tick… tick… tick… tick…`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `Try dragging on the timeline, using the timeline buttons, using the arrow keys with the timeline focused, or pressing the ⏸️ and ▶️ buttons. 
                            You can go backwards in time, to see previous evaluations.
                            
                            The dashed arrows step to previous and future stream inputs. 
                            The solid ones step between different steps of the program. 
                            
                            Try navigating time, and seeing what the program shows. 
                            This is how you can see all of the beautiful expressions you've learned about being evaluated by @Evaluate, one step at a time, resulting in the final value that @Program displays on stage.
                            `
                        ),
                        dialog(
                            'Time',
                            Emotion.Neutral,
                            `tick… tick… tick… tick… tick…`
                        ),
                        edit(`Time(1000ms)`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `@Time is an interesting stream because it can be used for many different things: keeping track of how long a performance has been happening, timing some event, animating a word. 
                            It's one of the most flexible streams, but also one of the most abstract.`
                        ),
                    ],
                },
                {
                    name: 'Clickity clack',
                    concept: 'Key',
                    program: output(`Phrase("⌨️")`),
                    lines: [
                        output(
                            `Phrase("⌨️" rest: Sequence({0%: Pose(tilt: -5°) 25%: Pose(tilt: 0°) 50%: Pose(tilt: 5°) 75%: Pose(tilt: 0°) 100%: Pose(tilt: -5°)} 1s 'straight'))`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Serious,
                            `If I'm not mistaken, there's a thing in your world called a “keyboard”? 
                            
                            It's a way of selecting which one of us you want to appear in your documents, right? 
                            
                            Well in the Verse, we receive these requests as a stream of text, each text value representing the key that was pressed. 
                            We use these to listen to what people in your world are typing.
                            
                            This stream is called @Key.`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `Here's a simple example. 
                            Click the stage or focus it with the keyboard and then press any keyboard key. 
                            You'll see the key you've typed appear by name. 
                            
                            That's because each time the key stream changes, @Program evaluates the key stream as its latest value, and then shows it on stage.`
                        ),
                        dialog(
                            'Key',
                            Emotion.Neutral,
                            `clickety clickety clickety`
                        ),
                        edit(`Phrase(Key())`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Serious,
                            `This stream will change any time any key is pressed. 
                            
                            But you can tell a key stream to just change when a particular key is pressed.
                            
                            See how the stream changes to ⧼a⧽ the first time, but then doesn't change after? 
                            
                            That's because this stream only changes when ⧼a⧽ is pressed, so it's always showing ⧼a⧽.
                            But you'll always see the new key value appear in the timeline.`
                        ),
                        dialog('Key', Emotion.Neutral, `clickety 'a'…`),
                        edit(`Phrase(Key('a'))`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `Sometimes it's helpful to know when a key is released, instead of pressed. 
                            Just pass ⧼⊥⧽ to tell the @Key stream that you to know when a key is released instead of pressed.
                            
                            Now, press and hold the 'a' key and then when you release, you'll see the 'a' appear on stage.
                            
                            Didn't catch it? 
                            Press the ↻ button to reset the performance and try it again.`
                        ),
                        dialog('Key', Emotion.Neutral, `clickety 'a'…`),
                        edit(`Phrase(Key('a' ⊥))`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `@Key streams are really helpful when you want a performance to react to keys that the audience presses. 
                            
                            For example, you could check if a key has the word "Arrow" in it to decide if an arrow key was pressed.
                            
                            Press an arrow key and you'll see ⧼'move'⧽, press something else and you'll see ⧼'stay'⧽`
                        ),
                        dialog('Key', Emotion.Neutral, `clickety 'Arrow'…`),
                        edit(`Phrase(Key().has('Arrow') ? 'move' 'stay')`),
                    ],
                },
                {
                    name: 'Hummmmmmm…',
                    concept: 'Pointer',
                    program: output(`Phrase("👆🏻")`),
                    lines: [
                        output(
                            `Phrase("👆🏻" rest: Sequence({0%: Pose(offset: Place(0m 0m)) 25%: Pose(offset: Place(-1m 1m)) 50%: Pose(offset: Place(1m 1m)) 75%: Pose(offset: Place(1m 0m)) 100%: Pose(offset: Place(0m 0m))} 3s))`,
                            true
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `You also have something called a "mouse" in your world, and "trackpads", and "touchscreens"? 
                            
                            These appear in our world as streams @Pointer, which is a stream of places on stage.`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `Move your pointer around the stage and you'll see the stream of @Place change on stage.`
                        ),
                        edit(`Pointer()`),
                        dialog('Pointer', Emotion.Neutral, `wzzzzzzzzz…`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Excited,
                            `@Pointer can be fun if you want to link the place of a phrase to where the pointer is.`
                        ),
                        code(`Phrase("hi" place: Pointer())`, false, true),
                        dialog('Pointer', Emotion.Neutral, `wzzzzzzzz…`),
                    ],
                },
                {
                    name: 'And... now!',
                    concept: 'Button',
                    program: output(`Phrase("🖱️")`),
                    lines: [
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `@Button is like @Key, but corresponds to the primary pointer button, like a click or tap. 
                            
                            It's just a stream of ⧼⊤⧽, indicating when the pointer button is pressed down.
                            
                            Press that button and watch the events appear on the timeline.`
                        ),
                        dialog(
                            'Button',
                            Emotion.Neutral,
                            `click… click… click…`
                        ),
                        edit(`Button()`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `You can configure it to only list to up or down by passing it a ⧼⊤⧽ or ⧼⊥⧽.`
                        ),
                        dialog('Button', Emotion.Neutral, `down… down… down…`),
                        edit(`Button(⊥)`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Excited,
                            `Using a @Button stream is one way to advance through stages of a performance, or to trigger some change in a performance. 
                            
                            This little program lists to button presses, and starts off showing sad, but when the @Button stream changes to true, @Conditional evaluates to ⧼'happy'⧽ instead.`
                        ),
                        edit(`Phrase(Button(⊥) ? 'sad' 'happy')`),
                    ],
                },
                {
                    name: 'Is anyone listening?',
                    concept: 'Mic',
                    program: output(`Phrase("🎤")`),
                    lines: [
                        dialog(
                            'FunctionDefinition',
                            Emotion.Excited,
                            `Your world and our world also has sound. 
                            Did you know we can hear you, with your consent? 
                            
                            We listen with a stream called @Mic, which provides a low-level sequence of amplitudes.
                            
                            Your mic might ask for permission to be shared with us.
                            Once you do, you'll see a number that corresponds to amplitude, between ⧼0⧽ and ⧼100⧽.`
                        ),
                        dialog('Mic', Emotion.Neutral, `bzzzZZZZZzzzzzZZZZ…`),
                        edit(`Mic()`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `@Mic can be used to make performances respond to sound from the audience. 
                            
                            For example, here we could make a little amplitude visualization by converting the amplitude number from the stream to a certain number of ⧼'o'⧽ characters.
                            
                            See how when you make noise, there are more ⧼'o'⧽s? 
                            The Mic's amplitude is divided by ⧼10⧽, putting it in the ⧼0⧽ to ⧼10⧽ range.
                            Then that value is given to @TextType's **repeat** function, which repeats the ⧼'o'⧽ the given number of times.`
                        ),
                        dialog('Mic', Emotion.Neutral, `bzzzZZZZZzzzzzZZZZ…`),
                        edit(`'o'.repeat(Mic() ÷ 10)`),
                    ],
                },
                {
                    name: 'You never know…',
                    concept: 'Random',
                    program: output(`Phrase((Time(100ms) % 10 ÷ 1ms) → "")`),
                    lines: [
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `There's one other stream I want to show you. 
                            Remember ⧼[].random()⧽ from earlier, from @ListType? 
                            
                            Inside it is a stream called @Random, which provides an infinite stream of random numbers. 
                            
                            It's a bit different from the other streams in that it doesn't cause a @Program to reevaluate. 
                            
                            Instead, each time it's evaluated, it gives a different random number.
                            
                            See that little ↻ button by the timeline? Press that to reevaluate the program manually, and you'll see a new number between ⧼0⧽ and ⧼1⧽ each time.`
                        ),
                        dialog(
                            'Random',
                            Emotion.Neutral,
                            `0.223423… 0.823423… 0.123459`
                        ),
                        edit(`Random()`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Surprised,
                            `We can tell @Random the range of numbers we'd like by giving it a minimum and maximum number. This example gives numbers between ⧼1⧽ and ⧼10⧽:`
                        ),
                        dialog('Random', Emotion.Neutral, `1… 7… 3… 9… 10… 2…`),
                        edit(`Random(1 10)`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Excited,
                            `Random can be so fun! 
                            
                            We can use it with other streams to create fun chaos. 
                            
                            For example, here we choose a random word from a list of words. 
                            This is the same as ⧼['kitty' 'cat' 'meowy'].random()⧽.
                            
                            Keep pressing ↻ to get a different cat synonym! 
                            Try adding your own word to the list and see if you can get the word to appear.`
                        ),
                        dialog('Random', Emotion.Neutral, `1… 2… 2… 1… 3…`),
                        edit(`['kitty' 'cat' 'feline'][Random(1 3)]`),
                    ],
                },
                {
                    name: "I'm listening…",
                    concept: 'Reaction',
                    program: output("Phrase('∆')"),
                    lines: [
                        output("Phrase('∆' rest: Pose(tilt: 120°))"),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `All of these streams that I've shown you come from your world. 
                            
                            But sometimes, it's helpful to create streams of your own, based on these other streams. 
                            That's where my friend @Reaction comes in!
                            
                            @Reaction, are you around?`
                        ),
                        dialog(
                            'Reaction',
                            Emotion.Excited,
                            `Yeah yeah yeah! 
                            It's @FunctionDefinition! 
                            How are you doing? 
                            
                            Everything has been so… constant, lately. 
                            Have you noticed that?`
                        ),
                        pause(),
                        output("Phrase('∆' rest: Pose(tilt: 240°))"),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `You mean the silence? 
                            Yes, nothing's really changed, has it, since the last person left? 
                            
                            What's that been like for you?`
                        ),
                        dialog(
                            'Reaction',
                            Emotion.Sad,
                            `Super strange, super strange. 
                            My whole life has been about change, always listening and watching for new inputs from people, helping transform them into values. 
                            
                            But there hasn't been anything. Until just a moment ago… 
                            
                            Wait … is that a person?`
                        ),
                        pause(),
                        output("Phrase('∆' rest: Pose(tilt: 360°))"),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Excited,
                            `Yes! 
                            This is our new potential director. 
                            
                            I was just showing them @Time, @Key, @Pointer, @Button, @Mic, and @Random, so you probably noticed all the new inputs they were bringing from their world.`
                        ),
                        dialog(
                            'Reaction',
                            Emotion.Excited,
                            `Yesssss, change is coming! 
                            Can I show you what I do?`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Eager,
                            `Yes, please do!`
                        ),
                        pause(),
                        dialog(
                            'Reaction',
                            Emotion.Serious,
                            `Okay, so I need three things from you: a condition for change, an initial value, and a next value.
                            
                            The **condition** has to evaluate to ⧼⊤⧽ or ⧼⊥⧽, and it should generally check one or more streams — otherwise, there's nothing changing, since the only source of change in a performance is streams.
                            
                            The **initial** value is whatever value I should make before any change has happened.
                            
                            The **next** value is whatever value I should make whenever the condition changes.`
                        ),
                        pause(),
                        dialog(
                            'Reaction',
                            Emotion.Serious,
                            `Here's an example. 
                            See the @Key stream? 
                            Putting ⧼∆⧽ before it asks, "Did this stream change"? 
                            
                            Before it changes, I evaluate to the initial value, ⧼1m⧽.
                            
                            But when the space key is pressed, @Program reevaluates, and I evaluate to the **next** expression, which is ⧼1m⧽ plus whatever the previous stream value was, that's represented by ⧼.⧽. 
                            
                            This adds 1m to the size of the phrase, making the word get bigger and bigger.`
                        ),
                        code(
                            `Phrase("hi" size: ∆ Key(" ") ? 1m … 1m + .)`,
                            false,
                            true
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `@Reaction, that is so cool. 
                            
                            Do you want to introduce @Changed?
                            You seem to work with them closely.`
                        ),
                        dialog(
                            'Reaction',
                            Emotion.Kind,
                            `Yes, @Changed and I are best buddies! 
                            They help me know when something has changed.
                            
                            They're like a stream whisperer, listening closely to the director's world…`
                        ),
                        pause(),
                        dialog(
                            'Changed',
                            Emotion.Eager,
                            `Wow, stream whisper, that seems a bit extreme...`
                        ),
                        dialog(
                            'Reaction',
                            Emotion.Serious,
                            `Oh hi @Changed! 
                            Do you want to say more about what you do?`
                        ),
                        dialog(
                            `Changed`,
                            Emotion.Bored,
                            `I mean, I just tell you if a stream changed.
                            Give me a stream, and I'll check.
                            
                            That's it.`
                        ),
                        dialog(
                            'Reaction',
                            Emotion.Confused,
                            `Well, it's more than that right?`
                        ),
                        dialog(
                            'Changed',
                            Emotion.Bored,
                            `Not really. That's kind of it.
                            I mean, I'm good at it, but that's my only thing.`
                        ),
                        dialog(`Reaction`, Emotion.Confused, `…`),
                        pause(),
                        dialog(
                            'Reaction',
                            Emotion.Eager,
                            `Okay.
                            
                            Well, I think you're more important that than. Because I'm pretty useless without you! For example, if you give me a condition that doesn't check a stream, I'm never going to create a new value. 
                            Like here, the condition a @BooleanType from @Button, but without you, I only ever change with the button .`
                        ),
                        code(
                            `Phrase("hi" size: Key(' ') = ' ' ? 1m … 1m + .)`,
                            false,
                            true
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `Oh, that makes sense. And @Reaction, you work with any stream?`
                        ),
                        dialog(
                            'Reaction',
                            Emotion.Eager,
                            `Yes, any stream! 
                            And actually, even myself. 
                            So if you make a reaction, and want to make a reaction that reacts to it reacting, you can do that too. 
                            But we won't worry about that now, since that doesn't usually come up in simple performances.`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `Thank you @Reaction. Will you be around to help as I show our director the rest of our beautiful Verse?`
                        ),
                        dialog(
                            'Reaction',
                            Emotion.Happy,
                            `Yes, of course, any time. I can't wait to see your inspirations!!`
                        ),
                    ],
                },
            ],
        },
        {
            name: 'Take the stage',
            program: output(RainingEmoji),
            scenes: [
                {
                    name: 'Output',
                    concept: undefined,
                    program: output(StaticRainingEmoji),
                    lines: [
                        output(`Phrase("😀")`),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Happy,
                            `So what do you think so far? 
                            
                            I think the Verse is pretty neat, mostly because the characters in it are so neat. 
                            Everyone is just so special!`
                        ),
                        pause(),
                        output(`Phrase("🥱")`),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `You're bored? 
                            Oh my. 
                            I thought all of this would be so interesting! 
                            
                            What were you hoping for?`
                        ),
                        pause(),
                        output(`Phrase("😴")`),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Serious,
                            `I see. 
                            Text and numbers and lists and streams are boring. 
                            I guess I really haven't shown you all the things we can make with all of this. 
                            
                            Maybe it's time we start talking about output.`
                        ),
                        pause(),
                        output(`Phrase("🤗")`),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `You've seen a lot of output already. 
                            
                            Every time @Program evaluates, it results in a value, and @Program shows that value on stage. 
                            
                            But so far you've only seen things like numbers, text, lists. 
                                                        
                            I get it, you just want to see full performances, just like we do!`
                        ),
                        pause(),
                        output(`Phrase("💬")`),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Eager,
                            `Remember that output I showed you a long time ago, @Phrase? 
                            
                            That's where the performances really begin. 
                            Let's start there! 
                            And then I'll show you ways of building ever more interesting performances from that building block. 
                            
                            Let me introduce you!`
                        ),
                    ],
                },
                {
                    name: 'Say what?',
                    concept: 'Phrase',
                    program: output(`Phrase("💬")`),
                    lines: [
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `@Phrase? Are you out there?`
                        ),
                        dialog(
                            'Phrase',
                            Emotion.Excited,
                            `Out and proud my darling, how are you? You look so glamorous today! I would love to get you on stage one of these days. `
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Shy,
                            `Oh, the stage isn't for me, I'm more than happy to be backstage, tinkering with the set.`
                        ),
                        dialog(
                            'Phrase',
                            Emotion.Curious,
                            `Don't be modest, you are every bit as fabulous as me. 
                            All you need is a bit of color, a flattering font, and you would be wonderful. 
                            You have so much to share! 
                            
                            Speaking of, we haven't put on a show in forever, have we? 
                            Has it been quiet? 
                            You know how much I talk to myself, I can never tell.`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `It has been quiet. 
                            Ever since our last director left, it's been a void. 
                            
                            But that is changing! 
                            We have a new person! 
                            We've been meeting the whole family, @Program, @ExpressionPlaceholder, @Evaluate, all the values, all the collections. 
                            
                            We just spent time with all of the streams too, and @Reaction and @Conditional. 
                            I'm starting to feel things hum. 
                            
                            But I haven't introduced our new director here too much about what you do on stage? 
                            This is so your world, and not mine, I figured we'd come to you first.`
                        ),
                        pause(),
                        dialog(
                            'Phrase',
                            Emotion.Happy,
                            `Well you came to the right place. 
                            I love talking about all things stage life. 
                            I can't wait to show you all the wonderful little things we do here on stage!`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Excited,
                            `Let the show begin!`
                        ),
                        pause(),
                        dialog(
                            'Phrase',
                            Emotion.Excited,
                            `So I know you've seen me do this.`
                        ),
                        edit(`Phrase('hi')`),
                        pause(),
                        dialog(
                            'Phrase',
                            Emotion.Kind,
                            `That, my darling, is the simplest way to get a word on stage. 
                            
                            But there's so much more. 
                            For example, I can take a **size**, measured in meters ⧼m⧽. 
                            
                            Try changing the size to any size you like!`
                        ),
                        edit(`Phrase('hi' 2m)`),
                        pause(),
                        dialog(
                            'Phrase',
                            Emotion.Kind,
                            `That size can be any expression. 
                            
                            For example, say we wanted it to grow as @Time ticks. We can take time, multiply it by a fraction of a meter, and glorious, tick tick tick, hi hi hi.
                            
                            Try changing the frequency or the multiplier. See what beautiful growth you can create!`
                        ),
                        code(`Phrase('hi' Time(100ms)·0.001m/ms)`, false, true),
                        pause(),
                        dialog(
                            'Phrase',
                            Emotion.Excited,
                            `Do you like costumes? 
                            
                            I loooooove costumes. 
                            **Font families** are our costumes. 
                            
                            Pick any of the supported fonts to spice up the word you've chosen.`
                        ),
                        code(
                            `Phrase('hi' Time(100ms)·0.001m/ms "Poor Story")`,
                            false,
                            true
                        ),
                        pause(),
                        dialog(
                            'Phrase',
                            Emotion.Neutral,
                            `Need me to be somewhere else on stage? 
                            Places please! 
                            
                            A @Place is just an ⧼x⧽, ⧼y⧽, and optional ⧼z⧽ position, in meters ⧼m⧽. 
                            
                            Try changing the place to a different location, by editing the numbers, or dragging the @Phrase on stage.`
                        ),
                        code(
                            `Phrase('hi' Time(100ms)·0.001m/ms “Poor Story” Place(2m 2m))`,
                            false,
                            true
                        ),
                        pause(),
                        dialog(
                            'Phrase',
                            Emotion.Curious,
                            `Do you ever feel a little off axis? 
                            
                            Maybe you give the world a little **tilt** with rotation. 
                            Try changing the rotation value to twist me around!`
                        ),
                        code(
                            `Phrase('hi' Time(100ms)·0.001m/ms  “Poor Story” Place(2m 2m) 20°)`,
                            false,
                            true
                        ),
                        pause(),
                        dialog(
                            'Phrase',
                            Emotion.Happy,
                            `Or maybe we have a little fun, and link rotation to @Time! Wheeeee. 
                            
                            Any guesses on how to make me spin faster? See if you can figure it out…`
                        ),
                        code(
                            `Phrase('hi' 3m “Poor Story” rotation: Time(10ms) · 1°/ms)`,
                            false,
                            true
                        ),
                        pause(),
                        dialog(
                            'Phrase',
                            Emotion.Serious,
                            `Now's an outstanding time to remind you that @FunctionDefinition here requires inputs to be in a particular order, so if you put them out of order, they. Are. Going. To. Complain.`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Shy,
                            `I will… I like things… tidy…
                            
                            Can you put them in the right order?
                            You can cut and paste with the keyboard or click and drag expressions to rearrange them.`
                        ),
                        code(
                            `Phrase('hi' “Poor Story” 3m Time(10ms) · 1°/ms Place(2m 2m))`,
                            false,
                            true
                        ),
                        pause(),
                        dialog(
                            'Phrase',
                            Emotion.Kind,
                            `Only want to give a particular property? 
                            Just name the one you want.
                            Here we name **size** and **rotation**.`
                        ),
                        edit(
                            `Phrase('hi' size: 3m rotation: Time(10ms) · 0.1°/ms)`
                        ),
                        pause(),
                        dialog(
                            'Phrase',
                            Emotion.Neutral,
                            `Now that we have all those out of the way, we can talk about dancing, darling! 
                            Dancing is one of my favorite things to do. 
                            
                            There are **four** ways I move.
                            
                            First, I can **enter**. 
                            Enter is my way of entering the stage. 
                            If you don't tell me how to enter, I'll just BLIP appear on stage like I teleported there. 
                            
                            But if you give me @Pose. I'll start with the pose you give me, then move to my resting pose.
                            
                            For example, let's make me fade in from invisible to oh-so-in-your face visible.`
                        ),
                        edit(`Phrase('hi' enter: Pose(opacity: 0))`),
                        pause(),
                        dialog(
                            'Phrase',
                            Emotion.Curious,
                            `Didn't see it? 
                            Did I move too fast for you? 
                            
                            That's because my duration is ⧼0s⧽ by default.
                            
                            Slow me down with a duration, which tells me how long I should take to move between poses. 
                            I made this one nice and slow for you, but try changing duration to higher and lower numbers.`
                        ),
                        edit(
                            `Phrase('hi' enter: Pose(opacity: 0) duration: 5s)`
                        ),
                        pause(),
                        dialog(
                            'Phrase',
                            Emotion.Neutral,
                            `Now, say I was moving. 
                            
                            We'll set my place to time, so I move to the right a bit every second. 
                            
                            But if we set a **move** @Pose, and have the pose tilt ⧼5°⧽ and maybe a little color, every time my place changes, I'll glide across the stage with the cutest little tilt.`
                        ),
                        code(
                            `Phrase('hi' size: 5m place: Place(Time(1000ms) · 0.001m/ms 0m) move: Pose(tilt: 5°) duration: 0.5s)`,
                            false,
                            true
                        ),
                        pause(),
                        dialog(
                            'Phrase',
                            Emotion.Curious,
                            `Not in the mood for cute? 
                            
                            How about you make me a little serious by having me slide across straight by changing my **style**.
                            
                            It's really subtle, but styles can really change the *emotion* of a movement.`
                        ),
                        code(
                            `Phrase('hi' size: 5m place: Place(Time(1000ms) · 0.001m/ms 0m) move: Pose(tilt: 5°) duration: 0.5s style: “straight”)`,
                            false,
                            true
                        ),
                        pause(),
                        dialog(
                            'Phrase',
                            Emotion.Excited,
                            `And for the coup de grâce, let's have me **exit** in style. 
                            We can play with @Conditional and have me exit stage after 3 seconds.`
                        ),
                        code(
                            `Time(1000ms) < 3000ms ? 
                                Phrase('hi' size: 5m place: Place(Time(1000ms) · 0.001 0m) move: Pose(tilt: 5°) duration: 0.5s) 
                                Phrase('')`,
                            false,
                            true
                        ),
                        pause(),
                        dialog(
                            'Phrase',
                            Emotion.Surprised,
                            `Not the exit you were hoping for? 
                            
                            The disappearing act is a bit harsh, ain't it? 
                            Give me an **exit** @Pose, and I'll glide off on stage toward whatever pose you want. 
                            
                            Here we'll have me get large than life, fall upside down, and fade out to **opacity** 0.`
                        ),
                        code(
                            `Time(1000ms) < 3000ms ? Phrase('hi' size: 5m place: Place(Time(1000ms) · 0.001m/ms 0m) move: Pose(tilt: 5°) exit: Pose(scale: 10 tilt: 180° opacity: 0) duration: 0.5s) Phrase('')`,
                            false,
                            true
                        ),
                        pause(),
                        dialog(
                            'Phrase',
                            Emotion.Serious,
                            `You probably noticed that I can take up a little space in @Program. 
                            
                            If you ever want to make me easier to read, just add some lines between my properties.
                            
                            See how that's so much easier to see?`
                        ),
                        edit(
                            `Time(1000ms) < 3000ms ?
    Phrase(
        'hi'
        size: 5m
        place: Place(Time(1000ms) · 0.001m/ms 0m)
        move: Pose(tilt: 5°)
        exit: Pose(scale: 10 tilt: 180° opacity: 0)
        duration: 0.5s
    )
    Phrase(“”)
`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Excited,
                            `Bravo, bravo, that was just stunning, @Phrase! I'm always blown away by how much you can do with just a few simple ideas.
                            
                            A while ago, I showed our new inspirational friend here about the palette. Do you want to say more about that?`
                        ),
                        dialog(
                            'Phrase',
                            Emotion.Happy,
                            `Of course! 
                            Any time you get tired of fiddling with @Evaluate's inputs, you can always select a phrase on stage, and a palette will appear, allowing you to change any little thing you might want, my size, font, place, poses. 
                            
                            There's just one rule: if you set any of those to an expression, instead of just a value, you'll have to change them down in @Program, not in the palette.
                            
                            Dress me up all you like!`
                        ),
                        edit(`Phrase('dress me up!')`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Curious,
                            `Wait, Phrase, what about @Color?`
                        ),
                        dialog(
                            'Phrase',
                            Emotion.Sad,
                            `Omigod omigod omigod, I CANNOT believe I forgot about color. 
                            
                            Okay, so any @Pose can have a color, right? 
                            But @Color comes in three parts.
                            
                            First, a **lightness** between 0 and 100%, which you can think of as how bright a room is, from black to white, with color in the middle at 50%.

                            Then, a **saturation** between 0 and 100, which you can think of has how much color there is, from no color gray to full color.

                            And finally, a **chroma**, which you can think of like a color wheel, from red to green to blue, in degrees.
                            
                            So you want me to be bright red? Set my rest pose color to ⧼Color(50% 300 30°)⧽.`
                        ),
                        edit(
                            `Phrase('red' rest: Pose(color: 🌈(50% 300 30°)))`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Excited,
                            `And want me to shimmer with the rainbow? Take time, get the remainder of dividing by 360, then multiply by degrees and I'll spin around that color wheel all day long!`
                        ),
                        edit(
                            `Phrase('red' size: 5m rest: Pose(color: 🌈(50% 300 (Time() % 360)·1°/ms)))`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Happy,
                            `@Phrase, that is something to be proud of :P
                            
                            I think we're going to go visit @Sequence next, and then maybe @Group and @Stage. You'll be around to help?`
                        ),
                        dialog(
                            'Phrase',
                            Emotion.Kind,
                            `I wouldn't miss it. Sparkle and shine!`
                        ),
                    ],
                },
                {
                    name: '1, 2, 3, 4, 1, 2, 3, 4',
                    concept: 'Sequence',
                    program: output(DancingEmoji('💃')),
                    lines: [
                        output(DarkVoid),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `@Phrase is just wonderful, aren't they? 
                            They have so much energy, so many amazing flourishes. 
                            
                            Did you know they work closely with our choreographer, @Sequence? 
                            @Sequence and @Phrase together can do some incredible things that @Phrase can't do alone. 
                            
                            Do you want to meet them?`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Excited,
                            `Yay! @Sequence, we have a guest. Are you back there?`
                        ),
                        dialog(
                            'Sequence',
                            Emotion.Curious,
                            `@FunctionDefinition! You look beautiful. 
                            How long has it been? A week? A month? A century? It was like 1, 2, 3 and then everything was quiet. 
                            
                            I feel like I've been dancing alone forever…`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Sad,
                            `It was silent, wasn't it? 
                            But I can totally see you dancing alone. 
                            I was doing my own choreography all alone too, just having to imagine all of you working together. 
                            But it wasn't the same.`
                        ),
                        dialog(
                            'Sequence',
                            Emotion.Kind,
                            `And you an @Evaluate? Are you still…`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Shy,
                            `I just saw them earlier. They…
                            
                            Oh, we have a guest! @Sequence, this is our new director pal. 
                            They've come to bring us inspiration!`
                        ),
                        dialog(
                            'Sequence',
                            Emotion.Excited,
                            `(We're going to come back to that tea, @FunctionDefinition). 
                            
                            Director pal, it's so exciting to meet you! Have you come here to learn to dance?`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `Of course they did! Do you want to show them the steps?`
                        ),
                        pause(),
                        dialog(
                            'Sequence',
                            Emotion.Serious,
                            `Absolutely. 
                            
                            You know time? 
                            1, 2, 3, 4, 1, 2, 3, 4? 
                            Well I make time beautiful, arranging a sequence of poses over time for @Phrase to follow. 
                            
                            You tell me what the poses are and I'll help @Phrase follow the steps.
                            
                            Like this example: our smiley friend here has four poses, and smoothly moves between them.`
                        ),
                        output(
                            `Phrase('😀' rest: Sequence({0%: Pose() 25%: Pose(offset: Place(0m 1m) scale: 2) 50%: Pose(offset: Place(0m 0m) flipy: ⊤) 75%: Pose(tilt: 45°) 100%: Pose()} 2s))`
                        ),
                        pause(),
                        dialog(
                            'Sequence',
                            Emotion.Neutral,
                            `Here's a simple example of how I work.
                            
                            Here's @Phrase (hi @Phrase!) with the word “dance”, and they have an enter pose that's a @Sequence rather than a single @Pose. 
                            
                            Follow me? 
                            
                            The sequence has four steps. 
                            Straight, tilt left, tilt right, straight. 
                            When @Phrase enters, they do this cute little wobble, and then stop. 
                            
                            I work with @MapLiteral to map percentages to a @Pose. 
                            Each of those percentages are how far through the sequence each @Pose should happen.
                            
                            Try changing the percentages, especially those two middle ones. It changes the flow and style of the wobble.`
                        ),
                        edit(
                            `Phrase(
    "dance"
    enter: Sequence({
        0%: Pose(tilt: 0°)
        33%:Pose(tilt:-5°)
        66%: Pose(tilt: 5°)
        100%: Pose(tilt: 0°)
        })
    )`
                        ),
                        pause(),
                        dialog(
                            'Sequence',
                            Emotion.Serious,
                            `Okay, so now imagine you wanted this to be really fast. 
                            By default, I'm pretty quick, so any sequence will be a quarter second and it's done. 
                            
                            But what if you wanted it to be even faster? 
                            
                            Give me a shorter duration and I'll speed every @Pose up to get it done faster. 
                            
                            1, 2, 3, 4! 
                            It doesn't look like a wobble anymore, does it? 
                            More like a frantic little shake!
                            
                            See what it looks like if you slow me down to 2 or 3 seconds…`
                        ),
                        edit(
                            `Phrase(
"dance"
enter: Sequence({
    0%: Pose(tilt: 0°)
    33%:Pose(tilt:-5°)
    66%: Pose(tilt: 5°)
    100%: Pose(tilt: 0°)
} duration: 0.05s)
)`
                        ),
                        pause(),
                        dialog(
                            'Sequence',
                            Emotion.Excited,
                            `But sometimes, we come up with a lovely move and we just can't help but want to do it over and over, for emphasis!
                            
                            That looks a little violent… try changing my duration and count until we get it just right…`
                        ),
                        edit(
                            `Phrase(
"dance"
enter: Sequence({
    0%: Pose(tilt: 0°)
    33%:Pose(tilt:-5°)
    66%: Pose(tilt: 5°)
    100%: Pose(tilt: 0°)
} duration: 0.1s count: 4x)
)`
                        ),
                        pause(),
                        dialog(
                            'Sequence',
                            Emotion.Curious,
                            `But, you say, what if we wanted to do it forever? 
                            
                            You can set a @Phrase's **rest** to me. For as long as @Phrase is on stage and resting, they'll repeat a sequence. Infinite wobbles!`
                        ),
                        edit(
                            `Phrase(
"dance"
rest: Sequence({
    0%: Pose(tilt: 0°)
    33%:Pose(tilt:-5°)
    66%: Pose(tilt: 5°)
    100%: Pose(tilt: 0°)
} duration: 0.05s)
)`
                        ),
                        pause(),
                        output(DarkVoid),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `@Sequence, this is so great! This is exactly what I was hoping you could show us. 
                            
                            But I'm curious, what have you been working on lately, dances of your own? 
                            Maybe something that shows everything you're capable of?`
                        ),
                        dialog(
                            'Sequence',
                            Emotion.Excited,
                            `Oh my yes! @Phrase and I have been working on this new donut dance. 
                            It comes my favorite treat with nearly everything I've learned in dance. 
                            
                            Do you want to see it?`
                        ),
                        dialog('FunctionDefinition', Emotion.Excited, `Yes!!!`),
                        pause(),
                        dialog(
                            'Sequence',
                            Emotion.Serious,
                            `Yeah, hmm, oooh, up, eee, eee, eee, eee, bam, boo, yeah, hmm, oooh, up, eee, eee, eee, eee, bam, boo, yeah, hmm, oooh, up, eee, eee, eee, eee, bam, boo, …`
                        ),
                        edit(DonutDance),
                        pause(),
                        output(DonutDance),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Happy,
                            `@Sequence, that's amazing! How could that not be the next viral dance?`
                        ),
                        dialog(
                            'Sequence',
                            Emotion.Excited,
                            `You mean next spiral dance. Cheers!`
                        ),
                    ],
                },
                {
                    name: 'Places please',
                    concept: 'Group',
                    program: output(
                        `Group(Grid(2 2) [Phrase("1" rest: Sequence(spin() 1s)) Phrase("2" rest: Sequence(spin() 2s)) Phrase("3" rest: Sequence(spin() 3s)) Phrase("4" rest: Sequence(spin() 4s))])`
                    ),
                    lines: [
                        output(`Phrase("☹️")`),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `Sigh… everyone keeps bringing up @Evaluate, but I don't know what to say.
                            Are you ever so close to someone, and yet so far away?

                            …`
                        ),
                        pause(),
                        output(`Phrase("😕")`),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Serious,
                            `Sorry.
                            I'm excited to be here with you.

                            I think…

                            I think what will help is introducing you to the rest of us, and then putting on a show, and then I think @Evaluate and I can sort things out.`
                        ),
                        pause(),
                        output(`Phrase("🙂")`),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Eager,
                            `So who's next?

                            Oh, @Group!
                            I can't believe I forgot @Group.

                            This is perfect timing; you know @Phrase and @Sequence now, and @Group is such an integral part of bringing us all together.
                            @Group cares for us all so deeply.

                            @Group? 
                            Are you there?
                            `
                        ),
                        pause(),
                        output(`Group(Grid(2 2) [Phrase("🔳")])`),
                        dialog(
                            'Group',
                            Emotion.Neutral,
                            `@FunctionDefinition, hello, how are you? 
                            Where has everyone been? 
                            I've been so worried! 
                            Are you okay?`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `I'm okay. 
                            We're all okay! 
                            The silence is breaking, because we found a person! 
                            They're going to be our inspiration.`
                        ),
                        pause(),
                        output(`Group(Grid(2 2) [Phrase("🔳") Phrase("🔳")])`),
                        dialog(
                            'Group',
                            Emotion.Happy,
                            `That's lovely! 
                            
                            You're not hurt? 
                            Everyone else is here? 
                            
                            I felt like I was wandering in the dark, and couldn't see anyone.`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `I'm not hurt. Just a bit rusty. 
                            
                            And I haven't seen everyone yet, but almost everyone, and I think everyone is waking up okay. 
                            
                            (Though apparently some have been at the beach). 
                            
                            We've met nearly everyone. 
                            We're getting ready to put on a show! 
                            And the best shows always involve you…`
                        ),
                        pause(),
                        output(
                            `Group(Grid(2 2) [Phrase("🔳") Phrase("🔳") Phrase("🔳")])`
                        ),
                        dialog(
                            'Group',
                            Emotion.Kind,
                            `A show! 
                            I can't wait to help. 
                            You kids are always so inspiring, I'm always happy to do my part. 
                            What shall I do, where do I start?`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Happy,
                            `Well, we've talked about @Phrase, so maybe start with a bit about your purpose?`
                        ),
                        pause(),
                        output(
                            `Group(Grid(2 2) [Phrase("🔳") Phrase("🔳") Phrase("🔳") Phrase("🔳")])`
                        ),
                        dialog(
                            'Group',
                            Emotion.Neutral,
                            `My purpose, yes. Let's see — I think my purpose is to bring everyone together. 
                            
                            But I particularly bring @Phrase together, in beautiful shapes and arrangements on stage.
                            
                            Did you know that @Phrase can be in more than one place at once? 
                            That's because they aren't so much one text phrase on stage, but a phrase maker, just like I'm a @Group maker. 
                            
                            They'll make as many as you need, and then I lay them out on stage, as you direct me. 
                            
                            All I need is an @Arrangement, and a list of @Phrase, and I'll do the rest.`
                        ),
                        pause(),
                        dialog(
                            'Group',
                            Emotion.Excited,
                            `Here's a simple example. 
                            
                            Here I'm using a @Stack arrangement, which creates a vertical arrangement of @Phrase, or other @Group. 
                            
                            See how I make a tidy little stack of words? 
                            They're arranged just so, with a little breathing room for everyone and everyone centered.
                            
                            Everyone is so cute!`
                        ),
                        edit(
                            `Group(
  Stack() [
    Phrase("one")
    Phrase('two')
    Phrase('three')
  ]
)`
                        ),
                        pause(),
                        dialog(
                            'Group',
                            Emotion.Serious,
                            `But sometimes we all need a little space. 
                            So you can give @Stack some padding.
                            
                            Try changing the padding to a different @MeasurementLiteral!`
                        ),
                        edit(
                            `Group(
  Stack(2m) [
    Phrase("one")
    Phrase('two')
    Phrase('three')
  ]
)`
                        ),
                        pause(),
                        dialog(
                            'Group',
                            Emotion.Happy,
                            `Just as with anything in the Verse, that padding value can come from anything, like input. 
                            
                            Sometimes we grow apart don't we? 
                            Let's dance that idea by making the padding grow over time…`
                        ),
                        edit(
                            `Group(
  Stack(Time(100ms)·0.001m/ms) [
    Phrase("one")
    Phrase('two')
    Phrase('three')
  ]
)`
                        ),
                        pause(),
                        dialog(
                            'Group',
                            Emotion.Surprised,
                            `We also have a @Row, which is a horizontal arrangement.`
                        ),
                        edit(
                            `Group(
  Row(Time(100ms)·0.001m/ms) [
    Phrase("one")
    Phrase('two')
    Phrase('three')
  ]
)`
                        ),
                        pause(),
                        dialog(
                            'Group',
                            Emotion.Curious,
                            `Sometimes it's nice to use two dimensions instead of one. 
                            
                            If you tell me how many rows and columns you want, I'll make a @Grid of phrases. 
                            
                            Just make sure to give me enough phrases to fill the grid! 
                            You can also give @Grid padding and a cell size if you want to be extra precise. 
                            
                            Grids are layed out a row at a time, so put your @Phrase list in order of rows.`
                        ),
                        edit(
                            `Group(
  Grid(2 2) [
    Phrase("one")
    Phrase('two')
    Phrase('three')
    Phrase('four')
  ]
)`
                        ),
                        pause(),
                        dialog(
                            'Group',
                            Emotion.Excited,
                            `And if you wanted a very specific arrangement?
                            
                            You could use @Free, and tell me exactly where you want all the phrases. 
                            Just be sure to give a place to each @Phrase, otherwise I'll just place it at ⧼Place(0m 0m⧽).`
                        ),
                        edit(
                            `Group(
  Free() [
    Phrase("one" place: Place(-2m 2m))
    Phrase('two' place: Place(-1m 1m))
    Phrase('three' place: Place(0m 0m))
    Phrase('four' place: Place(1m -1m))
    Phrase('five' place: Place(2m -2m))
  ]
)`
                        ),
                        pause(),
                        dialog(
                            'Group',
                            Emotion.Curious,
                            `And did you know you can also place me inside myself? 
                            A @Group in a @Group in a @Group, it's very silly. 
                            
                            This can make it possible to make a @Grid of @Stack for example.`
                        ),
                        edit(
                            `Group(
  Grid(2 2) [
    Group(Stack() [Phrase("one") Phrase(“two”)])
    Group(Stack() [Phrase("three") Phrase(“four”)])
    Group(Stack() [Phrase("five") Phrase(“six”)])
    Group(Stack() [Phrase("seven") Phrase(“eight”)])
  ]
)`
                        ),
                        pause(),
                        dialog(
                            'Group',
                            Emotion.Surprised,
                            `Hm, that kind of looks like a 4 by 2 grid, doesn't it? 
                            
                            Let's make it a little clearer by tilting two of the stacks.
                            
                            Oh, yes, you can give me all the same properties that @Phrase takes!`
                        ),
                        edit(
                            `Group(
  Grid(2 2) [
    Group(Stack() [Phrase("one") Phrase(“two”)])
    Group(Stack() [Phrase("three") Phrase(“four”)] rest: Pose(tilt: 45°))
    Group(Stack() [Phrase("five") Phrase(“six”)])
    Group(Stack() [Phrase("seven") Phrase(“eight”)] rest: Pose(tilt: 45°))
  ]
)`
                        ),
                        pause(),
                        output(DarkVoid),
                        dialog(
                            'Group',
                            Emotion.Curious,
                            `Was that good, @FunctionDefinition? 
                            Did I cover everything?`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Happy,
                            `That was better than good! 
                            I think you showed our new director here just how much is possible. 
                            
                            Is there anything else you want to share?`
                        ),
                        pause(),
                        dialog(
                            'Group',
                            Emotion.Serious,
                            `I don't think so… 
                            
                            I'm always learning new arrangements, so always check back for new designs I've come up with!
                            
                            And @FunctionDefinition, how are you and @Evaluate doing? I know the last time I saw you talking, things were bumpy…`
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Shy,
                            `I… I'd rather not talk about it right now.`
                        ),
                        dialog(
                            'Group',
                            Emotion.Kind,
                            `Okay.
                            I'm always here if you want to chat.`
                        ),
                    ],
                },
                {
                    name: 'Stage… right?',
                    concept: 'Stage',
                    program: output(
                        `Stage([Phrase("🎭" 5m)] background: Color(0% 0 0°))`,
                        false
                    ),
                    lines: [
                        output(
                            `Stage([Phrase("🎭" 5m rest: Sequence(bounce(5m) 2s))] background: Color(0% 0 0°))`,
                            false
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Excited,
                            `Okay, there's someone who's been here all along, but we haven't really done a proper introduction.
                            
                            May I introduce @Stage!`
                        ),
                        dialog(
                            'Stage',
                            Emotion.Neutral,
                            `HELLO, @FunctionDefinition
                            
                            HELLO PERSON.`
                        ),
                        pause(),
                        output(
                            `Stage([Phrase("🎭" 5m rest: Pose(tilt: 25° scale: 5))] background: Color(0% 0 0°))`,
                            false
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Happy,
                            `@Stage, this person is our new director. 
                            
                            They're so excited to finally meet you!`
                        ),
                        dialog(
                            'Stage',
                            Emotion.Neutral,
                            `HELLO DIRECTOR. ARE YOU HERE TO INSPIRE?`
                        ),
                        pause(),
                        output(
                            `Stage([Phrase("🎭" 5m rest: Pose(tilt: -150° scale: 10))] background: Color(0% 0 0°))`,
                            false
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `Indeed they are, with all kinds of expressions from their world.`
                        ),
                        dialog(
                            'Stage',
                            Emotion.Neutral,
                            `I AM HERE TO SERVE. TELL ME WHAT TO PUT ON STAGE, AND I WILL.`
                        ),
                        pause(),
                        output(
                            `Stage([Phrase("🎭" 5m)] background: Color(0% 0 0°))`,
                            false
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `@Stage is one of a kind, and always there. 
                            
                            In fact, if you give @Program a @Phrase or @Group, @Program will show a @Stage, even if you don't mention them.
                            
                            But if you do mention them, you can be more specific about how you want the stage to appear.`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `Maybe let's start with a simple example. 
                            
                            This just gives @Stage a list of one @Phrase. 
                            
                            You don't have to mention @Stage here; this just shows what's happening behind the scenes when you give @Phrase to @Program.`
                        ),
                        edit(`Stage([Phrase(“🐈”)])`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `But say you want the stage to have a different background color, such as black.`
                        ),
                        dialog('Stage', Emotion.Surprised, `BRRRRR…`),
                        edit(`Stage([Phrase(“🐈”)] background: Color(0 0 0°))`),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `You can also frame the stage, for example, with a @Rectangle, which takes a top left place and bottom right place.
                        
                            See how the kitty is a little bit out of frame?`
                        ),
                        dialog(
                            'Stage',
                            Emotion.Surprised,
                            `THE WORLD IS CLOSING IN…`
                        ),
                        edit(
                            `Stage([Phrase(“🐈” place:Place(-2.5m))] background: Color(0 0 0°) frame: Rectangle(-2m -2m 2m 2m))`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `You can also apply all of the same properties to @Stage as you can a @Group or @Phrase. 
                            Let's tilt the whole stage!`
                        ),
                        dialog(
                            'Stage',
                            Emotion.Surprised,
                            `WHOA, CAREFUL NOW…`
                        ),
                        edit(
                            `Stage(
    [Phrase(“🐈” place:Place(-2.5m))]
    background: Color(0 0 0°)
    frame: Rectangle(-2m -2m 2m 2m)
    rest:Pose(tilt: 30°)
)`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `There's much more you can do with @Stage, but you can explore with them anytime. Right @Stage?`
                        ),
                        dialog('Stage', Emotion.Excited, `ALWAYS!`),
                    ],
                },
                {
                    name: 'Is there someone named...',
                    concept: 'Choice',
                    program: output(`Phrase("🔘" 10m)`, false),
                    lines: [
                        output(
                            `Phrase("🔘" 10m enter: Sequence({0%: Pose(offset: Place(0m 0m)) 50%: Pose(offset: Place(0m -0.2m)) 100%: Pose(offset: Place(0m 0m))} 1s count: 3x))`,
                            false
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Serious,
                            `So you know @Key, @Pointer, and @Button, the streams we just talked about? 
                            
                            They can be very fun, but they have one problem: not everyone in the audience can use them.
                            
                            Some people do not have hands, or cannot use their hands, or cannot use them precisely to click keys or use a mouse.
                            
                            We know that many some people use their voices to communicate with our world, or even their eyes.
                            
                            So using @Key, @Pointer, or @Button means some people in your audience won't be able to participate.`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `Everyone should be able to participate! 
                            
                            So now that we've talked about @Phrase in more detail, I wanted to show y ou one final stream, @Choice, which is a stream of @Phrase names that have been selected, independent of how it was selected. 
                            
                            For example, an audience might use a mouse to click on a @Phrase, or they might use a keyboard to select it, or there might be other devices they use. 
                            
                            Whatever they use, @Choice will contain their latest selection.`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Excited,
                            `Here's a simple example. 
                            
                            See how it has three phrases? 
                            The first two have two important details. 
                            First, they're set to be selectable. 
                            
                            This tells @Stage that if they are clicked, or if the keyboard is used to select them, that they are chosen. 
                            
                            The second detail is that they have a **name**. 
                            
                            That gives @Stage a unique name for the phrase that was chosen. 
                            
                            It's important that it's unique so that @Stage knows what was chosen.
                            
                            The third phrase is set to a @Choice stream, which is a series of @Phrase or @Group names are selected. 
                            Here, we're just giving the name to another phrase, so that it shows what name is selected.
                            
                            Try clicking the cat or dog, or using the keyboard to select one. 
                            
                            See how the third @Phrase shows the name selected?
    `
                        ),
                        dialog(
                            'Choice',
                            Emotion.Neutral,
                            "cat... 'dog'... 'cat'... 'dog'..."
                        ),
                        edit(
                            `Stage(
    [Group(Stack() [
        Phrase('🐱' name:"cat" selectable:⊤)
        Phrase('🐶' name: "dog" selectable:⊤)
        Phrase(Choice())
    ])
])`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Serious,
                            `@Choice really is the best way to listen to the audience. 
                            
                            Only use @Key, @Pointer, or @Button if you have no other option, and use it knowing that some in your audience won't be able to enjoy your performance.`
                        ),
                    ],
                },
            ],
        },
    ],
};

export default en;
