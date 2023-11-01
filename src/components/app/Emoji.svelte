<script lang="ts">
    export let color = false;
</script>

<span class="emoji" class:color><slot /></span>

<style>
    .emoji {
        font-family: 'Noto Emoji', 'Noto Sans';
    }

    .color {
        font-family: 'Noto Emoji Color', 'Noto Sans';
    }
</style>
