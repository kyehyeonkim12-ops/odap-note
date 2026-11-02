// 오답 노트 앱 레이어
// - Firebase 로그인/저장소를 연결하고, 화면 코드가 쓰던 claude.use('db') 모양 그대로 흉내 낸다.
// - 안드로이드에서는 집중하는 동안 고른 앱을 막는 AppBlocker 플러그인을 연결한다.
import { initializeApp } from 'firebase/app';
import {
  initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail,
} from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, collection, doc, getDoc, getDocs, setDoc, updateDoc,
  deleteDoc, onSnapshot, query, where, limit,
} from 'firebase/firestore';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

const firebaseConfig = {
  apiKey: 'AIzaSyCgyxh3zuu7QZmxnkIk00nM0M1jUoyaxbE',
  authDomain: 'odap-note-5f9e9.firebaseapp.com',
  projectId: 'odap-note-5f9e9',
  storageBucket: 'odap-note-5f9e9.firebasestorage.app',
  messagingSenderId: '350801001631',
  appId: '1:350801001631:web:cdca602bfa32b9210a36aa',
};

const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
let fs;
try { fs = initializeFirestore(app, { localCache: persistentLocalCache() }); }
catch (e) { fs = initializeFirestore(app, {}); }

const ME = { uid: null, profile: null, cls: null };
const COL = { students: 'users', entries: 'entries', tasks: 'tasks', sessions: 'sessions' };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- claude.use('db') 흉내 ----------
function wrap(snap) {
  return { docs: snap.docs.map(d => ({ id: d.id, data: () => d.data() })), metadata: { fromCache: snap.metadata.fromCache } };
}
const dbShim = {
  collection(name) {
    const col = COL[name] || name;
    return {
      onSnapshot(cb, err) {
        const coach = ME.profile.role === 'coach';
        let q;
        if (col === 'users') {
          if (!coach) return onSnapshot(doc(fs, 'users', ME.uid), d => cb({ docs: d.exists() ? [{ id: d.id, data: () => d.data() }] : [], metadata: { fromCache: d.metadata.fromCache } }), err);
          q = query(collection(fs, 'users'), where('classId', '==', ME.profile.classId), where('role', '==', 'student'));
        } else {
          q = coach ? query(collection(fs, col), where('classId', '==', ME.profile.classId)) : query(collection(fs, col), where('sid', '==', ME.uid));
        }
        return onSnapshot(q, { includeMetadataChanges: false }, s => cb(wrap(s)), err);
      },
      doc(id) {
        const ref = id ? doc(fs, col, id) : doc(collection(fs, col));
        return { id: ref.id, set: data => setDoc(ref, col === 'users' ? data : { ...data, classId: ME.profile.classId }) };
      },
    };
  },
  doc(path) {
    const [c, id] = path.split('/');
    const ref = doc(fs, COL[c] || c, id);
    return { update: d => updateDoc(ref, d), delete: () => deleteDoc(ref) };
  },
};
let readyResolve; const ready = new Promise(r => { readyResolve = r; });
window.claude = { use: async k => (k === 'db' ? (await ready, dbShim) : null) };

