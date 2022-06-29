FROM node:lts-alpine

RUN npm install -g yarn

WORKDIR /app

COPY . /app

RUN yarn install

RUN yarn build

EXPOSE 3000

CMD ["yarn", "start"]