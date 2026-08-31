import Setting from '@db/settings/Setting';
import { isTourID, type TourID } from '@components/project/tours';

/** The interface tours this creator has taken. The tutorial holds a learner at
 *  the step that offers a tour until it's in here, so it has to be something
 *  that survives a reload — and having toured the editor is true of the person,
 *  not the device, so it rides in the creator's settings rather than staying
 *  local. */
export type ToursTaken = TourID[];

function validate(value: unknown): ToursTaken | undefined {
    if (!Array.isArray(value)) return undefined;
    // Drop anything unrecognized rather than rejecting the whole list: a tour
    // that has since been renamed shouldn't re-gate every tour a learner took.
    return Array.from(
        new Set(
            value.filter(
                (id): id is TourID => typeof id === 'string' && isTourID(id),
            ),
        ),
    );
}

export const ToursSetting = new Setting<ToursTaken>(
    'tours',
    false,
    [],
    validate,
    (current, value) =>
        current.length === value.length &&
        current.every((id) => value.includes(id)),
);
