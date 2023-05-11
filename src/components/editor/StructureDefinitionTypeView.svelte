<svelte:options immutable={true} />

<script lang="ts">
    import NodeView from './NodeView.svelte';
    import NameToken from '@nodes/NameToken';
    import { preferredLanguages } from '@locale/locales';
    import type StructureDefinitionType from '@nodes/StructureDefinitionType';

    export let node: StructureDefinitionType;

    // Choose what name to render based on the preferred languages.
    $: name = new NameToken(
        node.structure.names.getLocaleText($preferredLanguages)
    );
</script>

<NodeView node={name} />
