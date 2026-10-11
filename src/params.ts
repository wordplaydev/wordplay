import { defineParams } from '@sveltejs/kit/params';
import {
    isGuidePurposeSlug,
    isGuideSectionSlug,
} from '#components/concepts/guidePath.ts';

/**
 * The guide's landings are their own route, prerendered, and these keep it to the slugs
 * that name one, so a concept's path falls through to the guide's unprerendered route.
 */
export const params = defineParams({
    guidesection: (slug) => (isGuideSectionSlug(slug) ? slug : undefined),
    guidepurpose: (slug) => (isGuidePurposeSlug(slug) ? slug : undefined),
});
