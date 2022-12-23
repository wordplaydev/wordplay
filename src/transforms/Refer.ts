import type Definition from "../nodes/Definition";
import TypeVariable from "../nodes/TypeVariable";
import type Context from "../nodes/Context";
import type LanguageCode from "../nodes/LanguageCode";

export default class Refer<NodeType> {

    readonly creator: (name: string) => NodeType;
    readonly definition: Definition;

    constructor(creator: (name: string) => NodeType, definition: Definition) {
        this.creator = creator;
        this.definition = definition;
    }

    getNode(languages: LanguageCode[]) {
        return this.creator(this.definition.getTranslation(languages));
    }

    getType(context: Context) { return this.definition instanceof TypeVariable ? undefined : this.definition.getType(context); }

}