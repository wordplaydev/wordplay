import { isAuthenticated } from '@components/project/Contexts';
import type { User } from 'firebase/auth';
import type Project from './Project';

export function isAudience(
    user: User | null | undefined,
    project: Project,
): boolean {
    return (
        project.isPublic() &&
        (!isAuthenticated(user) ||
            (project.getOwner() !== user.uid &&
                !project.hasCollaborator(user.uid)))
    );
}
