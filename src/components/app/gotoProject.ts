import { goto } from '$app/navigation';
import type Project from '../../models/Project';
import { PROJECT_PARAM_PLAY } from '../project/ProjectView.svelte';

export default function gotoProject(example: Project, fullscreen: boolean) {
    goto(
        `/project/${encodeURI(example.id)}${
            fullscreen ? `?${PROJECT_PARAM_PLAY}` : ''
        }`
    );
}
