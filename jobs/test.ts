import * as firebase from 'firebase-admin/app';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { workerData } from 'node:worker_threads';

const outfile = path.join(dirname(fileURLToPath(import.meta.url)), 'test.txt');

const ref = process.argv && process.argv.length > 2 && process.argv[2];
const workingDir = process.cwd();
fs.appendFileSync(outfile, `test invoked with ref: "${ref}" in working dir: "${workingDir}"\n`);

firebase.initializeApp({
  credential: firebase.applicationDefault(),
});


