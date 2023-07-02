import type Context from '@nodes/Context';
import TokenType from '@nodes/TokenType';
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
    PROPERTY_SYMBOL,
    TRUE_SYMBOL,
    FALSE_SYMBOL,
    SUM_SYMBOL,
} from '@parser/Symbols';
import {
    getDimensionDescription,
    getEvaluateDescription,
    getLanguageDescription,
    getPlaceholderDescription,
    getTokenDescription,
    type Description,
} from '../Locale';
import type { CycleType } from '@nodes/CycleType';
import type UnknownNameType from '@nodes/UnknownNameType';
import Explanation from '../Explanation';
import type NodeLink from '../NodeLink';
import type StreamDefinitionType from '../../nodes/StreamDefinitionType';
import Emotion from '../../lore/Emotion';
import Unit from '@nodes/Unit';

const WRITE_DOC = 'pendiante';

const eng_wordplay: Locale = {
    language: 'es',
    wordplay: 'PalabraJugar',
    welcome: 'hola',
    motto: 'Donde las palabras cobran vida',
    terminology: {
        store: 'datos',
        decide: 'decidir',
        code: 'código',
        project: 'proyecto',
        source: 'fuente',
        input: 'input',
        output: 'producción',
        phrase: 'frase',
        group: 'grupo',
        verse: 'verso',
        type: 'género',
        start: 'comenzar',
        entered: 'ingresó',
        changed: 'cambiada',
    },
    caret: {
        before: (description) => `antes de ${description}`,
        inside: (description) => `dentro de ${description}`,
    },
    data: {
        value: 'avaluar',
        text: 'texto',
        boolean: 'booleano',
        map: 'par',
        measurement: 'número',
        function: 'función',
        exception: 'excepción',
        table: 'tabla',
        none: 'ninguna',
        list: 'lista',
        stream: 'arroyo',
        structure: 'estructura',
        streamdefinition: 'arroyo definición',
        index: 'índice',
        query: 'interrogante',
        row: 'hilera',
        set: 'set',
        key: 'clave',
    },
    evaluation: {
        unevaluated: 'el nodo seleccionado no evaluó',
        done: 'terminado de evaluar',
    },
    token: {
        EvalOpen: 'evaluación abierta',
        EvalClose: 'evaluación cerrar',
        SetOpen: 'recopilación/índice abierta',
        SetClose: 'recopilación/índice cerrar',
        ListOpen: 'lista abierta',
        ListClose: 'lista cerrar',
        TagOpen: 'etiqueta abierta',
        TagClose: 'cerrar etiqueta',
        Bind: 'nombrar',
        Access: 'acceso a la propiedad',
        Function: 'función',
        Borrow: 'pedir prestado',
        Share: 'compartir',
        Convert: 'convertir',
        Doc: 'documentación',
        Words: 'palabras',
        Link: 'enlace web',
        Italic: 'itálica',
        Bold: 'negrita',
        Extra: 'extra',
        Concept: 'enlace de concepto',
        URL: 'URL',
        ExampleOpen: 'ejemplo abierta',
        ExampleClose: 'ejemplo cerrar',
        None: 'nada',
        Type: 'tipo',
        TypeOperator: 'es',
        TypeOpen: 'tipo entrada abierta',
        TypeClose: 'escribir entrada cerrar',
        Separator: 'separadora de nombres',
        Language: 'etiqueta de idioma',
        BooleanType: 'tipo booleano',
        NumberType: 'tipo de número',
        JapaneseNumeral: 'número japonés',
        RomanNumeral: 'número romana',
        Pi: 'pi',
        Infinity: 'infinidad',
        NoneType: 'ninguno tipo',
        TableOpen: 'table abierta',
        TableClose: 'tabla cerrada',
        Select: 'seleccionar',
        Insert: 'insertar',
        Update: 'actualizar',
        Delete: 'borrar',
        Union: 'unión',
        Stream: 'próxima',
        Change: 'cambiar',
        Initial: 'primera evaluacion',
        Previous: 'previa',
        Placeholder: 'marcador de posición',
        Etc: 'etcétera',
        This: 'esta',
        UnaryOperator: 'operador unario',
        BinaryOperator: 'operadora binaria',
        Conditional: 'condicional',
        Text: 'texto',
        TemplateOpen: 'texto abierta',
        TemplateBetween: 'texto entre',
        TemplateClose: 'texto cerrada',
        Number: 'número',
        Decimal: 'número decimal',
        Base: 'numeral base',
        Boolean: 'booleano',
        Name: 'nombre',
        Unknown: 'desconocida',
        End: 'final',
    },
    node: {
        Dimension: {
            name: 'dimensión',
            description: getDimensionDescription,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        Doc: {
            name: 'documentación',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        Docs: {
            name: 'lista de documentación',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        KeyValue: {
            name: 'par clave/valor',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        Language: {
            name: 'lengua',
            description: getLanguageDescription,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        Name: {
            name: 'nombre',
            description: (name) => name.name?.getText(),
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        Names: {
            name: 'lista de nombres',
            description: (names) => `${names.names.length} nombres`,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        Row: {
            name: 'la hilera',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        Token: {
            name: 'token',
            description: getTokenDescription,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        TypeInputs: {
            name: 'lista de variable de tipo',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        TypeVariable: {
            name: 'variable de tipo',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        TypeVariables: {
            name: 'lista de variable de tipo',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        Paragraph: {
            name: 'párrafo',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        WebLink: {
            name: 'enlace',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        ConceptLink: {
            name: 'concepto',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        Words: {
            name: 'palabras',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        Example: {
            name: 'ejemplo',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        BinaryOperation: {
            name: 'operación binaria',
            description: (op) => op.operator.getText(),
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            right: 'input',
            start: (left) => Explanation.as('evaluating ', left, ' first'),
            finish: (result) =>
                Explanation.as('evaluated to ', result ?? ' nothing'),
        },
        Bind: {
            name: 'nombrar',
            description: (bind) => bind.names.getNames().join(', '),
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: (value) =>
                value
                    ? Explanation.as('evaluate ', value, ' first')
                    : 'no value',
            finish: (value, names) =>
                value
                    ? Explanation.as('giving ', value, ' the name ', names)
                    : 'no value',
        },
        Block: {
            name: 'block',
            description: (block) => `${block.statements.length} declaración`,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            statement: 'statement',
            start: 'start evaluating the statements',
            finish: (value) =>
                Explanation.as('block evaluated to ', value ?? 'nothing'),
        },
        BooleanLiteral: {
            name: 'boolean',
            description: (literal) => (literal.bool() ? 'verdadera' : 'falsa'),
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: (value) => Explanation.as('create a ', value),
        },
        Borrow: {
            name: 'pedir prestado',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
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
            name: 'Cambiada',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: (stream: NodeLink) =>
                Explanation.as(
                    'check if ',
                    stream,
                    ' caused this program to reevaluate'
                ),
            stream: 'stream',
        },
        Conditional: {
            name: 'condicional',
            description: '',
            emotion: Emotion.Neutral,
            doc: `¿Alguna vez pensaste en cómo decidimos?
            Pienso mucho en eso.
            Tantas decisiones en la vida pueden ser tan complicadas.
            A veces siento mucha presión para decidir, ya que soy el único en este mundo que puede decidir.
           
            Me siento abrumado, así que he tratado de simplificar las cosas.
            Primero, solo considero dos opciones: (${TRUE_SYMBOL}) y (${FALSE_SYMBOL}).
            Si es (${TRUE_SYMBOL}), entonces evalúo mi código *sí*. Si es (${FALSE_SYMBOL}), entonces evalúo mi código *no*.

            Sé que las decisiones rara vez son tan simples, pero dividir el mundo en estos binarios me facilita las cosas.
            Sí, no, si, si no, esto, aquello.
            Es mi pequeña forma de mantener las cosas organizadas, incluso ante tanta complejidad.
            `,
            start: (condition) => Explanation.as('check ', condition, ' first'),
            finish: (value) =>
                Explanation.as(
                    'conditional evaluated to ',
                    value ?? ' nothing'
                ),
            condition: 'condition',
            yes: 'yes',
            no: 'no',
        },
        ConversionDefinition: {
            name: 'conversión',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: 'define this conversion',
        },
        Convert: {
            name: 'convertir',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: (expr) => Explanation.as('first evaluate ', expr),
            finish: (value) =>
                Explanation.as('converted to ', value ?? 'nothing'),
        },
        Delete: {
            name: 'delete row',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: (table) => Explanation.as('evaluate ', table, ' first'),
            finish: (value) =>
                Explanation.as(
                    'evaluated to table without rows, ',
                    value ?? 'nothing'
                ),
        },
        DocumentedExpression: {
            name: 'expresión documentada',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: 'evaluate the documented expression',
        },
        Evaluate: {
            name: 'evaluar',
            description: getEvaluateDescription,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
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
            name: 'marcador de posición',
            description: getPlaceholderDescription,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: 'cannot evaluate a placeholder',
            placeholder: 'expresión',
        },
        FunctionDefinition: {
            name: 'función',
            description: (fun, translation) =>
                fun.names.getLocaleText(translation.language),
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: 'define this function',
        },
        HOF: {
            name: 'función de orden superior',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: 'evaluating the function given',
            finish: (value) =>
                Explanation.as('evaluated to ', value ?? 'nothing'),
        },
        Initial: {
            name: 'evaluación inicial',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        Insert: {
            name: 'insertar',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: (table) => Explanation.as('evaluate ', table, ' first'),
            finish: (value) =>
                Explanation.as(
                    'evaluated to table new rows, ',
                    value ?? 'nothing'
                ),
        },
        Is: {
            name: 'es',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
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
            name: 'acceso a la lista',
            description: '',
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: (list) => Explanation.as('evaluate ', list, ' first'),
            finish: (value) =>
                Explanation.as('item at index is ', value ?? 'nothing'),
        },
        ListLiteral: {
            name: 'lista',
            description: (literal) =>
                literal.values.length === 1
                    ? '1 elemento'
                    : `${literal.values.length} elementos`,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: 'evaluate items first',
            finish: (value) =>
                Explanation.as('evaluated to list ', value ?? 'nothing'),
            item: 'item',
        },
        MapLiteral: {
            name: 'índice',
            description: (literal) =>
                literal.values.length === 1
                    ? '1 elemento'
                    : `${literal.values.length} elementos`,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: 'evaluate each key and value first',
            finish: (value) =>
                Explanation.as('evaluated to map ', value ?? 'nothing'),
        },
        MeasurementLiteral: {
            name: 'number',
            description: (node: MeasurementLiteral) =>
                node.number.is(TokenType.Pi)
                    ? 'pi'
                    : node.number.is(TokenType.Infinity)
                    ? 'infinidad'
                    : node.unit.isUnitless()
                    ? node.number.getText()
                    : `${node.number.getText()} ${node.unit.toWordplay()}`,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: (value) => Explanation.as('evaluate to ', value),
        },
        NativeExpression: {
            name: 'expresión incorporada',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: 'evaluate the built-in expression',
        },
        NoneLiteral: {
            name: 'nada',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: 'create a nothing value',
        },
        Previous: {
            name: 'previa',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: (stream) => Explanation.as('first get ', stream),
            finish: (value) =>
                Explanation.as(
                    'evaluated to stream value ',
                    value ?? 'nothing'
                ),
        },
        Program: {
            name: 'programa',
            description: '',
            emotion: Emotion.Neutral,
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
        PropertyBind: {
            name: 'refinar',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: 'get the structure',
            finish: (structure) =>
                structure
                    ? Explanation.as('created new structure ', structure)
                    : 'no structure created',
        },
        PropertyReference: {
            name: 'acceso a la propiedad',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: 'first get the value',
            finish: (property, value) =>
                property
                    ? Explanation.as(
                          'property ',
                          property,
                          'is ',
                          value ?? 'nothing'
                      )
                    : 'no property name given, no value',
            property: 'propiedad',
        },
        Reaction: {
            name: 'reacción',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
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
            name: 'referencia',
            description: (node: Reference) => node.getName(),
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: (name) => Explanation.as('get the value of ', name),
        },
        Select: {
            name: 'seleccionar',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: (table) => Explanation.as('evaluate ', table, ' first'),
            finish: (value) =>
                Explanation.as(
                    'evaluated to a new table with the selected rows, ',
                    value ?? 'nothing'
                ),
        },
        SetLiteral: {
            name: 'recopilación',
            description: (literal) =>
                literal.values.length === 1
                    ? '1 elemento'
                    : `${literal.values.length} elementos`,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: WRITE_DOC,
            finish: (value) =>
                Explanation.as('evaluated to set ', value ?? 'nothing'),
        },
        SetOrMapAccess: {
            name: 'acceso al conjunto/mapa',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: (set) => Explanation.as('evaluate ', set, ' first'),
            finish: (value) =>
                Explanation.as('item in  with key is ', value ?? 'nothing'),
        },
        Source: {
            name: 'documento',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        StreamDefinition: {
            name: 'arroyo',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: `defines a stream of values.`,
            start: 'define this stream type',
        },
        StructureDefinition: {
            name: 'estructura',
            description: (structure, translation) =>
                structure.names.getLocaleText(translation.language),
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: 'define this structure type',
        },
        TableLiteral: {
            name: 'tabla',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            item: 'row',
            start: 'first evaluate the rows',
            finish: (table) =>
                Explanation.as('evaluated to new table ', table ?? 'nothing'),
        },
        Template: {
            name: 'plantilla de texto',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: WRITE_DOC,
            finish: WRITE_DOC,
        },
        TextLiteral: {
            name: 'texto',
            description: (text) => text.text.getText(),
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: WRITE_DOC,
        },
        This: {
            name: 'esta',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: (value) =>
                Explanation.as('evaluated to ', value ?? 'nothing'),
        },
        UnaryOperation: {
            name: 'operación unaria',
            description: (op) => op.operator.getText(),
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: (value) => Explanation.as('evaluate the ', value),
            finish: (value) =>
                Explanation.as('evaluated to ', value ?? 'nothing'),
        },
        UnparsableExpression: {
            name: 'no analizable',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: 'cannot evaluate unparsable code',
        },
        Update: {
            name: 'update rows',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
            start: (table) => Explanation.as('evaluate ', table, ' first'),
            finish: (value) =>
                Explanation.as(
                    'evaluated to a new table with revised rows, ',
                    value ?? 'nothing'
                ),
        },
        AnyType: {
            name: 'tipo de cualquier',
            description: '',
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        BooleanType: {
            name: 'tipo de booleano',
            description: '',
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        ConversionType: {
            name: 'tipo de conversión',
            description: '',
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        ExceptionType: {
            name: 'tipo de excepción',
            description: '',
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        FunctionDefinitionType: {
            name: 'tipo de función',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        FunctionType: {
            name: 'tipo de función',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        ListType: {
            name: 'tipo de lista',
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
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        MapType: {
            name: 'tipo de índice',
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
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        MeasurementType: {
            name: 'tipo de número',
            description: (node, translation, context) =>
                node.unit instanceof Unit
                    ? node.unit.getDescription(translation, context)
                    : 'number',
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        NameType: {
            name: 'tipo de nombre',
            description: (node: NameType) => `a ${node.name.getText()}`,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        NeverType: {
            name: 'tipo de nunca',
            description: '',
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        NoneType: {
            name: 'tipo de nada',
            description: '',
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        SetType: {
            name: 'tipo de recopilación',
            description: (node: SetType, translation: Locale) =>
                node.key === undefined
                    ? 'algo'
                    : node.key.getLabel(translation),
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        StreamDefinitionType: {
            name: 'streamtipo de arroyo',
            description: (node: StreamDefinitionType, translation: Locale) =>
                `a ${node.definition.names.getLocaleText(
                    translation.language
                )} stream`,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        StreamType: {
            name: 'streamtipo de arroyo',
            description: (
                node: StreamType,
                translation: Locale,
                context: Context
            ) => `stream of ${node.type.getDescription(translation, context)}`,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        StructureDefinitionType: {
            name: 'tipo de estructura',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        UnknownType: {
            name: 'desconocida',
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
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        TableType: {
            name: 'tipo de tabla',
            description: '',
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        TextType: {
            name: 'tipo de texto',
            description: (node) =>
                node.isLiteral() ? node.text.getText() : 'text',
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        TypePlaceholder: {
            name: 'tipo de marcador de posición',
            description: WRITE_DOC,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        UnionType: {
            name: 'tipo de opción',
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
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        Unit: {
            name: 'unidad de medida',
            description: (node, translation, context) =>
                node.exponents.size === 0
                    ? 'numero'
                    : node.numerator.length === 1 &&
                      node.denominator.length === 0
                    ? node.numerator[0].getDescription(translation, context)
                    : node.toWordplay() === 'm/s'
                    ? 'velocidad'
                    : node.toWordplay(),
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        UnparsableType: {
            name: 'tipo no analizable',
            description: '',
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        VariableType: {
            name: 'tipo variable',
            description: '',
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        CycleType: {
            name: 'tipo de ciclo',
            description: (node: CycleType) =>
                `${node.expression.toWordplay()} depende de si mismo`,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        UnknownVariableType: {
            name: 'tipo de variable desconocido',
            description: '',
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        NotAListType: {
            name: 'tipo sin lista',
            description: '',
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        NoExpressionType: {
            name: 'tipo sin expresión',
            description: '',
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        NotAFunctionType: {
            name: 'tipo sin función',
            description: '',
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        NotATableType: {
            name: 'tipo sin tabla',
            description: '',
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        NotAStreamType: {
            name: 'tipo sin arroyo',
            description: '',
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        NotASetOrMapType: {
            name: 'tipo sin recopilación/índice',
            description: '',
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        NotEnclosedType: {
            name: 'no en estructura, conversión o reacción',
            description: '',
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        NotImplementedType: {
            name: 'typo sin implementado',
            description: '',
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
        UnknownNameType: {
            name: 'tipo de nombre desconocido',
            description: (node: UnknownNameType) =>
                node.name === undefined
                    ? 'no se dio nombre'
                    : `${node.name.getText()} no está definido`,
            emotion: Emotion.Neutral,
            doc: WRITE_DOC,
        },
    },
    native: {
        bool: {
            doc: WRITE_DOC,
            name: 'bool',
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
            doc: WRITE_DOC,
            name: 'none',
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
            doc: WRITE_DOC,
            name: 'text',
            function: {
                length: {
                    doc: WRITE_DOC,
                    name: 'length',
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
                    name: 'repetir',
                    inputs: [{ doc: WRITE_DOC, names: 'contar' }],
                },
                segment: {
                    doc: WRITE_DOC,
                    name: ['segmentar'],
                    inputs: [{ doc: WRITE_DOC, names: 'delimitador' }],
                },
                combine: {
                    doc: WRITE_DOC,
                    name: [SUM_SYMBOL, 'combinar'],
                    inputs: [{ doc: WRITE_DOC, names: 'texto' }],
                },
                has: {
                    doc: WRITE_DOC,
                    name: ['tiene'],
                    inputs: [{ doc: WRITE_DOC, names: 'texto' }],
                },
            },
            conversion: {
                text: WRITE_DOC,
                number: WRITE_DOC,
            },
        },
        measurement: {
            doc: WRITE_DOC,
            name: 'number',
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
            doc: WRITE_DOC,
            name: 'list',
            kind: 'Kind',
            out: 'Result',
            outofbounds: 'outofbounds',
            function: {
                add: {
                    doc: WRITE_DOC,
                    name: 'agregar',
                    inputs: [{ doc: WRITE_DOC, names: 'item' }],
                },
                append: {
                    doc: WRITE_DOC,
                    name: 'adjuntar',
                    inputs: [{ doc: WRITE_DOC, names: 'list' }],
                },
                replace: {
                    doc: WRITE_DOC,
                    name: ['reemplazar'],
                    inputs: [
                        { doc: WRITE_DOC, names: 'index' },
                        { doc: WRITE_DOC, names: 'value' },
                    ],
                },
                length: {
                    doc: WRITE_DOC,
                    name: 'longitud',
                    inputs: [],
                },
                random: {
                    doc: WRITE_DOC,
                    name: 'azar',
                    inputs: [],
                },
                first: {
                    doc: WRITE_DOC,
                    name: 'primera',
                    inputs: [],
                },
                last: {
                    doc: WRITE_DOC,
                    name: 'última',
                    inputs: [],
                },
                has: {
                    doc: WRITE_DOC,
                    name: 'tiene',
                    inputs: [{ doc: WRITE_DOC, names: 'item' }],
                },
                join: {
                    doc: WRITE_DOC,
                    name: 'unirse',
                    inputs: [{ doc: WRITE_DOC, names: 'separator' }],
                },
                sansFirst: {
                    doc: WRITE_DOC,
                    name: 'sinPrimero',
                    inputs: [],
                },
                sansLast: {
                    doc: WRITE_DOC,
                    name: 'sinÚltima',
                    inputs: [],
                },
                sans: {
                    doc: WRITE_DOC,
                    name: 'sans',
                    inputs: [{ doc: WRITE_DOC, names: 'value' }],
                },
                sansAll: {
                    doc: WRITE_DOC,
                    name: 'sinTodo',
                    inputs: [{ doc: WRITE_DOC, names: 'value' }],
                },
                reverse: {
                    doc: WRITE_DOC,
                    name: 'inversa',
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
                    name: 'traducir',
                    inputs: [{ doc: WRITE_DOC, names: 'translator' }],
                    value: { doc: WRITE_DOC, names: 'item' },
                    index: { doc: WRITE_DOC, names: 'index' },
                },
                filter: {
                    doc: WRITE_DOC,
                    name: 'filtrar',
                    inputs: [{ doc: WRITE_DOC, names: 'checker' }],
                    value: { doc: WRITE_DOC, names: 'item' },
                },
                all: {
                    doc: WRITE_DOC,
                    name: 'todos',
                    inputs: [{ doc: WRITE_DOC, names: 'checker' }],
                    value: { doc: WRITE_DOC, names: 'item' },
                },
                until: {
                    doc: WRITE_DOC,
                    name: 'hasta',
                    inputs: [{ doc: WRITE_DOC, names: 'checker' }],
                    value: { doc: WRITE_DOC, names: 'item' },
                },
                find: {
                    doc: WRITE_DOC,
                    name: 'encontrar',
                    inputs: [{ doc: WRITE_DOC, names: 'checker' }],
                    value: { doc: WRITE_DOC, names: 'item' },
                },
                combine: {
                    doc: WRITE_DOC,
                    name: 'combinar',
                    inputs: [
                        { doc: WRITE_DOC, names: 'inicial' },
                        { doc: WRITE_DOC, names: 'combinador' },
                    ],
                    combination: { doc: WRITE_DOC, names: 'combinación' },
                    next: { doc: WRITE_DOC, names: 'próxima' },
                    index: { doc: WRITE_DOC, names: 'índice' },
                },
            },
            conversion: {
                text: WRITE_DOC,
                set: WRITE_DOC,
            },
        },
        set: {
            doc: WRITE_DOC,
            name: 'set',
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
            doc: WRITE_DOC,
            name: 'map',
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
            '¡Estoy tan emocionada de montar un espectáculo contigo! ¿Por dónde deberíamos empezar?',
        function: (node, type) =>
            Explanation.as(
                'no function named ',
                node,
                ' in ',
                type === undefined ? ' scope' : type
            ),
        name: (node, scope) =>
            node
                ? Explanation.as(
                      'There is no value named ',
                      node,
                      ' in ',
                      scope === undefined ? ' this @Block' : scope
                  )
                : Explanation.as('There was no name given'),
        cycle: (node) => Explanation.as(node, ' depends on itself'),
        functionlimit: (fun) =>
            Explanation.as('evaluated too many functions, especially ', fun),
        steplimit: 'evaluated too many steps in this function',
        type: (expected, given) =>
            Explanation.as('expected ', expected, ' but received ', given),
        placeholder: (node) =>
            Explanation.as('this ', node, ' is not implemented'),
        unparsable: (node) => Explanation.as('this ', node, ' is not parsable'),
        value: (node) =>
            Explanation.as(node, ' expected a value, but did not receive one'),
    },
    conflict: {
        BorrowCycle: {
            primary: (borrow) =>
                Explanation.as(
                    'this depends on ',
                    borrow,
                    " which depends on this source, so the program can't be evaluated"
                ),
        },
        ReferenceCycle: {
            primary: (ref) =>
                Explanation.as(
                    ref,
                    ' depends on itself, so it cannot be evaluated'
                ),
        },
        DisallowedInputs: {
            primary:
                'inputs on interfaces not allowed because one or more of its functions are unimplemented',
        },
        DuplicateName: {
            primary: (name) =>
                Explanation.as(
                    name,
                    ' is already defined, which might intend to refer to the other bind with the same name'
                ),
            secondary: (name) =>
                Explanation.as('this is overwritten by ', name),
        },
        DuplicateShare: {
            primary: (bind) =>
                Explanation.as(
                    'has the same name as ',
                    bind,
                    ', which makes what is shared ambiguous'
                ),
            secondary: (bind) =>
                Explanation.as(
                    'has the same name as ',
                    bind,
                    ', which makes what is shared ambiguous'
                ),
        },
        DuplicateTypeVariable: {
            primary: (dupe) =>
                Explanation.as('this has the same name as ', dupe),
            secondary: (dupe) =>
                Explanation.as('this has the same name as ', dupe),
        },
        ExpectedBooleanCondition: {
            primary: (type: NodeLink) =>
                Explanation.as(
                    WRITE_DOC + 'expected boolean condition but received ',
                    type
                ),
            secondary: (type: NodeLink) =>
                Explanation.as(
                    WRITE_DOC + 'expected boolean condition but received ',
                    type
                ),
        },
        ExpectedColumnType: {
            primary: (bind) =>
                Explanation.as(
                    'this table column ',
                    bind,
                    ' has no type, but all columns require one'
                ),
        },
        ExpectedEndingExpression: {
            primary:
                'blocks require at least one expression so that they evaluate to something',
        },
        ExpectedSelectName: {
            primary: (cell) =>
                Explanation.as(
                    cell,
                    ' has no name; selects require column names to know what columns to return'
                ),
        },
        ExpectedUpdateBind: {
            primary: (cell) =>
                Explanation.as(
                    cell,
                    ' has value; updates require a value for each column specified to know what value to set'
                ),
        },
        IgnoredExpression: {
            primary: WRITE_DOC,
            secondary: WRITE_DOC,
        },
        IncompleteImplementation: {
            primary: `structures must either be fully implemented or not implemented; this has a mixture`,
        },
        IncompatibleBind: {
            primary: (expected) => Explanation.as('expected ', expected),
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
                Explanation.as('expected column type ', expected),
            secondary: (given) => Explanation.as('given ', given),
        },
        IncompatibleInput: {
            primary: (given, expected) =>
                Explanation.as('expected ', expected, ' input'),
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
                Explanation.as('expected ', expected, ' key '),
            secondary: (given) => Explanation.as('given ', given),
        },
        ImpossibleType: {
            primary: 'this can never be this type',
        },
        InvalidLanguage: {
            primary: `this is not a valid language code`,
        },
        InvalidRow: {
            primary: `row is missing one or more required columns`,
        },
        InvalidTypeInput: {
            primary: (def) =>
                Explanation.as(def, ` does not expect this type input`),
            secondary: (type) =>
                Explanation.as('this definition does expect type ', type),
        },
        MisplacedConversion: {
            primary: `conversions only allowed in structure definitions`,
        },
        MisplacedInput: {
            primary: `this input is out of the expected order`,
        },
        MisplacedShare: {
            primary: `shares only allowed at top level of program`,
        },
        MisplacedThis: {
            primary: `${PROPERTY_SYMBOL} only allowed in structure definition, conversion, or reaction`,
        },
        MissingCell: {
            primary: (column) =>
                Explanation.as(`this row is missing column`, column),
            secondary: (row) =>
                Explanation.as(
                    `this column is required, but `,
                    row,
                    ' did not provide it'
                ),
        },
        MissingInput: {
            primary: (input) =>
                Explanation.as(
                    'expected input ',
                    input,
                    ' but did not receive it'
                ),
            secondary: (evaluate) =>
                Explanation.as(
                    `this input is required, but `,
                    evaluate,
                    ' did not provide it'
                ),
        },
        MissingLanguage: {
            primary:
                'no language was provided, but there was a slash suggesting one would be',
        },
        MissingShareLanguages: {
            primary:
                'shared bindings must specify language so others know what languages are supported',
        },
        NoExpression: {
            primary: `functions require an expression, but none was provided for this one`,
        },
        NonBooleanQuery: {
            primary: (type) =>
                Explanation.as('queries must be boolean, but this is a ', type),
        },
        NotAFunction: {
            primary: (name, type) =>
                Explanation.as(
                    name ? name : 'this',
                    ' is not a function ',
                    type ? ' in ' : ' scope',
                    type ? type : ''
                ),
        },
        NotAList: {
            primary: (type) =>
                Explanation.as('expected a list, this is a ', type),
        },
        NotAListIndex: {
            primary: (type) =>
                Explanation.as('expected number, this is a ', type),
        },
        NotAMap: {
            primary:
                'this expression is not allowed in a map, only key/value pairs are allowed',
            secondary: (expr) => Explanation.as('this map has a ', expr),
        },
        NotANumber: {
            primary: "this number isn't formatted correctly",
        },
        NotAnInterface: {
            primary:
                'this is not an interface; structures can only implement interfaces, not other structures',
        },
        NotASetOrMap: {
            primary: (type) =>
                Explanation.as('expected set or map, but this is a ', type),
        },
        NotAStream: {
            primary: (type) =>
                Explanation.as('expected stream, but this is a ', type),
        },
        NotAStreamIndex: {
            primary: (type) =>
                Explanation.as('expected a number, but this is a ', type),
        },
        NotATable: {
            primary: (type) =>
                Explanation.as('expected a table, but this is a ', type),
        },
        NotInstantiable: {
            primary:
                'cannot make this structure because it refers to an interface',
        },
        OrderOfOperations: {
            primary:
                'operators evalute left to right, unlike math; use parentheses to specify order of evaluation',
        },
        Placeholder: {
            primary:
                'this is unimplemented, so the program will stop if evaluated',
        },
        RequiredAfterOptional: {
            primary: 'required inputs cannot come after optional ones',
        },
        UnclosedDelimiter: {
            primary: (token, expected) =>
                Explanation.as('expected ', expected, ' to match ', token),
        },
        UnexpectedEtc: {
            primary:
                'variable length inputs can only appear on function evaluations',
        },
        UnexpectedInput: {
            primary: (evaluation) =>
                Explanation.as('this input is not specified on ', evaluation),
            secondary: (input) =>
                Explanation.as('this function does not expect this ', input),
        },
        UnexpectedTypeVariable: {
            primary: 'type inputs not allowed on type variables',
        },
        UnimplementedInterface: {
            primary: (inter, fun) =>
                Explanation.as(
                    'this structure implements ',
                    inter,
                    ' but does not implement ',
                    fun
                ),
        },
        UnknownBorrow: {
            primary: 'unknown source and name',
        },
        UnknownColumn: {
            primary: 'unknown column in table',
        },
        UnknownConversion: {
            primary: (from, to) =>
                Explanation.as('no conversion from ', from, ' to ', to),
        },
        UnknownInput: {
            primary: 'no input by this name',
        },
        UnknownName: {
            primary: (name, type) =>
                Explanation.as(
                    name,
                    ' is not defined in ',
                    type ? type : ' this scope'
                ),
        },
        InvalidTypeName: {
            primary: (type) =>
                Explanation.as(
                    'type names can only refer to structures or type variables, but this refers to a ',
                    type
                ),
        },
        Unnamed: {
            primary: 'missing name',
        },
        UnparsableConflict: {
            primary: (expression) =>
                expression
                    ? 'expected expression, but could not parse one'
                    : 'expected type, but could not parse one',
        },
        UnusedBind: {
            primary: 'this name is unused',
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
            name: 'nombre',
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
            chooserExpand: 'expandir/colapsar',
            place: 'mover salida',
            paint: 'salida de pintura',
            nextLesson: WRITE_DOC,
            previousLesson: WRITE_DOC,
            nextLessonStep: WRITE_DOC,
            previousLessonStep: WRITE_DOC,
        },
        prompt: {
            deleteSource: 'delete?',
            deleteProject: 'delete?',
        },
        labels: {
            learn: 'learn more …',
            nodoc: 'no documentation',
            mixed: 'mixed',
            computed: 'computed',
            default: 'default',
            inherited: 'inherited',
            notSequence: 'invalid sequence',
            notContent: 'invalid content',
            anonymous: 'temporary account - click to login',
        },
        tiles: {
            output: '💬',
            docs: '📕',
            palette: '🎨',
        },
        headers: {
            learn: WRITE_DOC,
            editing: '¡edítame!',
            projects: 'Proyectos',
            examples: 'ejemplos',
        },
        section: {
            project: 'proyecto',
            conflicts: 'conflictos',
            timeline: 'línea de tiempo',
            toolbar: 'herramientas',
            output: 'producción',
            palette: 'paleta',
            editor: 'editora',
        },
        feedback: {
            unknownProject: 'No hay ningún proyecto con este ID.',
        },
        login: {
            header: 'Login',
            prompt: 'Log in to access your projects.',
            anonymousPrompt:
                'You are currently using an anonymous account. Log in to ensure your projects are saved.',
            submit: 'send a login email',
            enterEmail:
                "It looks like you're logging in on a different device. Can you enter your email again?",
            sent: 'Check your email for a link.',
            success: 'Account created!',
            failure: 'There was a problem linking your email.',
            expiredFailure: 'This link expired.',
            invalidFailure: "This link isn't valid.",
            emailFailure: "This email wasn't valid.",
            logout: 'logout',
            offline: 'You appear to be offline.',
        },
        edit: {
            wrap: 'envolver',
            unwrap: 'desenvolver',
            bind: 'nombra esta expresión',
        },
    },
    input: {
        Random: {
            doc: WRITE_DOC,
            names: ['Azar'],
            min: { names: 'mínima', doc: WRITE_DOC },
            max: { names: 'maximo', doc: WRITE_DOC },
        },
        Choice: {
            doc: WRITE_DOC,
            names: ['Selección', 'Elección'],
        },
        Button: {
            doc: WRITE_DOC,
            names: ['Botón'],
            down: { names: 'abajo', doc: WRITE_DOC },
        },
        Pointer: {
            doc: WRITE_DOC,
            names: ['Puntero'],
        },
        Key: {
            doc: WRITE_DOC,
            names: ['Teclado'],
            key: { names: 'tecla', doc: WRITE_DOC },
            down: { names: 'abajo', doc: WRITE_DOC },
        },
        Time: {
            doc: WRITE_DOC,
            names: ['Tiempo'],
            frequency: {
                names: ['frecuencia'],
                doc: WRITE_DOC,
            },
        },
        Mic: {
            doc: WRITE_DOC,
            names: ['Micrófono', '🎤'],
            frequency: {
                names: ['frecuencia'],
                doc: WRITE_DOC,
            },
        },
        Camera: {
            doc: WRITE_DOC,
            names: ['Cámara'],
            width: {
                names: ['ancho'],
                doc: WRITE_DOC,
            },
            height: {
                names: ['altura'],
                doc: WRITE_DOC,
            },
            frequency: {
                names: ['frecuencia'],
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
            family: { doc: WRITE_DOC, names: 'fuente' },
            place: { doc: WRITE_DOC, names: 'place' },
            rotation: { doc: WRITE_DOC, names: 'rotación' },
            name: { doc: WRITE_DOC, names: 'nombre' },
            selectable: { doc: WRITE_DOC, names: 'seleccionable' },
            enter: { doc: WRITE_DOC, names: 'ingresar' },
            rest: { doc: WRITE_DOC, names: 'descansar' },
            move: { doc: WRITE_DOC, names: 'mover' },
            exit: { doc: WRITE_DOC, names: 'salida' },
            duration: { doc: WRITE_DOC, names: ['duración'] },
            style: { doc: WRITE_DOC, names: 'estilo' },
        },
        Stage: {
            names: ['Verso'],
            doc: WRITE_DOC,
            description: () => WRITE_DOC,
            content: { doc: WRITE_DOC, names: 'contenido' },
            background: { doc: WRITE_DOC, names: 'fondo' },
            frame: { doc: WRITE_DOC, names: 'marco' },
        },
        Group: {
            names: 'Group',
            doc: WRITE_DOC,
            content: { doc: WRITE_DOC, names: 'content' },
            layout: { doc: WRITE_DOC, names: 'layout' },
        },
        Phrase: {
            names: ['💬', 'Frase'],
            doc: WRITE_DOC,
            text: { doc: WRITE_DOC, names: 'texto' },
        },
        Layout: {
            names: ['Arrangement'],
            doc: WRITE_DOC,
        },
        Row: {
            names: ['Fila'],
            doc: WRITE_DOC,
            description: () => WRITE_DOC,
            padding: { doc: WRITE_DOC, names: 'relleno' },
        },
        Stack: {
            names: 'Pila',
            doc: WRITE_DOC,
            description: () => WRITE_DOC,
            padding: { doc: WRITE_DOC, names: 'relleno' },
        },
        Grid: {
            names: 'cuadrícula',
            doc: WRITE_DOC,
            description: (rows: number, columns: number) =>
                `cuadrícula de ${rows} fila, ${columns} columnas${rows}`,
            rows: { doc: WRITE_DOC, names: 'fila' },
            columns: { doc: WRITE_DOC, names: 'columnas' },
            padding: { doc: WRITE_DOC, names: 'relleno' },
            cellWidth: { doc: WRITE_DOC, names: 'anchodecelda' },
            cellHeight: { doc: WRITE_DOC, names: 'alturadecelda' },
        },
        Free: {
            names: ['Suelto'],
            doc: WRITE_DOC,
            description: (count: number) => `forma libre, ${count} outputs`,
        },
        Shape: {
            names: ['forma'],
            doc: WRITE_DOC,
        },
        Rectangle: {
            names: ['Rectángulo'],
            doc: WRITE_DOC,
            left: { doc: WRITE_DOC, names: 'izquierda' },
            top: { doc: WRITE_DOC, names: 'masalta' },
            right: { doc: WRITE_DOC, names: 'derecha' },
            bottom: { doc: WRITE_DOC, names: 'abajo' },
        },
        Pose: {
            names: 'Pose',
            doc: WRITE_DOC,
            duration: { doc: WRITE_DOC, names: 'duración' },
            style: { doc: WRITE_DOC, names: 'estilo' },
            color: { doc: WRITE_DOC, names: 'color' },
            opacity: { doc: WRITE_DOC, names: 'opacidad' },
            offset: { doc: WRITE_DOC, names: 'offset' },
            tilt: { doc: WRITE_DOC, names: 'inclinación' },
            scale: { doc: WRITE_DOC, names: 'escala' },
            flipx: { doc: WRITE_DOC, names: 'voltearx' },
            flipy: { doc: WRITE_DOC, names: 'volteary' },
        },
        Color: {
            names: ['Color'],
            doc: WRITE_DOC,
            lightness: { doc: WRITE_DOC, names: ['luminosidad'] },
            chroma: { doc: WRITE_DOC, names: ['croma'] },
            hue: { doc: WRITE_DOC, names: ['matiz'] },
        },
        Sequence: {
            names: 'Secuencia',
            doc: WRITE_DOC,
            timing: { doc: WRITE_DOC, names: 'timing' },
            count: { doc: WRITE_DOC, names: 'count' },
            poses: { doc: WRITE_DOC, names: 'poses' },
        },
        Place: {
            names: ['Posición'],
            doc: WRITE_DOC,
            x: { doc: WRITE_DOC, names: 'x' },
            y: { doc: WRITE_DOC, names: 'y' },
            z: { doc: WRITE_DOC, names: 'z' },
        },
        Easing: {
            straight: 'lineal',
            cautious: 'precavida',
            pokey: 'lenta',
            zippy: 'enérgico',
        },
    },
    animation: {
        sway: {
            doc: WRITE_DOC,
            names: ['vaivén'],
            angle: { doc: WRITE_DOC, names: ['ángulo'] },
        },
        bounce: {
            doc: WRITE_DOC,
            names: ['rebotar'],
            height: { doc: WRITE_DOC, names: ['altura'] },
        },
        spin: {
            doc: WRITE_DOC,
            names: ['girar'],
        },
        fadein: {
            doc: WRITE_DOC,
            names: ['revelar'],
        },
        popup: {
            doc: WRITE_DOC,
            names: ['surgir'],
        },
        shake: {
            doc: WRITE_DOC,
            names: ['agitar'],
        },
    },
    tutorial: [],
};

export default eng_wordplay;
