FROM node:15 as build
WORKDIR /build
ENV PATH /build/node_modules/.bin:$PATH
COPY package.json .
COPY package-lock.json .
COPY .npmrc .
RUN npm install
COPY . .
RUN npm run build
ENV PORT 9000
EXPOSE 80
CMD ["node", "dist/index.js"]
