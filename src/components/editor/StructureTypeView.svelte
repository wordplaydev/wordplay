<script lang="ts">
    import NameToken from '@nodes/NameToken';
    import type StructureType from '@nodes/StructureType';
    import { locales } from '../../db/Database';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: StructureType;
    }

    let { node }: Props = $props();

    // Choose what name to render based on the preferred languages.
    let name = $derived(new NameToken($locales.getName(node.definition.names)));
</script>

<NodeView node={name} />
