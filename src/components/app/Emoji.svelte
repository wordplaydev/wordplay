<script lang="ts">
    interface Props {
        color?: boolean;
        children?: import('svelte').Snippet;
    }

    let { color = false, children }: Props = $props();
</script>

<span class="emoji" class:color>{@render children?.()}</span>

<style>
    .emoji {
        font-family: 'Noto Emoji', 'Noto Sans';
        font-weight: 400;
        font-style: normal;
    }

    .color {
        font-family: 'Noto Color Emoji', 'Noto Sans';
    }
</style>
