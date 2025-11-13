FROM node:20-alpine

WORKDIR /app

# Copiar package files
COPY package.json ./
COPY package-lock.json ./

# Instalar dependências
RUN npm install

# Copiar TUDO (incluindo .env)
COPY . .

EXPOSE 3000

CMD ["npm", "start"]