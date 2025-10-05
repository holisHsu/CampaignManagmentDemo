# *** Build FE by Node.js ***
FROM node:20-alpine as frontend-build

WORKDIR /app

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# *** Build BE by Python ***
FROM python:3.11-alpine

# Install Nginx
COPY nginx/nginx.conf /etc/nginx/nginx.conf
RUN apk add --no-cache nginx && \
    mkdir -p /run/nginx && \
    mkdir -p /var/cache/nginx && \
    mkdir -p /var/log/nginx

# Set permissions for Nginx
# Link Nginx log to stdout and stderr
RUN chmod -R 777 /run/nginx /var/cache/nginx /var/log/nginx && \
    ln -sf /dev/stdout /var/log/nginx/access.log && \
    ln -sf /dev/stderr /var/log/nginx/error.log

WORKDIR /app

# Copy FE build result
COPY --from=frontend-build /app/dist /usr/share/nginx/html

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend .

# Collect static files for Django Admin Site
RUN python manage.py collectstatic --noinput

# Create start script
# Set $PORT (assigned by Heroku) to Nginx config
# Use uvicorn to run ASGI application
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'sed -i -e "s/\$PORT/$PORT/g" /etc/nginx/nginx.conf' >> /start.sh && \
    echo 'python3 -m uvicorn mysite.asgi:application --host 127.0.0.1 --port 8000 &' >> /start.sh && \
    echo 'nginx -g "daemon off;"' >> /start.sh && \
    chmod +x /start.sh

CMD ["/start.sh"] 
