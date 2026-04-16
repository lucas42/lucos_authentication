FROM lucas42/lucos_navbar:2.1.50 AS navbar
FROM node:25
ARG VERSION
ENV VERSION=$VERSION

WORKDIR /usr/src/app
COPY . .
COPY --from=navbar lucos_navbar.js .

RUN npm install

ENV NODE_ENV production

CMD [ "npm", "start" ]