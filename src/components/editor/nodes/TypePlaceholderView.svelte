<script lang="ts">
    import { getCaret } from '@components/project/Contexts';
    import type TypePlaceholder from '@nodes/TypePlaceholder';
    import MenuTrigger from '../menu/MenuTrigger.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: TypePlaceholder;
        format: Format;
    }

    let { node, format }: Props = $props();

    const caret = getCaret();
</script>

<NodeView node={[node, 'placeholder']} {format} />
{#if caret && format.block}<MenuTrigger anchor={node} />{/if}
