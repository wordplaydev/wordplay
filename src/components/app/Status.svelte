<script lang="ts">
    import { SaveStatus, locale } from '../../db/Database';
    import { status } from '../../db/Database';
    import { getUser } from '../project/Contexts';

    const user = getUser();
</script>

<div class="status {$status}">
    {$status === SaveStatus.Saved
        ? `${$user === null ? $locale.ui.save.local : $locale.ui.save.saved} ✔`
        : $status === SaveStatus.Saving
        ? `${$locale.ui.save.saving} …`
        : `${$locale.ui.save.unsaved} ⨉`}
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
