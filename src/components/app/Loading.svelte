<script lang="ts">
    import { config } from '../../db/Creator';
</script>

<div class="container">
    <div class="cursor">|</div>
    <div aria-live="assertive" aria-atomic="true" aria-relevant="all"
        >{$config.getLocale().ui.feedback.loading}</div
    >
</div>

<style>
    .container {
        width: 100vw;
        height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: var(--wordplay-spacing);
        font-size: medium;
    }

    .cursor {
        font-size: xx-large;
        animation: wobble infinite linear;
        animation-duration: calc(var(--animation-factor) * 1s);
    }

    @keyframes wobble {
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
