FROM nginx:alpine

# Copy all files to nginx html directory
COPY . /usr/share/nginx/html

# Rename main.html to index.html for default serving
RUN mv /usr/share/nginx/html/main.html /usr/share/nginx/html/index.html

# Create custom nginx config to use port 3000
RUN echo 'server {\n\
    listen 3000;\n\
    listen [::]:3000;\n\
    server_name localhost;\n\
    root /usr/share/nginx/html;\n\
    location / {\n\
    try_files $uri $uri/ /index.html;\n\
    }\n\
    }' > /etc/nginx/conf.d/default.conf

# Expose port 3000
EXPOSE 3000

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 