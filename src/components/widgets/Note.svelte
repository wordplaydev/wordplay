<script lang="ts">
    import { writingDirection } from '@translation/translations';
</script>

<div class="note" style:direction={$writingDirection}><slot /></div>

<style>
    div {
        font-style: italic;
        font-size: small;
        color: var(--wordplay-disabled-color);
    }
</style>
