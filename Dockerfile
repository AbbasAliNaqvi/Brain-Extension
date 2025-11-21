FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

EXPOSE 5050

CMD ["npm", "run", "dev"]
