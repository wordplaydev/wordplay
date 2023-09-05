import type Project from '../../models/Project';
import { PROJECT_PARAM_PLAY } from '../project/ProjectView.svelte';

export default function getProjectLink(example: Project, fullscreen: boolean) {
    return `/project/${encodeURI(example.id)}${
        fullscreen ? `?${PROJECT_PARAM_PLAY}` : ''
    }`;
}
