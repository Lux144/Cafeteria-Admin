FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY services/orders-service/package*.json ./services/orders-service/
COPY services/shared/ ./services/shared/
COPY services/orders-service/ ./services/orders-service/
RUN npm install --omit=dev
EXPOSE 4003
CMD ["node", "services/orders-service/src/index.js"]
