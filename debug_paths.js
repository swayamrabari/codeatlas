import { scanProject } from './server/src/services/scan.service.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectPath = path.resolve(__dirname, 'server/src/temp/projects/bff15dc2-a080-41af-8223-525aab46162e/trackit-main');

const result = await scanProject(projectPath);
const { files } = result;

// Find server.js entries
const serverFiles = files.filter(f => f.path.includes('server'));
const firstTen = serverFiles.slice(0, 15).map(f => ({
    path: f.path,
    type: f.type,
    category: f.category,
}));

// Find the actual server.js
const serverJs = files.filter(f => f.path.endsWith('server.js'));

fs.writeFileSync('debug_paths.json', JSON.stringify({ firstTen, serverJs: serverJs.map(f => ({ path: f.path, type: f.type, category: f.category, behavior: f.behavior })) }, null, 2), 'utf8');
