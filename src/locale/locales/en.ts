import type Locale from '../Locale';

const en: Locale = {
    $schema: '../Locale.json',
    language: 'en',
    tbd: 'TBD',
    wordplay: 'Wordplay',
    term: {
        store: 'bind',
        code: 'evaluate',
        decide: 'decide',
        project: 'performance',
        source: 'source',
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
        name: 'name',
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
        structure: '$structure',
        streamdefinition: 'stream definition',
        index: 'index',
        query: 'query',
        row: 'row',
        set: 'set',
        key: 'key',
    },
    evaluate: {
        unevaluated: 'the selected node did not evaluate',
        done: 'done evaluating',
        stream: 'keeping the stream instead of getting its latest value',
        jump: 'jumping past code',
        jumpif: '$1 ?? [jumping over code | not jumping over code]',
        halt: 'encountered exception, stopping',
        initialize: 'preparing to process items',
        evaluate: 'starting evaluation',
        next: 'apply the function to the next item',
        check: 'check the result',
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
        Separator: `$name separator`,
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
        Name: '$name',
        Unknown: 'unknown',
        End: 'end',
    },
    node: {
        Dimension: {
            name: 'dimension',
            description: 'number',
            emotion: 'serious',
            doc: `I am a *unit of measurement*, like ⧼1m⧽, ⧼10s⧽, ⧼100g⧽, or any other scientific unit. I'm happy to be any unit want to make up too, like (17apple).
            
                I can be combined with other symbols to make compound units like ⧼9.8m/s^2⧽ or ⧼17apple/day⧽.
                
                I must always follow a number. If I don't, I might be mistaken for a $name, which would be quite embarassing, because I name units, not values.`,
        },
        Doc: {
            name: 'documentation',
            description: 'documentation',
            emotion: 'serious',
            doc:
                '$?' +
                `Describes the purpose of some code.
                
                It can precede any expression, but is most useful before definitions to explain how to use them. 
                Documentation can be tagged with a language`,
        },
        Docs: {
            name: 'documentation list',
            description: 'documentation list',
            emotion: 'serious',
            doc: '$?' + `a list of documentation`,
        },
        KeyValue: {
            name: 'key/value pair',
            description: 'key/value pair',
            emotion: 'kind',
            doc:
                '$?' +
                `represents a single mapping in a map between a key and a value.`,
        },
        Language: {
            name: 'language tag',
            description: 'language',
            emotion: 'eager',
            doc: `
                Why hello! 
                Have you ever wanted to make it *crystal clear* what lanugage something is? 
                That's what I do. Just a little slash, and a couple letters, and no one will ever be confused about what language some text is in.
                For example, let's say you wanted to say my $name, but make it clear I'm in English:
                
                ⧼"Language"/en⧽
                
                Or, suppose you wanted to do this for a @Name.

                ⧼sound/en: "meow"⧽

                Or even @Doc!

                There are lots of different two letter language codes.
                `,
        },
        Name: {
            name: 'name',
            description: '$1 ?? [$1 | unnamed]',
            emotion: 'kind',
            doc:
                '$?' +
                `
                Identifies code.
                
                names are used to represent some value in a $program, such as a function, $structure type, or a binding in a block. 
                They're a helpful way of giving a shorthand label to some value or way of computing or storing values. 
                Names can be optionally tagged with a language; this is helpful when sharing code, since the language might use to name a function might not be known to people who want to use it. 
                Translating names makes shared code more globally useful.`,
        },
        Names: {
            name: '$name list',
            description: '$name list',
            emotion: 'kind',
            doc:
                '$?' +
                `
                Defines a list of names some code is known by.
                
                Names are separated by ⧼,⧽ symbols. 
                Having multiple names is most helpful when you want to use multiple languages.
                `,
        },
        Row: {
            name: 'row',
            description: 'row',
            emotion: 'angry',
            doc: '$?' + `a row of values, matching a table definition`,
        },
        Token: {
            name: 'token',
            description: '$1 $2',
            emotion: 'neutral',
            doc: '$?' + 'the smallest group of symbols in a performance',
        },
        TypeInputs: {
            name: 'type inputs',
            description: 'type inputs',
            emotion: 'curious',
            doc:
                '$?' +
                `a list of types given to a @FunctionDefinition or @StructureDefinition`,
        },
        TypeVariable: {
            name: 'type variable',
            description: 'type variable',
            emotion: 'curious',
            doc:
                '$?' +
                `a placeholder for a type used in a @FunctionDefinition or @StructureDefinition`,
        },
        TypeVariables: {
            name: 'type variables',
            description: 'type variables',
            emotion: 'curious',
            doc: '$?' + `a list of @TypeVariable`,
        },
        Paragraph: {
            name: 'paragraph',
            description: 'paragraph',
            emotion: 'serious',
            doc: '$?' + `a formatted list of words, links, and example code`,
        },
        WebLink: {
            name: 'link',
            description: 'link',
            emotion: 'serious',
            doc: '$?' + `a link to something on the web`,
        },
        ConceptLink: {
            name: 'concept',
            description: 'concept',
            emotion: 'serious',
            doc: '$?' + `a link to a concept in Wordplay`,
        },
        Words: {
            name: 'words',
            description: 'words',
            emotion: 'serious',
            doc: '$?' + `words that are part of @Doc`,
        },
        Example: {
            name: 'example',
            description: 'example',
            emotion: 'serious',
            doc: `You can put a $program in any documentation to format some text as $program, or to illustrate how to use some code. 
If you put it on it's own line, it will be displayed in a fancy box and show the result of evaluating the $program.
Like this:

⧼"My example is cute"⧽

`,
        },
        BinaryOperation: {
            name: 'binary operation',
            description: 'operator',
            emotion: 'insecure',
            doc: `Sometimes when I'm evaluating a @FunctionDefinition with just one value on the left and one value on the right, I like to use this form, instead of @Evaluate.
                
                ⧼1 + 1⧽ is just so much simpler than ⧼1.+(1)⧽ or ⧼1.add(1)⧽. 
                It makes everything a bit tidier, even though its basically the same thing.
                `,
            right: 'input',
            start: '$1 first, then right',
            finish: 'look, I made $1',
        },
        Bind: {
            name: 'bind',
            description: 'bind',
            emotion: 'bored',
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
            start: "Let's see what value we get from $1",
            finish: "Oh nice, I got $1! Let's name it $2",
        },
        Block: {
            name: 'block',
            description: '$1 statements',
            emotion: 'grumpy',
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
            finish: 'Finally done. The last thing I got was $1',
        },
        BooleanLiteral: {
            name: 'boolean',
            description: '$1 ?? [true|false]',
            emotion: 'precise',
            doc: `
                We are ⧼⊤⧽ and ⧼⊥⧽.
                
                We represent true and false.

                True is not false and false is not true.

                Use our functions to reason about truth.

                But leave ambiguity out of it.
                `,
            start: '$1!',
        },
        Borrow: {
            name: 'borrow',
            description: 'borrow',
            emotion: 'excited',
            doc: '$?' + `Use a binding from another $source or performance.`,
            start: 'borrowing $2 from $1',
            source: '$source',
            bind: 'name',
            version: 'version',
        },
        Changed: {
            name: 'changed',
            description: 'changed',
            emotion: 'curious',
            doc: '$?' + `true if a stream caused a $program to re-evaluate`,
            start: 'check if $1 caused this $program to reevaluate',
            stream: 'stream',
        },
        Conditional: {
            name: 'conditional',
            description: '',
            emotion: 'curious',
            doc: `
            Did you ever think about how we decide? 
            I think about that a lot. 
            So many decisions in life can be so complicated. 
            Sometimes I feel a lot of pressure to decide, since I'm the only one in this world who gets to decide.
            
            I get overwhelmed, and so I've tried to simplify things. 
            @BooleanLiteral helps see that I could reduce everything to just two options: ⧼⊤⧽ and ⧼⊥⧽.
            If it's ⧼⊤⧽, then I evaluate my *yes* code. If it's ⧼⊥⧽, then I evaluate my *no* code.

            I know that decisions are rarely this simple, but breaking down the world into these two options makes things easier for me.
            It's my little way of keeping things organized, even in the face of so much complexity.
            Yes, no, if, else, this, that.
            Hm, I'm starting to sound like @BooleanLiteral...
            `,
            start: "let's see if $1 is true",
            finish: "it's $1 value!",
            condition: 'condition',
            yes: 'yes',
            no: 'no',
        },
        ConversionDefinition: {
            name: 'conversion',
            description: 'conversion',
            emotion: 'excited',
            doc: '$?' + `define a conversion from one value type to another`,
            start: `define this conversion`,
        },
        Convert: {
            name: 'convert',
            description: 'converts a value to a different type',
            emotion: 'cheerful',
            doc: `
                Yo. I turn values from one type to another. Check it out:
                
                ⧼1 → ""⧽
                
                ⧼5s → #ms⧽

                ⧼"hello" → []⧽
                
                You can even chain these together:

                ⧼"hello" → [] → {}⧽

                Values have a set of @ConversionDefinition that are predefined, but if you make a @StructureDefinition for a new type of value, you can define your own.
                `,
            start: "let's get the value to convert from $1",
            finish: 'I converted this to $1',
        },
        Delete: {
            name: 'delete',
            description: 'delete',
            emotion: 'angry',
            doc: '$?' + `delete rows from a table`,
            start: 'evaluate $1 first',
            finish: 'evaluated to table without row $1',
        },
        DocumentedExpression: {
            name: 'documented expression',
            description: 'documented expression',
            emotion: 'serious',
            doc: '$?',
            start: 'evaluate the documented expression',
        },
        Evaluate: {
            name: 'evaluate',
            description: 'evaluate $1 ?? [$1|anonymous function]',
            emotion: 'shy',
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
            start: "let's evaluate the inputs first",
            finish: 'the function evaluated to $1',
            function: 'function',
            input: 'input',
        },
        ExpressionPlaceholder: {
            name: 'placeholder',
            description: '$1 ?? [$1|placeholder]',
            emotion: 'scared',
            doc: `
                I'm supposed to be an *expression*, but I really don't know how to do anything.
                
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
            description: 'function $1',
            emotion: 'kind',
            doc:
                '$?' +
                `define a function that maps input values to an output value`,
            start: 'define this function',
        },
        HOF: {
            name: 'higher order function',
            description: 'higher order function',
            emotion: 'kind',
            doc: '$?',
            start: 'evaluating the function given',
            finish: 'evaluated to $1',
        },
        Initial: {
            name: 'initial evaluation',
            description: 'initial evaluation',
            emotion: 'curious',
            doc: '$?',
        },
        Insert: {
            name: 'insert',
            description: 'insert',
            emotion: 'angry',
            doc: '$?',
            start: 'evaluate $1 first',
            finish: 'evaluated to table new rows, $1',
        },
        Is: {
            name: 'is',
            description: 'is',
            emotion: 'curious',
            doc: '$?',
            start: 'evaluate $1 first',
            finish: '$1 ?? [ value is $2 | value is not $2 ]',
        },
        ListAccess: {
            name: 'list access',
            description: '',
            emotion: 'cheerful',
            doc: '$?',
            start: 'evaluate $1 first',
            finish: 'item at index is $1',
        },
        ListLiteral: {
            name: 'list',
            description: '$1 item list',
            emotion: 'eager',
            doc: `I'm a list of expressions! You can put anything in me: @BooleanLiteral, @MeasurementLiteral, @TextLiteral, @NoneLiteral, even other @ListLiteral, @SetLiteral, @MapLiteral, and more.

            What makes me special is that I keep things in order and I number everything from 1 to however many items are in me.

            For example, the three words in this list are numbered 1, 2, and 3.

            ⧼['apple' 'banana' 'mango']⧽
            
            You can get values that I'm storing by their number.
            For example, the second value in this list is ⧼['banana']⧽

            ⧼['apple' 'banana' 'mango'][2]⧽

            `,
            start: "let's evaluate the items first",
            finish: 'evaluated to list $1',
            item: 'item',
        },
        MapLiteral: {
            name: 'map',
            description: '$1 pairing map',
            emotion: 'excited',
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
            finish: 'I connected everyone! $1',
        },
        MeasurementLiteral: {
            name: 'number',
            description: '$1 $2',
            emotion: 'excited',
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
            start: 'evaluate to $1',
        },
        NativeExpression: {
            name: 'built-in expression',
            description: 'built-in expression',
            emotion: 'neutral',
            doc: '$?',
            start: 'evaluate the built-in expression',
        },
        NoneLiteral: {
            name: 'nothing',
            description: 'nothing',
            emotion: 'neutral',
            doc: `/Hi, @FunctionDefinition here. @NoneLiteral doesn't like to say much, so I'll translate./
                
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
            emotion: 'curious',
            doc: '$?',
            start: 'first get $1',
            finish: 'evaluated to stream value $1',
        },
        Program: {
            name: 'program',
            description: '$program',
            emotion: 'serious',
            doc: `You know how @Block evaluates a list of expressions, and evaluates to the last one in its list? 
                
                I'm the same, but rather than giving my value to whatever expression I'm in, I put the value on stage.
                
                The value can be anything: a @MeasurementLiteral, @TextLiteral, or @BooleanLiteral, a @ListLiteral, @SetLiteral, @MapLiteral, or even something more complex, like a @Phrase, @Group, or @Stage.

                If you don't give me a value to show on stage, I'll probably ask you for one.
                `,
            start: '$1 ?? [ stream changed, reevaluating | evaluating for the first time ]',
            finish: 'I evaluated to $1',
        },
        PropertyBind: {
            name: 'refine',
            description: 'refine',
            emotion: 'kind',
            doc: '$?',
            start: `get the $structure`,
            finish: 'I created a new $structure $1 set to $2',
        },
        PropertyReference: {
            name: 'property access',
            description: 'property access',
            emotion: 'kind',
            doc: '$?',
            start: 'first get the value',
            finish: 'property $1 is $2',
            property: 'property',
        },
        Reaction: {
            name: 'reaction',
            description: 'reaction',
            emotion: 'excited',
            doc: `A reaction to a stream change.`,
            start: 'first check if the stream has changed',
            finish: 'the stream value is currently $1',
            initial: 'initial',
            condition: 'condition',
            next: 'next',
        },
        Reference: {
            name: 'reference',
            description: '$1',
            emotion: 'kind',
            doc: '$?',
            start: 'getting the value of $1',
        },
        Select: {
            name: 'select',
            description: 'select',
            emotion: 'angry',
            doc: '$?',
            start: 'evaluate $1 first',
            finish: 'evaluated to a new table with the selected rows, $1',
        },
        SetLiteral: {
            name: 'set',
            description: '$1 items',
            emotion: 'eager',
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
            finish: 'I created a set $1',
        },
        SetOrMapAccess: {
            name: 'set/map access',
            description: 'set/map access',
            emotion: 'kind',
            doc: '$?',
            start: 'evaluate the set first',
            finish: 'item in with key is $1',
        },
        Source: {
            name: 'document',
            description: 'document',
            emotion: 'serious',
            doc: '$?',
        },
        StreamDefinition: {
            name: 'stream',
            description: 'stream',
            emotion: 'curious',
            doc: '$?' + `defines a stream of values.`,
            start: 'define this stream type',
        },
        StructureDefinition: {
            name: 'structure',
            description: 'structure $1',
            emotion: 'kind',
            doc:
                '$?' +
                `define a structure that stores values and functions on those values.`,
            start: `define this $structure`,
        },
        TableLiteral: {
            name: 'table',
            description: 'table',
            emotion: 'angry',
            doc: '$?',
            item: 'row',
            start: 'first evaluate the rows',
            finish: 'evaluated to new table $1',
        },
        Template: {
            name: 'text template',
            description: 'text template',
            emotion: 'serious',
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
            description: 'text $1',
            emotion: 'serious',
            doc: `I can be any text you like, and use any of these text symbols: ⧼""⧽, ⧼“”⧽, ⧼„“⧽, ⧼''⧽, ⧼‘’⧽, ⧼‹›⧽, ⧼«»⧽, ⧼「」⧽, or ⧼『'⧽.
                Just remember to close me if you open me, and use the matching symbol.
                Otherwise I won't know that you're done with your words.`,
            start: `let's make text`,
        },
        This: {
            name: 'this',
            description: 'this',
            emotion: 'kind',
            doc: '$?',
            start: 'evaluated to $1',
        },
        UnaryOperation: {
            name: 'unary operation',
            description: '$1',
            emotion: 'insecure',
            doc: `Did you know that when I'm evaluating a @FunctionDefinition with just one value, and the name of the @FunctionDefinition is just a single symbol, you can put the name before the input?
                
                Like, ⧼-(1 + 1)⧽ or ⧼~⊥⧽, for example. Those are much easier to read than ⧼(1 + 1).negate()⧽ or ⧼⊥.not()⧽.
                You don't have to write me that way, but it might be easier overall.

                There's only one rule: you can't put any space between the name and the value. Otherwise you might be making a @Reference or @BinaryOperation.
                `,
            start: 'evaluate the expression',
            finish: 'I made it $1',
        },
        UnparsableExpression: {
            name: 'unparsable',
            description: 'unparseable',
            emotion: 'excited',
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
            emotion: 'angry',
            doc: '$?',
            start: 'evaluate $1 first',
            finish: 'evaluated to a new table with revised rows, $1',
        },
        AnyType: {
            name: 'any',
            description: 'any',
            emotion: 'curious',
            doc: `represents any possible type`,
        },
        BooleanType: {
            name: 'boolean',
            description: 'boolean',
            emotion: 'precise',
            doc: `a true or false value`,
        },
        ConversionType: {
            name: 'conversion',
            description: 'conversion',
            emotion: 'curious',
            doc: `a type of function that converts values of one type to another `,
        },
        ExceptionType: {
            name: 'exception',
            description: 'exception',
            emotion: 'curious',
            doc: '$?',
        },
        FunctionDefinitionType: {
            name: 'function',
            description: 'function',
            emotion: 'curious',
            doc: '$?',
        },
        FunctionType: {
            name: 'function',
            description: 'function',
            emotion: 'curious',
            doc: '$?',
        },
        ListType: {
            name: 'list',
            description: '$1 ?? [list of $1|list]',
            emotion: 'cheerful',
            doc: '$?',
        },
        MapType: {
            name: 'map',
            description: 'map from $1 ?? [$1|any] to $2 ?? [$2|any]',
            emotion: 'kind',
            doc: '$?',
        },
        MeasurementType: {
            name: 'number',
            description: 'number',
            emotion: 'precise',
            doc: '$?',
        },
        NameType: {
            name: 'structure',
            description: '$1 type',
            emotion: 'curious',
            doc: '$?',
        },
        NeverType: {
            name: 'never',
            description: '',
            emotion: 'curious',
            doc: '$?',
        },
        NoneType: {
            name: 'nothing',
            description: '',
            emotion: 'neutral',
            doc: '$?',
        },
        SetType: {
            name: 'set',
            description: '$1 ?? [$1|anything] set type',
            emotion: 'kind',
            doc: '$?',
        },
        StreamDefinitionType: {
            name: 'stream',
            description: 'stream type',
            emotion: 'curious',
            doc: '$?',
        },
        StreamType: {
            name: 'stream',
            description: 'stream type',
            emotion: 'curious',
            doc: '$?',
        },
        StructureDefinitionType: {
            name: 'structure',
            description: 'structure',
            emotion: 'kind',
            doc: '$?',
        },
        UnknownType: {
            name: 'unknown',
            description: 'unknown type',
            unknown: 'unknown',
            connector: ', because',
            emotion: 'curious',
            doc: '$?',
        },
        TableType: {
            name: 'table',
            description: 'table',
            emotion: 'angry',
            doc: '$?',
        },
        TextType: {
            name: 'text',
            description: '$1 ?? [$1|text]',
            emotion: 'happy',
            doc: '$?',
        },
        TypePlaceholder: {
            name: 'placeholder',
            description: 'placeholder',
            emotion: 'curious',
            doc: '$?',
        },
        UnionType: {
            name: 'option',
            description: '$1 | $2',
            emotion: 'curious',
            doc: '$?',
        },
        Unit: {
            name: 'unit',
            description: '$1',
            emotion: 'precise',
            doc: '$?',
        },
        UnparsableType: {
            name: 'unparsable',
            description: '',
            emotion: 'curious',
            doc: '$?',
        },
        VariableType: {
            name: 'variable',
            description: '',
            emotion: 'curious',
            doc: '$?',
        },
        CycleType: {
            name: 'cycle',
            description: 'depends on itself',
            emotion: 'curious',
            doc: '$?',
        },
        UnknownVariableType: {
            name: 'unknown variable',
            description: '',
            emotion: 'curious',
            doc: '$?',
        },
        NotAType: {
            name: 'unexpected',
            description: 'not a $1',
            emotion: 'curious',
            doc: '$?',
        },
        NoExpressionType: {
            name: 'non-expression',
            description: '',
            emotion: 'curious',
            doc: '$?',
        },
        NotEnclosedType: {
            name: 'not in $structure, $conversion, or $reaction',
            description: '',
            emotion: 'curious',
            doc: '$?',
        },
        NotImplementedType: {
            name: 'unimplemented',
            description: '',
            emotion: 'curious',
            doc: '$?',
        },
        UnknownNameType: {
            name: 'unknown name',
            description: "$1 ?? [$1 isn't defined | a name wasn't given]",
            emotion: 'curious',
            doc: '$?',
        },
    },
    native: {
        bool: {
            doc: `We are single true or false value.
            
            We are the simplest value type, since we can only be one of two values, (⊤) and (⊥).`,
            name: 'boolean type',
            function: {
                and: {
                    doc: '$?',
                    name: ['&', 'and'],
                    inputs: [{ doc: '$?', names: 'value' }],
                },
                or: {
                    doc: '$?',
                    name: ['|', 'or'],
                    inputs: [{ doc: '$?', names: 'value' }],
                },
                not: {
                    doc: '$?',
                    name: ['~', 'not'],
                    inputs: [],
                },
                equals: {
                    doc: '$?',
                    name: ['=', 'equals'],
                    inputs: [{ doc: '$?', names: 'value' }],
                },
                notequal: {
                    doc: '$?',
                    name: ['≠'],
                    inputs: [{ doc: '$?', names: 'value' }],
                },
            },
            conversion: {
                text: '$?',
            },
        },
        none: {
            doc: `I am nothing
            
            I am special because I am only equal to me.
            I can only ever be me and only ever want to be me!`,
            name: 'none type',
            function: {
                equals: {
                    doc: '$?',
                    name: ['=', 'equals'],
                    inputs: [{ doc: '$?', names: 'value' }],
                },
                notequals: {
                    doc: '$?',
                    name: '≠',
                    inputs: [{ doc: '$?', names: 'value' }],
                },
            },
            conversion: {
                text: '$?',
            },
        },
        text: {
            doc: `We are any words imaginable.
            
            We can represent ideas, stories, words, and more, and even represent other types of values, but as text.`,
            name: 'text type',
            function: {
                length: {
                    doc: '$?',
                    name: ['📏', 'length'],
                    inputs: [],
                },
                equals: {
                    doc: '$?',
                    name: ['=', 'equals'],
                    inputs: [{ doc: '$?', names: 'value' }],
                },
                notequals: {
                    doc: '$?',
                    name: '≠',
                    inputs: [{ doc: '$?', names: 'value' }],
                },
                repeat: {
                    doc: '$?',
                    name: ['·', '🔁', 'repeat'],
                    inputs: [{ doc: '$?', names: 'count' }],
                },
                segment: {
                    doc: '$?',
                    name: ['÷', 'segment'],
                    inputs: [{ doc: '$?', names: 'delimiter' }],
                },
                combine: {
                    doc: '$?',
                    name: ['+', 'combine'],
                    inputs: [{ doc: '$?', names: 'text' }],
                },
                has: {
                    doc: '$?',
                    name: ['⊆', 'has'],
                    inputs: [{ doc: '$?', names: 'text' }],
                },
            },
            conversion: {
                text: '$?',
                number: '$?',
            },
        },
        measurement: {
            doc: `We are any number imaginable, even with units.
            
            We can be integers, real numbers, negative, positive, fractional, decimal. We can be Arabic numbers (123), Roman numerals (ⅩⅩⅩⅠⅩ), Japanese numerals (二十), and more.`,
            name: 'number',
            function: {
                add: {
                    doc: `I take two @MeasurementType with the same @Unit and add them together, creating a new @MeasurementType of the same @Unit.
                    
                    For example:

                    ⧼1 + 1⧽

                    ⧼3cat + 5cat⧽
                    
                    If the units don't match, I halt the show.
                    
                    ⧼3cat + 5dog⧽
                    `,
                    name: ['+', 'add'],
                    inputs: [
                        { doc: `I'm the number to add.`, names: 'number' },
                    ],
                },
                subtract: {
                    doc: '$?',
                    name: ['-', 'subtract'],
                    inputs: [{ doc: '$?', names: 'number' }],
                },
                multiply: {
                    doc: '$?',
                    name: ['·', 'multiply'],
                    inputs: [{ doc: '$?', names: 'number' }],
                },
                divide: {
                    doc: '$?',
                    name: ['÷', 'divide'],
                    inputs: [{ doc: '$?', names: 'number' }],
                },
                remainder: {
                    doc: '$?',
                    name: ['%', 'remainder'],
                    inputs: [{ doc: '$?', names: 'number' }],
                },
                truncate: {
                    doc: '$?',
                    name: ['truncate'],
                    inputs: [{ doc: '$?', names: 'number' }],
                },
                absolute: {
                    doc: '$?',
                    name: ['absolute'],
                    inputs: [{ doc: '$?', names: 'number' }],
                },
                power: {
                    doc: '$?',
                    name: ['^', 'power'],
                    inputs: [{ doc: '$?', names: 'number' }],
                },
                root: {
                    doc: '$?',
                    name: ['√', 'root'],
                    inputs: [{ doc: '$?', names: 'number' }],
                },
                lessThan: {
                    doc: '$?',
                    name: ['<', 'lessthan'],
                    inputs: [{ doc: '$?', names: 'number' }],
                },
                lessOrEqual: {
                    doc: '$?',
                    name: ['≤', 'lessorequal'],
                    inputs: [{ doc: '$?', names: 'number' }],
                },
                greaterThan: {
                    doc: '$?',
                    name: ['>', 'greaterthan'],
                    inputs: [{ doc: '$?', names: 'number' }],
                },
                greaterOrEqual: {
                    doc: '$?',
                    name: ['≥', 'greaterorequal'],
                    inputs: [{ doc: '$?', names: 'number' }],
                },
                equal: {
                    doc: '$?',
                    name: ['=', 'equal'],
                    inputs: [{ doc: '$?', names: 'number' }],
                },
                notequal: {
                    doc: '$?',
                    name: '≠',
                    inputs: [{ doc: '$?', names: 'number' }],
                },
                cos: {
                    doc: '$?',
                    name: ['cos', 'cosine'],
                    inputs: [],
                },
                sin: {
                    doc: '$?',
                    name: ['sin', 'sine'],
                    inputs: [],
                },
            },
            conversion: {
                text: '$?',
                list: '$?',
                s2m: '$?',
                s2h: '$?',
                s2day: '$?',
                s2wk: '$?',
                s2year: '$?',
                s2ms: '$?',
                ms2s: '$?',
                min2s: '$?',
                h2s: '$?',
                day2s: '$?',
                wk2s: '$?',
                yr2s: '$?',
                m2pm: '$?',
                m2nm: '$?',
                m2micro: '$?',
                m2mm: '$?',
                m2cm: '$?',
                m2dm: '$?',
                m2km: '$?',
                m2Mm: '$?',
                m2Gm: '$?',
                m2Tm: '$?',
                pm2m: '$?',
                nm2m: '$?',
                micro2m: '$?',
                mm2m: '$?',
                cm2m: '$?',
                dm2m: '$?',
                km2m: '$?',
                Mm2m: '$?',
                Gm2m: '$?',
                Tm2m: '$?',
                km2mi: '$?',
                mi2km: '$?',
                cm2in: '$?',
                in2cm: '$?',
                m2ft: '$?',
                ft2m: '$?',
                g2mg: '$?',
                mg2g: '$?',
                g2kg: '$?',
                kg2g: '$?',
                g2oz: '$?',
                oz2g: '$?',
                oz2lb: '$?',
                lb2oz: '$?',
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
                    doc: '$?',
                    name: 'add',
                    inputs: [{ doc: '$?', names: 'item' }],
                },
                append: {
                    doc: '$?',
                    name: ['+', 'append'],
                    inputs: [{ doc: '$?', names: 'list' }],
                },
                replace: {
                    doc: '$?',
                    name: ['replace'],
                    inputs: [
                        { doc: '$?', names: 'index' },
                        { doc: '$?', names: 'value' },
                    ],
                },
                length: {
                    doc: '$?',
                    name: ['📏', 'length'],
                    inputs: [],
                },
                random: {
                    doc: '$?',
                    name: 'random',
                    inputs: [],
                },
                first: {
                    doc: '$?',
                    name: 'first',
                    inputs: [],
                },
                last: {
                    doc: '$?',
                    name: 'last',
                    inputs: [],
                },
                has: {
                    doc: '$?',
                    name: 'has',
                    inputs: [{ doc: '$?', names: 'item' }],
                },
                join: {
                    doc: '$?',
                    name: 'join',
                    inputs: [{ doc: '$?', names: 'separator' }],
                },
                sansFirst: {
                    doc: '$?',
                    name: 'sansFirst',
                    inputs: [],
                },
                sansLast: {
                    doc: '$?',
                    name: 'sansLast',
                    inputs: [],
                },
                sans: {
                    doc: '$?',
                    name: 'sans',
                    inputs: [{ doc: '$?', names: 'value' }],
                },
                sansAll: {
                    doc: '$?',
                    name: 'sansAll',
                    inputs: [{ doc: '$?', names: 'value' }],
                },
                reverse: {
                    doc: '$?',
                    name: 'reverse',
                    inputs: [],
                },
                equals: {
                    doc: '$?',
                    name: ['=', 'equals'],
                    inputs: [{ doc: '$?', names: 'list' }],
                },
                notequals: {
                    doc: '$?',
                    name: '≠',
                    inputs: [{ doc: '$?', names: 'list' }],
                },
                translate: {
                    doc: '$?',
                    name: 'translate',
                    inputs: [{ doc: '$?', names: 'translator' }],
                    value: { doc: '$?', names: 'item' },
                    index: { doc: '$?', names: 'index' },
                },
                filter: {
                    doc: '$?',
                    name: 'filter',
                    inputs: [{ doc: '$?', names: 'checker' }],
                    value: { doc: '$?', names: 'item' },
                },
                all: {
                    doc: '$?',
                    name: 'all',
                    inputs: [{ doc: '$?', names: 'checker' }],
                    value: { doc: '$?', names: 'item' },
                },
                until: {
                    doc: '$?',
                    name: 'until',
                    inputs: [{ doc: '$?', names: 'checker' }],
                    value: { doc: '$?', names: 'item' },
                },
                find: {
                    doc: '$?',
                    name: 'find',
                    inputs: [{ doc: '$?', names: 'checker' }],
                    value: { doc: '$?', names: 'item' },
                },
                combine: {
                    doc: '$?',
                    name: 'combine',
                    inputs: [
                        { doc: '$?', names: 'initial' },
                        { doc: '$?', names: 'combiner' },
                    ],
                    combination: { doc: '$?', names: 'combination' },
                    next: { doc: '$?', names: 'next' },
                    index: { doc: '$?', names: 'index' },
                },
            },
            conversion: {
                text: '$?',
                set: '$?',
            },
        },
        set: {
            doc: `We group unique values in no particular order.
            
            We don't like it when there's more than one value of a particular kind! Everything must be unique.`,
            name: 'set type',
            kind: 'Kind',
            function: {
                equals: {
                    doc: '$?',
                    name: ['=', 'equals'],
                    inputs: [{ doc: '$?', names: 'set' }],
                },
                notequals: {
                    doc: '$?',
                    name: '≠',
                    inputs: [{ doc: '$?', names: 'set' }],
                },
                add: {
                    doc: '$?',
                    name: ['add', '+'],
                    inputs: [{ doc: '$?', names: 'set' }],
                },
                remove: {
                    doc: '$?',
                    name: ['remove', '-'],
                    inputs: [{ doc: '$?', names: 'set' }],
                },
                union: {
                    doc: '$?',
                    name: ['union', '∪'],
                    inputs: [{ doc: '$?', names: 'set' }],
                },
                intersection: {
                    doc: '$?',
                    name: ['intersection', '∩'],
                    inputs: [{ doc: '$?', names: 'set' }],
                },
                difference: {
                    doc: '$?',
                    name: 'difference',
                    inputs: [{ doc: '$?', names: 'set' }],
                },
                filter: {
                    doc: '$?',
                    name: 'filter',
                    inputs: [{ doc: '$?', names: 'checker' }],
                    value: { doc: '$?', names: 'value' },
                },
                translate: {
                    doc: '$?',
                    name: 'translate',
                    inputs: [{ doc: '$?', names: 'lisetst' }],
                    value: { doc: '$?', names: 'value' },
                },
            },
            conversion: {
                text: '$?',
                list: '$?',
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
                    doc: '$?',
                    name: ['=', 'equals'],
                    inputs: [{ doc: '$?', names: 'value' }],
                },
                notequals: {
                    doc: '$?',
                    name: '≠',
                    inputs: [{ doc: '$?', names: 'value' }],
                },
                set: {
                    doc: '$?',
                    name: 'set',
                    inputs: [
                        { doc: '$?', names: 'key' },
                        { doc: '$?', names: 'value' },
                    ],
                },
                unset: {
                    doc: '$?',
                    name: 'unset',
                    inputs: [{ doc: '$?', names: 'key' }],
                },
                remove: {
                    doc: '$?',
                    name: 'remove',
                    inputs: [{ doc: '$?', names: 'value' }],
                },
                filter: {
                    doc: '$?',
                    name: 'filter',
                    inputs: [{ doc: '$?', names: 'checker' }],
                    key: { doc: '$?', names: 'key' },
                    value: { doc: '$?', names: 'value' },
                },
                translate: {
                    doc: '$?',
                    name: 'translate',
                    inputs: [{ doc: '$?', names: 'translator' }],
                    key: { doc: '$?', names: 'key' },
                    value: { doc: '$?', names: 'value' },
                },
            },
            conversion: {
                text: '$?',
                set: '$?',
                list: '$?',
            },
        },
    },
    exception: {
        blank: "I'm so excited to put on a show with you! Where should we start?",
        function: "Oops, I don't know how to $1",
        name: 'I feel... unbound, with no value. Am I supposed to have a value in $1 ?? [ $1 | this @Block ]?',
        cycle: '$1 depends on itself',
        functionlimit: 'I evaluated too many functions, especially $1',
        steplimit: 'I evaluated too many steps in this function',
        type: 'I expected a $1 but received $2',
        placeholder: "I don't know what to do here!!",
        unparsable: '???',
        value: "Oh no! I expected a value, but I didn't get one",
    },
    conflict: {
        BorrowCycle:
            "this depends on $1, which depends on this $source, so the $program can't be evaluated",
        ReferenceCycle:
            "$1 depends on itself, so there's no way to evaluate it.",
        DisallowedInputs:
            "I can't have inputs because one of or more of my functions isn't implemented",
        DuplicateName: {
            primary: "Someone has my name, so I can't have this name.",
            secondary: 'this is overwritten by $1',
        },
        DuplicateShare: {
            primary:
                'I have the same name as $1, which makes what is shared ambiguous',
            secondary: 'I have has the same name as $1',
        },
        DuplicateTypeVariable: {
            primary: 'I have the same name as $1',
            secondary: 'I have the same name as $1',
        },
        ExpectedBooleanCondition: {
            primary:
                "I can't choose between yes and no with a $1. Can you give me a @TextType?",
            secondary: "I wish I evaluated to a @TextType, but I'm a $1",
        },
        ExpectedColumnType: 'I need a column type',
        ExpectedEndingExpression: 'I need at least one expression.',
        ExpectedSelectName: 'I need at least one column name.',
        ExpectedUpdateBind: 'I need a value for every column',
        IgnoredExpression: {
            primary: "I'm going to use this value and ignore other ones above.",
            secondary: 'Why are you ignoring me, I want to help!',
        },
        IncompleteImplementation:
            'My functions either need to all be implemented, or none be implemented. No messy mixtures!',
        IncompatibleBind: {
            primary: `I'm supposed to be $1, but I'm $2`,
            secondary: 'Hey, I got a $2 instead of a $1',
        },
        IncompatibleCellType: {
            primary: 'I needed a $1, but got a $2',
            secondary: 'I got a $2',
        },
        IncompatibleInput: {
            primary: "I'm supposed to be a $1, but I'm a $2",
            secondary: 'Umm, I got a $2 instead of a $1',
        },
        IncompatibleKey: {
            primary: 'I expected a $1 key',
            secondary: 'I got a $2',
        },
        ImpossibleType: 'this can never be this type',
        InvalidLanguage: "I don't know this language",
        InvalidRow: "I'm missing one or more columns",
        InvalidTypeInput: {
            primary: "I wasn't expecting this type input",
            secondary: 'Am I supposed to be here?',
        },
        MisplacedConversion: "I'm not allowed here, only in a $structure.",
        MisplacedInput: 'I think this input is misplaced. Check the order?',
        MisplacedShare:
            'I can only be at the top level of a $program, not inside anything.',
        MisplacedThis:
            "I'm only allowed in a $structure, $conversion, or $reaction.",
        MissingCell: {
            primary: "I'm missing column $1",
            secondary: "I'm required, but $2 didn't provide it",
        },
        MissingInput: {
            primary: 'I need $1, can you add one?',
            secondary: 'This input is required, but $2 did not provide it',
        },
        MissingLanguage: `Don't forget to give me a language!`,
        MissingShareLanguages: `If you want to share, say what language this is in, so others can find it if they know your language.`,
        NoExpression: `What should my value be?`,
        NotAMap: {
            primary: "I'm a map, so everything you give me has to be in pairs.",
            secondary: "Oops, I'm in a map without a partner!",
        },
        NotANumber: `I'm not formatted correctly to be a number`,
        NotAnInterface: `I am not an interface; a $structure can only implement interfaces, not other structures`,
        NotInstantiable: `cannot make this $structure because it refers to an interface`,
        OrderOfOperations: `I'll evalute left to right, unlike math; do you want to use @Block to specify a different order?`,
        Placeholder: `Can someone take my place? I don't know what to do.`,
        RequiredAfterOptional: `required inputs can't come after optional ones`,
        UnclosedDelimiter: 'I expected $2 sometime after $1',
        UnexpectedEtc: 'only functions can have variable length inputs',
        UnexpectedInput: {
            primary: "I didn't expect this input $2",
            secondary: 'Am I supposed to be here?',
        },
        UnexpectedTypeVariable: 'type inputs not allowed on type variables',
        UnimplementedInterface: "I implement $1 but haven't implemented $2",
        UnknownBorrow: "I don't know a $souce by this name",
        UnknownColumn: `I don't know a column by this name`,
        UnknownConversion: "I couldn'tn find a way to make $1 into a $2",
        UnknownInput: `I don't know of an input by this name`,
        UnknownName: 'No one has this name in $1 ?? [ $1 | this @Block ]',
        InvalidTypeName:
            'type names can only refer to structures or type variables, but this refers to a $1',
        Unnamed: `ahh, I need a name!`,
        UnparsableConflict:
            "(@FunctionDefinition here, @UnparsableExpression doesn't know what kind of $1 ?? [ expression | type ] this is)",
        UnusedBind: `Hey, can I help? No one is saying my name :(`,
        InputListMustBeLast: 'list of inputs must be last',
    },
    edit: {
        before: 'before $1',
        inside: 'inside $1',
        add: 'add $1',
        append: 'append $1',
        remove: 'remove $1',
        replace: 'replace with $1 ?? [$1|nothing]',
    },
    ui: {
        phrases: {
            welcome: 'hello',
            motto: 'Where words come to life',
        },
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
            play: `evaluate the $program fully`,
            pause: `evaluate the $program one step at a time`,
            back: 'back one step',
            backInput: 'back one input',
            out: 'step out of this function',
            forward: 'forward one step',
            forwardInput: 'forward one input',
            present: 'to the present',
            start: 'to the beginning',
            reset: 'restart the evaluation of the performance from the beginning.',
            home: 'return home',
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
            addSource: 'create a new $source',
            deleteSource: 'remove this $source',
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
        error: {
            tutorial: "We weren't able to find a tutorial for this language.",
        },
    },
    input: {
        Random: {
            doc: '$?',
            names: ['🎲', 'Random'],
            min: { names: 'min', doc: '$?' },
            max: { names: 'max', doc: '$?' },
        },
        Choice: {
            doc: '$?',
            names: ['🔘', 'Choice'],
        },
        Button: {
            doc: '$?',
            names: ['🖱️', 'Button'],
            down: { names: 'down', doc: '$?' },
        },
        Pointer: {
            doc: '$?',
            names: ['👆🏻', 'Pointer'],
        },
        Key: {
            doc: '$?',
            names: ['⌨️', 'Key'],
            key: { names: 'key', doc: '$?' },
            down: { names: 'down', doc: '$?' },
        },
        Time: {
            doc: `/@FunctionDefinition here. I'll explain @Time, since it doesn't speak./
                
                Time is a stream that ticks at a certain frequency. 
                Each time it does, @Program reevaluates with the new time value.
                
                For example:
                
                ⧼Time()⧽
                
                If you provide time a @Time/frequency, it will tick at that rate. For example:

                ⧼Time(1000ms)⧽
 
                However, there are limits to how small it can be, since @Program needs time to evaluate before they can respond to the next tick.
                The smallest is probably around ⧼20ms⧽.`,
            names: ['🕕', 'Time'],
            frequency: {
                names: ['frequency'],
                doc: `This is the frequency with which time should tick. It defaults to ⧼33ms⧽, which is about 30 times per second.`,
            },
        },
        Mic: {
            doc: '$?',
            names: ['🎤', 'Mic'],
            frequency: {
                names: ['frequency'],
                doc: '$?',
            },
        },
        Camera: {
            doc: '$?',
            names: ['🎥', 'Camera'],
            width: {
                names: ['width'],
                doc: '$?',
            },
            height: {
                names: ['height'],
                doc: '$?',
            },
            frequency: {
                names: ['frequency'],
                doc: '$?',
            },
        },
        Reaction: {
            doc: '$?',
            names: 'reaction',
        },
        Motion: {
            doc: '$?',
            names: ['⚽️', 'Motion'],
            type: {
                doc: '$?',
                names: 'type',
            },
            vx: {
                doc: '$?',
                names: 'vx',
            },
            vy: {
                doc: '$?',
                names: 'vy',
            },
            vz: {
                doc: '$?',
                names: 'vz',
            },
            vangle: {
                doc: '$?',
                names: 'vangle',
            },
            mass: {
                doc: '$?',
                names: 'mass',
            },
            bounciness: {
                doc: '$?',
                names: 'bounciness',
            },
            gravity: {
                doc: '$?',
                names: 'gravity',
            },
        },
    },
    output: {
        Type: {
            names: 'Type',
            doc: '$?',
            size: { doc: '$?', names: 'size' },
            family: { doc: '$?', names: 'font' },
            place: { doc: '$?', names: 'place' },
            rotation: { doc: '$?', names: 'rotation' },
            name: { doc: '$?', names: 'name' },
            selectable: { doc: '$?', names: 'selectable' },
            enter: { doc: '$?', names: 'enter' },
            rest: { doc: '$?', names: 'rest' },
            move: { doc: '$?', names: 'move' },
            exit: { doc: '$?', names: 'exit' },
            duration: { doc: '$?', names: ['⏳', 'duration'] },
            style: { doc: '$?', names: 'style' },
        },
        Group: {
            names: ['🔳', 'Group'],
            doc: '$?',
            content: { doc: '$?', names: 'content' },
            layout: { doc: '$?', names: 'layout' },
        },
        Phrase: {
            doc: '$?',
            names: ['💬', 'Phrase'],
            text: { doc: '$?', names: 'text' },
        },
        Arrangement: {
            doc: '$?',
            names: ['⠿', 'Arrangement'],
        },
        Row: {
            doc: '$?',
            names: ['➡', 'Row'],
            description: 'row of $1 phrases and groups',
            padding: { doc: '$?', names: 'padding' },
        },
        Stack: {
            doc: '$?',
            names: ['⬇', 'Stack'],
            description: 'stack of $1 phrases and groups',
            padding: { doc: '$?', names: 'padding' },
        },
        Grid: {
            doc: '$?',
            names: ['▦', 'Grid'],
            description: '$1 row $2 column grid',
            rows: { doc: '$?', names: 'rows' },
            columns: { doc: '$?', names: 'columns' },
            padding: { doc: '$?', names: 'padding' },
            cellWidth: { doc: '$?', names: 'cellwidth' },
            cellHeight: { doc: '$?', names: 'cellpadding' },
        },
        Free: {
            doc: '$?',
            names: ['Free'],
            description: 'free-form $1 outputs',
        },
        Shape: {
            doc: '$?',
            names: 'Shape',
        },
        Rectangle: {
            doc: '$?',
            names: ['Rectangle'],
            left: { doc: '$?', names: 'left' },
            top: { doc: '$?', names: 'top' },
            right: { doc: '$?', names: 'right' },
            bottom: { doc: '$?', names: 'bottom' },
        },
        Pose: {
            doc: '$?',
            names: ['🤪', 'Pose'],
            duration: { doc: '$?', names: 'duration' },
            style: { doc: '$?', names: 'style' },
            color: { doc: '$?', names: 'color' },
            opacity: { doc: '$?', names: 'opacity' },
            offset: { doc: '$?', names: 'offset' },
            tilt: { doc: '$?', names: 'tilt' },
            scale: { doc: '$?', names: 'scale' },
            flipx: { doc: '$?', names: 'flipx' },
            flipy: { doc: '$?', names: 'flipy' },
        },
        Color: {
            doc: '$?',
            names: ['🌈', 'Color'],
            lightness: { doc: '$?', names: ['lightness', 'l'] },
            chroma: { doc: '$?', names: ['chroma', 'c'] },
            hue: { doc: '$?', names: ['hue', 'h'] },
        },
        Sequence: {
            doc: '$?',
            names: ['💃', 'Sequence'],
            count: { doc: '$?', names: 'count' },
            timing: { doc: '$?', names: 'timing' },
            poses: { doc: '$?', names: 'poses' },
        },
        Place: {
            doc: '$?',
            names: ['📍', 'Place'],
            x: { doc: '$?', names: 'x' },
            y: { doc: '$?', names: 'y' },
            z: { doc: '$?', names: 'z' },
        },
        Stage: {
            doc: '$?',
            names: ['🎭', 'Stage'],
            description: 'stage of $1 phrases and groups',
            content: { doc: '$?', names: 'content' },
            background: { doc: '$?', names: 'background' },
            frame: { doc: '$?', names: 'frame' },
        },
        Easing: {
            straight: 'straight',
            cautious: 'cautious',
            pokey: 'pokey',
            zippy: 'zippy',
        },
        sequence: {
            sway: {
                doc: '$?',
                names: ['sway'],
                angle: { doc: '$?', names: ['angle'] },
            },
            bounce: {
                doc: '$?',
                names: ['bounce'],
                height: { doc: '$?', names: ['height'] },
            },
            spin: {
                doc: '$?',
                names: ['spin'],
            },
            fadein: {
                doc: '$?',
                names: ['fadein'],
            },
            popup: {
                doc: '$?',
                names: ['popup'],
            },
            shake: {
                doc: '$?',
                names: ['shake'],
            },
        },
    },
};

// const div = document.createElement('pre');
// const json = JSON.stringify(en, null, 2);
// for (const line of json.split('\n'))
//     div.appendChild(document.createTextNode(line));
// document.body.appendChild(div);

export default en;
