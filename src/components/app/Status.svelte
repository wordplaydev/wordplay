<script lang="ts">
    import { SaveStatus, config } from '../../db/Database';
    import { status } from '../../db/Database';
</script>

<div class="status {$status}">
    {$status === SaveStatus.Saved
        ? `${$config.getLocale().ui.feedback.save.saved} ✔`
        : $status === SaveStatus.Saving
        ? `${$config.getLocale().ui.feedback.save.saving} …`
        : `${$config.getLocale().ui.feedback.save.unsaved} ⨉`}
</div>

<style>
    .status {
        font-size: small;
        padding: var(--wordplay-spacing);
        border-radius: 50%;
        background: var(--wordplay-background);
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
