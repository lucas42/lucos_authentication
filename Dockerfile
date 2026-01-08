FROM lucas42/lucos_navbar:latest AS navbar
FROM node:25

WORKDIR /usr/src/app
COPY . .
COPY --from=navbar lucos_navbar.js .

RUN npm install

ENV NODE_ENV production
EXPOSE $PORT

CMD [ "npm", "start" ]