<script lang="ts">
    import { getProjects } from '../project/Contexts';
    import { Status } from '../project/Projects';

    const projects = getProjects();
</script>

<div class="status {$projects.getStatus()}">
    {$projects.getStatus() === Status.Saved
        ? '✔'
        : $projects.getStatus() === Status.Saving
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
    }

    .status.error {
        background: var(--wordplay-error);
    }
</style>
