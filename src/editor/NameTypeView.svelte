<svelte:options immutable={true} />

<script lang="ts">
    import type NameType from '../nodes/NameType';
    import NodeView from './NodeView.svelte';
    import { project } from '../models/stores';
    import { getCaret } from './util/Contexts';
    import NameToken from '../nodes/NameToken';
    import { preferredLanguages } from '../translation/translations';

    export let node: NameType;

    $: context = $project.getNodeContext(node);
    $: definition = node.resolve(context);

    // Choose what name to render, constructing a token if necessary.
    // If the caret is in the node, we choose the name that it is, so that it's editable.
    // Otherwise we choose the best name from of the preferred languages.
    let caret = getCaret();
    $: name =
        definition === undefined || $caret?.isIn(node)
            ? node.name
            : new NameToken(
                  definition.names.getTranslation($preferredLanguages)
              );
</script>

<NodeView node={name} /><NodeView node={node.types} />
