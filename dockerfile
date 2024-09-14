FROM node:18
WORKDIR /app


# Loglar için klasör oluştur
RUN mkdir -p /app/logs

# Gerekli paketleri yükleyin
COPY package*.json ./
RUN npm install --only=production

# Uygulama dosyalarını kopyalayın
COPY . .

EXPOSE 8080
CMD ["npm", "start"]
