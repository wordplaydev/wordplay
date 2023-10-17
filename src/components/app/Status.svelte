<script lang="ts">
    import { SaveStatus, locales } from '../../db/Database';
    import { status } from '../../db/Database';
    import { getUser } from '../project/Contexts';

    const user = getUser();
</script>

<div class="status {$status}">
    {$status === SaveStatus.Saved
        ? `${
              $user === null
                  ? $locales.get((l) => l.ui.save.local)
                  : $locales.get((l) => l.ui.save.saved)
          } ✔`
        : $status === SaveStatus.Saving
        ? `${$locales.get((l) => l.ui.save.saving)} …`
        : `${$locales.get((l) => l.ui.save.unsaved)} ⨉`}
</div>

<style>
    .status {
        font-size: small;
        padding: var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
        background: var(--wordplay-background);
        height: 2em;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .status.error {
        background: var(--wordplay-error);
        color: var(--wordplay-background);
        animation: shake 1s infinite;
    }

    @keyframes shake {
        0% {
            transform: rotate(-2deg);
        }
        5% {
            transform: rotate(3deg);
        }
        10% {
            transform: rotate(-1deg);
        }
        15% {
            transform: rotate(2deg);
        }
        20% {
            transform: rotate(-3deg);
        }
        25% {
            transform: rotate(0deg);
        }
    }
</style>
