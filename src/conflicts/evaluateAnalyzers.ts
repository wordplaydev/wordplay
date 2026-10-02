import type Conflict from '#conflicts/Conflict.ts';
import type Context from '#nodes/Context.ts';
import type Definition from '#nodes/Definition.ts';
import type Evaluate from '#nodes/Evaluate.ts';

/**
 * An analyzer that produces conflicts specific to evaluations of a particular
 * function, structure, or stream definition. Lets Phrase (and any other
 * built-in) attach domain-specific warnings without Evaluate having to know
 * about them.
 */
export type EvaluateAnalyzer = (
    evaluate: Evaluate,
    context: Context,
) => Conflict[];

const analyzers = new Map<Definition, EvaluateAnalyzer[]>();

export function registerEvaluateAnalyzer(
    definition: Definition,
    analyzer: EvaluateAnalyzer,
): void {
    const existing = analyzers.get(definition);
    if (existing) existing.push(analyzer);
    else analyzers.set(definition, [analyzer]);
}

export function getEvaluateAnalyzers(
    definition: Definition,
): EvaluateAnalyzer[] {
    return analyzers.get(definition) ?? [];
}