// ---------- 로그인 화면 ----------
const css = document.createElement('style');
css.textContent = `
  #modeSeg, .who { display: none !important; }
  .acct { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; margin-top: 10px; font-size: 12.5px; color: var(--ink-2); }
  .acct b { color: var(--ink); }
  .acct .code { font-weight: 700; color: var(--blue); letter-spacing: .08em; }
  .acct button { border: 0; background: none; padding: 0; color: var(--ink-3); text-decoration: underline; font-size: 12.5px; }
  .gate { position: fixed; inset: 0; z-index: 50; background: var(--blue); display: flex; align-items: center; justify-content: center; padding: 16px; overflow-y: auto; }
  .gate .win { width: 100%; max-width: 400px; padding: 0 20px 22px; }
  .gate .win::before { margin: 0 -20px 18px; }
  .gate h1 { font-family: var(--px); font-weight: 400; font-size: 30px; margin: 0 0 4px; display: flex; align-items: center; gap: .2em; }
  .gate p { margin: 0 0 18px; color: var(--ink-2); font-size: 13.5px; }
  .gate label { display: block; font-size: 12.5px; font-weight: 700; color: var(--blue); margin: 12px 0 6px; }
  .gate .tin { width: 100%; }
  .gate .bigbtn { margin-top: 18px; }
  .gate .alt { display: block; width: 100%; margin-top: 12px; border: 0; background: none; color: var(--ink-2); font-size: 13px; text-decoration: underline; }
  .gate .err { color: var(--err); font-size: 13px; margin-top: 10px; font-weight: 700; }
  .gate .ok { color: var(--blue); font-size: 13px; margin-top: 10px; font-weight: 700; }
  .gate .roles { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .gate .roles .opt { justify-content: center; }
  .gate .roles .opt::before { display: none; }
  .pstep { display: grid; grid-template-columns: 30px 1fr; gap: 10px; padding: 14px 0; border-top: 2px dotted var(--rule); }
  .pstep > b { width: 28px; height: 28px; background: var(--blue); color: #fff; display: flex; align-items: center; justify-content: center; font-family: var(--px); font-weight: 400; font-size: 16px; clip-path: var(--notch); }
  .pstep strong { display: block; font-size: 15px; margin-bottom: 3px; }
  .pstep span { display: block; font-size: 13px; color: var(--ink-2); line-height: 1.55; margin-bottom: 8px; }
  .pstep span b { color: var(--ink); }
  .pstep .btn { height: 36px; font-size: 13.5px; }
  .pstat { margin-top: 4px; padding: 10px 12px; background: #FDECEB; color: var(--err); font-size: 13px; font-weight: 700; }
  .pstat.on { background: var(--blue-w); color: var(--blue); }
  .ab .row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .ab .st { font-size: 13px; color: var(--ink-2); }
  .ab .st b { color: var(--blue); }
  .ab .st.off b { color: var(--err); }
  .ab .apps { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; }
  .ab .pick { max-height: 320px; overflow-y: auto; margin-top: 10px; border-top: 2px dotted var(--rule); }
  .ab .pick button { display: grid; grid-template-columns: 26px 1fr; gap: 10px; align-items: center; width: 100%; text-align: left; border: 0; border-bottom: 2px dotted var(--rule); background: none; padding: 9px 0; font-size: 14px; }
  .ab .pick button.on .ck { background: var(--blue); border-color: var(--blue); }
  .ab .pick button.on .ck svg { visibility: visible; }
  .ab .pick small { display: block; color: var(--ink-3); font-size: 11px; }
`;
document.head.appendChild(css);

const G = { mode: 'login', role: 'student', msg: '', ok: '', busy: false, f: {} };
function gate(html) {
  let el = document.getElementById('gate');
  if (!html) { el?.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'gate'; el.className = 'gate'; document.body.appendChild(el); }
  el.innerHTML = `<div class="win">${html}</div>`;
}
const brand = '<h1><mark>오답</mark>노트</h1>';
function field(id, label, type = 'text', ph = '', extra = '') {
  const birth = id === 'pw', tel = id === 'phone';
  const attrs = birth ? 'inputmode="numeric" maxlength="6" pattern="[0-9]*" autocomplete="current-password"'
    : tel ? 'inputmode="tel" maxlength="13" autocomplete="tel"'
    : `autocomplete="${id === 'email' ? 'email' : 'off'}"`;
  return `<label for="g-${id}">${label}</label><input class="tin" id="g-${id}" type="${birth ? 'password' : type}" ${attrs} placeholder="${ph}" value="${esc(G.f[id] || '')}">${extra}`;
}
function msgs() { return (G.msg ? `<div class="err" role="alert">${esc(G.msg)}</div>` : '') + (G.ok ? `<div class="ok" role="status">${esc(G.ok)}</div>` : ''); }
const pickList = () => G.found && G.found.length > 1
  ? `<label>같은 이름의 선생님이 여러 명이에요. 내 선생님을 골라 주세요</label><div class="roles" style="grid-template-columns:1fr">${G.found.map(c => `<button class="opt" data-g="pick" data-id="${esc(c.id)}">${esc(c.name)} 선생님 · 전화 뒷자리 ${esc(c.code || '----')}</button>`).join('')}</div>` : '';
