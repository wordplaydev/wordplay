import type Emotion from '../lore/Emotion';
import type { Template, DocText } from './Locale';

export type NodeText = {
    /* The name that should be used to refer to the node type */
    name: string;
    /* A description of what the node is. More specific than a name. If not provided, name is used. */
    description: Template;
    /* Documentation text that appears in the documentation view */
    doc: DocText;
    /* The emotion that should be conveyed in animations of the node type */
    emotion: `${Emotion}`;
};
