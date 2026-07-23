import type { Detection } from '@mediapipe/tasks-vision';
import { normalizeBox, selectDetections } from '@input/Objects';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import { expect, test } from 'vitest';

/** A detection with one category, at a box in pixels of the detection frame. */
function detection(
    categoryName: string,
    score: number,
    box?: { originX: number; originY: number; width: number; height: number },
): Detection {
    const categories = [{ categoryName, score, index: 0, displayName: '' }];
    // `boundingBox` is optional under exactOptionalPropertyTypes, so omit the
    // key entirely rather than setting it to undefined.
    return box === undefined
        ? { categories, keypoints: [] }
        : {
              categories,
              boundingBox: { ...box, angle: 0 },
              keypoints: [],
          };
}

// The stream's live behavior (camera → MediaPipe → detection) needs a real
// browser + webcam and can't run headlessly, but the language-level
// integration can: that Objects is a registered stream, that the Thing it
// emits has the planned shape, and that a program using it is conflict-free.
test('Objects stream integrates: conflict-free, registered, correct Thing shape', () => {
    const code = `things: Objects()
Stage(things.translate(ƒ(thing) Phrase(thing.name place: thing.place)))`;
    const source = new Source('main', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    project.analyze();

    expect(
        project.getAnalysis().conflicts.map((c) => c.constructor.name),
    ).toEqual([]);

    expect(project.shares.input.Objects).toBeDefined();
    expect(project.shares.output.Thing).toBeDefined();

    expect(
        project.shares.output.Thing.inputs.map((i) => i.names.getNames()[0]),
    ).toEqual(['name', 'confidence', 'place', 'width', 'height']);
});

test('a category filter in the creator locale type checks', () => {
    const source = new Source('main', `Objects(category: 'cat').length()`);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    project.analyze();
    expect(
        project.getAnalysis().conflicts.map((c) => c.constructor.name),
    ).toEqual([]);
});

test('Thing.name is typed as the union of localized category literals', () => {
    const project = Project.make(
        null,
        'test',
        new Source('main', `Objects()`),
        [],
        DefaultLocale,
    );
    const nameType = project.shares.output.Thing.inputs[0].type?.toWordplay();
    // Every category name is a literal member, plus the '' default; a non-member
    // like 'notacategory' is absent, so hover/autocomplete show the exact set.
    expect(nameType).toContain("'cat'");
    expect(nameType).toContain("'dog'");
    expect(nameType).not.toContain('notacategory');
});

test('selectDetections keeps the surest matches, best first', () => {
    const detections = [
        detection('cup', 0.6),
        detection('cat', 0.9),
        detection('dog', 0.3),
    ];
    expect(
        selectDetections(detections, 0.5, undefined, 5).map(
            ({ label }) => label.categoryName,
        ),
    ).toEqual(['cat', 'cup']);
});

test('selectDetections honors the category filter and the count cap', () => {
    const detections = [
        detection('cat', 0.9),
        detection('cat', 0.7),
        detection('cup', 0.8),
    ];
    expect(selectDetections(detections, 0.5, 'cat', 5)).toHaveLength(2);
    expect(selectDetections(detections, 0.5, 'cat', 1)).toHaveLength(1);
    expect(selectDetections(detections, 0.5, 'giraffe', 5)).toHaveLength(0);
});

test('selectDetections drops detections the model gave no category', () => {
    const empty: Detection = { categories: [], keypoints: [] };
    expect(selectDetections([empty], 0, undefined, 5)).toHaveLength(0);
});

test('normalizeBox centers the box in the detection frame', () => {
    const box = normalizeBox(
        detection('cat', 1, {
            originX: 80,
            originY: 160,
            width: 160,
            height: 80,
        }),
        320,
    );
    expect(box).toEqual({ x: 0.5, y: 0.625, width: 0.5, height: 0.25 });
});

test('normalizeBox centers a box-less detection rather than failing', () => {
    expect(normalizeBox(detection('cat', 1), 320)).toEqual({
        x: 0.5,
        y: 0.5,
        width: 0,
        height: 0,
    });
});
