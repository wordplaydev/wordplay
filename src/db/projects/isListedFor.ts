/** The parts of a project that decide whose lists it appears in. */
export type ListableProject = {
    isArchived(): boolean;
    getOwner(): string | null;
    isOwner(uid: string): boolean;
    hasCollaborator(uid: string): boolean;
};

/**
 * Whether a locally tracked project belongs in the editable project lists of
 * `uid`, the signed-in creator or, while nobody is signed in, whoever last
 * signed in on this device.
 *
 * Local tracking is not ownership: a curator's device holds every project in
 * its galleries, and a shared device can hold a previous account's projects.
 * So a project with an owner is listed only for its owner and collaborators. An
 * ownerless project was made signed out on this device and is listed for
 * anyone, and with no account on record (`uid` null) everything is, since
 * nothing local can be attributed to anyone else.
 */
export default function isListedFor(
    project: ListableProject,
    uid: string | null,
): boolean {
    if (project.isArchived()) return false;
    if (uid === null || project.getOwner() === null) return true;
    return project.isOwner(uid) || project.hasCollaborator(uid);
}
