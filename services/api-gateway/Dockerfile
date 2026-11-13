FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY services/api-gateway/package*.json ./services/api-gateway/
COPY services/shared/ ./services/shared/
COPY services/api-gateway/ ./services/api-gateway/
RUN npm install --omit=dev
EXPOSE 4000
CMD ["node", "services/api-gateway/src/index.js"]
