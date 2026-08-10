const { MongoClient, ObjectId } = require('mongodb');

async function diagnosticoSepultados() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('Conectado ao MongoDB');
    
    const db = client.db('semit');
    const sepultados = db.collection('sepultados');
    
    console.log('\n📊 DIAGNÓSTICO DA COLEÇÃO SEPULTADOS:');
    
    // Contagem total
    const totalDocs = await sepultados.countDocuments();
    console.log(`Total de documentos: ${totalDocs}`);
    
    if (totalDocs === 0) {
      console.log('❌ A coleção está vazia!');
      return;
    }
    
    // Verificar tipos de _id
    const stringIds = await sepultados.countDocuments({ _id: { $type: "string" } });
    const objectIds = await sepultados.countDocuments({ _id: { $type: "objectId" } });
    const otherIds = totalDocs - stringIds - objectIds;
    
    console.log(`\nTipos de _id:`);
    console.log(`  String IDs: ${stringIds}`);
    console.log(`  ObjectIds: ${objectIds}`);
    console.log(`  Outros tipos: ${otherIds}`);
    
    // Mostrar exemplos
    console.log('\n📋 EXEMPLOS DE DOCUMENTOS:');
    
    const sampleDocs = await sepultados.find({}).limit(3).toArray();
    sampleDocs.forEach((doc, index) => {
      console.log(`\nDocumento ${index + 1}:`);
      console.log(`  _id: ${doc._id} (tipo: ${typeof doc._id})`);
      console.log(`  Campos: ${Object.keys(doc).join(', ')}`);
      if (doc.originalId) {
        console.log(`  originalId: ${doc.originalId}`);
      }
    });
    
    // Verificar se há backup
    const collections = await db.listCollections().toArray();
    const backups = collections.filter(col => col.name.includes('sepultados_backup'));
    
    console.log(`\n💾 BACKUPS ENCONTRADOS: ${backups.length}`);
    backups.forEach(backup => {
      console.log(`  - ${backup.name}`);
    });
    
    // Verificar se há coleção temporária
    const tempCollections = collections.filter(col => col.name.includes('sepultados_temp'));
    console.log(`\n⚠️ COLEÇÕES TEMPORÁRIAS: ${tempCollections.length}`);
    tempCollections.forEach(temp => {
      console.log(`  - ${temp.name}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.close();
  }
}

// Função para limpar e tentar novamente
async function limparETentarNovamente() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('semit');
    
    console.log('🧹 Limpando coleções temporárias...');
    
    // Remover coleções temporárias se existirem
    const collections = await db.listCollections().toArray();
    
    for (const col of collections) {
      if (col.name.includes('_temp')) {
        await db.collection(col.name).drop();
        console.log(`  Removida: ${col.name}`);
      }
    }
    
    // Verificar se precisa restaurar do backup
    const backups = collections.filter(col => col.name.includes('sepultados_backup'));
    
    if (backups.length > 0) {
      const latestBackup = backups.sort().pop().name;
      console.log(`\n🔄 Restaurando do backup: ${latestBackup}`);
      
      const backupCollection = db.collection(latestBackup);
      const sepultados = db.collection('sepultados');
      
      const backupDocs = await backupCollection.find({}).toArray();
      
      if (backupDocs.length > 0) {
        await sepultados.deleteMany({});
        await sepultados.insertMany(backupDocs);
        console.log(`✓ Restaurados ${backupDocs.length} documentos`);
      }
    }
    
    console.log('✅ Limpeza concluída. Pronto para nova tentativa.');
    
  } catch (error) {
    console.error('❌ Erro na limpeza:', error);
  } finally {
    await client.close();
  }
}

// Executar diagnóstico
console.log('🔍 Executando diagnóstico...\n');
diagnosticoSepultados()
  .then(() => {
    console.log('\n' + '='.repeat(50));
    console.log('Para limpar e tentar novamente, execute:');
    console.log('node diagnostico.js limpar');
  })
  .catch(console.error);

// Se passou argumento 'limpar'
if (process.argv[2] === 'limpar') {
  limparETentarNovamente().catch(console.error);
}