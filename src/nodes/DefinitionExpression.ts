import { ExpressionKind } from '#nodes/Expression.ts';
import SimpleExpression from '#nodes/SimpleExpression.ts';

export default abstract class DefinitionExpression extends SimpleExpression {
    getKind() {
        return ExpressionKind.Definition;
    }
}
