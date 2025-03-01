FROM nginx:alpine

# Copy nginx configuration first
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy all files to nginx html directory
COPY . /usr/share/nginx/html

# Remove the nginx.conf from html directory as we've already copied it to the correct location
RUN rm -f /usr/share/nginx/html/nginx.conf /usr/share/nginx/html/Dockerfile /usr/share/nginx/html/docker-compose.yml

# Rename main.html to index.html for default serving (with error handling)
RUN if [ -f /usr/share/nginx/html/main.html ]; then \
    mv /usr/share/nginx/html/main.html /usr/share/nginx/html/index.html; \
    else echo "Warning: main.html not found, skipping rename"; fi

# Configure nginx to listen on port 3000 internally
# Note: EXPOSE is only documentation, it doesn't actually publish the port
EXPOSE 3000

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 