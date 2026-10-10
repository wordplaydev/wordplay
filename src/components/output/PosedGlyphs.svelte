<!-- Text drawn one glyph at a time, each glyph in its own pose (Phrase.poses).
     Only rendered when a phrase has poses, so ordinary text keeps its single run.
     A glyph that only changes color or opacity stays inline, keeping the run's
     shaping and line breaking; one that moves becomes an inline-block, the only
     inline box a transform applies to, and its word is kept from breaking. -->
<script lang="ts">
    import CharacterView from '#components/output/CharacterView.svelte';
    import EmojisRepaired from '#components/widgets/EmojisRepaired.svelte';
    import {
        groupWords,
        toGlyphTransform,
        type PosedGlyph,
    } from '#output/Output/glyphPoses.ts';

    let { glyphs, adapting }: { glyphs: PosedGlyph[]; adapting: boolean } =
        $props();

    let styled = $derived(
        groupWords(glyphs).map((word) =>
            word.map(({ glyph, pose }) => ({
                glyph,
                color: pose.color?.toCSS(adapting) ?? null,
                opacity: pose.opacity?.toString() ?? null,
                transform: toGlyphTransform(pose) ?? null,
            })),
        ),
    );
</script>

{#each styled as word}<span
        class="word"
        class:moved={word.some((glyph) => glyph.transform !== null)}
        >{#each word as { glyph, color, opacity, transform }}<span
                class="glyph"
                class:moved={transform !== null}
                style:color
                style:opacity
                style:transform
                >{#if glyph.kind === 'character'}<CharacterView
                        name={glyph.name}
                        {adapting}
                    />{:else}<EmojisRepaired text={glyph.text} />{/if}</span
            >{/each}</span
    >{/each}

<style>
    .word.moved {
        white-space: nowrap;
    }

    .glyph.moved {
        display: inline-block;
        transform-origin: center;
        /* Keep a space glyph's width, which an inline-block would otherwise collapse. */
        white-space: pre;
    }
</style>
