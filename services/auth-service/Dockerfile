FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY services/auth-service/package*.json ./services/auth-service/
COPY services/shared/ ./services/shared/
COPY services/auth-service/ ./services/auth-service/
RUN npm install --omit=dev
EXPOSE 4001
CMD ["node", "services/auth-service/src/index.js"]
