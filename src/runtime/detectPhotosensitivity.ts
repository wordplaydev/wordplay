import type { Database } from '@db/Database';
import type Project from '@db/projects/Project';
import type Locale from '@locale/Locale';
import analyzeOutput, {
    analyzeSource,
    type PhotosensitivityRisk,
} from '@output/PhotosensitivityAnalysis';
import { toStage } from '@output/Output/Stage';
import Evaluator from '@runtime/Evaluator';

/**
 * Statically detect a project's photosensitivity risks for a read-only viewer,
 * combining a source scan ({@link analyzeSource}) with an analysis of the
 * initial rendered frame ({@link analyzeOutput}).
 *
 * This evaluates the project once via `getInitialValue()`, which produces the
 * output value tree WITHOUT a DOM or Web Animations — so it computes the risks
 * while exposing the viewer to zero painted frames, which is what lets us warn
 * before anything flashes.
 */
export default function detectPhotosensitivityRisks(
    project: Project,
    database: Database,
    locales: Locale[],
): Set<PhotosensitivityRisk> {
    const risks = analyzeSource(project);

    // Non-reactive: evaluate the initial output structure only, without starting
    // streams — so analyzing a mic/camera project never claims the device.
    const evaluator = new Evaluator(project, database, locales, false);
    const value = evaluator.getInitialValue();
    if (value !== undefined) {
        const stage = toStage(evaluator, value);
        if (stage !== undefined)
            for (const risk of analyzeOutput(stage)) risks.add(risk);
    }

    return risks;
}
