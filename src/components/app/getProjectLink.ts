import type Project from '../../models/Project';
import { PROJECT_PARAM_PLAY } from '../project/ProjectView.svelte';

export default function getProjectLink(project: Project, fullscreen: boolean) {
    return `/project/${encodeURI(project.getID())}${
        fullscreen ? `?${PROJECT_PARAM_PLAY}` : ''
    }`;
}
