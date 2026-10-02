import { expect, test } from 'vitest';
import { DB } from '#db/Database.ts';
import Project from '#db/projects/Project.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import DefaultLocales from '#locale/DefaultLocales.ts';
import Source from '#nodes/Source.ts';
import Evaluator from '#runtime/Evaluator.ts';
import { toStage } from '#output/Output/Stage.ts';

function describe(code: string): string | undefined {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const evaluator = new Evaluator(project, DB, [DefaultLocale], false);
    const value = evaluator.getInitialValue();
    if (value === undefined) return undefined;
    const music = toStage(evaluator, value)?.getMusic()[0];
    return music?.getDescription(DefaultLocales);
}

test('a description says how much music there is and how fast', () => {
    const one = describe('Music(Track([1 2 3]) tempo: 90beats/min)');
    expect(one).toContain('90');
    // The count branch has a form for one and for many, so a single track
    // doesn't read "1 tracks".
    expect(one).toContain('one track');
});

test('two different musics describe differently', () => {
    // Every recurring announcement must vary its text or it is heard once and
    // then sounds broken, so the two ends of the range must not collide.
    const small = describe('Music(Track([1]) tempo: 60beats/min)');
    const big = describe(
        'Music([Track([1]) Track([2]) Track([3])] tempo: 180beats/min)',
    );
    expect(small).toBeDefined();
    expect(big).toBeDefined();
    expect(small).not.toBe(big);
    expect(big).toContain('3 tracks');
});

test("a creator's own description is available to the announcer", () => {
    const source = new Source(
        'test',
        "Music(Track([1]) description: 'a lullaby')",
    );
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const evaluator = new Evaluator(project, DB, [DefaultLocale], false);
    const value = evaluator.getInitialValue();
    const music = value ? toStage(evaluator, value)?.getMusic()[0] : undefined;
    // OutputDescriptions prefers a creator's description over the generated
    // one; this is the value it reads.
    expect(music?.description?.text).toBe('a lullaby');
});
