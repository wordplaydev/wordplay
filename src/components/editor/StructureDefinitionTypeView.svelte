<svelte:options immutable={true} />

<script lang="ts">
    import NodeView from './NodeView.svelte';
    import NameToken from '@nodes/NameToken';
    import type StructureDefinitionType from '@nodes/StructureDefinitionType';
    import { creator } from '../../db/Creator';

    export let node: StructureDefinitionType;

    // Choose what name to render based on the preferred languages.
    $: name = new NameToken(
        node.structure.names.getLocaleText($creator.getLanguages())
    );
</script>

<NodeView node={name} />
