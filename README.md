# 클리닉 대기 시스템

조은이비인후과의원을 위한 진료 대기 관리 시스템입니다.

## 주요 기능

- ✅ 실시간 환자 대기 목록 관리
- ✅ 진료실별 환자 분류 (2개 진료실 지원)
- ✅ 환자 상태 관리 (대기, 진료 중, 검사 후 대기 등)
- ✅ 드래그 앤 드롭으로 대기 순서 변경
- ✅ 커스텀 상태 추가/편집
- ✅ 진료 안내 문구 관리
- ✅ 배너 광고 영역 관리 (이미지 업로드, 슬라이드)
- ✅ 관리자 모드 / 공개 모드 전환
- ✅ Firebase Realtime Database 지원 (실시간 동기화)

자세한 기능 명세는 [기능 명세서](./docs/기능_명세.md)를 참조하세요.

## 기술 스택

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Firebase Realtime Database
- Lucide React (아이콘)

자세한 기술 스택 정보는 [기술 스택 문서](./docs/기술_스택.md)를 참조하세요.

## 시작하기

### 필수 요구사항

- Node.js 18 이상

### 설치 및 실행

1. 의존성 설치:

```bash
npm install
```

2. Firebase 설정 (선택사항):

   - Firebase 프로젝트 생성 및 Realtime Database 설정
   - `lib/firebase.config.example.ts`를 복사하여 `lib/firebase.config.ts` 생성
   - Firebase 설정 정보 입력
   - 앱 내 환경 설정 메뉴에서도 Firebase 연결 정보를 입력할 수 있습니다

3. 앱 실행:

```bash
npm run dev
```

## Firebase Realtime Database 사용

이 프로젝트는 Firebase Realtime Database를 사용하여 데이터를 저장하고 실시간으로 동기화할 수 있습니다.

### 관련 문서

- **[파이어베이스 스키마](./docs/파이어베이스_스키마.md)** - 데이터베이스 스키마 상세 설명
- **[기능 명세서](./docs/기능_명세.md)** - 시스템 기능 상세 설명
- **[기술 스택](./docs/기술_스택.md)** - 사용된 기술 및 프로젝트 구조

### 빠른 시작

1. Firebase 프로젝트 생성
2. Realtime Database 생성
3. Firebase 설정:
   - 방법 1: 앱 실행 후 관리자 모드 → 환경 설정 → Firebase 설정에서 연결 정보 입력
   - 방법 2: `lib/firebase.config.example.ts`를 복사하여 `lib/firebase.config.ts` 생성 후 설정 입력
   - 방법 3: Vercel 배포 시 환경 변수로 설정

**참고**: Firebase 설정이 없어도 앱은 실행되지만, 데이터는 저장되지 않습니다. Firebase 설정 후 페이지를 새로고침하면 자동으로 초기화됩니다.

## 데이터 구조

### 환자 (Patient)

- `id`: 고유 식별자
- `name`: 환자 이름
- `status`: 환자 상태 (WAITING, EXAMINING, EXAM_WAIT, COMPLETED 등)
- `roomId`: 진료실 ID (ROOM_1, ROOM_2)
- `registeredAt`: 등록 시간
- `order`: 대기 순서 (드래그 앤 드롭 순서 관리)

### 설정 (Settings)

- `roomNames`: 진료실 이름
- `doctorNames`: 원장 이름
- `showDoctorNames`: 원장 이름 표시 여부
- `showBanner`: 배너 광고 영역 표시 여부
- `notices`: 안내 문구 목록
- `bannerImages`: 배너 이미지 URL 배열
- `customStatuses`: 커스텀 상태 목록

자세한 스키마는 [파이어베이스 스키마](./docs/파이어베이스_스키마.md)를 참조하세요.

## 빌드

```bash
npm run build
```

## 배포

### Vercel 배포

이 프로젝트는 Vercel에 배포할 수 있습니다.

1. **자세한 배포 가이드**: [배포 가이드](./docs/배포_가이드.md) 참조

2. **빠른 배포**:
   - GitHub 저장소에 코드 푸시
   - [Vercel](https://vercel.com)에서 프로젝트 import
   - 환경 변수 설정 (Firebase 설정)
   - 배포 완료!

### 환경 변수 (Vercel)

Vercel 배포 시 다음 환경 변수를 설정해야 합니다:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

자세한 내용은 [배포 가이드](./docs/배포_가이드.md)를 참조하세요.

## 라이선스

이 프로젝트는 개인 사용을 위한 것입니다.
