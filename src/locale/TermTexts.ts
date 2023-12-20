type TermTexts = {
    /** The phrase to use to describe when values are bound to names, e.g., 'num: 5' */
    bind: string;
    /** The phrase to use to describe */
    evaluate: string;
    /** The phrase to use to describe conditional logic */
    decide: string;
    /** What to call documentation in code */
    document: string;
    /** What to call a Wordplay project */
    project: string;
    /** What to call a Wordplay project source file */
    source: string;
    /** What to call data that goes into a program */
    input: string;
    /** What to call data that comes out of a program */
    output: string;
    /** The verb for converting data from one type to another */
    convert: string;
    /** The word for the top level organizational scheme of the tutorial, as in a dramatic play */
    act: string;
    /** The word for the a comoponent of an act in a dramatic play */
    scene: string;
    /** The word for phrase output in a Wordplay program */
    phrase: string;
    group: string;
    stage: string;
    type: string;
    /** What to call the main source in a project. */
    start: string;
    /** How to describe output that has entered for the first time */
    entered: string;
    /** How to describe output that has changed */
    changed: string;
    /** How to describe output that has moved */
    moved: string;
    /** How to refer to names */
    name: string;
    /** What to call a data value */
    value: string;
    /** What to call a boolean value */
    boolean: string;
    /** What to call a table value */
    table: string;
    /** What to call a list value */
    list: string;
    /** What to call a map value */
    map: string;
    /** What to call a text value */
    text: string;
    /** What to call a number value */
    number: string;
    /** What to call a function value */
    function: string;
    /** What to call a none value */
    none: string;
    /** What to call an exception value */
    exception: string;
    /** What to call a row value */
    row: string;
    /** What to call a set value */
    set: string;
    /** What to call a structure value */
    structure: string;
    /** What to call a stream value */
    stream: string;
    /** What to call an index into a list value  */
    index: string;
    /** What to call a query a table value */
    query: string;
    /** What to call a key in a map */
    key: string;
    /** What to call help in help/feedback links */
    help: string;
    /** What to call feedback in help/feedback links  */
    feedback: string;
};

export { type TermTexts as default };
