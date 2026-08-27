import type { Database } from '@db/Database';
import type Project from '@db/projects/Project';
import type Locale from '@locale/Locale';
import analyzeMusicSafety, {
    type MusicRisk,
} from '@output/MusicSafetyAnalysis';
import { toStage } from '@output/Output/Stage';
import { stagePoseMusic } from '@output/animation/poseMusic';
import Evaluator from '@runtime/Evaluator';

/**
 * Statically detect a project's music risks for a read-only viewer, the way
 * {@link ./detectPhotosensitivity} detects flashing: evaluate once with
 * `getInitialValue()`, which builds the output value tree with no DOM, no
 * audio, and no started streams, so the risks are known before a single note
 * sounds.
 */
export default function detectMusicRisks(
    project: Project,
    database: Database,
    locales: Locale[],
): Set<MusicRisk> {
    const evaluator = new Evaluator(project, database, locales, false);
    const value = evaluator.getInitialValue();
    if (value === undefined) return new Set();
    const stage = toStage(evaluator, value);
    if (stage === undefined) return new Set();
    // Pose music as well as content music: a sound a pose strikes is just as loud
    // as one standing on the stage, and reading only the content would put a gate
    // in front of the second and none in front of the first.
    return analyzeMusicSafety(
        [...stage.getMusic(), ...stagePoseMusic(project, stage)].map((music) =>
            music.toData(),
        ),
    );
}
