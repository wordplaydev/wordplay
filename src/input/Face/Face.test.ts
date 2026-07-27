import { test, expect } from 'vitest';
import Project from '@db/projects/Project';
import Source from '@nodes/Source';
import DefaultLocale from '@locale/DefaultLocale';

// The stream's live behavior (camera → MediaPipe → detection) needs a real
// browser + webcam and can't run headlessly, but the language-level
// integration can: that Face is a registered stream, that its emitted
// Expression has the planned shape, and that a program using it is conflict-free.
test('Face stream integrates: conflict-free, registered, correct Expression shape', () => {
    const code = `face: Face()
Phrase((face.smiling ? '😀' face.mouthOpen ? '😮' '😐') place: face.place)`;
    const source = new Source('main', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    project.analyze();

    expect(
        project.getAnalysis().conflicts.map((c) => c.constructor.name),
    ).toEqual([]);

    expect(project.shares.input.Face).toBeDefined();
    expect(project.shares.output.Expression).toBeDefined();

    expect(
        project.shares.output.Expression.inputs.map(
            (i) => i.names.getNames()[0],
        ),
    ).toEqual([
        'place',
        'leftEyeOpen',
        'rightEyeOpen',
        'eyesOpen',
        'mouthOpen',
        'mouthOpenAmount',
        'smiling',
        'smileAmount',
        'frowning',
        'frownAmount',
        'browsRaised',
        'browRaiseAmount',
        'turn',
        'tilt',
    ]);
});
