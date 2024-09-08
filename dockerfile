# Base image
FROM node:16

# Working directory inside the container
WORKDIR /app

# Dependencies kopyalama
COPY package*.json ./

# Dependencies yükleme
RUN npm install

# Tüm projeyi kopyalama
COPY . .

# Kullanılacak portu tanımlama (örnek: 5000)
EXPOSE 5000

# Backend server'ı başlatma
CMD ["npm", "start"]
