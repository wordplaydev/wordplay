<script lang="ts">
    import { writingDirection } from '@translation/locales';

    export let center: boolean = false;
</script>

<div class="note" class:center style:direction={$writingDirection}><slot /></div
>

<style>
    div {
        font-style: italic;
        font-size: small;
        color: var(--wordplay-disabled-color);
    }

    .center {
        text-align: center;
    }
</style>
