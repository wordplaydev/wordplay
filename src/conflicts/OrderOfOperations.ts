// We need to return a resolution type. The resolution type creates an instance of the project and tests ur code
// We need to write our code within getConflictNodes(), not create our own method

// PossiblePII.ts is the only working conflict resolution so far. 
// To test it out:
// 1. npm run dev
// 2. create a new project
// 3. write a string containing PII such as an email (e.g. 'bob@gmail.com')
// 4. a warning should be displayed. If the button is clicked, the PII will be added to something...

// Current progress:
// - returning a resolution type and created a placeholder mediator
// - created text for the client on what will be displayed
// Help needed to proceed:
// - how to integrate the word translation part (locales?) into the text displayed to the user
// - how to get started on working the mediator and making the button actually do something

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

    // // splits String expression. Uses a recursive method to find all combinations of equations 
    // // by adding parenthesis in different places in the equations. 
    // generateDisambiguations(expression: string): string[] {
    //     const parts = expression.split(' ');
    //     let disambiguations: string[] = [];

    //     function addParentheses(start: number, end: number) {
    //         if (start >= end - 1) return;

    //         let newExpr = [...parts];
    //         newExpr[start] = '(' + newExpr[start];
    //         newExpr[end] = newExpr[end] + ')';
    //         disambiguations.push(newExpr.join(' '));

    //         for (let i = start; i < end; i++) {
    //             addParentheses(start, i);
    //             addParentheses(i + 1, end);
    //         }
    //     }

    //     addParentheses(0, parts.length - 1);
    //     return disambiguations;
    // }
    

	// SAVE ORIGINAL STATE OF getConflictNodes IN CASE OF FAILURE
    // getConflictingNodes() {
    //     return {
    //         primary: {
    //             node: this.operation,
				// // this translates text into the specificed language
    //             explanation: (locales: Locales) =>
    //                 concretize(
    //                     locales,
    //                     locales.get(
    //                         (l) =>
    //                             l.node.BinaryEvaluate.conflict.OrderOfOperations
    //                     )
    //                 ),
    //         },
    //     };
    // }
	getConflictingNodes() {
        return {
            primary: {
                node: this.operation,
				// this translates text into the specificed language
                explanation: (locales: Locales) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) =>
							'I evaluate in reading order. Traditionally, mathematical expressions are evaluated in the order of Parenthesis, Exponents, Multiplication and Division, and finally Addition and Subtraction (PEMDAS). Would you like me to evaluate using PEMDAS?'
						)
                    ),
            },
			resolutions: [
				{
					description: (locales: Locales) =>
                        concretize(
                            locales,
                            locales.get(
                                (l) => `use PEMDAS`
						),
					),
					mediator: (context: Context) => {
                        // enforce PEMDAS here...
						// no idea how to do this ask Amy on wednesday
                        // return context.project.enforcePEMDAS(this.operation);
                    },
				}
			]
        };
    }
}
