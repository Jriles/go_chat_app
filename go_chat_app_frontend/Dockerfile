# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Install dependencies
COPY package.json .

RUN npm install

RUN npm i -g serve

# Copy the rest of the application code
COPY . .

# Build the Vite application
RUN npm run build

# Install a simple HTTP server to serve the built files
RUN npm install -g serve

# Expose the port the app runs on
EXPOSE 8080

# Start the application
CMD ["serve", "-s", "dist"]