function drawGate() {
  if (G.mode === 'login') {
    gate(`${brand}<p>반복되는 발상 놓침·실수를 모아 보는 공부 노트</p>
      ${field('email', '이메일', 'email', 'you@example.com')}${field('pw', '생년월일 6자리', 'password', '예: 031301')}
      <button class="bigbtn" data-g="login" ${G.busy ? 'disabled' : ''}>${G.busy ? '확인 중…' : '로그인'}</button>${msgs()}
      <button class="alt" data-g="toSignup">처음이에요 · 회원가입</button>`);
  } else if (G.mode === 'signup') {
    const coach = G.role === 'coach';
    gate(`${brand}<p>${coach ? '학생은 가입할 때 선생님 이름을 적어요. 이름을 적은 학생만 선생님 화면에 보여요.' : '내 코치 선생님 이름을 정확히 적어 주세요. 그 선생님에게만 내 기록이 보여요.'}</p>
      <label>나는</label><div class="roles"><button class="opt ${!coach ? 'on' : ''}" data-g="role" data-v="student">학생</button><button class="opt ${coach ? 'on' : ''}" data-g="role" data-v="coach">코치</button></div>
      ${field('name', '이름', 'text', coach ? '김선생' : '김민지')}
      ${coach ? field('phone', '전화번호', 'tel', '010-1234-5678') : ''}
      ${field('email', '이메일', 'email', 'you@example.com')}
      ${field('pw', '생년월일 6자리 (비밀번호로 써요)', 'password', '예: 031301')}
      ${coach ? '' : field('coach', '코치 선생님 이름', 'text', '예: 김선생')}
      ${pickList()}
      <button class="bigbtn" data-g="signup" ${G.busy ? 'disabled' : ''}>${G.busy ? '만드는 중…' : '가입하기'}</button>${msgs()}
      <button class="alt" data-g="toLogin">이미 계정이 있어요 · 로그인</button>`);
  } else if (G.mode === 'join') {
    gate(`${brand}<p>${esc(ME.profile?.name || '')} 학생, 코치 선생님 이름을 적어 주세요.</p>
      ${field('coach', '코치 선생님 이름', 'text', '예: 김선생')}
      ${pickList()}
      <button class="bigbtn" data-g="join" ${G.busy ? 'disabled' : ''}>선생님 연결하기</button>${msgs()}
      <button class="alt" data-g="logout">다른 계정으로 로그인</button>`);
  }
}
function keep() { document.querySelectorAll('#gate input').forEach(i => { G.f[i.id.slice(2)] = i.value; }); }
const ERR = {
  'auth/invalid-email': '이메일 형식이 맞지 않아요.',
  'auth/invalid-credential': '이메일이나 생년월일이 맞지 않아요.',
  'auth/wrong-password': '이메일이나 생년월일이 맞지 않아요.',
  'auth/user-not-found': '가입되지 않은 이메일이에요.',
  'auth/email-already-in-use': '이미 가입된 이메일이에요. 로그인해 주세요.',
  'auth/weak-password': '생년월일 6자리를 적어 주세요.',
  'auth/network-request-failed': '인터넷 연결을 확인해 주세요.',
  'auth/too-many-requests': '시도가 너무 많아요. 잠시 뒤 다시 해 주세요.',
  'auth/operation-not-allowed': 'Firebase에서 이메일 로그인이 꺼져 있어요. 관리자에게 알려 주세요.',
  'auth/configuration-not-found': 'Firebase 로그인 기능이 아직 켜져 있지 않아요. (콘솔 → Authentication → 시작하기)',
};
const errText = e => ERR[e?.code] || (e?.code === 'permission-denied' ? '권한이 없어요. Firestore 보안 규칙을 확인해 주세요.' : `문제가 생겼어요. 잠시 뒤 다시 해 주세요.${e?.code ? ' (' + e.code + ')' : ''}`);
const nameKey = v => String(v || '').replace(/\s+/g, '');
const digits = v => String(v || '').replace(/\D/g, '');
// 코치 이름(띄어쓰기 무시)으로 찾는다. 같은 이름이 여럿이면 전화 뒷자리로 구분해 고르게 한다.
async function findCoaches(name) {
  const s = await getDocs(query(collection(fs, 'classes'), where('nameKey', '==', nameKey(name)), limit(10)));
  return s.docs.map(d => ({ id: d.id, ...d.data() }));
}
async function linkCoach(uid, name) {
  if (!nameKey(name)) throw '코치 선생님 이름을 적어 주세요.';
  G.found = await findCoaches(name);
  if (!G.found.length) throw `'${name.trim()}' 선생님을 찾지 못했어요. 선생님이 먼저 가입했는지, 이름이 맞는지 확인해 주세요.`;
  if (G.found.length > 1) return false; // 목록에서 고르게 한다
  await updateDoc(doc(fs, 'users', uid), { classId: G.found[0].id, coachName: G.found[0].name });
  if (ME.profile) { ME.profile.classId = G.found[0].id; }
  G.found = null;
  return true;
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-g]'); if (!b) return;
  keep(); G.msg = ''; G.ok = '';
  const f = G.f;
  const run = async fn => { G.busy = true; drawGate(); try { await fn(); } catch (err) { console.error(err); G.msg = typeof err === 'string' ? err : errText(err); } G.busy = false; if (document.getElementById('gate')) drawGate(); };
  switch (b.dataset.g) {
    case 'toSignup': G.mode = 'signup'; G.found = null; drawGate(); break;
    case 'toLogin': G.mode = 'login'; drawGate(); break;
    case 'role': G.role = b.dataset.v; G.found = null; drawGate(); break;
    case 'logout': await signOut(auth); location.reload(); break;
    case 'login': await run(async () => {
      if (!/^\d{6}$/.test(f.pw || '')) throw '생년월일 6자리를 숫자로 적어 주세요. (예: 031301)';
      await signInWithEmailAndPassword(auth, (f.email || '').trim(), f.pw);
    }); break;
    case 'signup': await run(async () => {
      const coach = G.role === 'coach';
      if (!(f.name || '').trim()) throw '이름을 적어 주세요.';
      if (coach && digits(f.phone).length < 10) throw '전화번호를 적어 주세요.';
      if (!(f.email || '').trim()) throw '이메일을 적어 주세요.';
      if (!/^\d{6}$/.test(f.pw || '')) throw '생년월일 6자리를 숫자로 적어 주세요. (예: 031301)';
      if (!coach && !nameKey(f.coach)) throw '코치 선생님 이름을 적어 주세요.';
      G.pending = { role: G.role, name: f.name.trim(), phone: digits(f.phone), coach: (f.coach || '').trim() };
      const cred = await createUserWithEmailAndPassword(auth, f.email.trim(), f.pw);
      await finishProfile(cred.user.uid);
    }); break;
    case 'join': await run(async () => { if (await linkCoach(ME.uid, f.coach)) await enter(); }); break;
    case 'pick': await run(async () => {
      const c = (G.found || []).find(x => x.id === b.dataset.id); if (!c) return;
      await updateDoc(doc(fs, 'users', ME.uid), { classId: c.id, coachName: c.name });
      ME.profile.classId = c.id; G.found = null; await enter();
    }); break;
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.closest?.('#gate')) { e.preventDefault(); document.querySelector('#gate .bigbtn')?.click(); } });

