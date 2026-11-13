FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY services/catalog-service/package*.json ./services/catalog-service/
COPY services/shared/ ./services/shared/
COPY services/catalog-service/ ./services/catalog-service/
RUN npm install --omit=dev
EXPOSE 4002
CMD ["node", "services/catalog-service/src/index.js"]
