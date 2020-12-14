FROM node:15

WORKDIR /usr/src/app
COPY . .

RUN npm install

ENV NODE_ENV production
ENV PORT 8006
EXPOSE $PORT

CMD [ "npm", "start" ]