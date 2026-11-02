// www/ 폴더에 앱 화면을 만든다: index.html + fb.js(파이어베이스 묶음) + 글꼴
import { build } from 'esbuild';
import { mkdirSync, copyFileSync, readdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';

rmSync('www', { recursive: true, force: true });
mkdirSync('www/fonts/bhs/files', { recursive: true });

const result = await build({ entryPoints: ['src/fb.js'], bundle: true, minify: true, format: 'iife', target: 'chrome100', outfile: 'www/fb.js', legalComments: 'none', metafile: true });
copyFileSync('src/index.html', 'www/index.html');

for (const w of ['Regular', 'Medium', 'Bold']) copyFileSync(`node_modules/pretendard/dist/web/static/woff2/Pretendard-${w}.woff2`, `www/fonts/Pretendard-${w}.woff2`);
const bhs = 'node_modules/@fontsource/black-han-sans';
for (const f of readdirSync(`${bhs}/files`)) if (f.endsWith('.woff2')) copyFileSync(`${bhs}/files/${f}`, `www/fonts/bhs/files/${f}`);
// woff 대체 경로는 빼고 woff2만 쓰도록 정리
writeFileSync('www/fonts/bhs/index.css', readFileSync(`${bhs}/index.css`, 'utf8').replace(/,\s*url\([^)]*\.woff\)\s*format\('woff'\)/g, ''));

// ---------- 오픈소스 라이선스 화면 ----------
// 앱에 실제로 묶여 들어간 패키지(esbuild metafile 기준) + 안드로이드 껍데기 + 글꼴의 라이선스 전문을 모은다.
const pkgs = new Set(['@capacitor/android', '@capacitor/core', '@capacitor/app', 'pretendard', '@fontsource/black-han-sans']);
for (const f of Object.keys(result.metafile.inputs)) {
  const m = f.match(/node_modules\/((?:@[^/]+\/)?[^/]+)\//); if (m) pkgs.add(m[1]);
}
const esc = t => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const rows = [...pkgs].sort().map(name => {
  const dir = `node_modules/${name}`;
  const pj = JSON.parse(readFileSync(`${dir}/package.json`, 'utf8'));
  const lf = readdirSync(dir).find(f => /^(licen[cs]e|copying)(\.|$)/i.test(f));
  const text = lf ? readFileSync(`${dir}/${lf}`, 'utf8') : `License: ${pj.license}`;
  return { name, version: pj.version, license: typeof pj.license === 'string' ? pj.license : (pj.license?.type || ''), text };
});
writeFileSync('www/licenses.html', `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>오픈소스 라이선스</title>
<style>body{font-family:system-ui,sans-serif;margin:0;padding:20px;color:#111;line-height:1.55}h1{font-size:20px}p{font-size:14px;color:#444}details{border-top:1px solid #ddd;padding:10px 0}summary{cursor:pointer;font-weight:700;font-size:14px}summary small{font-weight:400;color:#666}pre{white-space:pre-wrap;font-size:11.5px;background:#f6f6f8;padding:10px;overflow:auto}</style></head><body>
<h1>오픈소스 라이선스</h1><p>오답 노트는 아래 오픈소스 소프트웨어와 글꼴을 사용해요. 각 라이선스 전문을 함께 싣습니다. 안드로이드 앱에는 이 밖에 Android Jetpack(AndroidX) 라이브러리가 Apache License 2.0으로 포함돼요.</p>
${rows.map(r => `<details><summary>${esc(r.name)} <small>${esc(r.version)} · ${esc(r.license)}</small></summary><pre>${esc(r.text)}</pre></details>`).join('\n')}
</body></html>`);
copyFileSync('src/privacy.html', 'www/privacy.html');
console.log(`www 빌드 완료 (라이선스 ${rows.length}개)`);
