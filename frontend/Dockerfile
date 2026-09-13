# BUILD STAGE
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# RUNTIME STAGE
FROM nginx:1.27-alpine
RUN addgroup -S app && adduser -S -G app app && mkdir -p /var/cache/nginx /var/log/nginx /var/run /tmp/nginx && chown -R app:app /var/cache/nginx /var/log/nginx /var/run /tmp/nginx
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
RUN chown -R app:app /usr/share/nginx/html
USER app
EXPOSE 8080
CMD ["nginx","-g","daemon off;"]
