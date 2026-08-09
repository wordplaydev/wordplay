import { expect, test } from 'vitest';
import { getDefaultTutorial } from '@util/verify-locales/TutorialSchema';
import Progress, { hashPerformance } from './Progress';

const tutorial = getDefaultTutorial('complete');
const at = (act: number, scene: number, pause: number) =>
    new Progress(tutorial, act, scene, pause);

test('title cards share one project per scene', () => {
    expect(at(6, 6, 0).getProjectID()).toBe('tutorial-6-6');
});

/**
 * The reason the ID carries a hash at all. Inserting the Music scene renumbered
 * every later lesson in Act 6, and a position-only ID would have loaded a
 * learner's saved edit of "And... scene!" into the Music lesson's editor —
 * a program they never wrote, appearing where a different one belongs.
 */
test('two different lessons never share a project ID', () => {
    const ids = new Set<string>();
    const collisions: string[] = [];
    for (let act = 1; act <= tutorial.acts.length; act++) {
        const scenes = tutorial.acts[act - 1].scenes;
        for (let scene = 1; scene <= scenes.length; scene++) {
            const pauses = scenes[scene - 1].lines.filter(
                (line) => line === null,
            ).length;
            for (let pause = 0; pause <= pauses; pause++) {
                const progress = at(act, scene, pause);
                const id = progress.getProjectID();
                const performance = progress.getPerformance();
                // Two steps showing the same program are the same lesson, and
                // should share their saved edit; that's what the ID means.
                const key = `${id}:${JSON.stringify(performance)}`;
                if (ids.has(id) && !ids.has(key)) collisions.push(id);
                ids.add(id);
                ids.add(key);
            }
        }
    }
    expect(collisions).toEqual([]);
});

test('the hash is stable and changes with the program', () => {
    const performance = { edit: 'Music(Track([1 3 5]))' } as const;
    expect(hashPerformance(performance)).toBe(hashPerformance(performance));
    expect(hashPerformance(performance)).not.toBe(
        hashPerformance({ edit: 'Music(Track([1 3 6]))' }),
    );
    // A step's mode is part of the program's identity: the same code shown to
    // watch and shown to edit are different steps.
    expect(hashPerformance(performance)).not.toBe(
        hashPerformance({ fix: 'Music(Track([1 3 5]))' }),
    );
});
