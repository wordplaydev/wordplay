<svelte:options immutable={true} />

<script lang="ts">
    import NodeView from './NodeView.svelte';
    import NameToken from '@nodes/NameToken';
    import type StructureDefinitionType from '@nodes/StructureDefinitionType';
    import { config } from '../../db/Creator';

    export let node: StructureDefinitionType;

    // Choose what name to render based on the preferred languages.
    $: name = new NameToken(
        node.structure.names.getPreferredNameString($config.getLocales())
    );
</script>

<NodeView node={name} />
