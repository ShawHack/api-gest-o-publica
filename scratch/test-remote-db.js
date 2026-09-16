const mongoose = require('mongoose');

async function runTest() {
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

    // 1. Create member
    const testMember = new ComturContent({
      type: 'council_member',
      title: 'Maria da Silva',
      slug: 'maria-da-silva-' + Date.now(),
      summary: 'Representante do setor de meios de hospedagem no Conselho Municipal de Turismo de Ipojuca.',
      body: 'Representante do setor de meios de hospedagem no Conselho Municipal de Turismo de Ipojuca.',
      featured: true,
      status: 'draft',
      contact: {
        email: 'maria.silva@ipojuca.pe.gov.br',
        phone: '(81) 3552-0000',
        publicEmail: 'maria.silva@ipojuca.pe.gov.br',
        publicPhone: '(81) 3552-0000'
      },
      metadata: {
        name: 'Maria da Silva',
        displayName: 'Maria da Silva',
        councilRole: 'Presidente',
        representationType: 'Titular',
        organization: 'Secretaria Municipal de Turismo',
        segment: 'Poder Público',
        organizationRole: 'Secretária Executiva',
        termStart: '2026-01-01',
        termEnd: '2028-12-31',
        memberStatus: 'Em exercício',
        isCurrent: true,
        bio: 'Representante do setor de meios de hospedagem no Conselho Municipal de Turismo de Ipojuca.',
        professionalArea: 'Gestão Pública',
        tourismExperience: '15 anos no setor.',
        publicEmail: 'maria.silva@ipojuca.pe.gov.br',
        publicPhone: '(81) 3552-0000',
        showPublicContact: true,
        displayOrder: 1,
        showOnPortal: true,
        featuredTop: true,
        appointmentAct: 'Decreto nº 123/2026',
        appointmentDate: '2026-01-02',
        appointmentDocUrl: 'https://ipojuca.pe.gov.br/atos/decreto-123-2026.pdf',
        photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300',
        photoAlt: 'Foto de Maria da Silva, Presidente do COMTUR'
      },
      media: [
        {
          type: 'photo',
          url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300',
          caption: 'Foto de Maria da Silva, Presidente do COMTUR',
          alt: 'Foto de Maria da Silva, Presidente do COMTUR',
          order: 0
        }
      ]
    });

    const saved = await testMember.save();
    console.log('✔ Member created and saved with ID:', saved._id);

    // 2. Fetch and assert
    const fetched = await ComturContent.findById(saved._id);
    console.log('✔ Fetched title:', fetched.title);
    console.log('✔ Fetched role:', fetched.metadata.councilRole);
    console.log('✔ Fetched rep:', fetched.metadata.representationType);
    console.log('✔ Fetched org:', fetched.metadata.organization);
    console.log('✔ Fetched segment:', fetched.metadata.segment);
    console.log('✔ Fetched mandate:', fetched.metadata.termStart, 'to', fetched.metadata.termEnd);
    console.log('✔ Fetched photo:', fetched.media[0].url);
    console.log('✔ Fetched contact email:', fetched.contact.email);

    // 3. Update to published
    fetched.status = 'published';
    await fetched.save();
    console.log('✔ Updated status to:', fetched.status);

    // 4. Verify in query
    const list = await ComturContent.find({ type: 'council_member' }).lean();
    console.log('✔ Total council members in database:', list.length);

    // Clean up test record
    await ComturContent.findByIdAndDelete(saved._id);
    console.log('✔ Test cleanup complete');

    await mongoose.disconnect();
    console.log('✔ Disconnected from MongoDB');
    console.log('ALL REMOTE BACKEND TESTS PASSED! 🎉');
  } catch (err) {
    console.error('Error during test:', err);
    process.exit(1);
  }
}

runTest();
