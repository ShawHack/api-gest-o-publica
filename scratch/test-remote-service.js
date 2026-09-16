const https = require('https');

async function testRemoteService() {
  console.log('=== TESTING REMOTE DEPLOYMENT OF SERVIÇOS AO TURISTA ===');

  const postData = JSON.stringify({
    type: 'service',
    title: 'Centro de Atendimento ao Turista - Teste Automatizado',
    slug: 'cat-teste-ipojuca-' + Date.now(),
    summary: 'Central oficial de orientação e suporte ao turista em Ipojuca / Porto de Galinhas.',
    body: 'O CAT disponibiliza atendimento presencial, distribuição de mapas e roteiros turísticos homologados pelo COMTUR.',
    location: 'Praça das Piscinas Naturais, Quiosque Central - Porto de Galinhas - Ipojuca - PE',
    featured: true,
    status: 'published',
    geo: { lat: -8.5032, lng: -35.0061 },
    contact: {
      phone: '(81) 3552-0000',
      secondaryPhone: '(81) 3552-0001',
      whatsapp: '(81) 99999-0000',
      email: 'cat@ipojuca.pe.gov.br',
      website: 'https://turismo.ipojuca.pe.gov.br',
      mainChannel: 'Presencial',
      instagram: '@catturismo',
      facebook: 'facebook.com/catturismo'
    },
    metadata: {
      category: 'Informações Turísticas',
      serviceCategory: 'Informações Turísticas',
      isOfficial: true,
      is24h: false,
      open24h: false,
      touristService: true,
      isEmergency: false,
      noPhysicalAttendance: false,
      address: {
        street: 'Praça das Piscinas Naturais',
        number: 'S/N',
        complement: 'Quiosque Central',
        neighborhood: 'Porto de Galinhas',
        cep: '55590-000',
        city: 'Ipojuca',
        state: 'PE',
        reference: 'Em frente à orla'
      },
      emergency: {
        emergencyPhone: '190',
        onCallPhone: '(81) 99888-0000',
        hasEmergencyAttendance: false,
        has24hOnCall: false
      },
      facilities: ['in_person_service', 'phone_service', 'whatsapp_service', 'wifi', 'parking', 'accessible_restroom'],
      catFeatures: ['tourist_maps', 'brochures', 'attractions_info', 'events_info', 'routes_guidance'],
      accessibility: ['accessible_entrance', 'wheelchair_access', 'ramp_access', 'accessible_restroom'],
      languages: ['pt', 'en', 'es'],
      usefulDocs: [
        { title: 'Guia do Turista 2026', type: 'document', url: 'https://turismo.ipojuca.pe.gov.br/guia2026.pdf', description: 'Edição atualizada' }
      ],
      videoUrl: 'https://youtube.com/watch?v=cat-demo',
      seo: {
        title: 'CAT Porto de Galinhas - Informações Oficiais',
        description: 'Encontre informações sobre praias, passeios e atrativos em Porto de Galinhas.',
        shareText: 'Confira as dicas oficiais do CAT Porto de Galinhas!'
      }
    }
  });

  // 1. Create content via API
  const options = {
    hostname: '10.15.25.28',
    port: 443,
    path: '/api/comtur/admin/content',
    method: 'POST',
    rejectUnauthorized: false,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log('Status code:', res.statusCode);
      try {
        const json = JSON.parse(body);
        console.log('Created item ID:', json._id || json.data?._id || json.id);
        console.log('PASS: Service content item created successfully on remote backend!');
      } catch(e) {
        console.log('Response body:', body.slice(0, 300));
      }
    });
  });

  req.on('error', (e) => {
    console.error('Request error:', e.message);
  });

  req.write(postData);
  req.end();
}

testRemoteService();
