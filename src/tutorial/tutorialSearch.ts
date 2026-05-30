/**
 * Builds searchable records for the tutorial so it can use the shared search
 * policy in src/util/search.ts. A scene's title/subtitle ranks above its dialog.
 * The builder is pure (no Progress/runtime deps) so it can be unit-tested; the
 * view turns a {@link TutorialTarget} back into a Progress to navigate.
 */

import { withoutAnnotations } from '@locale/withoutAnnotations';
import { foldEntry, type Searchable, type SearchLanguages } from '@util/search';
import { PerformanceMode } from './Tutorial';

/** Where in the tutorial a search result points (1-based, like Progress). */
export type TutorialTarget = {
    act: number;
    scene: number;
    pause: number;
    /** "Act title — scene subtitle/title", shown above the result excerpt. */
    label: string;
};

/**
 * The structural slice of a Tutorial this builder reads. A real `Tutorial` (with
 * its fixed-size act/scene tuples and Dialog/Performance line tuples) satisfies
 * this, and it lets tests build fixtures without the full strict shape.
 */
export type SearchableTutorial = {
    acts: readonly {
        title: string;
        scenes: readonly {
            title: string;
            subtitle: string | null;
            lines: readonly (readonly string[] | null)[];
        }[];
    }[];
};

const performanceModes = new Set<string>(PerformanceMode);

/** Builds searchable records for every scene title and dialog line. */
export function buildTutorialSearch(
    tutorial: SearchableTutorial,
    languages: SearchLanguages,
): Searchable<TutorialTarget>[] {
    const records: Searchable<TutorialTarget>[] = [];

    tutorial.acts.forEach((act, actIndex) => {
        act.scenes.forEach((scene, sceneIndex) => {
            const label = `${withoutAnnotations(act.title)} — ${withoutAnnotations(
                scene.subtitle ?? scene.title,
            )}`;
            const at = (pause: number): TutorialTarget => ({
                act: actIndex + 1,
                scene: sceneIndex + 1,
                pause,
                label,
            });

            // Scene title/subtitle, navigating to the scene start (priority 1).
            const titles = [scene.title, scene.subtitle]
                .filter((t): t is string => t !== null)
                .map((t) => withoutAnnotations(t));
            records.push({
                ref: at(1),
                fields: [
                    {
                        entries: titles.map((t) => foldEntry(t, languages)),
                        priority: 1,
                    },
                ],
            });

            // Each dialog line's text, navigating to that line (priority 2).
            let pauseCount = 0;
            for (const line of scene.lines) {
                if (line === null) {
                    pauseCount++;
                    continue;
                }
                // Skip performance lines (line[0] is a performance mode, not a speaker).
                if (performanceModes.has(line[0])) continue;
                // Dialog is [speaker, emotion, ...text]; drop the first two.
                const text = line.slice(2).join('\n\n');
                records.push({
                    ref: at(pauseCount + 1),
                    fields: [
                        { entries: [foldEntry(text, languages)], priority: 2 },
                    ],
                });
            }
        });
    });

    return records;
}
