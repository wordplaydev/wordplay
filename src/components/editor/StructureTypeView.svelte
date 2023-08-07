<svelte:options immutable={true} />

<script lang="ts">
    import NodeView from './NodeView.svelte';
    import NameToken from '@nodes/NameToken';
    import type StructureType from '@nodes/StructureType';
    import { config } from '../../db/Database';

    export let node: StructureType;

    // Choose what name to render based on the preferred languages.
    $: name = new NameToken(
        node.structure.names.getPreferredNameString($config.getLocales())
    );
</script>

<NodeView node={name} />
