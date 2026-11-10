import {devices} from '@playwright/test';
import path from 'path';
import {fileURLToPath, pathToFileURL} from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const mob = (w, h) => ({...devices['Pixel 7'], viewport: {width: w, height: h}});

export default {
  testDir: '.', testMatch: 'mobil.spec.mjs', reporter: 'list', workers: 4,
  globalSetup: './render.mjs',
  use: {baseURL: pathToFileURL(path.join(here, '_nahled')).href + '/'},
  projects: [
    {name: '320', use: mob(320, 640)},
    {name: '360', use: mob(360, 740)},
    {name: '390', use: mob(390, 844)},
    {name: '412 Pixel7', use: devices['Pixel 7']},
  ],
};
