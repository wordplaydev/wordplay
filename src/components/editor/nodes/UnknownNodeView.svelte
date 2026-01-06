<script lang="ts">
    import type Node from '@nodes/Node';

    export interface UnknownProps {
        node: Node;
    }

    let { node }: UnknownProps = $props();
</script>

<span class="name">{node.getDescriptor()}</span>

<style>
    .name {
        background-color: var(--wordplay-error);
    }
</style>
