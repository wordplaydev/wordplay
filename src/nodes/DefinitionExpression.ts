import SimpleExpression from './SimpleExpression';
import { ExpressionKind } from './Expression';

export default abstract class DefinitionExpression extends SimpleExpression {
    getKind() {
        return ExpressionKind.Definition;
    }
}
