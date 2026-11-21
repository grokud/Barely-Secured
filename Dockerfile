FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci


FROM node:24-alpine AS runtime
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY public ./public
COPY data/uploads/mystery-shack-tax-exemption.pdf ./
RUN mkdir -p data/ data/uploads/ data/bulk-tax-documents/ && chown -R node:node data
USER node
EXPOSE 3000
CMD ["node", "src/main.ts"]
