<script lang="ts">
    export let label: string;
</script>

<div
    class="cursor"
    aria-live="assertive"
    aria-atomic="true"
    aria-relevant="all"
    aria-label={label}>|</div
>

<style>
    .cursor {
        display: inline-block;
        animation: spin infinite linear;
        animation-duration: calc(var(--animation-factor) * 1s);
        transform-origin: center;
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        50% {
            transform: rotate(180deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }
</style>
