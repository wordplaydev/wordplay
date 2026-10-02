<script lang="ts">
    import NameToken from '#nodes/NameToken.ts';
    import type StructureType from '#nodes/StructureType.ts';
    import { locales } from '#db/Database.ts';
    import NodeView, {
        type Format,
    } from '#components/editor/nodes/NodeView.svelte';

    interface Props {
        node: StructureType;
        format: Format;
    }

    let { node, format }: Props = $props();

    // Choose what name to render based on the preferred languages.
    let name = $derived(NameToken($locales.getName(node.definition.names)));
</script>

<NodeView node={name} {format} />
