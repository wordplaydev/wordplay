import type { Edit } from "../editor/util/Commands";
import type Node from "../nodes/Node";
import type LanguageCode from "../nodes/LanguageCode";
import type Context from "../nodes/Context";

export default abstract class Transform {

    readonly context: Context;

    constructor(context: Context) {

        this.context = context;

    }

    abstract getEdit(lang: LanguageCode[]): Edit | undefined ;
    abstract getDescription(lang: LanguageCode[]): string;
    abstract getNewNode(lang: LanguageCode[]): Node;
    abstract equals(transform: Transform): boolean;

    // Pretty print all new nodes.
    getPrettyNewNode(lang: LanguageCode[]): Node { return this.getNewNode(lang).replace(true); }


}