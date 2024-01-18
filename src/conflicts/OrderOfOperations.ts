// We need to return a resolution type. The resolution type creates an instance of the project and tests ur code
// We need to write our code within getConflictNodes(), not create our own method

// PossiblePII.ts is the only working conflict resolution so far. 
// To test it out:
// 1. npm run dev
// 2. create a new project
// 3. write a string containing PII such as an email (e.g. 'bob@gmail.com')
// 4. a warning should be displayed. If the button is clicked, the PII will be added to something...

// This week, we need to come up with a design draft
// Current thoughts:
//	- create a similar message as the on in PII that tells the user about PEMDAS and offer an option to evaluate equations
//	  in-order or with PEMDAS. This means we only need to write something that will evaluate equations in terms of PEMDAS
//	  or in-order depending on what the user chooses. 

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
