<script lang="ts">
    import { SaveStatus } from '../../db/Database';
    import { status } from '../../db/Database';
</script>

<div class="status {$status}">
    {$status === SaveStatus.Saved
        ? '✔'
        : $status === SaveStatus.Saving
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
