# 오답 노트 (안드로이드 앱)

반복되는 **발상 놓침·실수 패턴**을 모아 보고, **학습 계획 체크리스트**와 **순공 타이머(앱 차단 포함)**로 공부를 관리하는 앱이에요.
학생과 코치가 각자 로그인해서 쓰고, 학생은 코치 선생님 전화번호 뒷자리 4개로 선생님을 찾아 연결해요.

## 구조

| 경로 | 내용 |
|---|---|
| `src/index.html` | 앱 화면 전체 (claude.ai 아티팩트 버전과 같은 화면) |
| `src/fb.js` | Firebase 로그인·저장소 연결, 로그인 화면, 앱 차단 연결 |
| `android/` | Capacitor 안드로이드 프로젝트 |
| `android/app/src/main/java/com/odapnote/app/` | 앱 차단 (`BlockService` 접근성 서비스, `AppBlockerPlugin`) |
| `firestore.rules` | Firestore 보안 규칙 |
| `.github/workflows/android.yml` | main에 올리면 APK를 만들어 Releases에 올림 |

## APK 받기

`main` 브랜치에 올라가면 GitHub Actions가 APK를 만들어요.
저장소의 **Releases**에서 가장 위 `odap-note-번호.apk`를 폰으로 받아 설치하면 돼요.
(처음 설치할 때 "출처를 알 수 없는 앱 설치" 허용이 필요해요.)

## 처음 한 번 해야 할 설정 (Firebase 콘솔)

1. **Authentication** → 로그인 방법 → **이메일/비밀번호** 사용 설정
2. **Firestore Database** → **규칙** 탭 → `firestore.rules` 내용을 붙여 넣고 **게시**

## 앱 차단

순공 타이머가 켜져 있는 동안, 고른 앱(유튜브 등)을 열면 오답 노트로 돌아와요.
폰의 **설정 → 접근성 → 설치된 앱 → 오답 노트 앱 차단**을 켜야 동작해요.
접근성 권한을 쓰는 앱은 플레이스토어 심사가 까다로워서, 지금은 APK로 직접 설치해서 써요.

## 개발

```bash
npm install
npm run build          # www/ 만들기
npx cap sync android   # 안드로이드 프로젝트에 반영
```

APK는 GitHub Actions에서 빌드해요(로컬에서 하려면 Android Studio 필요).
`android/app/odap-debug.keystore`는 테스트 빌드를 같은 키로 서명해 덮어 설치가 되게 하는 테스트용 키예요. 플레이스토어용 정식 키는 따로 만들어야 해요.
