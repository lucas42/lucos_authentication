FROM lucas42/lucos_navbar:2.1.2 AS navbar
FROM node:25

WORKDIR /usr/src/app
COPY . .
COPY --from=navbar lucos_navbar.js .

RUN npm install

ENV NODE_ENV production

CMD [ "npm", "start" ]