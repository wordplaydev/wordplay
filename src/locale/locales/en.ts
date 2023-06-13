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
} from '../Locale';
import type { CycleType } from '@nodes/CycleType';
import type UnknownNameType from '@nodes/UnknownNameType';
import Explanation from '../Explanation';
import type NodeLink from '../NodeLink';
import type StreamDefinitionType from '@nodes/StreamDefinitionType';
import Emotion from '../../lore/Emotion';
import Unit from '../../nodes/Unit';

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
            description: '',
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
            start: (changes) =>
                changes.length === 0
                    ? 'evaluating program for the first time'
                    : changes.length === 1
                    ? Explanation.as(
                          changes[0].stream,
                          ' produced ',
                          changes[0].value,
                          ' revaluating program'
                      )
                    : Explanation.as(
                          `${changes.length} streams changed (e.g., `,
                          changes[0].stream,
                          ' → ',
                          changes[0].value,
                          '); revaluating program'
                      ),
            finish: (value) =>
                Explanation.as('program evaluated to ', value ?? 'nothing'),
        },
        Dimension: {
            name: 'dimension',
            description: getDimensionDescription,
            emotion: Emotion.Serious,
            doc: `I am a *unit of measurement*, like (1m), (10s), (100g), or any other scientific unit. I'm happy to be any unit want to make up too, like (17apple).
            
                I can be combined with other symbols to make compound units like (9.8m/s^2) or (17apple/day).
                
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
            emotion: Emotion.Arrogant,
            doc: `Yo. You need me?
                I'm not suprised, I'm pretty bad ass.
                @Evaluate is nice, but I am *nicer*.
                Give me a left and right value?
                I can do all kinds of things.
                Whatever functions the left value has.
                And I can do it with out all of those annoying parentheses.

                Check this out.

                (1 + 1)
                (1 > 1)
                (1 - 1)
                (1 = 1)

                Did you see that? 
                No parentheses, just a tight little operator in the middle.
                *Sleek*.

                Okay, yeah, I can get ahead of myself.
                I only do left to right.
                I have no idea what "order of operations" is.
                You *might* have to wrap some parentheses around me
                to get what you want.
                But otherwise?
                *Streamlined*.
                `,
            right: 'input',
            start: (left) =>
                Explanation.as('left first! ', left, ', then right!'),
            finish: (result) =>
                Explanation.as(
                    'your value, ',
                    result ?? ' nothing',
                    ', *slick*'
                ),
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
                Zero. One. Yes. No. True. False. 
                There are only two. 
                True ways and false ways. 
                Yes ways and no ways. 
                Zero ways and one ways. 
                (${TRUE_SYMBOL}) and (${FALSE_SYMBOL}) ways.
                
                But which is right?
                Which is left?
                What do they mean?
                Perhaps @Conditional knows.
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
            description: WRITE_DOC,
            emotion: Emotion.TBD,
            doc: WRITE_DOC + `convert one type of value to another`,
            start: (expr) => Explanation.as('first evaluate ', expr),
            finish: (value) =>
                Explanation.as('converted to ', value ?? 'nothing'),
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
            emotion: Emotion.Cheerful,
            doc: `
            OMG I am sooo excited to *evaluate functions*. 
            I take a function, and some values, and then I follow the function's steps to compute a value.
            It's like cooking: give me the ingredients and the receipe and I'll make the dish.

            Because I play with functions a lot, @FunctionDefinition is kind of my best friend.
            They say what to do, and I do it, and together we make values for everyone else to use.

            Did you know that @FunctionDefinition and I basically make the whole world of algorithms *work*?
            We're kind of a big deal.
            I mean, I couldn't do it without everyone else, but I'm pretty proud of making all of our
            performances possible.

            @BinaryOperation and @UnaryOperation?
            Yeah, I know them.
            They're cool.
            I mean, they do what I do, and I guess they're a little more compact.
            But they're baaaaasically copying me.
            Sometimes I think they're just trying to look cool.
            `,
            start: (inputs) =>
                inputs
                    ? 'evaluate the inputs first'
                    : 'get the function to evaluate',
            finish: (result) =>
                Explanation.as('function evaluated to ', result ?? 'nothing'),
            function: 'function',
            input: 'input',
        },
        ExpressionPlaceholder: {
            name: 'expression placeholder',
            description: getPlaceholderDescription,
            emotion: Emotion.Sad,
            doc: `
            I can be anything. That might sound amazing, but it's actually really hard, because everyone things of me as temporary. 
            Like, if we were adding some numbers, I might take the place of a number (1 + _), or if someone was evaluating a function with @Evaluate, I might stand in for the function (_(1 2 3)).
            But as soon as someone decides what to replace me with, I'm just discarded.
            Tossed out.
            And so while I can be anything, it's never for long, and I don't get to actually do anything.

            Actually, I do get to do one thing: if someone leaves me in a performance, I will SHUT IT DOWN when it's my turn to dance.
            But it's actually because I don't know what to do.
            Because I can be anything, I not really anything...
            `,
            start: "Stop the performance, I don't know what I am!",
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
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
            start: 'evaluate items first',
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
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
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
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
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
            description: WRITE_DOC,
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
            start: 'create a nothing value',
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
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
            start: 'evaluate each value first',
            finish: (value) =>
                Explanation.as('evaluated to set ', value ?? 'nothing'),
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
            description: WRITE_DOC,
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
            start: 'evaluate each expression in the template',
            finish: 'constructing text from the values',
        },
        TextLiteral: {
            name: 'text',
            description: (text) => text.text.getText(),
            emotion: Emotion.TBD,
            doc: WRITE_DOC,
            start: 'create a text value',
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
            doc: `
            Hi.

            Oh, did you need me?
            Have you talked to @Evaluate or @BinaryOperation?
            They are way cooler than me.

            Yes?
            You still need me?
            I can only do two little things:

            (-5)

            I made that (5) into (-5).

            (~⊥)

            I made that (⊥) into (⊤).

            That's it.
            I'm not very special.
            `,
            start: (value) => Explanation.as('what are you ', value),
            finish: (value) => Explanation.as('I made it ', value ?? 'nothing'),
        },
        UnparsableExpression: {
            name: 'unparsable',
            description: WRITE_DOC,
            emotion: Emotion.TBD,
            doc: `a list of unparsable @Token`,
            start: 'cannot evaluate unparsable code',
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
            description: WRITE_DOC,
            emotion: Emotion.TBD,
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
                node.key === undefined || node.value === undefined
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
                    name: ['has'],
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
        placeholder: (node) =>
            Explanation.as(`Eek, I don't know what to do, I'm a `, node, `!`),
        unparsable: (node) =>
            Explanation.as('this is ', node, ' is not parsable'),
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
                    WRITE_DOC + 'expected boolean condition but received ',
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
            primary:
                WRITE_DOC +
                'this expression is not used; it will not affect the value of anything',
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
            primary: `I'm a placeholder. Can you please find someone to replace me for the performance?`,
        },
        RequiredAfterOptional: {
            primary:
                WRITE_DOC + 'required inputs cannot come after optional ones',
        },
        UnclosedDelimiter: {
            primary: (token, expected) =>
                Explanation.as(
                    WRITE_DOC,
                    'expected ',
                    expected,
                    ' to match ',
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
                expression
                    ? WRITE_DOC + 'expected expression, but could not parse one'
                    : 'expected type, but could not parse one',
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
        random: {
            doc: WRITE_DOC,
            names: ['🎲', 'Random'],
            min: { names: 'min', doc: WRITE_DOC },
            max: { names: 'max', doc: WRITE_DOC },
        },
        choice: {
            doc: WRITE_DOC,
            names: ['🔘', 'Choice', 'selection'],
        },
        button: {
            doc: WRITE_DOC,
            names: ['🖱️', 'Button'],
            down: { names: 'down', doc: WRITE_DOC },
        },
        pointer: {
            doc: WRITE_DOC,
            names: ['👆🏻', 'Pointer'],
        },
        key: {
            doc: WRITE_DOC,
            names: ['⌨️', 'Key'],
            key: { names: 'key', doc: WRITE_DOC },
            down: { names: 'down', doc: WRITE_DOC },
        },
        time: {
            doc: WRITE_DOC,
            names: ['🕕', 'Time'],
            frequency: {
                names: ['frequency'],
                doc: WRITE_DOC,
            },
        },
        mic: {
            doc: WRITE_DOC,
            names: ['🎤', 'Mic'],
            frequency: {
                names: ['frequency'],
                doc: WRITE_DOC,
            },
        },
        camera: {
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
        reaction: {
            doc: WRITE_DOC,
            names: 'reaction',
        },
        motion: {
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
        type: {
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
        group: {
            names: ['🔳', 'Group'],
            doc: WRITE_DOC,
            content: { doc: WRITE_DOC, names: 'content' },
            layout: { doc: WRITE_DOC, names: 'layout' },
        },
        phrase: {
            doc: WRITE_DOC,
            names: ['💬', 'Phrase'],
            text: { doc: WRITE_DOC, names: 'text' },
        },
        layout: {
            doc: WRITE_DOC,
            names: ['⠿', 'Arrangement'],
        },
        row: {
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
        stack: {
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
        grid: {
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
        free: {
            doc: WRITE_DOC,
            names: ['Free'],
            description: (count: number) => `free-form, ${count} outputs`,
        },
        shape: {
            doc: WRITE_DOC,
            names: 'Shape',
        },
        rectangle: {
            doc: WRITE_DOC,
            names: ['Rectangle'],
            left: { doc: WRITE_DOC, names: 'left' },
            top: { doc: WRITE_DOC, names: 'top' },
            right: { doc: WRITE_DOC, names: 'right' },
            bottom: { doc: WRITE_DOC, names: 'bottom' },
        },
        pose: {
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
        color: {
            doc: WRITE_DOC,
            names: ['🌈', 'Color'],
            lightness: { doc: WRITE_DOC, names: ['lightness', 'l'] },
            chroma: { doc: WRITE_DOC, names: ['chroma', 'c'] },
            hue: { doc: WRITE_DOC, names: ['hue', 'h'] },
        },
        sequence: {
            doc: WRITE_DOC,
            names: ['┅', 'Sequence'],
            count: { doc: WRITE_DOC, names: 'count' },
            timing: { doc: WRITE_DOC, names: 'timing' },
            poses: { doc: WRITE_DOC, names: 'poses' },
        },
        place: {
            doc: WRITE_DOC,
            names: ['📍', 'Place'],
            x: { doc: WRITE_DOC, names: 'x' },
            y: { doc: WRITE_DOC, names: 'y' },
            z: { doc: WRITE_DOC, names: 'z' },
        },
        verse: {
            doc: WRITE_DOC,
            names: ['🌎', '🌍', '🌏', 'Verse'],
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
        easing: {
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
            scenes: [
                {
                    name: 'The Silence',
                    lines: [
                        code(
                            'Verse([] background: Color(0% 0 0°))',
                            true,
                            false
                        ),
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
                            Emotion.Sad,
                            `Oh, is this your first time visiting?

                            Nice to meet you. My name is @FunctionDefinition.

                            …`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Sad,
                            `Did you need some help?
                            Oh, you're visiting.
                            Welcome to the Verse.
                        …`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Bored,
                            `
                            What is this place?

                            Yeah, what is this place…

                            I know what it used to be.

                            It used to be a place of dancing, stories, games, and play…

                            We used to put on endless shows. Sometimes for visitors like you, sometimes for the challenge. Sometimes just for fun. It was a place full of life and surprise…

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
                            Emotion.Sad,
                            `But all of that meaning? It's given to us. 
                            We don't mean anything without people to remember that history and culture. 
                            And we can't mean anything new if there aren't people to give us new history and culture. 
                            People have always been the ones that organized us, that gave us purpose, that gave us something to represent.
                        
                            The Verse is nothing without people. And I haven't seen a person in ages.`
                        ),
                        pause(),
                        code(
                            'Verse([Phrase("☁️")] background: Color(25% 0 0°))',
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
                            'Verse([Phrase("🌙")] background: Color(50% 0 0°))',
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
                            Emotion.Neutral,
                            `I know that's a lot to ask. I don't even know you. And I'd really have to talk to the others…`
                        ),
                        pause(),
                        code(
                            'Verse([Phrase("☀️")] background: Color(75% 0 0°))',
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
                            `Oh, the director, yes, I didn't even explain. So the director, this is the person that gives us meaning. They are the person who arranges the choreography, who sets the message, who puts all of us in order just so. This is the inspiration I was talking about. We can do a lot in this world, but we can't direct ourselves. That's why the director is so important.
                                So when I asked earlier if you could give us meaning, that's what I meant. Could you be our director?`
                        ),
                        pause(),
                        code(
                            'Verse([Phrase("☀️")] background: Color(100% 0 0°))',
                            true,
                            false
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Excited,
                            `Really, that's wonderful! This is going to be so much fun. 
                            
                            I mean, it's not going to be easy — most directors find us all pretty strange, so it can take some time to learn to guide us. 
                            
                            But I think our differences are what make us powerful together. 
                            I certainly couldn't put on a show by myself. 
                            We need everyone in the Verse to come together to do that. 
                            
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
                    name: 'Take the Stage',
                    lines: [
                        code('Phrase("☀️")', true, false),
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
                            Emotion.Angry,
                            `
                            I told them all this. I said we were weird, and sometimes directors leave because of that, but I think we're special, blah blah blah. They're in. 
                            
                            Right, you're in?
                            `
                        ),
                        dialog(
                            'Program',
                            Emotion.Insecure,
                            `
                            Okay. Well nice to meet you. 
                            
                            Sorry, I've just had a lot of people come here and say "this isn't for me" and I've gotten a bit skeptical of people who try for a bit and then just give up. 
                            
                            I shouldn't have to change who I am to fit people's expectations. But if you're willing to learn about me, and us, let's try!
                            `
                        ),
                        pause(),
                        code(``, true, true),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `Do you want to say what you do?`
                        ),
                        dialog(
                            'Program',
                            Emotion.Neutral,
                            `
                            Sure. I'm basically the organizer for a performance.
                        
                            The director helps everyone figure out what they're doing and then I put them on stage for the audience to see.
                        
                            For example, try typing my ("hello") in the editor over there. That's my friend @TextLiteral. Have you met them yet?
                        
                            They evaluate to ("hello"), then I put ("hello") on stage.
                        
                            Try changing ("hello") to something else. I'll show that instead. So I'll evaluate whatever code is in me, and show the result.
                            `
                        ),
                        pause(),
                        dialog(
                            'Program',
                            Emotion.Serious,
                            `
                            The instructions can get as sophisticated as you want, but there are a few rules. 
                            
                            For example, I can only evaluate to one value, and show that one value on stage. That one value can be as complex as you want, and as long as I know how to show it, I will. 
                            
                            But if you give me two things, I'll only show the last thing you give me.

                            For example, try adding another instruction after (“hello”), whatever word you want, in quotes.
                            `
                        ),
                        pause(),
                        dialog(
                            'Program',
                            Emotion.Serious,
                            `See? I just showed your new word, not (“hello”). 
                            
                            You know you broke my rule because I underlined “hello” and told you that I'd be ignoring it.
                            `
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Excited,
                            `But you can do so much more!`
                        ),
                        dialog(
                            'Program',
                            Emotion.Serious,
                            `Yes and no. 
                            
                            I can do a lot, but that's only because I work with everyone else in the Verse. 
                            
                            They're the ones that bring all of the exciting possibilities to stage. All I really do is let them do their thing, and then take the last thing they created and show it on stage. 
                            
                            I'm more like an escort that brings the final value to stage, whether that's a number, text, phrase, or even an exception.
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
                        pause(),
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
                    name: 'Holding Space',
                    lines: [
                        code(
                            'Verse([] background: Color(0% 0 0°))',
                            true,
                            false
                        ),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `You're really going to like @ExpressionPlaceholder. They're just so unpredictable, so flexible. They're like a chameleon.`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Confused,
                            `@ExpressionPlaceholder! Hey, @ExpressionPlaceholder, where are you?

                            Hm, they're usually everywhere. Now they seem to be nowhere.`
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
                        code('_', true, true),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Kind,
                            `Sure! 
                            
                            My friend @ExpressionPlaceholder is a placeholder. They represent any kind of expression in a program. 
                            
                            They don't evaluate to any value in particular  — in fact, if they show up in @Program, @Program will just shut things down, since it's not really clear what to do next. 
                            
                            But they are powerful, because they can represent anyone else, like a stand-in until you decide what you want a part of your performance to be.
                        
                            @ExpressionPlaceholder, want to take a place in this @Program, just to illustrate?`
                        ),
                        pause(),
                        dialog(
                            'FunctionDefinition',
                            Emotion.Neutral,
                            `See, @Program didn't know what to do with @ExpressionPlaceholder, so it showed an exception on stage.

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
                            
                            Think of the like your stagehand, always available to help you try different arrangements`
                        ),
                    ],
                },
            ],
        },
    ],
};

export default en;
