import fs from 'fs';
import path from 'path';

function findFile(dir: string, targetName: string, depth = 0): string[] {
  if (depth > 6 || !fs.existsSync(dir)) return [];
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
        results.push(...findFile(full, targetName, depth + 1));
      } else if (e.isFile()) {
        if (e.name.toLowerCase().includes(targetName.toLowerCase())) {
          results.push(full);
        }
      }
    }
  } catch (_) {}
  return results;
}

const workspaceRoot = path.resolve(process.cwd(), '../..');
console.log('Searching for target file in workspace:', workspaceRoot);

const matches = findFile(workspaceRoot, '1787737504951');
console.log('Matches:', matches);

const pdfMatches = findFile(path.join(workspaceRoot, 'Organized_Truck_Documents'), 'ISTIMARA');
console.log('Sample Istimara matches in Organized_Truck_Documents:', pdfMatches.slice(0, 5));
