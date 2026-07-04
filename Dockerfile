FROM node:20-alpine

WORKDIR /app

# dependency 먼저 설치 (캐시 최적화)
COPY package*.json ./
RUN npm install

# 소스 복사
COPY . .

# 포트 (express 서버)
EXPOSE 3000

RUN npm run build

# 실행
CMD ["npm", "run", "start"]