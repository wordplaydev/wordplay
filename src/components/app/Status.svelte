<script lang="ts">
    import { SaveStatus } from '../../db/Creator';
    import { creator } from '../../db/Creator';
</script>

<div class="status {$creator.getSaveStatus()}">
    {$creator.getSaveStatus() === SaveStatus.Saved
        ? '✔'
        : $creator.getSaveStatus() === SaveStatus.Saving
        ? '…'
        : '⨉'}
</div>

<style>
    .status {
        font-size: small;
        padding: var(--wordplay-spacing);
        border-radius: 50%;
        background: var(--wordplay-background);
        width: 2em;
        height: 2em;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .status.error {
        background: var(--wordplay-error);
        color: var(--wordplay-background);
    }
</style>
