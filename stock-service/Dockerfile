FROM node:18-alpine

WORKDIR /app

# Salin package.json dan package-lock.json terlebih dahulu
COPY package*.json ./

# Install dependensi. Layer ini akan di-cache jika package.json tidak berubah
RUN npm install

# Salin sisa kode aplikasi
COPY . .

# Jalankan aplikasi
CMD ["npm", "start"]