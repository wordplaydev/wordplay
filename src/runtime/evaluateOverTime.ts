import { DB } from '#db/Database.ts';
import Project from '#db/projects/Project.ts';
import Time from '#input/Time/Time.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import Source from '#nodes/Source.ts';
import Evaluator from '#runtime/Evaluator.ts';

/**
 * Evaluates a program reactively, then advances its time stream `ticks` times by `interval`
 * milliseconds each, returning the program's value after the first evaluation and after each tick.
 * For tests of what a program does over time — `◆`, `←`, reactions — rather than at its start.
 * A program with no time stream is reevaluated by nothing, so its value simply repeats.
 */
export default function evaluateOverTime(
    code: string,
    ticks: number,
    interval = 100,
): (string | undefined)[] {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const evaluator = new Evaluator(project, DB, [DefaultLocale], true);
    evaluator.start();
    const values = [evaluator.getLatestSourceValue(source)?.toString()];
    for (let tick = 1; tick <= ticks; tick++) {
        evaluator
            .getBasisStreamsOfType(Time)[0]
            ?.add(Time.make(source, tick * interval), tick * interval);
        evaluator.flush();
        values.push(evaluator.getLatestSourceValue(source)?.toString());
    }
    evaluator.stop();
    return values;
}
