# Single stage: serve pre-built dist
FROM nginx:1.27-alpine

COPY dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN chmod -R 755 /usr/share/nginx/html/

EXPOSE 80
