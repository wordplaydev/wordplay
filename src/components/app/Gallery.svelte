<script lang="ts">
    import { database } from '../../db/Database';
    import type Project from '../../models/Project';
    import ProjectPreviewSet from './ProjectPreviewSet.svelte';
    import Subheader from './Subheader.svelte';
    import gotoProject from './gotoProject';

    export let projects: Project[];
    export let name: string;

    function viewProject(project: Project) {
        database.addOrUpdateProject(project, false, true);
        gotoProject(project, true);
    }
</script>

<Subheader>{name}</Subheader>
<ProjectPreviewSet
    set={projects}
    previewAction={(project) => viewProject(project)}
/>
