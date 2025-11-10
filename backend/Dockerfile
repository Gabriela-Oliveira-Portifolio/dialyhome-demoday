# backend/Dockerfile
# Usa uma imagem oficial do Node como base para o build.
# Use uma versão específica que você sabe que funciona.
FROM node:20-alpine AS build  
# CORREÇÃO: Mudar de 18 para 20

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia o package.json e package-lock.json para instalar dependências
COPY package.json ./
COPY package-lock.json ./

# Instala as dependências do projeto
RUN npm install

# Copia todo o código do backend
COPY . .

# Comando para rodar a aplicação quando o container iniciar.
# Certifique-se de que o comando de inicialização está correto (ex: npm start ou node server.js)
CMD ["npm", "start"]

# A porta que o seu backend expõe (pode ser 3000, 8080, etc.)
EXPOSE 3000