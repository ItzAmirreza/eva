FROM nginx:alpine

# Copy all files to nginx html directory
COPY . /usr/share/nginx/html

# Rename main.html to index.html for default serving
RUN mv /usr/share/nginx/html/main.html /usr/share/nginx/html/index.html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 3000
EXPOSE 3000

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 