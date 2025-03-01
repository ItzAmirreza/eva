FROM nginx:alpine

# Copy nginx configuration first
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy all files to nginx html directory
COPY . /usr/share/nginx/html

# Remove unnecessary files from html directory
RUN rm -f /usr/share/nginx/html/nginx.conf /usr/share/nginx/html/Dockerfile /usr/share/nginx/html/docker-compose.yml

# Configure nginx to listen on port 3000 internally
# Note: EXPOSE is only documentation, it doesn't actually publish the port
EXPOSE 3000

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 