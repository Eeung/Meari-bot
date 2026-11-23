# Discord Meari

Discord 음성 채널의 최근 음성 데이터를 임시로 보관하고, 사용자의 요청에 따라 사전에 설정된 기간만큼 녹음 파일로 저장하는 Discord 봇입니다.

일반적인 녹음 기능과 달리, **별도로 녹음을 시작하지 않아도 이미 지나간 음성 대화를 저장할 수 있는 Replay Buffer 기능**을 제공합니다.

## 1. 주요 기능

### Replay Buffer

- Discord 음성 채널에서 사용자별 음성 데이터 수신
- Opus 패킷을 메모리에 일정 시간 보관
- 설정된 보관 시간이 지난 데이터 자동 제거
- Discord 서버별 Replay Buffer 활성화 및 설정 관리
- 음성 채널 참여 인원에 따른 자동 참여 기능

### 음성 파일 생성

- 저장 명령어 실행 시 사용자별 음성 데이터 추출
- Worker Thread를 이용한 Opus 디코딩
- 타임스탬프 기반 음성 프레임 정렬
- 발화하지 않은 구간에 무음 데이터 삽입
- 사용자별 WAV 파일 생성
- 여러 WAV 파일을 ZIP 파일로 압축

### 파일 다운로드 및 관리

- JWT 기반 다운로드 토큰 발급
- Express HTTP 서버를 통한 파일 다운로드
- Discord 메시지에 다운로드 버튼 제공
- 다운로드 링크 유효기간 7일
- 보관 기간이 지난 파일 자동 삭제
- 만료된 다운로드 메시지 상태 변경

## 2. 시스템 아키텍처

```text
Discord Voice Channel
         │
         ▼
  @discordjs/voice/
  AudioReceiveStream
         │
         ▼
   Opus Packet 수신
         │
         ▼
  사용자별 Replay Buffer
       (Denque)
         │
         │ 저장 명령어
         ▼
    Worker Thread
     Opus → PCM
         │
         ▼
  WAV Stream 생성
         │
         ▼
   ZIP 파일 생성
       (yazl)
         │
         ▼
   로컬 파일 저장
         │
         ▼
   Express HTTP 서버
         │
         ▼
  Cloudflare Tunnel
         │
         ▼
     사용자 다운로드
```

### 음성 데이터 처리

Discord에서 수신한 Opus 패킷은 즉시 디코딩하지 않고 압축된 상태로 메모리에 보관합니다.

저장 요청이 발생하면 보관 중인 패킷을 추출하고, Worker Thread에서 PCM 데이터로 디코딩합니다.

디코딩된 데이터는 시간 정보에 따라 배치되며, 음성이 없는 구간에는 무음 프레임을 삽입합니다.

이후 WAV 헤더를 생성하고 스트림을 통해 ZIP 파일에 추가합니다.

해당 WAV 파일들의 타이밍 조정은 음성의 시작이 아닌, 끝 지점에 맞추도록 되어있습니다.

### 다운로드 처리

생성된 ZIP 파일은 서버의 로컬 저장소에 보관됩니다.

다운로드 요청은 Cloudflare Tunnel을 통해 Express 서버로 전달되며, 서버는 JWT 토큰을 검증한 후 해당 파일을 제공합니다.

## 3. 주요 구현 사항

### 3.1 음성 버퍼 관리

사용자별 음성 데이터를 Denque 자료구조로 관리합니다.

기존 배열 기반 버퍼에서 오래된 데이터를 제거할 때 발생하는 `shift()` 연산 비용을 줄이기 위해 Denque를 적용했습니다.

버퍼 정리는 새로운 음성 데이터가 추가되거나 버퍼를 조회하는 시점에 수행합니다.

이를 통해 불필요한 전체 버퍼 순회를 줄이도록 구성했습니다.

### 3.2 Worker Thread 기반 음성 디코딩

Opus 디코딩은 CPU 자원을 사용하는 작업이므로 Node.js 메인 스레드와 분리하여 처리합니다.

`worker_threads`를 이용하여 디코딩 작업을 수행하고, 메인 스레드에서는 Discord 이벤트와 음성 수신을 처리하도록 구성했습니다.

Worker 내부에서는 PCM 데이터를 일정 크기의 프레임으로 누적하고, 필요한 경우 마지막 프레임에 무음 데이터를 추가합니다.

### 3.3 WAV 파일 직접 생성

기존 FFmpeg 기반 WAV 생성 방식을 변경하여 PCM 데이터와 WAV 헤더를 직접 구성하도록 구현했습니다.