async function finishProfile(uid) {
  const p = G.pending; if (!p) return;
  let classId = '';
  if (p.role === 'coach') {
    // 전화번호 전체는 본인만 보는 프로필에만 두고, 학생이 찾는 문서에는 이름과 뒷자리만 둔다
    const ref = doc(collection(fs, 'classes'));
    await setDoc(ref, { name: p.name, nameKey: nameKey(p.name), coachUid: uid, code: p.phone.slice(-4), createdAt: Date.now() });
    classId = ref.id;
  }
  await setDoc(doc(fs, 'users', uid), { name: p.name, role: p.role, classId, goal: 180, createdAt: Date.now(), ...(p.role === 'coach' ? { phone: p.phone } : { coachName: p.coach }) });
  if (p.role === 'student') {
    ME.profile = { name: p.name, role: 'student', classId: '' };
    try { await linkCoach(uid, p.coach); } catch (err) { G.mode = 'join'; G.msg = typeof err === 'string' ? err : errText(err); }
    if (G.found && G.found.length > 1) G.mode = 'join';
  }
  G.pending = null; // 이게 풀려야 로그인 쪽이 완성된 프로필을 읽어 들어간다
}

let entered = false;
async function enter() {
  if (!ME.profile.classId) { G.mode = 'join'; drawGate(); return; }
  try { const c = await getDoc(doc(fs, 'classes', ME.profile.classId)); ME.cls = c.exists() ? { id: c.id, ...c.data() } : null; } catch (e) { ME.cls = null; }
  gate(null);
  if (ME.profile.role === 'coach') { if (location.hash !== '#coach') location.hash = 'coach'; }
  else if (location.hash) history.replaceState(null, '', location.pathname);
  acctBar();
  setTimeout(() => window.ODAP_PERM && window.ODAP_PERM.maybeAsk(), 400);
  if (!entered) { entered = true; readyResolve(); }
}
function acctBar() {
  const head = document.querySelector('.head-in'); if (!head) return;
  let el = document.getElementById('acct');
  if (!el) { el = document.createElement('div'); el.id = 'acct'; el.className = 'acct'; head.querySelector('.head-row').after(el); }
  const p = ME.profile, c = ME.cls;
  el.innerHTML = p.role === 'coach'
    ? `<span><b>${esc(p.name)}</b> 코치</span><span>학생이 가입할 때 <span class="code">${esc(p.name)}</span> 을(를) 적으면 연결돼요</span><button data-g="logout">로그아웃</button>`
    : `<span><b>${esc(p.name)}</b> 학생${c ? ' · ' + esc(c.name) + ' 선생님' : ''}</span><button data-g="logout">로그아웃</button>`;
}

