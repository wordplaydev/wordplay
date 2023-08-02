<svelte:options immutable={true} />

<script lang="ts">
    import NodeView from './NodeView.svelte';
    import type FormattedTranslation from '../../nodes/FormattedTranslation';

    export let node: FormattedTranslation;
</script>

<span class="doc"
    ><NodeView node={node.open} /><NodeView node={node.markup} /><NodeView
        node={node.close}
    /><NodeView node={node.language} /></span
>

<style>
    .doc {
        color: var(--wordplay-doc-color);
    }
</style>
