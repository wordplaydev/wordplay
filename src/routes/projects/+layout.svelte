<script lang="ts">
    import { getProjects } from '@components/project/Contexts';

    let projects = getProjects();

    /** Load whatever is stored in local storage */
    $projects.loadLocal();
</script>

<slot />
