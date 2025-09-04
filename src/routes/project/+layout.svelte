<script lang="ts">
    interface Props {
        children?: import('svelte').Snippet;
    }

    let { children }: Props = $props();
</script>

<div class="project">{@render children?.()}</div>

<style>
    .project {
        display: flex;
        flex-direction: row;
        width: 100vw;
        height: calc(100vh - 1px);
        max-width: 100%;
        max-height: 100%;
        box-sizing: border-box;
    }
</style>
