<script lang="ts">
    import type Node from '@nodes/Node';

    interface Props {
        node: Node;
    }

    let { node }: Props = $props();
</script>

<span class="name">{node.getDescriptor()}</span>

<style>
    .name {
        background-color: var(--wordplay-error);
    }
</style>
