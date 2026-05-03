import { ExpressionKind } from '@nodes/Expression';
import SimpleExpression from '@nodes/SimpleExpression';

export default abstract class DefinitionExpression extends SimpleExpression {
    getKind() {
        return ExpressionKind.Definition;
    }
}
