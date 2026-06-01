import { expect, test } from 'vitest';
import getBreadcrumbTrail from './getBreadcrumbs';

const tos = (routeId: string | null, galleryid?: string, name?: string) =>
    getBreadcrumbTrail(routeId, galleryid, name).map((c) => c.to);

test('the landing page (root) has no breadcrumbs', () => {
    expect(tos('/[[locale]]')).toEqual([]);
});

test('a null route id (error boundary) has no breadcrumbs', () => {
    expect(tos(null)).toEqual([]);
});

test('the project editor has no breadcrumbs', () => {
    expect(tos('/[[locale]]/project/[projectid]')).toEqual([]);
});

test('a flat content page links only to home', () => {
    expect(tos('/[[locale]]/about')).toEqual(['/']);
});

test('the projects page is not mistaken for the project route', () => {
    expect(tos('/[[locale]]/projects')).toEqual(['/']);
});

test('gallery moderation links through galleries', () => {
    expect(tos('/[[locale]]/galleries/moderation')).toEqual([
        '/',
        '/galleries',
    ]);
});

test('a gallery page links through galleries', () => {
    expect(tos('/[[locale]]/gallery/[galleryid]')).toEqual(['/', '/galleries']);
});

test('a character editor links through characters', () => {
    expect(tos('/[[locale]]/character/[id]')).toEqual(['/', '/characters']);
});

test('a how-to page with a gallery name links through the named gallery', () => {
    expect(
        tos('/[[locale]]/gallery/[galleryid]/howto', 'abc', 'My Gallery'),
    ).toEqual(['/', '/galleries', '/gallery/abc']);
});

test('a how-to page without a gallery name omits the gallery crumb', () => {
    expect(tos('/[[locale]]/gallery/[galleryid]/howto', 'abc')).toEqual([
        '/',
        '/galleries',
    ]);
});

test('teach class subpages link through teach', () => {
    expect(tos('/[[locale]]/teach/class/[classid]')).toEqual(['/', '/teach']);
    expect(tos('/[[locale]]/teach/class/new')).toEqual(['/', '/teach']);
});

test('the teach landing page links only to home', () => {
    expect(tos('/[[locale]]/teach')).toEqual(['/']);
});
