import { DB } from '@db/Database';
import ProjectsDatabase from '@db/projects/ProjectsDatabase.svelte';

/**
 * The one projects database.
 *
 * It lives here rather than on `Database` because constructing it reaches
 * `Project`, and `Project` is the language runtime — the basis, the nodes, the
 * evaluator, the output layer. Anything that imports `Database` for a locale
 * store would otherwise carry all of that, on every page, whether or not the
 * page shows a project.
 *
 * Importing this module IS asking for the runtime. Only modules that are
 * already part of it should do so statically; everything else should go
 * through `DB.loadProjects()`, which imports this on demand.
 *
 * Constructed at module scope, which is safe precisely because this module is
 * only ever evaluated inside that deferred chunk. Note the import direction:
 * heavy depends on light (`@db/Database`), never the reverse, so the
 * basis→database cycle the codebase guards against stays open.
 */
export const Projects = new ProjectsDatabase(DB);

export default Projects;
