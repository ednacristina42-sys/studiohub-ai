# CRA/craco embebe as variáveis REACT_APP_* no bundle em tempo de build —
# por isso REACT_APP_BACKEND_URL tem de ser passada como build-arg, não como
# variável de ambiente do contentor em runtime.
FROM node:20-alpine AS build
WORKDIR /app

ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}

COPY package.json ./
COPY yarn.lock* package-lock.json* ./
RUN if [ -f yarn.lock ]; then yarn install; else npm install; fi

COPY . .
RUN if [ -f yarn.lock ]; then yarn build; else npm run build; fi

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
