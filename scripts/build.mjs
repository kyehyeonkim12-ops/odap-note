// www/ 폴더에 앱 화면을 만든다: index.html + fb.js(파이어베이스 묶음) + 글꼴
import { build } from 'esbuild';
import { mkdirSync, copyFileSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';

rmSync('www', { recursive: true, force: true });
mkdirSync('www/fonts/bhs/files', { recursive: true });

await build({ entryPoints: ['src/fb.js'], bundle: true, minify: true, format: 'iife', target: 'chrome100', outfile: 'www/fb.js', legalComments: 'none' });
copyFileSync('src/index.html', 'www/index.html');

for (const w of ['Regular', 'Medium', 'Bold']) copyFileSync(`node_modules/pretendard/dist/web/static/woff2/Pretendard-${w}.woff2`, `www/fonts/Pretendard-${w}.woff2`);
const bhs = 'node_modules/@fontsource/black-han-sans';
for (const f of readdirSync(`${bhs}/files`)) if (f.endsWith('.woff2')) copyFileSync(`${bhs}/files/${f}`, `www/fonts/bhs/files/${f}`);
// woff 대체 경로는 빼고 woff2만 쓰도록 정리
writeFileSync('www/fonts/bhs/index.css', readFileSync(`${bhs}/index.css`, 'utf8').replace(/,\s*url\([^)]*\.woff\)\s*format\('woff'\)/g, ''));
console.log('www 빌드 완료');
