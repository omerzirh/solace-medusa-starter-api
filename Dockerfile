FROM node:20

WORKDIR /app/medusa

COPY . .

RUN apt-get update && apt-get install -y python3 python3-pip python-is-python3

RUN npm install -g corepack
RUN corepack enable
RUN corepack prepare yarn@3.2.3 --activate

RUN yarn install
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN yarn build

CMD ["/bin/sh", "-c", "yarn start"]
