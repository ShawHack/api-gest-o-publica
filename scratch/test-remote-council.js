const https = require('https');

async function testRemoteCouncilMember() {
  console.log('=== TESTING REMOTE COUNCIL MEMBER API & PERSISTENCE ===');

  const memberPayload = {
    type: 'council_member',
    title: 'Maria da Silva',
    slug: 'maria-da-silva-' + Date.now(),
    summary: 'Representante do setor de meios de hospedagem no Conselho Municipal de Turismo de Ipojuca.',
    body: 'Representante do setor de meios de hospedagem no Conselho Municipal de Turismo de Ipojuca.',
    featured: true,
    status: 'draft',
    contact: {
      email: 'maria.silva@comtur.ipojuca.pe.gov.br',
      phone: '(81) 3552-0000',
      publicEmail: 'maria.silva@comtur.ipojuca.pe.gov.br',
      publicPhone: '(81) 3552-0000'
    },
    metadata: {
      name: 'Maria da Silva',
      displayName: 'Maria da Silva',
      councilRole: 'Presidente',
      role: 'Presidente',
      representationType: 'Titular',
      organization: 'Secretaria Municipal de Turismo',
      entity: 'Secretaria Municipal de Turismo',
      segment: 'Poder Público',
      organizationRole: 'Secretária Executiva',
      termStart: '2026-01-01',
      termEnd: '2028-12-31',
      memberStatus: 'Em exercício',
      isCurrent: true,
      bio: 'Representante do setor de meios de hospedagem no Conselho Municipal de Turismo de Ipojuca.',
      professionalArea: 'Gestão Pública e Turismo',
      tourismExperience: '15 anos de atuação em governança e desenvolvimento regional.',
      publicEmail: 'maria.silva@comtur.ipojuca.pe.gov.br',
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
  };

  const postData = JSON.stringify(memberPayload);

  // Helper request
  function sendReq(path, method, data) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: '10.15.25.28',
        port: 443,
        path,
        method,
        rejectUnauthorized: false,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch(e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      });

      req.on('error', reject);
      if (data) req.write(data);
      req.end();
    });
  }

  // 1. Create member as draft
  console.log('1. Creating member as Draft...');
  const createRes = await sendReq('/api/comtur/admin/content', 'POST', postData);
  console.log('Create status:', createRes.status);
  const createdItem = createRes.data?.data || createRes.data;
  const createdId = createdItem?._id || createdItem?.id;
  console.log('Created member ID:', createdId);

  if (!createdId) {
    console.error('Failed to create member:', createRes);
    return;
  }

  // 2. Fetch created member to verify all fields persisted
  console.log('2. Verifying persistence of all fields...');
  const fetchRes = await sendReq(`/api/comtur/admin/content/${createdId}`, 'GET');
  const fetched = fetchRes.data?.data || fetchRes.data;
  console.log('Fetched Title:', fetched.title);
  console.log('Fetched Role:', fetched.metadata?.councilRole);
  console.log('Fetched RepType:', fetched.metadata?.representationType);
  console.log('Fetched Org:', fetched.metadata?.organization);
  console.log('Fetched Segment:', fetched.metadata?.segment);
  console.log('Fetched Mandate:', fetched.metadata?.termStart, 'to', fetched.metadata?.termEnd);
  console.log('Fetched Photo:', fetched.media?.[0]?.url || fetched.metadata?.photoUrl);
  console.log('Fetched Status:', fetched.status);

  // 3. Update member to Published
  console.log('3. Publishing member...');
  memberPayload.status = 'published';
  memberPayload._id = createdId;
  const updateRes = await sendReq(`/api/comtur/admin/content/${createdId}`, 'PUT', JSON.stringify(memberPayload));
  console.log('Update status:', updateRes.status);

  // 4. Verify in list
  console.log('4. Checking list of council members...');
  const listRes = await sendReq('/api/comtur/admin/content?type=council_member', 'GET');
  const list = Array.isArray(listRes.data) ? listRes.data : (listRes.data?.data || listRes.data?.items || []);
  const inList = list.find(i => (i._id === createdId || i.id === createdId));
  console.log('Found in list:', inList ? 'YES' : 'NO', inList?.title, inList?.metadata?.councilRole, inList?.status);

  console.log('=== TEST COMPLETED SUCCESSFULLY! ===');
}

testRemoteCouncilMember().catch(err => {
  console.error('Test error:', err);
});
