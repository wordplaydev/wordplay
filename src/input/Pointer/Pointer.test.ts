import { DB } from '#db/Database.ts';
import Project from '#db/projects/Project.ts';
import Chat from '#input/Chat/Chat.ts';
import Pointer from '#input/Pointer/Pointer.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import Source from '#nodes/Source.ts';
import Evaluator from '#runtime/Evaluator.ts';
import { afterEach, expect, test } from 'vitest';

/** What a program sees from the pointer and chat streams as events arrive. */

const evaluators: Evaluator[] = [];
afterEach(() => {
    for (const evaluator of evaluators.splice(0)) evaluator.stop();
});

function start(code: string) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const evaluator = new Evaluator(project, DB, [DefaultLocale]);
    evaluators.push(evaluator);
    evaluator.start();
    return {
        evaluator,
        value: () => evaluator.getLatestSourceValue(source)?.toString(),
    };
}

test('the pointer is a place that follows each move', () => {
    const { evaluator, value } = start('p: Pointer()\n[p.x p.y]');
    expect(value()).toBe('[0m 0m]');
    evaluator.singletonReact(Pointer, (stream) => stream.react({ x: 3, y: 4 }));
    evaluator.flush();
    expect(value()).toBe('[3m 4m]');
});

// The pointer built its own Place without a rotation, so reading one was an unknown name that
// halted the program, and the pointer never equaled the same place written out.
test('the pointer is a whole place, rotation included', () => {
    expect(start('Pointer().rotation').value()).toBe('ø');
    expect(start('Pointer() = Place(0m 0m 0m)').value()).toBe('⊤');
});

test('chat is the latest message', () => {
    const { evaluator, value } = start('Chat()');
    expect(value()).toBe('""');
    evaluator.singletonReact(Chat, (stream) => stream.react('hi'));
    evaluator.flush();
    expect(value()).toBe('"hi"');
    evaluator.singletonReact(Chat, (stream) => stream.react('bye'));
    evaluator.flush();
    expect(value()).toBe('"bye"');
});
