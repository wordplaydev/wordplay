import DefaultLocales from '@locale/DefaultLocales';
import getSequencePreviews, {
    buildSequencePreview,
} from '@components/palette/sequencePreviews';
import { Animations } from '@output/animation/DefaultSequences';
import { expect, test } from 'vitest';

// The palette builds every preset's preview by evaluating one generated program. A name that
// doesn't resolve there fails silently — the dropdown just shows a still dot — so assert that
// every animation actually produced keyframes.
test('every predefined animation gets a preview', () => {
    const previews = getSequencePreviews(DefaultLocales);
    for (const animation of Animations) {
        const preview = previews.get(animation.key);
        expect(preview, `no preview for ${animation.key}`).toBeDefined();
        expect(
            preview?.keyframes.length,
            `no keyframes for ${animation.key}`,
        ).toBeGreaterThan(1);
    }
});

test('a hand-written custom sequence previews too', () => {
    const preview = buildSequencePreview(
        DefaultLocales,
        'Sequence({0%: Pose(rotation: 0°) 100%: Pose(rotation: 90°)} 1s)',
    );
    expect(preview?.keyframes).toHaveLength(2);
});
