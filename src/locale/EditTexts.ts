import type { FormattedText, Template } from '@locale/LocaleText';

type EditTexts = {
    /** [formatted] A way to say "on node of type [type], they [description]". $1: node label, $2: type, $3: description */
    node: Template<['node', 'type']>;
    /** [formatted] A way to say "before [token], at the beginning of the program" */
    before: Template<['after']>;
    /** [formatted] A way to say "inside [description], between character [before|start] and [after|end]" */
    inside: Template<['token', 'before', 'after']>;
    /** [formatted] Description of a selection range */
    range: Template<['start', 'end']>;
    /** [formatted] A way to say "between [token1] and [token2]" */
    between: Template<['before', 'after']>;
    /** [formatted] A way to say "empty line between [node1] and [node2]" */
    line: Template<['before', 'after']>;
    /** [formatted] A description of how many conflicts are at this position */
    conflicts: Template<['count']>;
    /** [plain] Says the selected delimiter's matching partner is on the same line. $name: the partner delimiter's label */
    delimiterMatchedSameLine: Template<['name']>;
    /** [plain] Says the selected delimiter's matching partner is some lines below. $name: partner label, $lines: number of lines */
    delimiterMatchedBelow: Template<['name', 'lines']>;
    /** [plain] Says the selected delimiter's matching partner is some lines above. $name: partner label, $lines: number of lines */
    delimiterMatchedAbove: Template<['name', 'lines']>;
    /** [plain] Says the selected delimiter has no matching partner */
    delimiterUnmatched: string;
    /** [formatted] $1: node description */
    assign: Template<['name']>;
    /** [formatted] $1: node description */
    append: FormattedText;
    /** [formatted] $1: node description */
    remove: FormattedText;
    /** [formatted] $1: node description or undefined */
    replace: FormattedText;
    /** [plain] A label for the textarea in which text is typed */
    area: string;
};

export { type EditTexts as default };
