FROM node:16-alpine

WORKDIR /app

COPY package.json package-lock.json notifications.json server.js /app/

RUN npm install

COPY . .

EXPOSE 8080

CMD [ "node", "server.js" ]
