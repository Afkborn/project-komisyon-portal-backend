FROM node:18
WORKDIR /app

# Gerekli paketleri yükleyin
COPY package*.json ./
RUN npm install --only=production

# Uygulama dosyalarını kopyalayın
COPY . .

EXPOSE 8080
CMD ["npm", "start"]
