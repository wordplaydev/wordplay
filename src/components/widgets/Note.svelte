<script lang="ts">
    import { creator } from '../../db/Creator';

    export let center: boolean = false;
</script>

<div class="note" class:center style:direction={$creator.getWritingDirection()}
    ><slot /></div
>

<style>
    div {
        font-style: italic;
        font-size: 14pt;
        color: var(--wordplay-disabled-color);
    }

    .center {
        text-align: center;
    }
</style>
