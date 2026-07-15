import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import detectPhotosensitivityRisks from '@runtime/detectPhotosensitivity';
import { expect, test } from 'vitest';

/** The detected photosensitivity risks for a program in its own default project. */
function risksOf(code: string): Set<string> {
    const project = Project.make(
        null,
        'test',
        new Source('test', code),
        [],
        DefaultLocale,
    );
    return detectPhotosensitivityRisks(project, DB, [DefaultLocale]);
}

test('flags the built-in flash sequence (~8 Hz opacity strobe)', () => {
    // Sequence(flash()) → flashing, via both the output walk and source scan.
    expect(
        risksOf(`Phrase('A' resting: Sequence(flash()))`).has('flashing'),
    ).toBe(true);
});

test('flags a bare reference to a fast built-in even when dormant', () => {
    // The output walk sees no sequence in the initial frame, but the source
    // scan still catches the reference to the fast built-in.
    expect(
        risksOf(`fast: Sequence(flash())\nPhrase('A')`).has('flashing'),
    ).toBe(true);
});

test('flags a fast black↔white color sequence (~5 Hz)', () => {
    const risks = risksOf(`Phrase('A' resting: Sequence({
        0%: Pose(color: Color(0% 0 0°))
        50%: Pose(color: Color(100% 0 0°))
        100%: Pose(color: Color(0% 0 0°))
    } 0.2s))`);
    expect(risks.has('flashing')).toBe(true);
});

test('flags rapidly alternating saturated red', () => {
    const risks = risksOf(`Phrase('A' resting: Sequence({
        0%: Pose(color: Color(54% 106 40°))
        50%: Pose(color: Color(100% 0 0°))
        100%: Pose(color: Color(54% 106 40°))
    } 0.2s))`);
    expect(risks.has('flashing')).toBe(true);
    expect(risks.has('redflash')).toBe(true);
});

test('labels a stage-level flash as a strobe', () => {
    const risks = risksOf(`Stage([Phrase('A')] resting: Sequence(flash()))`);
    expect(risks.has('flashing')).toBe(true);
    expect(risks.has('strobe')).toBe(true);
});

test('flags very fast scale + opacity pulsing as motion', () => {
    const risks = risksOf(`Phrase('A' resting: Sequence({
        0%: Pose(scale: 1 opacity: 1)
        50%: Pose(scale: 2 opacity: 0.5)
        100%: Pose(scale: 1 opacity: 1)
    } 0.1s))`);
    expect(risks.has('motion')).toBe(true);
});

test('flags fast shaking (offset) as motion', () => {
    const risks = risksOf(`Phrase('A' resting: Sequence({
        0%: Pose(offset: Place(x: -0.2m))
        50%: Pose(offset: Place(x: 0.2m))
        100%: Pose(offset: Place(x: -0.2m))
    } 0.1s))`);
    expect(risks.has('motion')).toBe(true);
});

test('does not flag static output', () => {
    expect(risksOf(`Phrase('hello')`).size).toBe(0);
});

test('does not flag a slow move (< 3 Hz)', () => {
    const risks = risksOf(`Phrase('A' resting: Sequence({
        0%: Pose(color: Color(0% 0 0°))
        50%: Pose(color: Color(100% 0 0°))
        100%: Pose(color: Color(0% 0 0°))
    } 3s))`);
    expect(risks.size).toBe(0);
});

test('does not flag a low-contrast pulse', () => {
    const risks = risksOf(`Phrase('A' resting: Sequence({
        0%: Pose(color: Color(50% 0 0°))
        50%: Pose(color: Color(54% 0 0°))
        100%: Pose(color: Color(50% 0 0°))
    } 0.2s))`);
    expect(risks.has('flashing')).toBe(false);
});