onAuthStateChanged(auth, async user => {
  if (!user) { ME.uid = null; G.mode = G.mode === 'signup' ? 'signup' : 'login'; drawGate(); return; }
  ME.uid = user.uid;
  // 가입 직후라면 프로필이 생길 때까지 잠깐 기다린다
  for (let i = 0; i < 40; i++) {
    const s = await getDoc(doc(fs, 'users', user.uid)).catch(() => null);
    if (s && s.exists() && !G.pending) { ME.profile = s.data(); break; }
    if (!G.pending && i > 2) break;
    await new Promise(r => setTimeout(r, 300));
  }
  if (!ME.profile || ME.profile.role === undefined) { G.mode = 'signup'; G.msg = '프로필을 찾지 못했어요. 이름과 역할을 다시 정해 주세요.'; drawGate(); return; }
  await enter();
});

// ---------- 앱 차단 (안드로이드) ----------
const native = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
const Blocker = native ? registerPlugin('AppBlocker') : null;
const AB = { enabled: false, apps: null, picking: false, stats: 0, sel: loadSel() };
// ---------- 처음 켤 때 접근성 권한 안내 ----------
// 안드로이드 13부터는 스토어 밖에서 설치한 앱의 접근성 권한을 '제한된 설정'으로 막는다.
// 그래서 ① 앱 정보 → ⋮ → 제한된 설정 허용 ② 접근성 → 오답 노트 앱 차단 켜기 순서로 안내한다.
const PERMKEY = 'odap-perm-asked';
function drawPerm() {
  const el = document.getElementById('perm'); if (!el) return;
  el.innerHTML = `<div class="win">
    <h1 style="font-size:24px"><mark>앱 차단</mark>권한</h1>
    <p>순공 타이머가 켜진 동안 유튜브·인스타 같은 앱을 열면 오답 노트로 돌아오게 하려면, 아래 두 가지를 한 번만 켜 주세요.</p>
    <div class="pstep"><b>1</b><div><strong>제한된 설정 허용</strong><span>버튼을 누르면 앱 정보가 열려요. 오른쪽 위 <b>⋮</b> → <b>제한된 설정 허용</b>을 누르고 돌아오세요. 메뉴에 없으면 건너뛰어도 돼요.</span><button class="btn line" data-ab="details">앱 정보 열기</button></div></div>
    <div class="pstep"><b>2</b><div><strong>접근성 켜기</strong><span><b>설치된 앱</b>(또는 다운로드한 앱) → <b>오답 노트 앱 차단</b> → <b>사용</b>을 켜 주세요.</span><button class="btn solid" data-ab="access">접근성 설정 열기</button></div></div>
    <div class="pstat ${AB.enabled ? 'on' : ''}">${AB.enabled ? '권한이 켜졌어요! 이제 순공 탭에서 막을 앱을 고르면 돼요.' : '아직 권한이 꺼져 있어요.'}</div>
    <button class="alt" data-ab="later">${AB.enabled ? '닫기' : '나중에 할게요'}</button>
    ${AB.enabled ? '' : '<button class="alt" data-ab="never">앱 차단은 안 쓸래요 (다시 묻지 않기)</button>'}
  </div>`;
}
function showPerm() {
  if (!document.getElementById('perm')) { const el = document.createElement('div'); el.id = 'perm'; el.className = 'gate'; document.body.appendChild(el); }
  drawPerm();
}
function closePerm() { document.getElementById('perm')?.remove(); rerender(); }
window.ODAP_PERM = {
  async maybeAsk() {
    if (!Blocker || ME.profile?.role !== 'student') return;
    await refreshAB();
    if (AB.enabled) return;
    let pref = null; try { pref = localStorage.getItem(PERMKEY); } catch (e) {}
    if (pref === 'never') return;
    showPerm();
  },
};
function loadSel() { try { return JSON.parse(localStorage.getItem('odap-block') || '[]'); } catch (e) { return []; } }
function saveSel() { try { localStorage.setItem('odap-block', JSON.stringify(AB.sel)); } catch (e) {} }
function rerender() { if (typeof window.render === 'function') window.render(); }
async function refreshAB() {
  if (!Blocker) return;
  try { AB.enabled = (await Blocker.isEnabled()).enabled; } catch (e) { AB.enabled = false; }
  try { AB.stats = (await Blocker.getStats()).today || 0; } catch (e) {}
  rerender();
}
const CHECK = '<svg viewBox="0 0 12 12" aria-hidden="true"><path fill="currentColor" d="M1 6h2v2H1zM3 8h2v2H3zM5 6h2v2H5zM7 4h2v2H7zM9 2h2v2H9z"/></svg>';
window.ODAP_EXTRA = {
  studyPanel() {
    if (!Blocker) return '';
    const names = AB.sel.map(p => (AB.apps || []).find(a => a.package === p)?.label || p.split('.').pop());
    return `<div class="h"><h2>앱 차단</h2><span class="aside">${AB.stats ? `오늘 ${AB.stats}번 막았어요` : '순공 중에만 작동'}</span></div>
      <div class="box win ab" style="margin-top:0">
        <div class="row"><span class="st ${AB.enabled ? '' : 'off'}">권한 <b>${AB.enabled ? '켜짐' : '꺼짐'}</b></span>${AB.enabled ? '' : '<button class="btn solid" data-ab="perm">접근성 권한 켜기</button>'}</div>
        ${AB.enabled ? '' : '<p class="muted" style="margin:8px 0 0">설정 → 접근성 → 설치된 앱 → <b>오답 노트</b>를 켜 주세요. 순공 타이머가 돌아가는 동안 고른 앱을 열면 오답 노트로 돌아와요.</p>'}
        <div class="apps">${names.length ? names.map((n, i) => `<span class="tg on">${esc(n)}</span>`).join('') : '<span class="muted">막을 앱을 골라 주세요.</span>'}</div>
        <button class="btn line" style="width:100%;margin-top:10px" data-ab="pick">${AB.picking ? '다 골랐어요' : '막을 앱 고르기'}</button>
        ${AB.picking ? `<div class="pick">${AB.apps ? AB.apps.map(a => `<button class="${AB.sel.includes(a.package) ? 'on' : ''}" data-ab="tog" data-p="${esc(a.package)}"><span class="ck">${CHECK}</span><span>${esc(a.label)}<small>${esc(a.package)}</small></span></button>`).join('') : '<p class="muted">앱 목록을 불러오는 중…</p>'}</div>` : ''}
      </div>`;
  },
};
if (Blocker) {
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-ab]'); if (!b) return;
    if (b.dataset.ab === 'perm') { showPerm(); }
    if (b.dataset.ab === 'details') { await Blocker.openAppDetails(); }
    if (b.dataset.ab === 'access') { await Blocker.openSettings(); }
    if (b.dataset.ab === 'later') { closePerm(); }
    if (b.dataset.ab === 'never') { try { localStorage.setItem(PERMKEY, 'never'); } catch (err) {} closePerm(); }
    if (b.dataset.ab === 'pick') {
      AB.picking = !AB.picking; rerender();
      if (AB.picking && !AB.apps) { try { AB.apps = (await Blocker.getApps()).apps.sort((x, y) => x.label.localeCompare(y.label, 'ko')); } catch (err) { AB.apps = []; } rerender(); }
      if (!AB.picking) syncActive(true);
    }
    if (b.dataset.ab === 'tog') { const p = b.dataset.p; AB.sel = AB.sel.includes(p) ? AB.sel.filter(x => x !== p) : [...AB.sel, p]; saveSel(); rerender(); }
  });
  CapApp.addListener('resume', async () => {
    await refreshAB();
    if (document.getElementById('perm')) { drawPerm(); if (AB.enabled) setTimeout(closePerm, 1500); }
  });
  refreshAB();
  // 순공 타이머 상태를 보고 차단을 켜고 끈다
  let last = null;
  async function syncActive(force) {
    let on = false;
    try { const t = JSON.parse(localStorage.getItem('odap-timer-v1')); on = !!(t && !t.pausedAt); } catch (e) {}
    if (on === last && !force) return;
    last = on;
    try { await Blocker.setActive({ active: on, packages: AB.sel }); } catch (e) {}
  }
  setInterval(syncActive, 1000);
}
