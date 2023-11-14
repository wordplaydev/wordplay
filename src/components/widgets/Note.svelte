<script lang="ts">
    import { locales } from '../../db/Database';

    export let center = false;
</script>

<div class="note" class:center style:direction={$locales.getDirection()}
    ><slot /></div
>

<style>
    div {
        font-style: italic;
        font-size: calc(var(--wordplay-font-size) - 2pt);
        color: var(--wordplay-inactive-color);
    }

    .center {
        text-align: center;
    }
</style>
