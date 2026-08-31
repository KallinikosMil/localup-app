import fs from 'fs';
import path from 'path';

import { Routes, allRoutes } from './routes';

// A constant stops a typo. It does not stop a screen being renamed out
// from under it — the constant still reads fine and the push still goes
// nowhere. These two tests close that: one asserts every route points at
// a real file, the other asserts every real screen has a route.
//
// Together they are worth more than expo-router's typed routes for this
// project, because they run inside `npm run verify` rather than only in
// the editor, and they need no experimental flag turned on.

const APP_DIR = path.join(__dirname, '..', 'app');

// expo-router accepts either `foo.tsx` or `foo/index.tsx` for the same
// href, so a route is satisfied by either.
const candidatesFor = (route: string) => {
  const rel = route.replace(/^\//, '');
  return [
    path.join(APP_DIR, `${rel}.tsx`),
    path.join(APP_DIR, rel, 'index.tsx'),
  ];
};

// Not routes: the layouts that wrap them, and the /dev previews, which
// exist to render a screen in isolation and are never navigated to from
// the app itself.
const isScreenFile = (file: string) =>
  file.endsWith('.tsx') &&
  !path.basename(file).startsWith('_') &&
  !file.split(path.sep).includes('dev');

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });

const hrefFor = (file: string) =>
  '/' +
  path
    .relative(APP_DIR, file)
    .replace(/\.tsx$/, '')
    .split(path.sep)
    .join('/')
    .replace(/\/index$/, '');

describe('Routes', () => {
  it.each(allRoutes())('%s points at a screen that exists', route => {
    const found = candidatesFor(route).some(p => fs.existsSync(p));
    expect(found).toBe(true);
  });

  it('has no duplicate paths', () => {
    const all = allRoutes();
    expect(new Set(all).size).toBe(all.length);
  });

  // The direction that catches a NEW screen someone forgot to name here.
  it('names every screen in src/app', () => {
    const known = new Set<string>(allRoutes());
    const screens = walk(APP_DIR).filter(isScreenFile).map(hrefFor);
    const unnamed = screens.filter(href => !known.has(href));
    expect(unnamed).toEqual([]);
  });

  it('keeps the bracket form on dynamic routes', () => {
    // Passing an interpolated path where expo-router wants a pattern is
    // the mistake this guards: `/chat/abc123` as a pathname silently
    // matches nothing.
    expect(Routes.chat).toContain('[');
    expect(Routes.profile.user).toContain('[');
  });
});
