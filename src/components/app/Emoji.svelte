<script lang="ts">
    export let color = false;
</script>

<span class="emoji" class:color><slot /></span>

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
