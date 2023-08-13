<script lang="ts">
    import { config } from '../../db/Database';

    export let center = false;
</script>

<div class="note" class:center style:direction={$config.getWritingDirection()}
    ><slot /></div
>

<style>
    div {
        font-style: italic;
        font-size: 14pt;
        color: var(--wordplay-inactive-color);
    }

    .center {
        text-align: center;
    }
</style>
