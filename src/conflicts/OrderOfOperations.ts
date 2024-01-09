import type BinaryEvaluate from '@nodes/BinaryEvaluate';
import Conflict from './Conflict';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';

export default class OrderOfOperations extends Conflict {
    readonly operation: BinaryEvaluate;
    readonly after: BinaryEvaluate;

    constructor(operation: BinaryEvaluate, after: BinaryEvaluate) {
        super(true);

        this.operation = operation;
        this.after = after;
    }

    // splits String expression. Uses a recursive method to find all combinations of equations 
    // by adding parenthesis in different places in the equations. 
    generateDisambiguations(expression: string): string[] {
        const parts = expression.split(' ');
        let disambiguations: string[] = [];

        function addParentheses(start: number, end: number) {
            if (start >= end - 1) return;

            let newExpr = [...parts];
            newExpr[start] = '(' + newExpr[start];
            newExpr[end] = newExpr[end] + ')';
            disambiguations.push(newExpr.join(' '));

            for (let i = start; i < end; i++) {
                addParentheses(start, i);
                addParentheses(i + 1, end);
            }
        }

        addParentheses(0, parts.length - 1);
        return disambiguations;
    }
    
    getConflictingNodes() {
        return {
            primary: {
                node: this.operation,
                explanation: (locales: Locales) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) =>
                                l.node.BinaryEvaluate.conflict.OrderOfOperations
                        )
                    ),
            },
        };
    }
}
