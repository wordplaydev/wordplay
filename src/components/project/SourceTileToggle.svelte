<script lang="ts">
    import Emoji from '@components/app/Emoji.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Templates from '@concepts/Templates';
    import type Project from '@db/projects/Project';
    import type Source from '@nodes/Source';
    import { locales } from '@db/Database';
    import Characters from '../../lore/BasisCharacters';
    import Toggle from '@components/widgets/Toggle.svelte';
    import { getConflicts, getEvaluation } from '@components/project/Contexts';
    import { toColorGrid } from '@output/Output/Image';
    import type Value from '@values/Value';

    interface Props {
        project: Project;
        source: Source;
        expanded: boolean;
        toggle: () => void;
    }

    let { project, source, expanded, toggle }: Props = $props();

    let conflicts = getConflicts();
    let evaluation = getEvaluation();

    /**
     * What this source currently evaluates to.
     *
     * Read only when the value is a different object, since the evaluation store
     * broadcasts on every frame a program plays and a picture that isn't changing
     * shouldn't be walked sixty times a second.
     */
    let value = $state<Value | undefined>(undefined);
    $effect(() => {
        const next = $evaluation?.evaluator.getLatestSourceValue(source);
        if (next !== value) value = next;
    });

    /** A source of rows of colors, as the picture it is. A 📄 says nothing about which
     *  file holds which picture; the picture does. */
    let picture = $derived(toColorGrid(value));

    let thumbnail = $state<HTMLCanvasElement | undefined>(undefined);
    $effect(() => {
        const element = thumbnail;
        const grid = picture;
        if (element === undefined || grid === undefined) return;
        const ctx = element.getContext('2d');
        if (ctx === null) return;
        ctx.clearRect(0, 0, element.width, element.height);
        // Kept as authored, like the picture's own pixels on stage.
        for (const [y, row] of grid.entries())
            for (const [x, color] of row.entries()) {
                ctx.fillStyle = color.toCSS(false);
                ctx.fillRect(x, y, 1, 1);
            }
    });

    /** Whether the source's own name is worth showing. With one source there's nothing
     *  to tell apart, so the toggle says "code" instead; with several, the name is the
     *  only thing distinguishing identical emoji, so the tile row keeps it. */
    const named = $derived(project.getSources().length > 1);

    // The number of conflicts is the number of nodes in the source involved in conflicts
    let conflictCount = $state(0);

    // Derive counts from sources.
    $effect(() => {
        let newCount = 0;
        if ($conflicts) {
            for (const conflict of $conflicts) {
                const node = conflict.getConflictingNode(
                    project.getContext(source),
                    Templates,
                );
                if (source.has(node)) {
                    if (!conflict.isMinor()) newCount++;
                }
            }
        }

        conflictCount = newCount;
    });
</script>

<!-- Name the source in the tooltip: a project can have several sources, and a bare
     "show" is indistinguishable between them, especially to a screen reader. -->
<Toggle
    tips={(l) => l.ui.tile.toggle.showSource}
    tipInputs={{ name: $locales.getName(source.names) }}
    on={expanded}
    {toggle}
>
    {#if conflictCount > 0}<span class="count conflict">{conflictCount}</span
        >{/if}
    {#if conflictCount === 0}{#if picture !== undefined}<canvas
                class="thumbnail"
                bind:this={thumbnail}
                width={Math.max(1, picture[0]?.length ?? 1)}
                height={Math.max(1, picture.length)}
                aria-hidden="true"
            ></canvas>{:else}<Emoji
                text={Characters.Program.symbols}
            />{/if}{/if}
    <!-- Only one source? Use a label to indicate that this is where the code is. Otherwise, use the source names. -->
    <span class="toggle-label" class:named
        >{#if named}{$locales.getName(source.names)}{:else}<em
                ><LocalizedText path={(locale) => locale.glossary.code.word}
                ></LocalizedText></em
            >{/if}</span
    >
</Toggle>

<style>
    .count {
        font-size: small;
        border-radius: 50%;
        color: var(--wordplay-background);
        min-width: 1.5em;
        min-height: 1.5em;
        display: inline-flex;
        flex-direction: column;
        justify-content: center;
        text-align: center;
        vertical-align: middle;
    }

    .conflict {
        background-color: var(--wordplay-error);
    }

    /* The height of the emoji it replaces, so a picture file's toggle is no taller than
       any other; its width follows the picture's shape. */
    .thumbnail {
        height: 1em;
        width: auto;
        vertical-align: middle;
        image-rendering: pixelated;
        border-radius: var(--wordplay-border-radius);
    }
</style>
