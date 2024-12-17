import type Context from '@nodes/Context';
import Token from '@nodes/Token';
import type Type from '@nodes/Type';
import NodeRef from '@locale/NodeRef';
import Conflict from './Conflict';
import type NameType from '../nodes/NameType';
import Reference from '../nodes/Reference';
import type Locales from '../locale/Locales';
import type Refer from '@edit/Refer';

export class UnknownName extends Conflict {
    readonly name: Reference | NameType | Token;
    readonly type: Type | undefined;

    constructor(name: Reference | NameType | Token, type: Type | undefined) {
        super(false);
        this.name = name;
        this.type = type;
    }

    levenshtein(a: string, b: string): number {
        // convert both input strings to lowercase to perform check case-insensitively
        a = a.toLowerCase()
        b = b.toLowerCase()

        const an = a ? a.length : 0;
        const bn = b ? b.length : 0;
        if (an === 0) {
            return bn;
        }
        if (bn === 0) {
            return an;
        }
        
        const matrix = new Array<number[]>(bn + 1);
        for (let i = 0; i <= bn; ++i) {
            let row = matrix[i] = new Array<number>(an + 1);
            row[0] = i;
        }
        const firstRow = matrix[0];
        for (let j = 1; j <= an; ++j) {
            firstRow[j] = j;
        }
        for (let i = 1; i <= bn; ++i) {
            for (let j = 1; j <= an; ++j) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                }
                else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1], // substitution
                        matrix[i][j - 1], // insertion
                        matrix[i - 1][j] // deletion
                    ) + 1;
                }
            }
        }
        return matrix[bn][an];
    };
    
    getConflictingNodes(context: Context) {
        let names: Refer[] = [];
        if (this.name instanceof Reference) {
            names = Reference.getPossibleReferences(
                undefined,
                this.name,
                false,
                context,
            );

            const userInput: string = this.name.name.text.text // unknown name input by user
            const maxNames: number = 50; // the maximum number of names we want to check edit distance for (cap for performance)
            names.splice(maxNames) // truncate the names array after the desired amount
            
            for (let i = names.length-1; i >= 0; i--) {
                const currName: string = names[i].definition.names.names[0].name.text.text // get name in string form from Refer object
                
                if (this.levenshtein(userInput, currName) > 1) { // check if levenshtein distance is greater than 1
                    names.splice(i, 1) // remove dissimilar names
                }
            };
        }

        return {
            primary: {
                node: this.name,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => l.node.Reference.conflict.UnknownName.conflict,
                        this.name instanceof Token
                            ? undefined
                            : new NodeRef(this.name, locales, context),
                        this.type
                            ? new NodeRef(this.type, locales, context)
                            : undefined,
                    ),
            },
            resolutions: names.map((name) => {
                return {
                    description: (locales: Locales) =>
                        locales.concretize(
                            (l) =>
                                l.node.Reference.conflict.UnknownName
                                    .resolution,
                            name.definition.getPreferredName(
                                locales.getLocales(),
                            ),
                        ),
                    mediator: (context: Context, locales: Locales) => {
                        const newReference = Reference.make(
                            name.definition.getPreferredName(
                                locales.getLocales(),
                            ),
                        );
                        return {
                            newProject: context.project.withRevisedNodes([
                                [this.name, newReference],
                            ]),
                            newNode: newReference,
                        };
                    },
                };
            }),
        };
    }
}
