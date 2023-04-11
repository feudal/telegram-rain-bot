FROM node:16-alpine

WORKDIR /app

COPY package.json package-lock.json notifications.json server.js /app/

RUN npm install

COPY . .

CMD [ "node", "server.js" ]
