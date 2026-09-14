const{normalize,canTransition}=require('../../helpers/comtur-content')
describe('transição editorial',()=>{
  test('rascunho pode ir direto para publicado',()=>{
    expect(canTransition('draft','published')).toBe(true)
    expect(canTransition('draft','review')).toBe(true)
    expect(canTransition('review','published')).toBe(true)
    expect(canTransition('published','draft')).toBe(false)
  })
})
describe('conteúdo editorial COMTUR',()=>{
  test('aceita todos os dados de um atrativo',()=>{const r=normalize({type:'attraction',slug:'museu-municipal',title:'Museu Municipal',summary:'Visitação',geo:{lat:-22.2,lng:-49.6},contact:{website:'https://garca.sp.gov.br'},media:[{kind:'image',title:'Fachada',url:'/images/comtur/museu.webp'}]});expect(r.error).toBeUndefined();expect(r.value.geo.lat).toBe(-22.2)});
  test('aceita dados completos e paradas estruturadas de um roteiro',()=>{
    const r = normalize({
      type: 'route',
      slug: 'garca-em-1-dia',
      title: 'Garça em 1 Dia',
      summary: 'Roteiro essencial pelos principais cartões postais de Garça.',
      body: 'Descrição detalhada do roteiro...',
      location: 'Bosque Municipal ➔ Lago Artificial',
      geo: { lat: -22.2134, lng: -49.6543 },
      metadata: {
        routeCategory: 'Natureza e aventura',
        duration: '6 horas',
        distance: 18.5,
        difficulty: 'Fácil',
        transports: ['car', 'walking'],
        targetAudiences: ['families', 'kids'],
        features: ['free', 'pet_friendly'],
        stops: [
          { order: 1, stopType: 'attraction', customName: 'Bosque Municipal', suggestedTime: '09:00', duration: '1h30' },
          { order: 2, stopType: 'gastronomy', customName: 'Almoço Gastronômico', suggestedTime: '12:00', duration: '1h30' },
          { order: 3, stopType: 'attraction', customName: 'Lago Artificial J. K. Williams', suggestedTime: '14:30', duration: '2h' }
        ],
        accessibilityFeatures: ['wheelchair_accessible', 'accessible_restroom'],
        seo: { title: 'Garça em 1 Dia — Portal Oficial', description: 'Visite Garça' }
      }
    });
    expect(r.error).toBeUndefined();
    expect(r.value.type).toBe('route');
    expect(r.value.metadata.stops).toHaveLength(3);
    expect(r.value.metadata.stops[0].customName).toBe('Bosque Municipal');
  });
  test('aceita dados completos de compras (shopping) estruturados',()=>{
    const r = normalize({
      type: 'shopping',
      slug: 'emporio-do-cafe-garca',
      title: 'Empório do Café Garça',
      summary: 'Produtos coloniais, cafés especiais e artesanato típico da região.',
      body: 'Descrição completa da loja e tradição familiar...',
      location: 'Rua Coronel Joaquim Piza, 123, Centro, CEP 17400-000, Garça - SP',
      geo: { lat: -22.2134, lng: -49.6543 },
      contact: { phone: '(14) 3471-0000', email: 'contato@emporiodocafe.com.br', website: 'https://emporiodocafe.com.br' },
      metadata: {
        shoppingCategory: 'Cafés e doces',
        storeCategory: 'Cafés e doces',
        priceRange: '$$',
        paymentMethods: ['cash', 'pix', 'credit_card', 'debit_card'],
        facilities: ['parking', 'delivery', 'wifi'],
        languages: ['pt', 'en'],
        accessibilityFeatures: ['accessible_entrance', 'accessible_restroom'],
        accessibilityNotes: 'Rampa de acesso e corredores amplos.',
        openingHours: {
          monday: { closed: false, p1: '08:00 às 18:00', p2: '' },
          sunday: { closed: true, p1: '', p2: '' }
        },
        whatsapp: '(14) 99999-0000',
        instagram: '@emporiodocafe',
        facebook: 'https://facebook.com/emporiodocafe',
        seo: { title: 'Empório do Café — Onde Comprar em Garça', description: 'Cafés especiais de Garça' }
      }
    });
    expect(r.error).toBeUndefined();
    expect(r.value.type).toBe('shopping');
    expect(r.value.metadata.shoppingCategory).toBe('Cafés e doces');
    expect(r.value.metadata.paymentMethods).toContain('pix');
    expect(r.value.metadata.facilities).toContain('delivery');
    expect(r.value.metadata.languages).toContain('pt');
    expect(r.value.metadata.accessibilityFeatures).toContain('accessible_entrance');
  });
  test('aceita dados completos de serviços comuns, de emergência 24h e de transporte',()=>{
    const rEmergency = normalize({
      type: 'service',
      slug: 'upa-garca-24h',
      title: 'UPA Garça — Unidade de Pronto Atendimento',
      summary: 'Atendimento médico de urgência e emergência 24 horas para munícipes e turistas.',
      body: 'Estrutura completa de pronto socorro...',
      location: '[Próximo à Rodoviária] Rua Faustino, 100, Centro, CEP 17400-000, Garça - SP',
      geo: { lat: -22.2134, lng: -49.6543 },
      contact: { phone: '(14) 3471-0192', email: 'upa@garca.sp.gov.br', website: 'https://garca.sp.gov.br/saude/upa' },
      metadata: {
        serviceCategory: 'Emergência',
        attendanceType: 'Emergencial',
        is24Hours: true,
        isEmergency: true,
        natureOptions: ['free', 'emergency', 'in_person', 'order_of_arrival'],
        facilities: ['parking', 'restroom_accessible', 'waiting_room', 'priority_service'],
        accessibilityFeatures: ['accessible_entrance', 'wheelchair_access', 'accessible_restroom'],
        emergencyInfo: {
          isEmergency: true,
          emergencyNumber: '192',
          emergencyCategory: 'UPA',
          managingBody: 'Secretaria Municipal de Saúde',
          coverageArea: 'Município de Garça e zona rural',
          immediateCare: true
        }
      }
    });
    expect(rEmergency.error).toBeUndefined();
    expect(rEmergency.value.type).toBe('service');
    expect(rEmergency.value.metadata.is24Hours).toBe(true);
    expect(rEmergency.value.metadata.emergencyInfo.emergencyNumber).toBe('192');

    const rTransport = normalize({
      type: 'service',
      slug: 'ponto-de-taxi-matriz',
      title: 'Ponto de Táxi Praça Matriz',
      summary: 'Serviço de táxi 24 horas no centro de Garça com veículos climatizados.',
      metadata: {
        serviceCategory: 'Táxi',
        attendanceType: 'Privado',
        transportInfo: {
          transportType: 'Táxi',
          areaServed: 'Urbana e Rural',
          fare: 'Taxímetro regulamentado',
          hasAccessibility: true,
          acceptsPets: true
        }
      }
    });
    expect(rTransport.error).toBeUndefined();
    expect(rTransport.value.metadata.transportInfo.transportType).toBe('Táxi');
  });
  test('aceita dados completos e estruturados de uma notícia editorial',()=>{
    const rNews = normalize({
      type: 'news',
      slug: 'bosque-das-cerejeiras-florada-2026',
      title: 'Florada das Cerejeiras 2026 atrai milhares de turistas a Garça',
      summary: 'Parque municipal registra recorde de visitantes no primeiro fim de semana do festival.',
      body: 'O Bosque das Cerejeiras de Garça recebeu um público histórico neste fim de semana...\n\nProgramação cultural e gastronomia típica...',
      location: 'Bosque Municipal de Garça',
      featured: true,
      contact: { website: 'https://garca.sp.gov.br' },
      metadata: {
        subtitle: 'Apresentações culturais, praça de alimentação e florada recorde encantam visitantes',
        newsCategory: 'Turismo',
        isMainHeadline: true,
        author: 'Assessoria de Comunicação',
        managingBody: 'Secretaria de Turismo',
        source: 'SEMIT / COMTUR',
        credit: 'Fotos: Secom Garça',
        relatedAttractionId: 'attr_123',
        relatedEventId: 'event_456',
        relatedEntities: ['attr_123', 'event_456', 'gastro_789'],
        coverAlt: 'Cerejeiras em flor com visitantes passeando no bosque',
        coverCredit: 'Foto: Divulgação Secom',
        coverCaption: 'Visitantes aproveitam a florada no Bosque Municipal',
        tags: ['cerejeiras', 'turismo_rural', 'eventos', 'florada 2026'],
        attachments: [
          { title: 'Programação Oficial do Festival', url: '/files/programacao-cerejeiras-2026.pdf', description: 'PDF com horários e palcos' }
        ],
        seo: {
          title: 'Florada das Cerejeiras 2026 em Garça — Portal Oficial de Turismo',
          description: 'Confira as atrações e fotos da florada das cerejeiras em Garça'
        }
      }
    });
    expect(rNews.error).toBeUndefined();
    expect(rNews.value.type).toBe('news');
    expect(rNews.value.metadata.subtitle).toContain('Apresentações');
    expect(rNews.value.metadata.isMainHeadline).toBe(true);
    expect(rNews.value.metadata.tags).toContain('cerejeiras');
    expect(rNews.value.metadata.attachments).toHaveLength(1);
    expect(rNews.value.metadata.relatedEntities).toContain('event_456');
  });
  test('rejeita protocolo e coordenadas perigosas',()=>{expect(normalize({media:[{kind:'link',url:'javascript:alert(1)'}]},true).error).toBe('Mídia inválida');expect(normalize({geo:{lat:100,lng:0}},true).error).toBe('Coordenadas inválidas')});
  test('aceita compras e serviços do catálogo',()=>{expect(normalize({type:'shopping',slug:'feira-municipal',title:'Feira Municipal'}).error).toBeUndefined();expect(normalize({type:'service',slug:'centro-de-informacoes',title:'Centro de Informações'}).error).toBeUndefined()})
  test('filtra catálogo público por tipo, destaque e busca',()=>{
    const{publicContentFilter}=require('../../helpers/comtur-content')
    expect(publicContentFilter({type:'attraction'}).filter).toEqual({status:'published',type:'attraction'})
    expect(publicContentFilter({type:'route'}).filter).toEqual({status:'published',type:'route'})
    expect(publicContentFilter({featured:'true'}).filter.featured).toBe(true)
    expect(publicContentFilter({q:'  jardim  '}).filter.$text).toEqual({$search:'jardim'})
    expect(publicContentFilter({type:'invalido'}).error).toBe('Tipo inválido')
  })
})
