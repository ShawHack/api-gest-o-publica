const mongoose = require('mongoose');

async function runLegislationRemoteTest() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/semit_db';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully');

    let ComturContent;
    try {
      ComturContent = mongoose.model('ComturContent');
    } catch (e) {
      const ContentSchema = new mongoose.Schema({
        type: { type: String, required: true },
        title: { type: String, required: true },
        slug: { type: String, required: true },
        summary: String,
        body: String,
        featured: { type: Boolean, default: false },
        publishedAt: Date,
        status: { type: String, default: 'draft' },
        contact: mongoose.Schema.Types.Mixed,
        metadata: mongoose.Schema.Types.Mixed,
        media: [mongoose.Schema.Types.Mixed]
      }, { timestamps: true });
      ComturContent = mongoose.model('ComturContent', ContentSchema);
    }

    // 1. Create legislation test document
    console.log('1. Creating test legislation document (Lei nº 5.432/2026)...');
    const testDoc = new ComturContent({
      type: 'legislation',
      title: 'Lei nº 5.432/2026 — Dispõe sobre o Conselho Municipal de Turismo',
      slug: 'lei-5432-2026-conselho-municipal-de-turismo-' + Date.now(),
      summary: 'Dispõe sobre a reestruturação do Conselho Municipal de Turismo de Garça, institui o Fundo Municipal de Turismo (FUMTUR) e dá outras providências.',
      body: 'Dispõe sobre a reestruturação do Conselho Municipal de Turismo de Garça, institui o Fundo Municipal de Turismo (FUMTUR) e dá outras providências.',
      featured: true,
      status: 'draft',
      metadata: {
        title: 'Lei nº 5.432/2026 — Dispõe sobre o Conselho Municipal de Turismo',
        documentType: 'Lei',
        docType: 'Lei',
        number: '5432',
        year: 2026,
        officialIdentifier: 'Lei nº 5.432/2026',
        responsibleBody: 'Prefeitura Municipal',
        documentDate: '2026-08-15',
        publicationDate: '2026-08-15',
        effectiveFrom: '2026-08-15',
        legalStatus: 'Vigente',
        category: 'COMTUR',
        tags: ['Conselho', 'FUMTUR', 'Governança'],
        pdfFile: {
          url: 'https://ipojuca.pe.gov.br/atos/lei-5432-2026.pdf',
          name: 'lei-5432-2026.pdf',
          originalName: 'lei-5432-2026.pdf',
          size: 2516582,
          sizeFormatted: '2.4 MB',
          mimeType: 'application/pdf',
          uploadedAt: '2026-08-15T10:00:00Z',
          title: 'Lei nº 5.432/2026 - Texto Integral'
        },
        showOnPortal: true,
        featured: true
      },
      media: [
        {
          kind: 'document',
          title: 'Lei nº 5.432/2026 - Texto Integral',
          url: 'https://ipojuca.pe.gov.br/atos/lei-5432-2026.pdf',
          mimeType: 'application/pdf',
          size: 2516582,
          originalName: 'lei-5432-2026.pdf',
          isAccessible: true
        }
      ]
    });

    const saved = await testDoc.save();
    console.log('✔ Test document saved with ID:', saved._id);

    // 2. Fetch and assert all metadata and PDF
    console.log('2. Fetching and asserting metadata...');
    const fetched = await ComturContent.findById(saved._id);
    console.log('✔ Fetched title:', fetched.title);
    console.log('✔ Fetched docType:', fetched.metadata.documentType);
    console.log('✔ Fetched number:', fetched.metadata.number);
    console.log('✔ Fetched year:', fetched.metadata.year);
    console.log('✔ Fetched identifier:', fetched.metadata.officialIdentifier);
    console.log('✔ Fetched date:', fetched.metadata.documentDate);
    console.log('✔ Fetched legalStatus:', fetched.metadata.legalStatus);
    console.log('✔ Fetched category:', fetched.metadata.category);
    console.log('✔ Fetched PDF url:', fetched.media[0].url);
    console.log('✔ Fetched PDF size:', fetched.metadata.pdfFile.sizeFormatted);

    // 3. Update to Published
    console.log('3. Publishing document...');
    fetched.status = 'published';
    fetched.publishedAt = new Date('2026-08-15');
    await fetched.save();
    console.log('✔ Status updated to:', fetched.status);

    // 4. Test query by type, year, category
    console.log('4. Testing queries...');
    const match = await ComturContent.findOne({
      type: 'legislation',
      status: 'published',
      'metadata.year': 2026,
      'metadata.documentType': 'Lei'
    }).lean();
    console.log('✔ Found matched document:', match ? match.title : 'None');

    // 5. Cleanup
    await ComturContent.findByIdAndDelete(saved._id);
    console.log('✔ Cleaned up test document');

    await mongoose.disconnect();
    console.log('ALL REMOTE LEGISLATION TESTS PASSED! 🎉');
  } catch (err) {
    console.error('Remote test error:', err);
    process.exit(1);
  }
}

runLegislationRemoteTest();
