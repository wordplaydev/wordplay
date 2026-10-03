import type { FormattedText, Template } from '#locale/LocaleText.ts';

type EditTexts = {
    /** [formatted] A way to say "on node of type [type], they [description]". $1: node label, $2: type, $3: description */
    node: Template<['node', 'type']>;
    /** [formatted] A way to say "before [token], at the beginning of the program" */
    before: Template<['after']>;
    /** [formatted] A way to say "inside [description], between character [before|start] and [after|end]" */
    inside: Template<['token', 'before', 'after']>;
    /** [formatted] A way to say "between [before|start] and [after|end]". Both inputs
     * MUST have fallback branches: a caret at the end of a line has no node after it
     * on the same line, and an unmatched input makes the whole template unparsable. */
    between: Template<['before', 'after']>;
    /** [formatted] A way to say "empty line between [node1] and [node2]" */
    line: Template<['before', 'after']>;
    /** [formatted] A description of how many conflicts are at this position */
    conflicts: Template<['#count']>;
    /** [plain] Says the selected delimiter's matching partner is on the same line. $name: the partner delimiter's label */
    delimiterMatchedSameLine: Template<['name']>;
    /** [plain] Says the selected delimiter's matching partner is some lines below. $name: partner label, $lines: number of lines */
    delimiterMatchedBelow: Template<['name', '#lines']>;
    /** [plain] Says the selected delimiter's matching partner is some lines above. $name: partner label, $lines: number of lines */
    delimiterMatchedAbove: Template<['name', '#lines']>;
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
    /** [plain] Verbose announcements only: the construct the caret's node sits in. $parent: the parent node's label */
    parent: Template<['parent']>;
    /** [plain] A menu choice added a node to the program. $node: the node's label */
    inserted: Template<['node']>;
    /** [plain] A node was removed, by a menu choice or by dropping it in the recycle bin. $node: its label */
    removed: Template<['node']>;
    /** [plain] A node was dragged or moved from one place in the program to another. $node: its label, $target: the label of what now holds it */
    moved: Template<['node', 'target']>;
    /** [plain] A node from the palette, the guide, or an example was dropped into the program. $node: its label, $target: the label of what now holds it */
    copied: Template<['node', 'target']>;
    /** [plain] A drag began. $node: the label of what was picked up */
    pickedUp: Template<['node']>;
    /** [plain] A drag was refused at pickup because the program needs the node where it is. $node: its label */
    cannotPickUp: Template<['node']>;
    /** [plain] A drag ended without dropping anywhere */
    dropCancelled: string;
    /** [plain] Search and replace finished. $count: how many matches changed, $text: what they became */
    replacedAll: Template<['#count', 'text']>;
    /** [plain] An undo finished. $added: code that came back, if any; $removed: code that is gone, if any */
    undone: Template<['removed', 'added']>;
    /** [plain] A redo finished. $added: code that came back, if any; $removed: code that is gone, if any */
    redone: Template<['removed', 'added']>;
    /** [plain] A keyboard move put a node before its sibling. $node: its label, $sibling: the sibling's label */
    movedBefore: Template<['node', 'sibling']>;
    /** [plain] A keyboard move put a node after its sibling. $node: its label, $sibling: the sibling's label */
    movedAfter: Template<['node', 'sibling']>;
};

export { type EditTexts as default };
