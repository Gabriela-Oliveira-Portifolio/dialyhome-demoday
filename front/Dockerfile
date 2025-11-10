# front/Dockerfile

# --- ESTÁGIO 1: BUILD (Compila o código JavaScript/Front-end) ---
FROM node:20-alpine AS builder

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de dependência e instala
COPY package.json ./
COPY package-lock.json ./
RUN npm install

# Copia o código fonte e executa o build
COPY . .
RUN npm run build 

# --- ESTÁGIO 2: PRODUÇÃO (Serve os arquivos estáticos) ---
FROM node:20-alpine

# Instala o pacote 'serve' globalmente para servir os arquivos estáticos
RUN npm install -g serve

# Define o diretório de trabalho
WORKDIR /usr/src/app

# COPIA CORRIGIDA: Usa /app/dist (pasta de saída padrão do Vite)
COPY --from=builder /app/dist ./

# A porta que o servidor 'serve' irá escutar
EXPOSE 5173

# Comando para iniciar o servidor 'serve' na porta 5173
CMD ["serve", "-s", ".", "-l", "5173"]