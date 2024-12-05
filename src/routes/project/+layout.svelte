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
        height: 100vh;
    }
</style>
