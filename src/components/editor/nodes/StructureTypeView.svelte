<script lang="ts">
    import NameToken from '@nodes/NameToken';
    import type StructureType from '@nodes/StructureType';
    import { locales } from '../../../db/Database';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: StructureType;
        format: Format;
    }

    let { node, format }: Props = $props();

    // Choose what name to render based on the preferred languages.
    let name = $derived(new NameToken($locales.getName(node.definition.names)));
</script>

<NodeView node={name} {format} />
