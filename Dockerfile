# Use a lightweight Node.js base image
FROM node:20.12.0-alpine3.19

# Set working directory inside the container
WORKDIR /app

# Copy package.json and yarn.lock to the container
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install

# Copy the Prisma schema and migrations files
COPY prisma ./prisma

# Generate Prisma client (ensure Prisma CLI is installed in dev dependencies)
RUN npx prisma generate

# Copy the rest of the application code
COPY . .

# Build the application
RUN yarn build

EXPOSE 4000

# Start the application
CMD ["yarn", "start"]
