import DefaultLocales from '@locale/DefaultLocales';
import { describe, expect, test } from 'vitest';

import {
    privilegeAnnouncement,
    removalAnnouncement,
} from '@components/project/collaboratorAnnounce';

/**
 * A live region that is handed the same string twice says nothing the second
 * time, and nothing makes it speak again — so an announcement that can fire
 * repeatedly has to name what actually changed. These fire once per permission
 * edit, which is exactly the recurring case.
 */

describe('collaborator announcements vary between firings', () => {
    test('two privilege changes to the same person differ', () => {
        expect(
            privilegeAnnouncement(DefaultLocales, 'jess', 'comment'),
        ).not.toBe(privilegeAnnouncement(DefaultLocales, 'jess', 'view'));
    });

    test('the same privilege given to two people differs', () => {
        expect(
            privilegeAnnouncement(DefaultLocales, 'jess', 'collaborate'),
        ).not.toBe(privilegeAnnouncement(DefaultLocales, 'sam', 'collaborate'));
    });

    test('two removals differ', () => {
        expect(removalAnnouncement(DefaultLocales, 'jess')).not.toBe(
            removalAnnouncement(DefaultLocales, 'sam'),
        );
    });

    test('a removal never reads like a privilege change', () => {
        expect(removalAnnouncement(DefaultLocales, 'jess')).not.toBe(
            privilegeAnnouncement(DefaultLocales, 'jess', 'view'),
        );
    });

    test('both name the person, and the privilege names what they may do', () => {
        // The words are verbs so this reads as a sentence rather than a label.
        expect(privilegeAnnouncement(DefaultLocales, 'jess', 'comment')).toBe(
            'jess can now comment',
        );
        expect(removalAnnouncement(DefaultLocales, 'jess')).toBe(
            'jess can no longer reach this project',
        );
    });
});
