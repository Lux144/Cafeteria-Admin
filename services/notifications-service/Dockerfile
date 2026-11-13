FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY services/notifications-service/package*.json ./services/notifications-service/
COPY services/shared/ ./services/shared/
COPY services/notifications-service/ ./services/notifications-service/
RUN npm install --omit=dev
EXPOSE 4004
CMD ["node", "services/notifications-service/src/index.js"]