48kHz, 스테레오, 16비트 PCM 형식을 사용합니다.

WAV 데이터는 Readable 스트림으로 생성되며, ZIP 생성 과정에 전달됩니다.

### 3.4 스트림 기반 ZIP 생성

사용자별 WAV 데이터를 yazl을 이용해 ZIP 파일로 생성합니다.

WAV 스트림을 ZIP 생성 과정에 직접 전달하여 별도의 WAV 중간 파일을 생성하지 않도록 구성했습니다.

### 3.5 다운로드 링크 및 파일 정리

다운로드 링크에는 만료 시간이 설정된 JWT를 사용합니다.

생성된 파일과 Discord 메시지의 메타데이터는 JSON 파일로 관리합니다.

스케줄러를 이용해 보관 기간이 지난 파일을 정리하며, 관련 Discord 메시지도 만료 상태로 변경합니다.

## 4. 프로젝트 구조

```text
src/
├── app.ts
├── audio/
│   ├── receiver.ts
│   ├── saveWav.ts
│   ├── decodeWorker.js
│   ├── voiceStateUpdate.ts
│   └── autoReplayState.ts
├── commands/
├── server/
│   ├── server.ts
│   ├── signedUrl.ts
│   └── download.ts
├── storage/
│   ├── guildConfig.ts
│   ├── createZip.ts
│   ├── messageData.ts
│   ├── cleanupOldFiles.ts
│   └── cleanupScheduler.ts
└── utils/
```

주요 파일 역할:

| 파일 | 역할 |
|---|---|
| `receiver.ts` | Discord 음성 수신 및 사용자별 버퍼 관리 |
| `saveWav.ts` | 음성 데이터 추출 및 WAV 스트림 생성 |
| `decodeWorker.js` | Opus 디코딩과 PCM 프레임 처리 |
| `voiceStateUpdate.ts` | 음성 채널 상태 또는 설정 변경에 따른 봇의 참여/퇴장 처리 |
| `createZip.ts` | ZIP 스트림 생성 |
| `signedUrl.ts` | JWT 다운로드 토큰 생성 및 인증 |
| `download.ts` | 다운로드 요청 처리 |
| `guildConfig.ts` | Discord 서버별 설정 관리 |
| `cleanupOldFiles.ts` | 만료 파일 및 메시지 데이터 정리 |

## 5. 배포 환경

Ubuntu 홈서버에서 Docker Compose를 이용하여 운영하고 있습니다.

Docker Compose는 다음 두 서비스로 구성됩니다.

- `bot`: Discord 봇과 Express HTTP 서버
- `tunnel`: Cloudflare Tunnel

```text
                  Internet
                     │
                     ▼
                Cloudflare
                     │
                     ▼
             Cloudflare Tunnel
                     │
                     ▼
            Docker Compose Network
                     │
                     ▼
                Bot Container
                ├── Discord Bot
                ├── Express :3000
                └── Recordings
```

설정 데이터, 로그, 녹음 파일은 Docker Volume를 이용해 컨테이너 외부에 보관합니다.

## 6. 현재 운영 상태

현재 지인끼리의 Discord 서버 1곳에서 운영하고 있습니다.

- 운영 서버: Ubuntu 홈서버
- 실행 환경: Docker Compose
- 음성 데이터: 메모리 기반 Replay Buffer
- 설정 및 메타데이터: JSON 파일
- 녹음 파일: 로컬 파일 시스템
- 다운로드: Express 및 Cloudflare Tunnel

현재는 단일 봇 프로세스와 단일 서버 환경으로 구성되어 있으며, 다수의 Discord 서버 또는 대규모 동시 사용자 환경에서의 성능은 검증되지 않았습니다.

## 7. 현재 구조의 제약 사항

### 메모리 사용량

음성 데이터를 메모리에 보관하므로 동시 녹음 사용자 수와 버퍼 보관 시간이 증가하면 메모리 사용량도 증가합니다.

### 데이터 관리

길드 설정과 다운로드 메타데이터를 JSON 파일로 관리하고 있어 데이터 증가 및 동시 접근에 대한 제약이 있습니다.

### 동시 저장 작업

음성 저장 요청이 동시에 다수 발생할 경우 Worker Thread와 파일 생성 작업에 따른 CPU 및 메모리 사용량이 증가할 수 있습니다.

### 운영 환경

현재 단일 서버 환경이므로 서버 장애가 발생하면 봇과 다운로드 서비스가 함께 영향을 받습니다.