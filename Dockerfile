FROM lucas42/lucos_navbar:latest as navbar
FROM node:22

WORKDIR /usr/src/app
COPY . .
COPY --from=navbar lucos_navbar.js .

RUN npm install

ENV NODE_ENV production
ENV PORT 8006
EXPOSE $PORT

CMD [ "npm", "start" ]