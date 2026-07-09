# Build stage
FROM node:22-alpine as build
WORKDIR /app
# Copy package files
COPY package*.json ./
# Install dependencies
RUN npm install --legacy-peer-deps
# Copy source code
COPY . .
# Build the Vite app
RUN npm run build

# Production stage
FROM nginx:alpine
# Copy the custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy the built assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html
# Expose port 80
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
