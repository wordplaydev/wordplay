import {
    observeGlyphOutlines,
    pendingGlyphOutlines,
    unreachableGlyphOutlines,
} from '#output/physics/glyphOutline.ts';

/**
 * Reactive container for glyph outline loading, so the stage can say why
 * output that collides by its letter shapes hasn't started moving. A thin
 * bridge like `instrumentSamplesStatus.svelte.ts`, keeping the loader itself
 * free of Svelte.
 */
class GlyphOutlineStatus {
    /** Whether any outline is still downloading, so physics is holding. */
    loading = $state(false);
    /** Whether any outline couldn't download, so its body collides as a box. */
    failed = $state(false);
}

export const glyphOutlineStatus = new GlyphOutlineStatus();

observeGlyphOutlines(() => {
    glyphOutlineStatus.loading = pendingGlyphOutlines() > 0;
    glyphOutlineStatus.failed = unreachableGlyphOutlines() > 0;
});
