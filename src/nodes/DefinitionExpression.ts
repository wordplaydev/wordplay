import { ExpressionKind } from './Expression';
import SimpleExpression from './SimpleExpression';

export default abstract class DefinitionExpression extends SimpleExpression {
    getKind() {
        return ExpressionKind.Definition;
    }
}
