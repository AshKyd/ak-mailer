FROM node:22-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application source
COPY . .

# Create data and logs directories
RUN mkdir -p /data/logs

# Port 3001 is used by the Node.js server
EXPOSE 3001

CMD ["npm", "start"]