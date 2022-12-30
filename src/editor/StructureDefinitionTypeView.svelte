<svelte:options immutable={true} />

<script lang="ts">
    import NodeView from './NodeView.svelte';
    import NameToken from '../nodes/NameToken';
    import { languages } from '../models/languages';
    import type StructureDefinitionType from '../nodes/StructureDefinitionType';

    export let node: StructureDefinitionType;

    // Choose what name to render based on the preferred languages.
    $: name = new NameToken(node.structure.names.getTranslation($languages));
</script>

<NodeView node={name} />
