<script lang="ts">
    import { writingDirection } from '../../db/Database';

    export let center = false;
</script>

<div class="note" class:center style:direction={$writingDirection}><slot /></div
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
