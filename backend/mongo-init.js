 /* backend/mongo-init.js */
db = db.getSiblingDB('semit');

// Coleções principais (ajuste nomes conforme seu backend)
db.createCollection('Sepultado');
db.createCollection('User');

// Índices (otimizam buscas)
db.Sepultado.createIndex({ name: 1 });
db.Sepultado.createIndex({ letter: 1 });
db.User.createIndex({ email: 1 }, { unique: true });

/*
 * Usuário de aplicação é criado no DB admin via variável de ambiente no entrypoint.
 * Se quiser forçar aqui (fallback), descomente abaixo:
 *
 * db = db.getSiblingDB('admin');
 * db.createUser({
 *   user: "appuser",
 *   pwd: "appPass123",
 *   roles: [ { role: "readWrite", db: "semit" } ]
 * });
 */
