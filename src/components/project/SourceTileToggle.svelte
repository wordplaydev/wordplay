<script lang="ts">
    import Emoji from '@components/app/Emoji.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Templates from '@concepts/Templates';
    import type Project from '@db/projects/Project';
    import type Source from '@nodes/Source';
    import { locales } from '@db/Database';
    import Characters from '../../lore/BasisCharacters';
    import Toggle from '@components/widgets/Toggle.svelte';
    import { getConflicts } from '@components/project/Contexts';

    interface Props {
        project: Project;
        source: Source;
        expanded: boolean;
        toggle: () => void;
    }

    let { project, source, expanded, toggle }: Props = $props();

    let conflicts = getConflicts();

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
    {#if conflictCount === 0}<Emoji text={Characters.Program.symbols} />{/if}
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
</style>
