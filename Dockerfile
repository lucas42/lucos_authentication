FROM node:8

WORKDIR /usr/src/app
COPY . .

ENV NODE_ENV production
EXPOSE 8080

CMD [ "nodejs", "server.js", "8080" ]