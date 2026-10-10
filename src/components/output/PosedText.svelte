<!-- A phrase's text drawn glyph by glyph, each glyph taking the next of the
     phrase's poses (Phrase.poses), the cycle continuing across language parts
     and markup runs. AnimatedText imports this dynamically, so only phrases
     with poses carry it. Markup is drawn from its flattened runs, as Phrase
     measures it: MarkupHTMLView renders segments recursively and has no notion
     of a glyph index. -->
<script lang="ts">
    import PosedGlyphs from '#components/output/PosedGlyphs.svelte';
    import type Markup from '#nodes/Markup.ts';
    import type Pose from '#output/animation/Pose.ts';
    import {
        poseGlyphs,
        toGlyphRuns,
        type PosedGlyph,
    } from '#output/Output/glyphPoses.ts';
    import type { TextPart } from '#values/TextValue.ts';

    interface Props {
        /** What's shown: plain text or markup. */
        text: string | Markup;
        /** The text's parts when it has settled in several languages, drawn each in its own. */
        parts: readonly TextPart[] | undefined;
        poses: Pose[];
        adapting: boolean;
    }

    let { text, parts, poses, adapting }: Props = $props();

    type Run = {
        glyphs: PosedGlyph[];
        lang?: string | undefined;
        italic?: boolean;
        weight?: number;
        underline?: boolean;
    };

    let runs: Run[] = $derived.by(() => {
        let start = 0;
        const next = (value: string) => {
            const glyphs = poseGlyphs(value, poses, start);
            start += glyphs.length;
            return glyphs;
        };
        if (parts !== undefined)
            return parts.map((part) => ({
                glyphs: next(part.text),
                lang: part.language?.getBCP47(),
            }));
        if (typeof text === 'string') return [{ glyphs: next(text) }];
        return toGlyphRuns(text).map((run) => ({
            glyphs: next(run.text),
            italic: run.italic,
            weight: run.weight,
            underline: run.underline,
        }));
    });
</script>

{#each runs as run}<span
        lang={run.lang}
        style:font-style={run.italic ? 'italic' : null}
        style:font-weight={run.weight === undefined || run.weight === 400
            ? null
            : run.weight}
        style:text-decoration={run.underline ? 'underline' : null}
        ><PosedGlyphs glyphs={run.glyphs} {adapting} /></span
    >{/each}
