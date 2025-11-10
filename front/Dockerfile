# --- ESTÁGIO 1: BUILD (Compila o código JavaScript/Front-end) ---
FROM node:18-alpine AS builder

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de dependência e instala
COPY package.json ./
COPY package-lock.json ./
RUN npm install

# Copia o código fonte e executa o build (cria os arquivos estáticos)
COPY . .
# Adapte o comando abaixo se o seu projeto usa "npm run prod" ou outro comando
RUN npm run build 

# --- ESTÁGIO 2: PRODUÇÃO (Serve os arquivos estáticos) ---
FROM node:18-alpine

# Instala o pacote 'serve' globalmente para servir os arquivos estáticos
RUN npm install -g serve

# Define o diretório de trabalho como a pasta onde os arquivos de build estão
# O caminho "/app/build" deve ser o mesmo que o comando "npm run build" gera
WORKDIR /usr/src/app

# Copia os arquivos de build do Estágio 1 para o diretório de produção
COPY --from=builder /app/build ./

# A porta que o servidor 'serve' irá escutar (vamos usar 5173 para consistência)
EXPOSE 5173

# Comando para iniciar o servidor 'serve' na porta 5173, servindo a pasta atual (.)
CMD ["serve", "-s", ".", "-l", "5173"]