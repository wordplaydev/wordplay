import { DB } from '#db/Database.ts';
import Project from '#db/projects/Project.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import BooleanType from '#nodes/BooleanType.ts';
import Source from '#nodes/Source.ts';
import Evaluator from '#runtime/Evaluator.ts';
import BoolValue from '#values/BoolValue.ts';
import ExceptionValue from '#values/ExceptionValue.ts';
import NumberValue from '#values/NumberValue.ts';
import TextValue from '#values/TextValue.ts';
import { expect, test } from 'vitest';

/**
 * Twenty-one basis functions asserted their own closure's class — `this` was
 * taken to be a `TextValue` because the function was installed on Text. The
 * assertion was true for every call the type checker admits and false for
 * anything else, with no way to find out which had happened. `getClosureOf`
 * asks instead, and answers with the exception the basis already uses when a
 * value is not the type a function needs.
 */

/** Step until the evaluation on top closes over a text value, as a Text basis
 *  function's activation does. */
function textClosure() {
    const source = new Source('test', "'hi'.length()");
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const evaluator = new Evaluator(project, DB, [DefaultLocale], false);
    evaluator.pause();
    evaluator.start();
    let safety = 0;
    while (
        !(
            evaluator.getCurrentEvaluation()?.getClosure() instanceof TextValue
        ) &&
        !evaluator.isDone() &&
        safety++ < 2000
    )
        evaluator.step();
    const evaluation = evaluator.getCurrentEvaluation();
    expect(evaluation?.getClosure()).toBeInstanceOf(TextValue);
    return { evaluator, evaluation, source };
}

test('a closure of the expected kind comes back as itself', () => {
    const { evaluator, evaluation, source } = textClosure();
    if (evaluation === undefined) throw new Error('no evaluation');
    expect(
        evaluation.getClosureOf(
            TextValue,
            BooleanType.make(),
            source.expression,
        ),
    ).toBe(evaluation.getClosure());
    evaluator.stop();
});

test('a closure of the wrong kind is an exception, not a lie about its type', () => {
    const { evaluator, evaluation, source } = textClosure();
    if (evaluation === undefined) throw new Error('no evaluation');
    expect(
        evaluation.getClosureOf(
            NumberValue,
            BooleanType.make(),
            source.expression,
        ),
    ).toBeInstanceOf(ExceptionValue);
    expect(
        evaluation.getClosureOf(
            BoolValue,
            BooleanType.make(),
            source.expression,
        ),
    ).toBeInstanceOf(ExceptionValue);
    evaluator.stop();
});
