<script lang="ts">
    import Emoji from '@components/app/Emoji.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Templates from '@concepts/Templates';
    import type Project from '@db/projects/Project';
    import Context from '@nodes/Context';
    import type Source from '@nodes/Source';
    import { locales } from '../../db/Database';
    import Characters from '../../lore/BasisCharacters';
    import Toggle from '../widgets/Toggle.svelte';
    import { getConflicts } from './Contexts';

    interface Props {
        project: Project;
        source: Source;
        expanded: boolean;
        toggle: () => void;
    }

    let { project, source, expanded, toggle }: Props = $props();

    let conflicts = getConflicts();

    // The number of conflicts is the number of nodes in the source involved in conflicts
    let primaryCount = $state(0);
    let secondaryCount = $state(0);

    // Derive counts from sources.
    $effect(() => {
        let newPrimaryCount = 0;
        let newSecondaryCount = 0;
        if ($conflicts) {
            for (const conflict of $conflicts) {
                const nodes = conflict.getConflictingNodes(
                    new Context(project, source),
                    Templates,
                );
                if (source.has(nodes.primary.node)) {
                    if (!conflict.isMinor()) newPrimaryCount++;
                    else newSecondaryCount++;
                } else if (
                    nodes.secondary !== undefined &&
                    source.has(nodes.secondary.node)
                )
                    newSecondaryCount++;
            }
        }

        primaryCount = newPrimaryCount;
        secondaryCount = newSecondaryCount;
    });
</script>

<Toggle tips={(l) => l.ui.tile.toggle.show} on={expanded} {toggle}>
    {#if primaryCount > 0}<span class="count primary">{primaryCount}</span>{/if}
    {#if secondaryCount > 0}<span class="count secondary">{secondaryCount}</span
        >{/if}
    {#if primaryCount === 0 && secondaryCount === 0}<Emoji
            >{Characters.Program.symbols}</Emoji
        >{/if}
    <!-- Only one source? Use a label to indicate that this is where the code is. Otherwise, use the source names. -->
    {#if project.getSources().length > 1}{$locales.getName(
            source.names,
        )}{:else}<em
            ><LocalizedText path={(locale) => locale.term.code}
            ></LocalizedText></em
        >{/if}
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

    .primary {
        background-color: var(--wordplay-error);
    }

    .secondary {
        background-color: var(--wordplay-warning);
    }
</style>
