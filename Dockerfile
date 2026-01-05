FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

COPY . .

RUN mkdir -p uploads

EXPOSE 5050

CMD ["npm", "run", "dev", "start"]