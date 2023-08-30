<script lang="ts">
    import { Projects } from '../../db/Database';
    import { PersistenceType } from '../../db/ProjectHistory';
    import type Project from '../../models/Project';
    import ProjectPreviewSet from './ProjectPreviewSet.svelte';
    import Subheader from './Subheader.svelte';

    export let projects: Project[];
    export let name: string;

    function viewProject(project: Project) {
        Projects.track(project, false, PersistenceType.None, false);
    }
</script>

<Subheader>{name}</Subheader>
<ProjectPreviewSet
    set={projects}
    editable={false}
    beforePlay={(project) => viewProject(project)}
/>
