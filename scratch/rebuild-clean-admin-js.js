const fs = require('fs');

const filePath = 'comtur-next/portal/comtur-content-admin.html';
let content = fs.readFileSync(filePath, 'utf8');

// Let's find where the script tag starts and ends
const scriptStartMarker = '<script>';
const scriptEndMarker = '</script>';

const scriptStartIdx = content.indexOf(scriptStartMarker);
const scriptEndIdx = content.lastIndexOf(scriptEndMarker);

if (scriptStartIdx === -1 || scriptEndIdx === -1) {
  console.error('Could not find script tag in admin html');
  process.exit(1);
}

// Let's extract the HTML portion
const htmlPortion = content.substring(0, scriptStartIdx + scriptStartMarker.length);
const closingPortion = content.substring(scriptEndIdx);

// Now let's build the entire, clean JS block
const cleanJs = `
(function() {
  'use strict';

  if (window.SemitSession) {
    SemitSession.restoreSync();
    if (!SemitSession.readAccess() && !SemitSession.readRefresh()) {
      location.replace('/dashboard.html');
    }
  }

  // --- CONFIGURATION OF ALL CATEGORIES ---
  const CONTENT_TYPES = [
    { id: 'event', label: 'Evento', icon: '🎉', listTitle: 'EVENTOS', searchPlaceholder: 'Buscar evento...', newBtnLabel: '+ Novo evento', formNewTitle: 'Novo evento' },
    { id: 'attraction', label: 'Atrativo', icon: '🏛️', listTitle: 'ATRATIVOS', searchPlaceholder: 'Buscar atrativo...', newBtnLabel: '+ Novo atrativo', formNewTitle: 'Novo atrativo turístico' },
    { id: 'gastronomy', label: 'Gastronomia', icon: '🍽️', listTitle: 'ESTABELECIMENTOS', searchPlaceholder: 'Buscar estabelecimento...', newBtnLabel: '+ Novo estabelecimento', formNewTitle: 'Novo estabelecimento gastronômico' },
    { id: 'news', label: 'Notícia', icon: '📰', listTitle: 'NOTÍCIAS', searchPlaceholder: 'Buscar notícia...', newBtnLabel: '+ Nova notícia', formNewTitle: 'Nova notícia' },
    { id: 'lodging', label: 'Hospedagem', icon: '🏨', listTitle: 'HOSPEDAGENS', searchPlaceholder: 'Buscar hospedagem...', newBtnLabel: '+ Nova hospedagem', formNewTitle: 'Nova hospedagem' },
    { id: 'route', label: 'Roteiro', icon: '🗺️', listTitle: 'ROTEIROS', searchPlaceholder: 'Buscar roteiro...', newBtnLabel: '+ Novo roteiro', formNewTitle: 'Novo roteiro' },
    { id: 'shopping', label: 'Compras', icon: '🛍️', listTitle: 'COMÉRCIOS E LOJAS', searchPlaceholder: 'Buscar comércio...', newBtnLabel: '+ Novo comércio', formNewTitle: 'Novo comércio' },
    { id: 'service', label: 'Serviços', icon: '🛠️', listTitle: 'SERVIÇOS AO TURISTA', searchPlaceholder: 'Buscar serviço...', newBtnLabel: '+ Novo serviço', formNewTitle: 'Novo serviço' },
    { id: 'council_member', label: 'Membro do Conselho', icon: '👥', listTitle: 'MEMBROS DO CONSELHO', searchPlaceholder: 'Buscar conselheiro...', newBtnLabel: '+ Novo membro', formNewTitle: 'Novo membro do conselho' },
    { id: 'legislation', label: 'Legislação', icon: '📜', listTitle: 'LEGISLAÇÃO', searchPlaceholder: 'Buscar documento legal...', newBtnLabel: '+ Novo documento', formNewTitle: 'Novo documento de legislação' }
  ];

  const TYPE_ALIASES = {
    'eventos': 'event', 'evento': 'event', 'events': 'event',
    'atrativos': 'attraction', 'atrativo': 'attraction', 'attractions': 'attraction',
    'gastronomia': 'gastronomy', 'restaurante': 'gastronomy', 'restaurantes': 'gastronomy',
    'noticias': 'news', 'noticia': 'news', 'posts': 'news',
    'hospedagem': 'lodging', 'hospedagens': 'lodging', 'hotel': 'lodging', 'hoteis': 'lodging', 'pousada': 'lodging',
    'roteiro': 'route', 'roteiros': 'route', 'routes': 'route',
    'compras': 'shopping', 'artesanato': 'shopping', 'lojas': 'shopping', 'loja': 'shopping', 'comercio': 'shopping',
    'servicos': 'service', 'servico': 'service', 'services': 'service',
    'conselho': 'council_member', 'conselheiro': 'council_member', 'conselheiros': 'council_member', 'membros': 'council_member', 'membro': 'council_member', 'council_member': 'council_member', 'council_members': 'council_member',
    'legislacao': 'legislation', 'legislation': 'legislation', 'documento': 'legislation', 'documentos': 'legislation', 'leis': 'legislation', 'lei': 'legislation'
  };

  // --- AMENITIES & FEATURES CONSTANTS ---
  const GASTRO_AMENITIES = [
    { id: 'wifi', label: 'Wi-Fi gratuito', icon: '📶' },
    { id: 'parking', label: 'Estacionamento', icon: '🚗' },
    { id: 'outdoor_seating', label: 'Área externa / Ar livre', icon: '🌳' },
    { id: 'ac', label: 'Ar-condicionado', icon: '❄️' },
    { id: 'pet_friendly', label: 'Pet Friendly', icon: '🐾' },
    { id: 'kids_area', label: 'Espaço Kids / Brinquedoteca', icon: '🧸' },
    { id: 'live_music', label: 'Música ao vivo', icon: '🎵' },
    { id: 'bar', label: 'Bar completo / Drinks', icon: '🍸' },
    { id: 'craft_beer', label: 'Cervejas artesanais / Chopp', icon: '🍺' },
    { id: 'wine_list', label: 'Carta de vinhos', icon: '🍷' },
    { id: 'delivery', label: 'Delivery / Entrega', icon: '🛵' },
    { id: 'takeout', label: 'Retirada no balcão', icon: '🥡' },
    { id: 'reservations', label: 'Aceita reservas', icon: '📅' },
    { id: 'scenic_view', label: 'Vista panorâmica / Beira-mar', icon: '🌅' },
    { id: 'tv_sports', label: 'Transmissão de esportes / TV', icon: '📺' },
    { id: 'air_purifier', label: 'Ambiente climatizado', icon: '🌬️' }
  ];

  const GASTRO_DIETARY = [
    { id: 'vegetarian', label: 'Opções vegetarianas', icon: '🥗' },
    { id: 'vegan', label: 'Opções veganas', icon: '🌱' },
    { id: 'gluten_free', label: 'Opções sem glúten', icon: '🌾' },
    { id: 'lactose_free', label: 'Opções sem lactose', icon: '🥛' },
    { id: 'organic', label: 'Ingredientes orgânicos / Locais', icon: '🥕' },
    { id: 'kids_menu', label: 'Menu infantil (Kids)', icon: '👶' },
    { id: 'fit_healthy', label: 'Pratos Fit / Saudáveis', icon: '🥑' },
    { id: 'zero_sugar', label: 'Sobremesas sem açúcar', icon: '🍏' }
  ];

  const GASTRO_ACCESSIBILITY = [
    { id: 'wheelchair_entrance', label: 'Entrada acessível / Rampa', icon: '♿' },
    { id: 'accessible_restroom', label: 'Banheiro adaptado PCD', icon: '🚻' },
    { id: 'accessible_parking', label: 'Vaga de estacionamento PCD', icon: '🅿️' },
    { id: 'wide_doors', label: 'Circulação ampla entre mesas', icon: '🚪' },
    { id: 'braille_menu', label: 'Cardápio em Braille / QR acessível', icon: '📱' },
    { id: 'libras_staff', label: 'Atendimento em Libras', icon: '👐' },
    { id: 'guide_dog', label: 'Permite Cão-Guia', icon: '🐕' }
  ];

  const GASTRO_PAYMENT = [
    { id: 'pix', label: 'Pix', icon: '💠' },
    { id: 'credit_visa', label: 'Visa', icon: '💳' },
    { id: 'credit_master', label: 'Mastercard', icon: '💳' },
    { id: 'credit_elo', label: 'Elo', icon: '💳' },
    { id: 'credit_amex', label: 'American Express', icon: '💳' },
    { id: 'credit_hiper', label: 'Hipercard', icon: '💳' },
    { id: 'debit', label: 'Cartão de Débito', icon: '💳' },
    { id: 'cash', label: 'Dinheiro', icon: '💵' },
    { id: 'meal_ticket', label: 'Vale-Refeição (VR / Sodexo / Ticket / Alelo)', icon: '🍽️' },
    { id: 'contactless', label: 'Pagamento por aproximação (NFC)', icon: '📲' }
  ];

  const GASTRO_LANGUAGES = [
    { id: 'pt', label: 'Português', icon: '🇧🇷' },
    { id: 'en', label: 'Inglês', icon: '🇺🇸' },
    { id: 'es', label: 'Espanhol', icon: '🇪🇸' },
    { id: 'fr', label: 'Francês', icon: '🇫🇷' },
    { id: 'it', label: 'Italiano', icon: '🇮🇹' },
    { id: 'de', label: 'Alemão', icon: '🇩🇪' },
    { id: 'libras', label: 'Libras', icon: '👐' }
  ];

  const ATTRACTION_PROFILES = [
    { id: 'family', label: 'Família', icon: '👨‍👩‍👧‍👦' },
    { id: 'couples', label: 'Casais / Romântico', icon: '💑' },
    { id: 'kids', label: 'Crianças / Infantil', icon: '🧸' },
    { id: 'elderly', label: 'Terceira idade / Sênior', icon: '👴' },
    { id: 'youth', label: 'Jovens / Amigos', icon: '🎉' },
    { id: 'nature_lovers', label: 'Ecoturismo / Aventureiros', icon: '🧗' },
    { id: 'culture_lovers', label: 'Cultura / História', icon: '🏛️' },
    { id: 'tourists', label: 'Turistas', icon: '🏖️' },
    { id: 'locals', label: 'Moradores locais', icon: '🏡' },
    { id: 'solo', label: 'Viajantes solo', icon: '🎒' },
    { id: 'pcd', label: 'Pessoas com deficiência', icon: '♿' },
    { id: 'pets', label: 'Tutores de Pets', icon: '🐾' }
  ];

  const ATTRACTION_FEATURES = [
    { id: 'parking', label: 'Estacionamento', icon: '🚗' },
    { id: 'restroom', label: 'Sanitários / Banheiros', icon: '🚻' },
    { id: 'drinking_water', label: 'Bebedouro de água', icon: '🚰' },
    { id: 'visitor_center', label: 'Centro de atendimento ao turista (CAT)', icon: 'ℹ️' },
    { id: 'guided_tour', label: 'Visitas guiadas / Monitores', icon: '🧑‍🏫' },
    { id: 'audio_guide', label: 'Audioguia / QR Code informativo', icon: '🎧' },
    { id: 'souvenir_shop', label: 'Loja de lembranças / Artesanato', icon: '🛍️' },
    { id: 'restaurant', label: 'Restaurante / Lanchonete', icon: '🍽️' },
    { id: 'picnic_area', label: 'Área para piquenique', icon: '🧺' },
    { id: 'kids_area', label: 'Playground / Espaço Infantil', icon: '🧸' },
    { id: 'wifi', label: 'Wi-Fi gratuito', icon: '📶' },
    { id: 'photo_spot', label: 'Mirante / Ponto instagramável', icon: '📸' },
    { id: 'scenic_view', label: 'Vista panorâmica', icon: '🌅' },
    { id: 'shuttle', label: 'Transporte interno / Trenzinho', icon: '🛺' },
    { id: 'first_aid', label: 'Posto de primeiros socorros', icon: '🩺' },
    { id: 'lockers', label: 'Guarda-volumes', icon: '🧳' }
  ];

  const ATTRACTION_ACCESSIBILITY = [
    { id: 'accessible_entrance', label: 'Entrada acessível / Rampas', icon: '♿' },
    { id: 'wheelchair_trails', label: 'Trilhas e passarelas acessíveis', icon: '🧑‍🦽' },
    { id: 'accessible_restroom', label: 'Banheiro adaptado PCD', icon: '🚻' },
    { id: 'accessible_parking', label: 'Vagas de estacionamento PCD', icon: '🚗' },
    { id: 'tactile_paving', label: 'Piso tátil', icon: '🦯' },
    { id: 'tactile_maps', label: 'Maquetes táteis / Mapas táteis', icon: '🗺️' },
    { id: 'braille_signage', label: 'Sinalização em Braille', icon: '🪧' },
    { id: 'libras_guide', label: 'Guia ou intérprete de Libras', icon: '👐' },
    { id: 'audio_description', label: 'Audiodescrição disponível', icon: '👁️' },
    { id: 'quiet_space', label: 'Espaço calmo (TEA / Neurodivergência)', icon: '🧩' },
    { id: 'guide_dog', label: 'Permite cão-guia', icon: '🐕' }
  ];

  const ATTRACTION_RESTRICTIONS = [
    { id: 'no_smoking', label: 'Proibido fumar', icon: '🚭' },
    { id: 'no_pets', label: 'Não permite animais (exceto cão-guia)', icon: '🚫🐕' },
    { id: 'no_flash_photos', label: 'Proibido fotos com flash', icon: '📷🚫' },
    { id: 'no_commercial_filming', label: 'Proibida filmagem comercial sem autorização', icon: '🎬🚫' },
    { id: 'no_food_drink', label: 'Proibido entrar com alimentos/bebidas', icon: '🍔🚫' },
    { id: 'no_alcohol', label: 'Proibido consumo de bebidas alcoólicas', icon: '🍺🚫' },
    { id: 'no_drones', label: 'Proibido uso de drones', icon: '🚁🚫' },
    { id: 'no_loud_speakers', label: 'Proibido caixas de som / Som alto', icon: '🔊🚫' },
    { id: 'age_limit', label: 'Classificação etária mínima', icon: '🔞' },
    { id: 'height_limit', label: 'Restrição de altura mínima/máxima', icon: '📏' },
    { id: 'dress_code', label: 'Código de vestimenta (ex.: templos, igrejas)', icon: '👔' },
    { id: 'footwear_required', label: 'Obrigatório calçado fechado (trilhas/grutas)', icon: '👟' },
    { id: 'health_restriction', label: 'Não recomendado p/ gestantes ou cardíacos', icon: '⚠️' }
  ];

  const ATTRACTION_PAYMENT = [
    { id: 'pix', label: 'Pix', icon: '💠' },
    { id: 'credit_card', label: 'Cartão de Crédito', icon: '💳' },
    { id: 'debit_card', label: 'Cartão de Débito', icon: '💳' },
    { id: 'cash', label: 'Dinheiro', icon: '💵' },
    { id: 'online_ticket', label: 'Venda online antecipada', icon: '🎟️' },
    { id: 'student_discount', label: 'Meia-entrada (Estudantes / Idosos / Professores)', icon: '🏷️' },
    { id: 'free_admission', label: 'Entrada Gratuita', icon: '🆓' }
  ];

  const EVENT_AUDIENCES = [
    { id: 'general', label: 'Público Geral', icon: '👥' },
    { id: 'family', label: 'Famílias', icon: '👨‍👩‍👧‍👦' },
    { id: 'kids', label: 'Crianças / Infantil', icon: '🧸' },
    { id: 'youth', label: 'Jovens / Universitários', icon: '🎉' },
    { id: 'elderly', label: 'Melhor Idade / Idosos', icon: '👴' },
    { id: 'tourists', label: 'Turistas', icon: '🏖️' },
    { id: 'professionals', label: 'Profissionais / Negócios', icon: '💼' },
    { id: 'reduced_mobility', label: 'Pessoas com deficiência', icon: '♿' }
  ];

  const EVENT_FEATURES = [
    { id: 'parking', label: 'Estacionamento', icon: '🚗' },
    { id: 'restroom', label: 'Sanitários / Banheiros', icon: '🚻' },
    { id: 'accessible_restroom', label: 'Banheiro acessível PCD', icon: '♿' },
    { id: 'food_area', label: 'Área de alimentação', icon: '🍔' },
    { id: 'food_court', label: 'Praça de alimentação', icon: '🍽️' },
    { id: 'drinking_water', label: 'Bebedouro', icon: '🚰' },
    { id: 'wifi', label: 'Wi-Fi público', icon: '📶' },
    { id: 'covered_area', label: 'Área coberta / Tendas', icon: '⛺' },
    { id: 'security', label: 'Segurança no local', icon: '🛡️' },
    { id: 'medical_service', label: 'Posto médico', icon: '🩺' },
    { id: 'ambulance', label: 'Ambulância de plantão', icon: '🚑' },
    { id: 'kids_area', label: 'Espaço Kids', icon: '🧸' },
    { id: 'baby_changing', label: 'Fraldário', icon: '🍼' },
    { id: 'bike_rack', label: 'Bicicletário', icon: '🚲' },
    { id: 'special_transport', label: 'Transporte especial', icon: '🚌' },
    { id: 'taxi_stand', label: 'Ponto de táxi / Uber', icon: '🚖' },
    { id: 'pcd_area', label: 'Área reservada PCD', icon: '♿' },
    { id: 'guide_dog', label: 'Permite cão-guia', icon: '🐕' }
  ];

  const EVENT_ACCESSIBILITY = [
    { id: 'accessible_entrance', label: 'Entrada acessível / Rampa', icon: '♿' },
    { id: 'wheelchair_access', label: 'Acesso para cadeirantes', icon: '🧑‍🦽' },
    { id: 'accessible_parking', label: 'Vagas de estacionamento PCD', icon: '🚗' },
    { id: 'accessible_restroom', label: 'Banheiro adaptado PCD', icon: '🚻' },
    { id: 'tactile_paving', label: 'Piso tátil / Rota acessível', icon: '🦯' },
    { id: 'tactile_signage', label: 'Sinalização tátil / Braille', icon: '🪧' },
    { id: 'libras_interpreter', label: 'Intérprete de Libras', icon: '👐' },
    { id: 'subtitles', label: 'Legendas / Closed Caption', icon: '💬' },
    { id: 'hearing_support', label: 'Recursos p/ deficiência auditiva', icon: '🧏' },
    { id: 'visual_support', label: 'Recursos p/ deficiência visual', icon: '👁️' },
    { id: 'pcd_reserved_area', label: 'Área reservada em frente ao palco', icon: '⭐' },
    { id: 'guide_dog', label: 'Permite Cão-Guia', icon: '🐕' }
  ];

  const LODGING_FEATURES = [
    { id: 'wifi', label: 'Wi-Fi gratuito', icon: '📶' },
    { id: 'parking', label: 'Estacionamento', icon: '🚗' },
    { id: 'parking_free', label: 'Estacionamento gratuito', icon: '🅿️' },
    { id: 'air_conditioning', label: 'Ar-condicionado', icon: '❄️' },
    { id: 'pool', label: 'Piscina', icon: '🏊' },
    { id: 'pool_heated', label: 'Piscina aquecida', icon: '♨️' },
    { id: 'gym', label: 'Academia', icon: '🏋️' },
    { id: 'sauna_spa', label: 'Sauna / Spa', icon: '🧖' },
    { id: 'restaurant', label: 'Restaurante', icon: '🍽️' },
    { id: 'bar_lounge', label: 'Bar / Lounge', icon: '🍸' },
    { id: 'leisure_area', label: 'Área de lazer', icon: '🌴' },
    { id: 'garden', label: 'Área verde / Jardim', icon: '🌳' },
    { id: 'playground', label: 'Playground / Espaço Kids', icon: '🧸' },
    { id: 'games_room', label: 'Salão de jogos', icon: '🎱' },
    { id: 'laundry', label: 'Lavanderia', icon: '🧺' },
    { id: 'elevator', label: 'Elevador', icon: '🛗' },
    { id: 'bike_rack', label: 'Bicicletário', icon: '🚲' },
    { id: 'pet_friendly', label: 'Pet Friendly', icon: '🐾' },
    { id: 'coworking', label: 'Espaço para trabalho', icon: '💻' },
    { id: 'events_hall', label: 'Salão de eventos', icon: '🎪' },
    { id: 'luggage_storage', label: 'Guarda-volumes', icon: '🧳' },
    { id: 'ev_charger', label: 'Recarga para veículo elétrico', icon: '🔌' }
  ];

  const LODGING_SERVICES = [
    { id: 'breakfast', label: 'Café da manhã', icon: '☕' },
    { id: 'daily_housekeeping', label: 'Limpeza diária', icon: '🧹' },
    { id: 'room_service', label: 'Room Service', icon: '🛎️' },
    { id: 'laundry_service', label: 'Lavanderia', icon: '🧺' },
    { id: 'ironing_service', label: 'Passadoria', icon: '👔' },
    { id: 'concierge', label: 'Recepção / Concierge', icon: '🤵' },
    { id: 'luggage_storage', label: 'Guarda-volumes', icon: '🧳' },
    { id: 'transfer', label: 'Transfer', icon: '🚐' },
    { id: 'taxi_call', label: 'Chamada de táxi', icon: '🚖' },
    { id: 'tourist_info', label: 'Informações turísticas', icon: 'ℹ️' },
    { id: 'baby_crib', label: 'Berço disponível', icon: '👶' },
    { id: 'extra_bed', label: 'Cama extra', icon: '🛏️' },
    { id: 'multilingual_staff', label: 'Atendimento em outros idiomas', icon: '🌐' },
    { id: 'tour_booking', label: 'Reserva de passeios', icon: '🎫' }
  ];

  const LODGING_MEAL_TYPES = [
    { id: 'breakfast', label: 'Café da manhã', icon: '☕' },
    { id: 'lunch', label: 'Almoço', icon: '🍽️' },
    { id: 'dinner', label: 'Jantar', icon: '🍷' },
    { id: 'snacks', label: 'Lanches', icon: '🥪' },
    { id: 'bar_drinks', label: 'Bar / Drinks', icon: '🍸' }
  ];

  const LODGING_DIETARY_OPTIONS = [
    { id: 'vegetarian', label: 'Vegetariano', icon: '🥗' },
    { id: 'vegan', label: 'Vegano', icon: '🌱' },
    { id: 'gluten_free', label: 'Sem glúten', icon: '🌾' },
    { id: 'lactose_free', label: 'Sem lactose', icon: '🥛' }
  ];

  const LODGING_ACCESSIBILITY = [
    { id: 'accessible_entrance', label: 'Entrada acessível', icon: '♿' },
    { id: 'wheelchair_access', label: 'Acesso para cadeira de rodas', icon: '🧑‍🦽' },
    { id: 'ramp_access', label: 'Rampa', icon: '📐' },
    { id: 'accessible_elevator', label: 'Elevador acessível', icon: '🛗' },
    { id: 'accessible_parking', label: 'Vaga PCD', icon: '🚗' },
    { id: 'accessible_room', label: 'Quarto acessível', icon: '🛏️' },
    { id: 'accessible_restroom', label: 'Banheiro acessível', icon: '🚻' },
    { id: 'grab_bars', label: 'Barras de apoio', icon: '🦾' },
    { id: 'tactile_paving', label: 'Piso tátil', icon: '🦯' },
    { id: 'tactile_signage', label: 'Sinalização tátil', icon: '🪧' },
    { id: 'braille_signage', label: 'Braille', icon: '⠃' },
    { id: 'visual_support', label: 'Recursos para deficiência visual', icon: '👁️' },
    { id: 'hearing_support', label: 'Recursos para deficiência auditiva', icon: '🧏' },
    { id: 'guide_dog', label: 'Cão-guia permitido', icon: '🐕' }
  ];

  const LODGING_PAYMENT_METHODS = [
    { id: 'pix', label: 'Pix', icon: '💠' },
    { id: 'credit_card', label: 'Cartão de Crédito', icon: '💳' },
    { id: 'debit_card', label: 'Cartão de Débito', icon: '💳' },
    { id: 'cash', label: 'Dinheiro', icon: '💵' },
    { id: 'bank_transfer', label: 'Transferência bancária', icon: '🏦' },
    { id: 'online_payment', label: 'Pagamento online', icon: '🌐' }
  ];

  const LODGING_ROOM_AMENITIES = [
    { id: 'wifi', label: 'Wi-Fi', icon: '📶' },
    { id: 'ac', label: 'Ar-condicionado', icon: '❄️' },
    { id: 'fan', label: 'Ventilador', icon: '🌀' },
    { id: 'tv', label: 'TV', icon: '📺' },
    { id: 'smart_tv', label: 'Smart TV', icon: '🖥️' },
    { id: 'minibar', label: 'Frigobar', icon: '🧊' },
    { id: 'microwave', label: 'Micro-ondas', icon: '🍿' },
    { id: 'kitchen', label: 'Cozinha', icon: '🍳' },
    { id: 'safe', label: 'Cofre', icon: '🔒' },
    { id: 'phone', label: 'Telefone', icon: '📞' },
    { id: 'desk', label: 'Mesa de trabalho', icon: '💼' },
    { id: 'wardrobe', label: 'Guarda-roupa', icon: '🚪' },
    { id: 'hairdryer', label: 'Secador de cabelo', icon: '💨' },
    { id: 'bed_linen', label: 'Roupa de cama', icon: '🛏️' },
    { id: 'towels', label: 'Toalhas', icon: '🧖' },
    { id: 'private_bathroom', label: 'Banheiro privativo', icon: '🚿' }
  ];

  const ROUTE_AUDIENCES = [
    { id: 'family', label: 'Família', icon: '👨‍👩‍👧‍👦' },
    { id: 'couples', label: 'Casais / Romântico', icon: '💑' },
    { id: 'kids', label: 'Crianças / Infantil', icon: '🧸' },
    { id: 'elderly', label: 'Melhor Idade / Idosos', icon: '👴' },
    { id: 'youth', label: 'Jovens / Amigos', icon: '🎉' },
    { id: 'nature_lovers', label: 'Ecoturismo / Aventura', icon: '🧗' },
    { id: 'culture_lovers', label: 'Cultura / História', icon: '🏛️' },
    { id: 'tourists', label: 'Turistas', icon: '🏖️' },
    { id: 'locals', label: 'Moradores locais', icon: '🏡' },
    { id: 'cyclists', label: 'Ciclistas / Cicloturismo', icon: '🚲' }
  ];

  const ROUTE_SEASONS = [
    { id: 'all_year', label: 'Ano todo / Qualquer época', icon: '☀️' },
    { id: 'summer', label: 'Verão', icon: '🏖️' },
    { id: 'winter', label: 'Inverno / Chuvas', icon: '🌧️' },
    { id: 'spring', label: 'Primavera', icon: '🌸' },
    { id: 'autumn', label: 'Outono', icon: '🍂' },
    { id: 'dry_season', label: 'Estação Seca', icon: '🏜️' },
    { id: 'weekends', label: 'Fins de semana / Feriados', icon: '🗓️' }
  ];

  const ROUTE_ACCESSIBILITY = [
    { id: 'wheelchair_accessible', label: 'Totalmente acessível para cadeirantes', icon: '♿' },
    { id: 'partially_accessible', label: 'Parcialmente acessível', icon: '🧑‍🦽' },
    { id: 'paved_trail', label: 'Trilha pavimentada / Plana', icon: '🛤️' },
    { id: 'dirt_trail', label: 'Trilha de terra batida', icon: '🥾' },
    { id: 'steep_terrain', label: 'Terreno íngreme / Escadarias', icon: '⛰️' },
    { id: 'braille_signage', label: 'Sinalização em Braille ao longo da rota', icon: '🪧' },
    { id: 'audio_guide', label: 'Audioguia disponível', icon: '🎧' },
    { id: 'guide_dog', label: 'Permite Cão-Guia', icon: '🐕' }
  ];

  const SHOP_PRODUCTS = [
    { id: 'handicraft', label: 'Artesanato local', icon: '🎨' },
    { id: 'souvenirs', label: 'Lembrancinhas / Souvenirs', icon: '🎁' },
    { id: 'clothing', label: 'Roupas / Moda praia', icon: '👗' },
    { id: 'food_products', label: 'Doces, queijos e alimentos regionais', icon: '🧀' },
    { id: 'drinks', label: 'Bebidas artesanais / Cachaças', icon: '🍶' },
    { id: 'accessories', label: 'Bijuterias / Acessórios', icon: '💍' },
    { id: 'art_decor', label: 'Obras de arte / Decoração', icon: '🖼️' },
    { id: 'books', label: 'Livros e guias regionais', icon: '📚' }
  ];

  const SHOP_PAYMENT = [
    { id: 'pix', label: 'Pix', icon: '💠' },
    { id: 'credit_card', label: 'Cartão de Crédito', icon: '💳' },
    { id: 'debit_card', label: 'Cartão de Débito', icon: '💳' },
    { id: 'cash', label: 'Dinheiro', icon: '💵' },
    { id: 'installments', label: 'Parcelamento sem juros', icon: '🏷️' }
  ];

  const SHOP_ACCESSIBILITY = [
    { id: 'accessible_entrance', label: 'Entrada acessível / Rampa', icon: '♿' },
    { id: 'wide_aisles', label: 'Corredores amplos', icon: '🚪' },
    { id: 'accessible_restroom', label: 'Banheiro adaptado PCD', icon: '🚻' },
    { id: 'accessible_parking', label: 'Vaga de estacionamento PCD', icon: '🅿️' },
    { id: 'guide_dog', label: 'Permite Cão-Guia', icon: '🐕' }
  ];

  const SVC_SECURITY_FEATURES = [
    { id: 'emergency_24h', label: 'Emergência 24 horas', icon: '🚨' },
    { id: 'in_person_attendance', label: 'Atendimento presencial', icon: '👮' },
    { id: 'phone_attendance', label: 'Atendimento telefônico', icon: '📞' },
    { id: 'tourist_support', label: 'Apoio ao turista', icon: 'ℹ️' }
  ];

  const SVC_BANKING_FEATURES = [
    { id: 'atm', label: 'Caixa eletrônico', icon: '🏧' },
    { id: 'withdrawal', label: 'Saque', icon: '💵' },
    { id: 'deposit', label: 'Depósito', icon: '📥' },
    { id: 'in_person_teller', label: 'Atendimento presencial', icon: '🧑‍💼' },
    { id: 'atm_24h', label: 'Caixa 24 horas', icon: '🕐' },
    { id: 'accessible_atm', label: 'Acessível', icon: '♿' }
  ];

  const SVC_GAS_FEATURES = [
    { id: 'gasoline', label: 'Gasolina', icon: '⛽' },
    { id: 'ethanol', label: 'Etanol', icon: '🌽' },
    { id: 'diesel', label: 'Diesel', icon: '🚛' },
    { id: 'gnv', label: 'GNV', icon: '💨' },
    { id: 'convenience_store', label: 'Loja de conveniência', icon: '🏪' },
    { id: 'tire_inflation', label: 'Calibrador', icon: '💨' },
    { id: 'restroom', label: 'Banheiro', icon: '🚻' },
    { id: 'gas_24h', label: 'Atendimento 24 horas', icon: '🕐' },
    { id: 'ev_charging', label: 'Recarga de veículo elétrico', icon: '⚡' }
  ];

  const SVC_ACCESSIBILITY = [
    { id: 'accessible_entrance', label: 'Entrada acessível', icon: '🚪' },
    { id: 'wheelchair_access', label: 'Acesso para cadeira de rodas', icon: '🧑‍🦽' },
    { id: 'ramp_access', label: 'Rampa de acesso', icon: '📐' },
    { id: 'accessible_parking', label: 'Vaga PCD', icon: '🅿️' },
    { id: 'accessible_restroom', label: 'Banheiro acessível', icon: '🚻' },
    { id: 'accessible_elevator', label: 'Elevador acessível', icon: '🛗' },
    { id: 'tactile_paving', label: 'Piso tátil', icon: '🦯' },
    { id: 'tactile_signage', label: 'Sinalização tátil', icon: '🪧' },
    { id: 'braille_signage', label: 'Sinalização em Braille', icon: '⠃' },
    { id: 'visual_support', label: 'Recursos para deficiência visual', icon: '👁️' },
    { id: 'hearing_support', label: 'Recursos para deficiência auditiva', icon: '🧏' },
    { id: 'guide_dog', label: 'Cão-guia permitido', icon: '🐕' },
    { id: 'priority_service', label: 'Atendimento prioritário', icon: '⭐' }
  ];

  const SVC_LANGUAGES = [
    { id: 'pt', label: 'Português', icon: '🇧🇷' },
    { id: 'en', label: 'Inglês', icon: '🇺🇸' },
    { id: 'es', label: 'Espanhol', icon: '🇪🇸' },
    { id: 'libras', label: 'Libras', icon: '👐' },
    { id: 'other', label: 'Outros', icon: '🌐' }
  ];

  const DAYS_OF_WEEK = [
    { id: 'monday', label: 'Segunda-feira' },
    { id: 'tuesday', label: 'Terça-feira' },
    { id: 'wednesday', label: 'Quarta-feira' },
    { id: 'thursday', label: 'Quinta-feira' },
    { id: 'friday', label: 'Sexta-feira' },
    { id: 'saturday', label: 'Sábado' },
    { id: 'sunday', label: 'Domingo' },
    { id: 'holidays', label: 'Feriados' }
  ];

  const STATUS_LABELS = {
    draft: 'Rascunho',
    review: 'Em revisão',
    published: 'Publicado',
    archived: 'Arquivado'
  };

  // --- STATE ---
  let currentType = 'event';
  let allItems = [];
  
  // Media state for Gastronomy
  let gastroMedia = [];
  let gastroCoverUrl = '';

  // Media state for Attraction
  let attractionMedia = [];
  let attractionCoverUrl = '';

  // State for Event
  let eventMedia = [];
  let eventCoverUrl = '';
  let eventSchedule = [];
  let eventDates = [];
  let eventDocs = [];

  // State for Lodging
  let lodgingMedia = [];
  let lodgingCoverUrl = '';
  let lodgingRooms = [];

  // State for Route
  let routeMedia = [];
  let routeCoverUrl = '';
  let routeStops = [];

  // State for Shopping
  let shopMedia = [];
  let shopCoverUrl = '';

  // State for Service
  let svcMedia = [];
  let svcCoverUrl = '';
  let svcUsefulDocs = [];

  // State for Council Member
  let councilPhotoUrl = '';

  // State for Legislation
  let legisPdfFile = null;

  const $ = (id) => document.getElementById(id);

  function normalizeType(t) {
    if (!t) return 'event';
    const lower = String(t).toLowerCase().trim();
    if (TYPE_ALIASES[lower]) return TYPE_ALIASES[lower];
    const exists = CONTENT_TYPES.find(c => c.id === lower);
    return exists ? exists.id : 'event';
  }

  function slugify(text) {
    return String(text || '')
      .normalize('NFD')
      .replace(/[\\u0300-\\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 150);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function showNotice(msg, isError = false) {
    const el = $('notice');
    if (!el) return;
    el.textContent = msg;
    el.className = 'comtur-notice' + (isError ? ' is-error' : '');
    el.style.display = 'block';
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setTimeout(() => { el.style.display = 'none'; }, 6000);
  }

  window.toggleCollapse = function(bodyId, iconId) {
    const body = $(bodyId);
    const icon = $(iconId);
    if (!body) return;
    const isHidden = body.style.display === 'none';
    body.style.display = isHidden ? 'block' : 'none';
    if (icon) icon.textContent = isHidden ? '▲ Recolher' : '▼ Expandir';
  };

  // --- CHIPS RENDERING ---
  function renderChips(containerId, options, selected = [], onChange = null) {
    const el = typeof containerId === 'string' ? $(containerId) : containerId;
    if (!el) return;
    const selSet = new Set(selected || []);
    el.innerHTML = options.map(opt => {
      const isChecked = selSet.has(opt.id);
      return \`
        <label class="comtur-chip-btn \${isChecked ? 'is-checked' : ''}">
          <input type="checkbox" value="\${opt.id}" \${isChecked ? 'checked' : ''}>
          <span>\${opt.icon ? opt.icon + ' ' : ''}\${opt.label}</span>
        </label>
      \`;
    }).join('');

    el.querySelectorAll('input[type="checkbox"]').forEach(chk => {
      chk.onchange = () => {
        const chip = chk.closest('.comtur-chip-btn');
        if (chk.checked) chip.classList.add('is-checked');
        else chip.classList.remove('is-checked');
        if (typeof onChange === 'function') {
          onChange(chk.value, chk.checked);
        }
      };
    });
  }

  function getSelectedChips(containerId) {
    const el = $(containerId);
    if (!el) return [];
    return Array.from(el.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.value);
  }

  // --- RELATED ENTITIES LIST ---
  function renderRelatedEntities(containerId, selectedIds = []) {
    const container = $(containerId);
    if (!container) return;
    const selSet = new Set(selectedIds || []);
    const available = allItems.filter(i => ['attraction', 'event', 'route', 'gastronomy', 'lodging', 'service', 'news'].includes(i.type) && i._id !== $('id').value);

    if (!available.length) {
      container.innerHTML = '<div class="comtur-hint" style="grid-column: 1/-1; padding: 6px;">Nenhuma entidade cadastrada para vincular.</div>';
      return;
    }

    const typeIcons = { attraction: '🏛️ Atrativo', event: '🎉 Evento', route: '🗺️ Roteiro', gastronomy: '🍽️ Gastro', lodging: '🏨 Hospedagem', service: '🛠️ Serviço', news: '📰 Notícia' };

    container.innerHTML = available.map(item => {
      const isChecked = selSet.has(item._id);
      const label = \`[\${typeIcons[item.type] || item.type}] \${item.title || 'Sem título'}\`;
      return \`
        <label class="comtur-chip-btn \${isChecked ? 'is-checked' : ''}" style="font-size: 0.78rem;">
          <input type="checkbox" value="\${item._id}" \${isChecked ? 'checked' : ''}>
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">\${label}</span>
        </label>
      \`;
    }).join('');

    container.querySelectorAll('input[type="checkbox"]').forEach(chk => {
      chk.onchange = () => {
        const chip = chk.closest('.comtur-chip-btn');
        if (chk.checked) chip.classList.add('is-checked');
        else chip.classList.remove('is-checked');
      };
    });
  }

  // --- HOURS TABLE ---
  function renderHoursTable(openingHours = {}, containerId = 'gastroHoursTable') {
    const el = $(containerId);
    if (!el) return;
    el.innerHTML = DAYS_OF_WEEK.map(d => {
      const dayData = openingHours[d.id] || { closed: false, open: '08:00', close: '18:00', open2: '', close2: '' };
      return \`
        <div class="hours-row \${dayData.closed ? 'is-closed' : ''}" data-day="\${d.id}">
          <div class="hours-day">\${d.label}</div>
          <label class="hours-closed-toggle">
            <input type="checkbox" class="hours-closed-chk" \${dayData.closed ? 'checked' : ''}>
            <span>Fechado</span>
          </label>
          <div class="hours-inputs" style="display: flex; gap: 6px; align-items: center;">
            <input type="text" class="hours-open" placeholder="08:00" value="\${dayData.open || ''}" style="width: 68px;">
            <span>às</span>
            <input type="text" class="hours-close" placeholder="18:00" value="\${dayData.close || ''}" style="width: 68px;">
          </div>
          <div class="hours-inputs" style="display: flex; gap: 6px; align-items: center;">
            <input type="text" class="hours-open2" placeholder="Opcional" value="\${dayData.open2 || ''}" style="width: 68px;">
            <span>às</span>
            <input type="text" class="hours-close2" placeholder="Opcional" value="\${dayData.close2 || ''}" style="width: 68px;">
          </div>
        </div>
      \`;
    }).join('');

    el.querySelectorAll('.hours-closed-chk').forEach(chk => {
      chk.onchange = () => {
        const row = chk.closest('.hours-row');
        if (chk.checked) row.classList.add('is-closed');
        else row.classList.remove('is-closed');
      };
    });
  }

  function getHoursData(containerId = 'gastroHoursTable') {
    const el = $(containerId);
    if (!el) return {};
    const res = {};
    el.querySelectorAll('.hours-row').forEach(row => {
      const dayId = row.dataset.day;
      const closed = row.querySelector('.hours-closed-chk').checked;
      const open = row.querySelector('.hours-open').value.trim();
      const close = row.querySelector('.hours-close').value.trim();
      const open2 = row.querySelector('.hours-open2').value.trim();
      const close2 = row.querySelector('.hours-close2').value.trim();
      res[dayId] = { closed, open, close, open2, close2 };
    });
    return res;
  }

  // --- GALLERY UI RENDERING ---
  function renderGalleryUI(mediaArray, coverUrl, containerId, prefix, onSetCover, onRemove, onTitleChange, onCreditChange) {
    const container = $(containerId);
    if (!container) return;
    if (!mediaArray.length) {
      container.innerHTML = '<div class="comtur-hint" style="grid-column: 1/-1; padding: 12px 0;">Nenhuma foto adicionada à galeria.</div>';
      return;
    }

    container.innerHTML = mediaArray.map((m, idx) => {
      const isCover = m.url === coverUrl;
      return \`
        <div class="comtur-gallery-item \${isCover ? 'is-cover' : ''}">
          <div class="comtur-gallery-thumb">
            <img src="\${m.url}" alt="\${m.title || ''}">
            \${isCover ? '<span class="comtur-gallery-cover-badge">⭐ Capa</span>' : ''}
          </div>
          <div class="comtur-gallery-body">
            <input type="text" class="comtur-gallery-input \${prefix}-gal-title" data-idx="\${idx}" placeholder="Legenda da foto" value="\${m.title || ''}">
            <input type="text" class="comtur-gallery-input \${prefix}-gal-credit" data-idx="\${idx}" placeholder="Créditos / Fotógrafo" value="\${m.credit || ''}">
            <div class="comtur-gallery-actions">
              <button type="button" class="comtur-btn-cover \${prefix}-btn-cover" data-idx="\${idx}">\${isCover ? '★ Capa ativa' : 'Definir como capa'}</button>
              <button type="button" class="comtur-btn-remove \${prefix}-btn-remove" data-idx="\${idx}">Remover</button>
            </div>
          </div>
        </div>
      \`;
    }).join('');

    container.querySelectorAll(\`.\${prefix}-gal-title\`).forEach(inp => {
      inp.oninput = () => { onTitleChange(parseInt(inp.dataset.idx, 10), inp.value); };
    });
    container.querySelectorAll(\`.\${prefix}-gal-credit\`).forEach(inp => {
      inp.oninput = () => { onCreditChange(parseInt(inp.dataset.idx, 10), inp.value); };
    });
    container.querySelectorAll(\`.\${prefix}-btn-cover\`).forEach(btn => {
      btn.onclick = () => { onSetCover(mediaArray[parseInt(btn.dataset.idx, 10)].url); };
    });
    container.querySelectorAll(\`.\${prefix}-btn-remove\`).forEach(btn => {
      btn.onclick = () => { onRemove(parseInt(btn.dataset.idx, 10)); };
    });
  }

  function renderGastroGallery() {
    renderGalleryUI(gastroMedia, gastroCoverUrl, 'gastroGalleryGrid', 'gastro',
      (url) => { gastroCoverUrl = url; renderGastroGallery(); },
      (idx) => { if (gastroMedia[idx]?.url === gastroCoverUrl) gastroCoverUrl = ''; gastroMedia.splice(idx, 1); renderGastroGallery(); },
      (idx, val) => { gastroMedia[idx].title = val; },
      (idx, val) => { gastroMedia[idx].credit = val; }
    );
  }

  function renderAttractionGallery() {
    renderGalleryUI(attractionMedia, attractionCoverUrl, 'attractionGalleryGrid', 'attraction',
      (url) => { attractionCoverUrl = url; renderAttractionGallery(); },
      (idx) => { if (attractionMedia[idx]?.url === attractionCoverUrl) attractionCoverUrl = ''; attractionMedia.splice(idx, 1); renderAttractionGallery(); },
      (idx, val) => { attractionMedia[idx].title = val; },
      (idx, val) => { attractionMedia[idx].credit = val; }
    );
  }

  function renderEventGallery() {
    renderGalleryUI(eventMedia, eventCoverUrl, 'eventGalleryGrid', 'event',
      (url) => { eventCoverUrl = url; renderEventGallery(); },
      (idx) => { if (eventMedia[idx]?.url === eventCoverUrl) eventCoverUrl = ''; eventMedia.splice(idx, 1); renderEventGallery(); },
      (idx, val) => { eventMedia[idx].title = val; },
      (idx, val) => { eventMedia[idx].credit = val; }
    );
  }

  // --- MEDIA UPLOAD HELPER ---
  async function uploadMediaFiles(files, targetArray, progressId, onSuccess) {
    if (!files || !files.length) return;
    const progressEl = $(progressId);
    if (progressEl) progressEl.textContent = \`Enviando \${files.length} arquivo(s)...\`;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      try {
        const send = (window.SemitSession && typeof window.SemitSession.fetchWithAuth === 'function')
          ? window.SemitSession.fetchWithAuth.bind(window.SemitSession)
          : ((window.SemitSession && typeof window.SemitSession.fetchAuth === 'function')
              ? window.SemitSession.fetchAuth.bind(window.SemitSession)
              : fetch);
        const res = await send('/api/comtur/admin/media/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (res.ok && data.url) {
          targetArray.push({
            type: 'image',
            url: data.url,
            title: file.name.replace(/\\.[^/.]+$/, ''),
            credit: '',
            order: targetArray.length
          });
        }
      } catch (err) {
        console.error('Upload error:', err);
      }
    }

    if (progressEl) progressEl.textContent = 'Upload concluído!';
    setTimeout(() => { if (progressEl) progressEl.textContent = ''; }, 3000);
    if (typeof onSuccess === 'function') onSuccess();
  }

  // --- EVENT SPECIFIC HELPERS ---
  function renderEventSchedule() {
    const container = $('eventScheduleList');
    if (!container) return;
    if (!eventSchedule.length) {
      container.innerHTML = '<div class="comtur-hint" style="padding: 6px 0;">Nenhuma atração ou horário adicionado.</div>';
      return;
    }

    container.innerHTML = eventSchedule.map((item, idx) => \`
      <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 8px; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <input type="text" class="comtur-input ev-sched-time" data-idx="\${idx}" placeholder="Horário (ex: 20:00)" style="width: 140px;" value="\${item.time || ''}">
        <input type="text" class="comtur-input ev-sched-title" data-idx="\${idx}" placeholder="Título da atração / Palco / Palestra" style="flex: 1;" value="\${item.title || ''}">
        <input type="text" class="comtur-input ev-sched-stage" data-idx="\${idx}" placeholder="Local / Palco" style="width: 160px;" value="\${item.stage || ''}">
        <button type="button" class="comtur-btn comtur-btn-danger comtur-btn-sm" onclick="removeEventScheduleItem(\${idx})">Remover</button>
      </div>
    \`).join('');

    container.querySelectorAll('.ev-sched-time').forEach(inp => {
      inp.oninput = () => { eventSchedule[inp.dataset.idx].time = inp.value; };
    });
    container.querySelectorAll('.ev-sched-title').forEach(inp => {
      inp.oninput = () => { eventSchedule[inp.dataset.idx].title = inp.value; };
    });
    container.querySelectorAll('.ev-sched-stage').forEach(inp => {
      inp.oninput = () => { eventSchedule[inp.dataset.idx].stage = inp.value; };
    });
  }

  window.removeEventScheduleItem = function(idx) {
    eventSchedule.splice(idx, 1);
    renderEventSchedule();
  };

  function renderEventDates() {
    const container = $('eventDatesList');
    if (!container) return;
    if (!eventDates.length) {
      container.innerHTML = '<div class="comtur-hint" style="padding: 6px 0;">Nenhuma data adicional adicionada.</div>';
      return;
    }

    container.innerHTML = eventDates.map((item, idx) => \`
      <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 8px; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <input type="date" class="comtur-input ev-date-val" data-idx="\${idx}" value="\${item.date || ''}">
        <input type="text" class="comtur-input ev-date-start" data-idx="\${idx}" placeholder="Início (ex: 18:00)" style="width: 130px;" value="\${item.startTime || ''}">
        <input type="text" class="comtur-input ev-date-end" data-idx="\${idx}" placeholder="Fim (ex: 23:00)" style="width: 130px;" value="\${item.endTime || ''}">
        <input type="text" class="comtur-input ev-date-label" data-idx="\${idx}" placeholder="Rótulo (ex: Dia 1 - Abertura)" style="flex: 1;" value="\${item.label || ''}">
        <button type="button" class="comtur-btn comtur-btn-danger comtur-btn-sm" onclick="removeEventDateItem(\${idx})">Remover</button>
      </div>
    \`).join('');

    container.querySelectorAll('.ev-date-val').forEach(inp => {
      inp.oninput = () => { eventDates[inp.dataset.idx].date = inp.value; };
    });
    container.querySelectorAll('.ev-date-start').forEach(inp => {
      inp.oninput = () => { eventDates[inp.dataset.idx].startTime = inp.value; };
    });
    container.querySelectorAll('.ev-date-end').forEach(inp => {
      inp.oninput = () => { eventDates[inp.dataset.idx].endTime = inp.value; };
    });
    container.querySelectorAll('.ev-date-label').forEach(inp => {
      inp.oninput = () => { eventDates[inp.dataset.idx].label = inp.value; };
    });
  }

  window.removeEventDateItem = function(idx) {
    eventDates.splice(idx, 1);
    renderEventDates();
  };

  function renderEventDocs() {
    const container = $('eventDocsList');
    if (!container) return;
    if (!eventDocs.length) {
      container.innerHTML = '<div class="comtur-hint" style="padding: 6px 0;">Nenhum documento anexado.</div>';
      return;
    }

    container.innerHTML = eventDocs.map((item, idx) => \`
      <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 8px; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <input type="text" class="comtur-input ev-doc-title" data-idx="\${idx}" placeholder="Nome do documento (ex: Regulamento, Edital)" style="width: 220px;" value="\${item.title || ''}">
        <input type="url" class="comtur-input ev-doc-url" data-idx="\${idx}" placeholder="URL do arquivo (https://...)" style="flex: 1;" value="\${item.url || ''}">
        <button type="button" class="comtur-btn comtur-btn-danger comtur-btn-sm" onclick="removeEventDocItem(\${idx})">Remover</button>
      </div>
    \`).join('');

    container.querySelectorAll('.ev-doc-title').forEach(inp => {
      inp.oninput = () => { eventDocs[inp.dataset.idx].title = inp.value; };
    });
    container.querySelectorAll('.ev-doc-url').forEach(inp => {
      inp.oninput = () => { eventDocs[inp.dataset.idx].url = inp.value; };
    });
  }

  window.removeEventDocItem = function(idx) {
    eventDocs.splice(idx, 1);
    renderEventDocs();
  };

  function populateEventVenueSelect(selectedId = '') {
    const select = $('eventVenueSelect');
    if (!select) return;
    const venues = allItems.filter(i => ['attraction', 'lodging', 'gastronomy', 'service'].includes(i.type));
    let html = '<option value="">-- Nenhum local cadastrado vinculado --</option>';
    venues.forEach(v => {
      const isSel = (v._id === selectedId) ? 'selected' : '';
      html += \`<option value="\${v._id}" \${isSel}>[\${v.type}] \${v.title}</option>\`;
    });
    select.innerHTML = html;
  }

  // --- LODGING HELPERS ---
  function toggleLodgingPetWrap(val) {
    const wrap = $('lodgingPetWrap');
    if (wrap) wrap.style.display = (val === 'yes' || val === 'fee') ? 'block' : 'none';
  }

  function syncLodgingReceptionChip(is24h) {
    const chk = $('lodgingFeaturesList')?.querySelector('input[value="reception_24h"]');
    if (chk) {
      chk.checked = is24h;
      const chip = chk.closest('.comtur-chip-btn');
      if (chip) {
        if (is24h) chip.classList.add('is-checked');
        else chip.classList.remove('is-checked');
      }
    }
  }

  function renderLodgingChips(data = {}) {
    renderChips('lodgingFeaturesList', LODGING_FEATURES, data.features || ['wifi', 'parking', 'air_conditioning', 'breakfast']);
    renderChips('lodgingServicesList', LODGING_SERVICES, data.services || ['daily_housekeeping', 'tourist_info']);
    renderChips('lodgingMealTypesList', LODGING_MEAL_TYPES, data.mealTypes || ['breakfast']);
    renderChips('lodgingDietaryList', LODGING_DIETARY_OPTIONS, data.dietary || []);
    renderChips('lodgingAccessibilityList', LODGING_ACCESSIBILITY, data.accessibility || ['wheelchair_access']);
    renderChips('lodgingPaymentList', LODGING_PAYMENT_METHODS, data.paymentMethods || ['pix', 'credit_card', 'debit_card', 'cash']);
  }

  function renderLodgingGallery() {
    renderGalleryUI(lodgingMedia, lodgingCoverUrl, 'lodgingGalleryGrid', 'lodging',
      (url) => { lodgingCoverUrl = url; renderLodgingGallery(); },
      (idx) => { if (lodgingMedia[idx]?.url === lodgingCoverUrl) lodgingCoverUrl = ''; lodgingMedia.splice(idx, 1); renderLodgingGallery(); },
      (idx, val) => { lodgingMedia[idx].title = val; },
      (idx, val) => { lodgingMedia[idx].credit = val; }
    );
  }

  function renderLodgingRooms() {
    const container = $('lodgingRoomsList');
    if (!container) return;
    if (!lodgingRooms.length) {
      container.innerHTML = '<div class="comtur-hint" style="padding: 6px 0;">Nenhuma tipologia de acomodação adicionada.</div>';
      return;
    }

    container.innerHTML = lodgingRooms.map((room, idx) => \`
      <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 700; font-size: 0.88rem; color: #0f766e;">🛏️ Tipo de Quarto #\${idx + 1}</span>
          <button type="button" class="comtur-btn comtur-btn-danger comtur-btn-sm" onclick="removeLodgingRoom(\${idx})">Remover</button>
        </div>
        <div class="comtur-grid-2">
          <div class="comtur-field">
            <label>Nome do quarto / categoria <span class="req">*</span></label>
            <input type="text" class="comtur-input l-room-name" data-idx="\${idx}" placeholder="Ex.: Suíte Master Casal" value="\${room.name || ''}">
          </div>
          <div class="comtur-field">
            <label>Capacidade (pessoas)</label>
            <input type="number" min="1" class="comtur-input l-room-cap" data-idx="\${idx}" placeholder="2" value="\${room.capacity || 2}">
          </div>
          <div class="comtur-field">
            <label>Tipo de cama</label>
            <input type="text" class="comtur-input l-room-bed" data-idx="\${idx}" placeholder="Ex.: 1 Cama Queen + 1 Solteiro" value="\${room.bedType || ''}">
          </div>
          <div class="comtur-field">
            <label>Diária média estimada</label>
            <input type="text" class="comtur-input l-room-price" data-idx="\${idx}" placeholder="Ex.: R$ 250 - R$ 380" value="\${room.price || ''}">
          </div>
        </div>
      </div>
    \`).join('');

    container.querySelectorAll('.l-room-name').forEach(inp => {
      inp.oninput = () => { lodgingRooms[inp.dataset.idx].name = inp.value; };
    });
    container.querySelectorAll('.l-room-cap').forEach(inp => {
      inp.oninput = () => { lodgingRooms[inp.dataset.idx].capacity = parseInt(inp.value, 10) || 2; };
    });
    container.querySelectorAll('.l-room-bed').forEach(inp => {
      inp.oninput = () => { lodgingRooms[inp.dataset.idx].bedType = inp.value; };
    });
    container.querySelectorAll('.l-room-price').forEach(inp => {
      inp.oninput = () => { lodgingRooms[inp.dataset.idx].price = inp.value; };
    });
  }

  window.removeLodgingRoom = function(idx) {
    lodgingRooms.splice(idx, 1);
    renderLodgingRooms();
  };

  // --- ROUTE HELPERS ---
  function renderRouteChips(data = {}) {
    renderChips('routeAudiencesList', ROUTE_AUDIENCES, data.audiences || ['family', 'couples', 'tourists']);
    renderChips('routeSeasonsList', ROUTE_SEASONS, data.seasons || ['all_year']);
    renderChips('routeAccessibilityList', ROUTE_ACCESSIBILITY, data.accessibility || ['wheelchair_accessible']);
  }

  function renderRouteGallery() {
    renderGalleryUI(routeMedia, routeCoverUrl, 'routeGalleryGrid', 'route',
      (url) => { routeCoverUrl = url; renderRouteGallery(); },
      (idx) => { if (routeMedia[idx]?.url === routeCoverUrl) routeCoverUrl = ''; routeMedia.splice(idx, 1); renderRouteGallery(); },
      (idx, val) => { routeMedia[idx].title = val; },
      (idx, val) => { routeMedia[idx].credit = val; }
    );
  }

  function renderRouteStops() {
    const container = $('routeStopsList');
    if (!container) return;
    if (!routeStops.length) {
      container.innerHTML = '<div class="comtur-hint" style="padding: 6px 0;">Nenhuma parada ou ponto de interesse adicionado ao roteiro.</div>';
      return;
    }

    const availableEntities = allItems.filter(i => ['attraction', 'gastronomy', 'lodging', 'event', 'shopping', 'service'].includes(i.type));

    container.innerHTML = routeStops.map((stop, idx) => \`
      <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 700; font-size: 0.88rem; color: #0f766e;">📍 Parada #\${idx + 1}</span>
          <button type="button" class="comtur-btn comtur-btn-danger comtur-btn-sm" onclick="removeRouteStop(\${idx})">Remover</button>
        </div>
        <div class="comtur-grid-2">
          <div class="comtur-field">
            <label>Vincular a entidade cadastrada</label>
            <select class="comtur-select r-stop-entity" data-idx="\${idx}">
              <option value="">-- Ponto personalizado / Não vinculado --</option>
              \${availableEntities.map(ent => \`<option value="\${ent._id}" \${ent._id === stop.entityId ? 'selected' : ''}>[\${ent.type}] \${ent.title}</option>\`).join('')}
            </select>
          </div>
          <div class="comtur-field">
            <label>Título / Nome da parada <span class="req">*</span></label>
            <input type="text" class="comtur-input r-stop-title" data-idx="\${idx}" placeholder="Ex.: Parada 1: Centro Histórico" value="\${stop.title || stop.customName || ''}">
          </div>
          <div class="comtur-field">
            <label>Tempo sugerido de permanência</label>
            <input type="text" class="comtur-input r-stop-duration" data-idx="\${idx}" placeholder="Ex.: 45 min, 1h30" value="\${stop.duration || ''}">
          </div>
          <div class="comtur-field">
            <label>Endereço / Localização</label>
            <input type="text" class="comtur-input r-stop-address" data-idx="\${idx}" placeholder="Ex.: Praça Central, s/n" value="\${stop.address || ''}">
          </div>
        </div>
      </div>
    \`).join('');

    container.querySelectorAll('.r-stop-entity').forEach(inp => {
      inp.onchange = () => {
        const idx = parseInt(inp.dataset.idx, 10);
        routeStops[idx].entityId = inp.value;
        const selectedEntity = allItems.find(i => i._id === inp.value);
        if (selectedEntity) {
          routeStops[idx].title = selectedEntity.title;
          routeStops[idx].stopType = selectedEntity.type;
          renderRouteStops();
        }
      };
    });
    container.querySelectorAll('.r-stop-title').forEach(inp => {
      inp.oninput = () => { routeStops[inp.dataset.idx].title = inp.value; };
    });
    container.querySelectorAll('.r-stop-duration').forEach(inp => {
      inp.oninput = () => { routeStops[inp.dataset.idx].duration = inp.value; };
    });
    container.querySelectorAll('.r-stop-address').forEach(inp => {
      inp.oninput = () => { routeStops[inp.dataset.idx].address = inp.value; };
    });
  }

  window.removeRouteStop = function(idx) {
    routeStops.splice(idx, 1);
    renderRouteStops();
  };

  // --- SHOPPING HELPERS ---
  function renderShopChips(data = {}) {
    renderChips('shopProductsList', SHOP_PRODUCTS, data.products || ['handicraft', 'souvenirs']);
    renderChips('shopPaymentList', SHOP_PAYMENT, data.paymentMethods || ['pix', 'credit_card', 'debit_card', 'cash']);
    renderChips('shopAccessibilityList', SHOP_ACCESSIBILITY, data.accessibility || ['accessible_entrance']);
  }

  function renderShopGallery() {
    renderGalleryUI(shopMedia, shopCoverUrl, 'shopGalleryGrid', 'shop',
      (url) => { shopCoverUrl = url; renderShopGallery(); },
      (idx) => { if (shopMedia[idx]?.url === shopCoverUrl) shopCoverUrl = ''; shopMedia.splice(idx, 1); renderShopGallery(); },
      (idx, val) => { shopMedia[idx].title = val; },
      (idx, val) => { shopMedia[idx].credit = val; }
    );
  }

  // --- SERVICE HELPERS ---
  function syncService24h(is24h) {
    if ($('svcIs24h')) $('svcIs24h').checked = is24h;
    if ($('svcOpen24h')) $('svcOpen24h').checked = is24h;
    const hoursTable = $('svcHoursSectionWrap');
    if (hoursTable) hoursTable.style.display = is24h ? 'none' : 'block';
  }

  function updateServiceCategorySpecificFields() {
    const cat = $('svcCategory') ? $('svcCategory').value : 'outros';
    const secWrap = $('svcSecurityWrap');
    const bankWrap = $('svcBankingWrap');
    const gasWrap = $('svcGasWrap');

    if (secWrap) secWrap.style.display = (cat === 'seguranca' || cat === 'saude') ? 'block' : 'none';
    if (bankWrap) bankWrap.style.display = (cat === 'banco_cambio') ? 'block' : 'none';
    if (gasWrap) gasWrap.style.display = (cat === 'posto_combustivel') ? 'block' : 'none';
  }

  function renderServiceChips(data = {}) {
    renderChips('svcSecurityFeaturesList', SVC_SECURITY_FEATURES, data.securityFeatures || ['emergency_24h', 'in_person_attendance', 'phone_attendance', 'tourist_support']);
    renderChips('svcBankingFeaturesList', SVC_BANKING_FEATURES, data.bankingFeatures || ['atm', 'withdrawal', 'deposit', 'in_person_teller']);
    renderChips('svcGasFeaturesList', SVC_GAS_FEATURES, data.gasFeatures || ['gasoline', 'ethanol', 'diesel', 'convenience_store', 'tire_inflation']);
    renderChips('svcAccessibilityList', SVC_ACCESSIBILITY, data.accessibility || ['accessible_entrance', 'wheelchair_access', 'ramp_access', 'accessible_restroom']);
    renderChips('svcLanguagesList', SVC_LANGUAGES, data.languages || ['pt']);
  }

  function renderServiceGallery() {
    renderGalleryUI(svcMedia, svcCoverUrl, 'svcGalleryGrid', 'svc',
      (url) => { svcCoverUrl = url; renderServiceGallery(); },
      (idx) => { if (svcMedia[idx]?.url === svcCoverUrl) svcCoverUrl = ''; svcMedia.splice(idx, 1); renderServiceGallery(); },
      (idx, val) => { svcMedia[idx].title = val; },
      (idx, val) => { svcMedia[idx].credit = val; }
    );
  }

  function renderServiceDocs() {
    const container = $('svcUsefulDocsList');
    if (!container) return;
    if (!svcUsefulDocs.length) {
      container.innerHTML = '<div class="comtur-hint" style="padding: 6px 0;">Nenhum documento ou link útil adicionado.</div>';
      return;
    }

    container.innerHTML = svcUsefulDocs.map((doc, idx) => \`
      <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 700; font-size: 0.88rem; color: #0f766e;">📄 Link / Documento #\${idx + 1}</span>
          <button type="button" class="comtur-btn comtur-btn-danger comtur-btn-sm" onclick="removeServiceDoc(\${idx})">Remover</button>
        </div>
        <div class="comtur-grid-2">
          <div class="comtur-field">
            <label>Título do item <span class="req">*</span></label>
            <input type="text" class="comtur-input svc-doc-title" data-idx="\${idx}" placeholder="Ex.: Tabela de Horários de Ônibus" value="\${doc.title || ''}">
          </div>
          <div class="comtur-field">
            <label>Tipo</label>
            <select class="comtur-select svc-doc-type" data-idx="\${idx}">
              <option value="link" \${doc.type === 'link' ? 'selected' : ''}>Link externo / Site</option>
              <option value="document" \${doc.type === 'document' ? 'selected' : ''}>Documento / PDF</option>
              <option value="app" \${doc.type === 'app' ? 'selected' : ''}>Aplicativo móvel</option>
              <option value="map" \${doc.type === 'map' ? 'selected' : ''}>Mapa / Linhas</option>
              <option value="form" \${doc.type === 'form' ? 'selected' : ''}>Formulário oficial</option>
              <option value="other" \${doc.type === 'other' ? 'selected' : ''}>Outros</option>
            </select>
          </div>
          <div class="comtur-field comtur-grid-full">
            <label>URL / Arquivo</label>
            <input type="url" class="comtur-input svc-doc-url" data-idx="\${idx}" placeholder="https://..." value="\${doc.url || ''}">
          </div>
          <div class="comtur-field comtur-grid-full">
            <label>Descrição / Orientações</label>
            <input type="text" class="comtur-input svc-doc-desc" data-idx="\${idx}" placeholder="Ex.: Consulte as partidas da linha nos dias úteis" value="\${doc.description || ''}">
          </div>
        </div>
      </div>
    \`).join('');

    container.querySelectorAll('.svc-doc-title').forEach(inp => {
      inp.oninput = () => { svcUsefulDocs[inp.dataset.idx].title = inp.value; };
    });
    container.querySelectorAll('.svc-doc-type').forEach(inp => {
      inp.onchange = () => { svcUsefulDocs[inp.dataset.idx].type = inp.value; };
    });
    container.querySelectorAll('.svc-doc-url').forEach(inp => {
      inp.oninput = () => { svcUsefulDocs[inp.dataset.idx].url = inp.value; };
    });
    container.querySelectorAll('.svc-doc-desc').forEach(inp => {
      inp.oninput = () => { svcUsefulDocs[inp.dataset.idx].description = inp.value; };
    });
  }

  window.removeServiceDoc = function(idx) {
    svcUsefulDocs.splice(idx, 1);
    renderServiceDocs();
  };

  // --- COUNCIL MEMBER HELPERS ---
  function renderCouncilAvatarPreview(url) {
    const previewEl = $('councilAvatarPreview');
    const removeBtn = $('btnRemoveCouncilPhoto');
    const altInput = $('councilPhotoAlt');
    const nameVal = ($('councilDisplayName') ? $('councilDisplayName').value.trim() : '') || ($('councilName') ? $('councilName').value.trim() : '') || 'Conselheiro';

    if (!previewEl) return;

    if (url) {
      previewEl.innerHTML = \`<img src="\${url}" alt="\${(altInput && altInput.value) || 'Foto de ' + nameVal}" style="width: 100%; height: 100%; object-fit: cover;">\`;
      if (removeBtn) removeBtn.style.display = 'inline-flex';
    } else {
      previewEl.innerHTML = \`<span style="font-size: 3.2rem;">👤</span>\`;
      if (removeBtn) removeBtn.style.display = 'none';
    }
  }

  async function uploadCouncilPhoto(file) {
    if (!file) return;
    const progressEl = $('councilPhotoProgress');
    if (progressEl) progressEl.textContent = 'Enviando foto...';

    const formData = new FormData();
    formData.append('file', file);
    try {
      const send = (window.SemitSession && typeof window.SemitSession.fetchWithAuth === 'function')
        ? window.SemitSession.fetchWithAuth.bind(window.SemitSession)
        : ((window.SemitSession && typeof window.SemitSession.fetchAuth === 'function')
            ? window.SemitSession.fetchAuth.bind(window.SemitSession)
            : fetch);
      const res = await send('/api/comtur/admin/media/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.url) {
        councilPhotoUrl = data.url;
        renderCouncilAvatarPreview(councilPhotoUrl);
        if (progressEl) progressEl.textContent = 'Foto enviada com sucesso!';
        setTimeout(() => { if (progressEl) progressEl.textContent = ''; }, 3000);
      } else {
        showNotice(\`Erro ao enviar foto: \${data.error || 'Falha no upload'}\`, true);
        if (progressEl) progressEl.textContent = '';
      }
    } catch (err) {
      showNotice('Erro de conexão ao enviar foto.', true);
      if (progressEl) progressEl.textContent = '';
    }
  }

  function populateCouncilRelatedMemberSelect(selectedId = '') {
    const select = $('councilRelatedMemberSelect');
    if (!select) return;
    const currentMemberId = $('id').value;
    const councilMembers = allItems.filter(item => item.type === 'council_member' && item._id !== currentMemberId);
    
    let html = '<option value="">-- Nenhum membro vinculado --</option>';
    councilMembers.forEach(m => {
      const meta = m.metadata || {};
      const role = meta.councilRole || meta.role || 'Conselheiro(a)';
      const rep = meta.representationType ? \` (\${meta.representationType})\` : '';
      const isSel = (m._id === selectedId) ? 'selected' : '';
      html += \`<option value="\${m._id}" \${isSel}>\${m.title} - \${role}\${rep}</option>\`;
    });
    select.innerHTML = html;
  }

  function populateCouncilLegislationSelect(selectedId = '') {
    const select = $('councilLegislationSelect');
    if (!select) return;
    const legislationDocs = allItems.filter(item => item.type === 'legislation');
    
    let html = '<option value="">-- Selecionar da categoria Legislação --</option>';
    legislationDocs.forEach(doc => {
      const isSel = (doc._id === selectedId) ? 'selected' : '';
      html += \`<option value="\${doc._id}" \${isSel}>\${doc.title}</option>\`;
    });
    select.innerHTML = html;
  }

  // --- LEGISLATION HELPERS (SIMPLIFIED PDF REPOSITORY) ---
  function renderLegisPdfPreview() {
    const emptyEl = $('legisPdfEmpty');
    const previewEl = $('legisPdfPreview');
    if (!emptyEl || !previewEl) return;

    if (legisPdfFile && legisPdfFile.url) {
      emptyEl.style.display = 'none';
      previewEl.style.display = 'block';
      const nameEl = $('legisPdfFileNameDisplay');
      const sizeEl = $('legisPdfSizeDisplay');
      if (nameEl) nameEl.textContent = legisPdfFile.originalName || legisPdfFile.name || 'documento.pdf';
      if (sizeEl) sizeEl.textContent = legisPdfFile.sizeFormatted || (legisPdfFile.size ? formatBytes(legisPdfFile.size) : 'PDF');
    } else {
      emptyEl.style.display = 'block';
      previewEl.style.display = 'none';
    }
  }

  async function uploadLegisPdf(file) {
    if (!file) return;

    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    if (!isPdf) {
      showNotice('Formato inválido. Por favor, envie apenas arquivos em formato PDF (.pdf).', true);
      return;
    }

    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      showNotice('Arquivo muito grande. O limite máximo para upload de PDF é de 20 MB.', true);
      return;
    }

    if (file.size === 0) {
      showNotice('O arquivo selecionado está vazio.', true);
      return;
    }

    const progressEl = $('legisPdfProgress');
    if (progressEl) progressEl.textContent = 'Enviando arquivo PDF...';

    const formData = new FormData();
    formData.append('file', file);

    try {
      const send = (window.SemitSession && typeof window.SemitSession.fetchWithAuth === 'function')
        ? window.SemitSession.fetchWithAuth.bind(window.SemitSession)
        : ((window.SemitSession && typeof window.SemitSession.fetchAuth === 'function')
            ? window.SemitSession.fetchAuth.bind(window.SemitSession)
            : fetch);
      const res = await send('/api/comtur/admin/media/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.url) {
        legisPdfFile = {
          url: data.url,
          name: file.name,
          originalName: file.name,
          size: file.size,
          sizeFormatted: formatBytes(file.size),
          mimeType: 'application/pdf',
          uploadedAt: new Date().toISOString()
        };
        renderLegisPdfPreview();
        if (progressEl) progressEl.textContent = 'PDF anexado com sucesso!';
        setTimeout(() => { if (progressEl) progressEl.textContent = ''; }, 3000);
      } else {
        showNotice(\`Erro ao enviar PDF: \${data.error || 'Falha no upload'}\`, true);
        if (progressEl) progressEl.textContent = '';
      }
    } catch (err) {
      showNotice('Erro de conexão ao enviar arquivo PDF.', true);
      if (progressEl) progressEl.textContent = '';
    }
  }

  // --- CONTENT TYPE SWITCHING & FORM REGISTRY ---
  window.onContentTypeChange = function(newType, pushState = true) {
    currentType = normalizeType(newType);
    $('type').value = currentType;
    $('contentTypeSelector').value = currentType;

    const typeConfig = CONTENT_TYPES.find(c => c.id === currentType) || CONTENT_TYPES[0];

    // Update left sidebar headers and actions
    $('listPanelTitle').textContent = typeConfig.listTitle;
    $('searchInput').placeholder = typeConfig.searchPlaceholder;
    $('btnNew').textContent = typeConfig.newBtnLabel;

    // Toggle Form Containers
    document.querySelectorAll('.comtur-category-fields').forEach(el => { el.style.display = 'none'; });

    if (currentType === 'event') {
      $('eventFields').style.display = 'block';
      $('sharedNonGastroActions').style.display = 'none';
    } else if (currentType === 'attraction') {
      $('attractionFields').style.display = 'block';
      $('sharedNonGastroActions').style.display = 'none';
    } else if (currentType === 'gastronomy') {
      $('gastronomyFields').style.display = 'block';
      $('sharedNonGastroActions').style.display = 'none';
    } else if (currentType === 'news') {
      $('newsFields').style.display = 'block';
      $('sharedNonGastroActions').style.display = 'block';
    } else if (currentType === 'lodging') {
      $('lodgingFields').style.display = 'block';
      $('sharedNonGastroActions').style.display = 'none';
    } else if (currentType === 'route') {
      $('routeFields').style.display = 'block';
      $('sharedNonGastroActions').style.display = 'none';
    } else if (currentType === 'shopping') {
      $('shoppingFields').style.display = 'block';
      $('sharedNonGastroActions').style.display = 'none';
    } else if (currentType === 'service') {
      $('serviceFields').style.display = 'block';
      $('sharedNonGastroActions').style.display = 'none';
    } else if (currentType === 'council_member') {
      $('councilMemberFields').style.display = 'block';
      $('sharedNonGastroActions').style.display = 'none';
    } else if (currentType === 'legislation') {
      $('legislationFields').style.display = 'block';
      $('sharedNonGastroActions').style.display = 'none';
    } else {
      $('standardFields').style.display = 'block';
      $('sharedNonGastroActions').style.display = 'block';
    }

    // Reset Form for new entry in this category
    resetForm(false);

    // Filter sidebar list
    renderList();

    // URL state sync
    if (pushState) {
      const url = new URL(window.location.href);
      url.searchParams.set('type', currentType);
      window.history.pushState({ type: currentType }, '', url.toString());
    }
  };

  // --- FORM RESET ---
  function resetForm(clearSidebarActive = true) {
    $('form').reset();
    $('id').value = '';
    $('type').value = currentType;

    const typeConfig = CONTENT_TYPES.find(c => c.id === currentType) || CONTENT_TYPES[0];
    $('formTitle').textContent = typeConfig.formNewTitle;
    $('statusBadge').textContent = 'Rascunho';
    $('statusBadge').className = 'comtur-status-badge';

    // Buttons
    if ($('btnArchiveGastro')) $('btnArchiveGastro').style.display = 'none';
    if ($('btnArchiveAttraction')) $('btnArchiveAttraction').style.display = 'none';
    if ($('btnArchiveEvent')) $('btnArchiveEvent').style.display = 'none';
    if ($('btnArchiveLodging')) $('btnArchiveLodging').style.display = 'none';
    if ($('btnArchiveRoute')) $('btnArchiveRoute').style.display = 'none';
    if ($('btnArchiveShopping')) $('btnArchiveShopping').style.display = 'none';
    if ($('btnArchiveService')) $('btnArchiveService').style.display = 'none';
    if ($('btnArchiveCouncil')) $('btnArchiveCouncil').style.display = 'none';
    if ($('btnArchiveLegis')) $('btnArchiveLegis').style.display = 'none';

    // Gastronomy Defaults
    if (currentType === 'gastronomy') {
      gastroMedia = [];
      gastroCoverUrl = '';
      renderGastroGallery();
      renderChips('gastroAmenitiesList', GASTRO_AMENITIES, ['wifi', 'parking', 'ac', 'scenic_view']);
      renderChips('gastroDietaryList', GASTRO_DIETARY, ['vegetarian', 'gluten_free']);
      renderChips('gastroAccessibilityList', GASTRO_ACCESSIBILITY, ['wheelchair_entrance', 'accessible_restroom']);
      renderChips('gastroPaymentList', GASTRO_PAYMENT, ['pix', 'credit_visa', 'credit_master', 'debit', 'cash']);
      renderChips('gastroLanguagesList', GASTRO_LANGUAGES, ['pt']);
      renderHoursTable({}, 'gastroHoursTable');
      if ($('gastroSummaryCount')) $('gastroSummaryCount').textContent = '0 / 250';
    }

    // Attraction Defaults
    if (currentType === 'attraction') {
      attractionMedia = [];
      attractionCoverUrl = '';
      renderAttractionGallery();
      renderChips('attractionProfilesList', ATTRACTION_PROFILES, ['family', 'couples', 'tourists']);
      renderChips('attractionFeaturesList', ATTRACTION_FEATURES, ['parking', 'restroom', 'photo_spot']);
      renderChips('attractionAccessibilityList', ATTRACTION_ACCESSIBILITY, ['accessible_entrance', 'accessible_restroom']);
      renderChips('attractionRestrictionsList', ATTRACTION_RESTRICTIONS, ['no_smoking', 'no_littering']);
      renderChips('attractionPaymentList', ATTRACTION_PAYMENT, ['pix', 'credit_card', 'debit_card', 'cash']);
      renderHoursTable({}, 'attractionHoursTable');
      renderRelatedEntities('attractionRelatedEntitiesList', []);
      if ($('attractionSummaryCount')) $('attractionSummaryCount').textContent = '0 / 250';
    }

    // Event Defaults
    if (currentType === 'event') {
      eventMedia = [];
      eventCoverUrl = '';
      renderEventGallery();
      eventSchedule = [];
      renderEventSchedule();
      eventDates = [];
      renderEventDates();
      eventDocs = [];
      renderEventDocs();
      renderChips('eventAudiencesList', EVENT_AUDIENCES, ['general', 'family', 'tourists']);
      renderChips('eventFeaturesList', EVENT_FEATURES, ['restroom', 'food_area', 'security']);
      renderChips('eventAccessibilityList', EVENT_ACCESSIBILITY, ['accessible_entrance', 'wheelchair_access']);
      renderRelatedEntities('eventRelatedEntitiesList', []);
      populateEventVenueSelect('');
      if ($('eventSummaryCount')) $('eventSummaryCount').textContent = '0 / 250';
    }

    // Lodging Defaults
    if (currentType === 'lodging') {
      lodgingMedia = [];
      lodgingCoverUrl = '';
      renderLodgingGallery();
      lodgingRooms = [];
      renderLodgingRooms();
      renderLodgingChips();
      renderHoursTable({}, 'lodgingHoursTable');
      renderRelatedEntities('lodgingRelatedEntitiesList', []);
      if ($('lodgingSummaryCount')) $('lodgingSummaryCount').textContent = '0 / 250';
    }

    // Route Defaults
    if (currentType === 'route') {
      routeMedia = [];
      routeCoverUrl = '';
      renderRouteGallery();
      routeStops = [];
      renderRouteStops();
      renderRouteChips();
      renderRelatedEntities('routeRelatedEntitiesList', []);
      if ($('routeSummaryCount')) $('routeSummaryCount').textContent = '0 / 250';
    }

    // Shopping Defaults
    if (currentType === 'shopping') {
      shopMedia = [];
      shopCoverUrl = '';
      renderShopGallery();
      renderShopChips();
      renderHoursTable({}, 'shopHoursTable');
      renderRelatedEntities('shopRelatedEntitiesList', []);
      if ($('shopSummaryCount')) $('shopSummaryCount').textContent = '0 / 250';
    }

    // Service Defaults
    if (currentType === 'service') {
      svcMedia = [];
      svcCoverUrl = '';
      renderServiceGallery();
      svcUsefulDocs = [];
      renderServiceDocs();
      renderServiceChips();
      renderHoursTable({}, 'svcHoursTable');
      renderRelatedEntities('svcRelatedEntitiesList', []);
      if ($('svcSummaryCount')) $('svcSummaryCount').textContent = '0 / 250';
    }

    // Council Member Defaults
    if (currentType === 'council_member') {
      if ($('councilName')) $('councilName').value = '';
      if ($('councilDisplayName')) {
        $('councilDisplayName').value = '';
        delete $('councilDisplayName').dataset.manual;
      }
      if ($('councilRole')) $('councilRole').value = 'Conselheiro(a)';
      if ($('councilRepresentationType')) $('councilRepresentationType').value = 'Titular';
      if ($('councilSlug')) {
        $('councilSlug').value = '';
        delete $('councilSlug').dataset.manual;
      }
      if ($('councilOrganization')) $('councilOrganization').value = '';
      if ($('councilSegment')) $('councilSegment').value = 'Poder Público';
      if ($('councilOrganizationRole')) $('councilOrganizationRole').value = '';
      if ($('councilTermStart')) $('councilTermStart').value = '';
      if ($('councilTermEnd')) $('councilTermEnd').value = '';
      if ($('councilMemberStatus')) $('councilMemberStatus').value = 'Em exercício';
      if ($('councilIsCurrent')) $('councilIsCurrent').checked = true;
      if ($('councilBio')) $('councilBio').value = '';
      if ($('councilProfessionalArea')) $('councilProfessionalArea').value = '';
      if ($('councilTourismExperience')) $('councilTourismExperience').value = '';
      if ($('councilPublicEmail')) $('councilPublicEmail').value = '';
      if ($('councilPublicPhone')) $('councilPublicPhone').value = '';
      if ($('councilShowPublicContact')) $('councilShowPublicContact').checked = false;
      if ($('councilDisplayOrder')) $('councilDisplayOrder').value = '1';
      if ($('councilShowOnPortal')) $('councilShowOnPortal').checked = true;
      if ($('councilFeaturedTop')) $('councilFeaturedTop').checked = false;
      if ($('councilAppointmentAct')) $('councilAppointmentAct').value = '';
      if ($('councilAppointmentDate')) $('councilAppointmentDate').value = '';
      if ($('councilAppointmentDocUrl')) $('councilAppointmentDocUrl').value = '';
      if ($('councilPublishDate')) $('councilPublishDate').value = '';
      
      councilPhotoUrl = '';
      renderCouncilAvatarPreview('');
      if ($('councilPhotoAlt')) {
        $('councilPhotoAlt').value = '';
        delete $('councilPhotoAlt').dataset.manual;
      }
      if ($('councilPhotoProgress')) $('councilPhotoProgress').textContent = '';
      populateCouncilRelatedMemberSelect('');
      populateCouncilLegislationSelect('');
    }

    // Legislation Defaults (Simplified PDF Repository)
    if (currentType === 'legislation') {
      if ($('legisTitle')) {
        $('legisTitle').value = '';
        delete $('legisTitle').dataset.manual;
      }
      if ($('legisDocType')) $('legisDocType').value = 'Lei';
      if ($('legisDocumentDate')) $('legisDocumentDate').value = new Date().toISOString().slice(0, 10);
      if ($('legisYear')) $('legisYear').value = new Date().getFullYear();
      if ($('legisSummary')) $('legisSummary').value = '';
      if ($('legisSlug')) {
        $('legisSlug').value = '';
        delete $('legisSlug').dataset.manual;
      }
      legisPdfFile = null;
      renderLegisPdfPreview();
      if ($('legisPdfProgress')) $('legisPdfProgress').textContent = '';
    }

    if (clearSidebarActive) {
      document.querySelectorAll('.comtur-list-item').forEach(el => el.classList.remove('is-active'));
    }
  }

  // --- RENDER SIDEBAR LIST ---
  function renderList() {
    const listEl = $('list');
    if (!listEl) return;

    const query = $('searchInput') ? $('searchInput').value.toLowerCase().trim() : '';
    const activeId = $('id') ? $('id').value : '';

    const filtered = allItems.filter(item => {
      if (item.type !== currentType) return false;
      if (!query) return true;

      const title = (item.title || '').toLowerCase();
      const slug = (item.slug || '').toLowerCase();
      const meta = item.metadata || {};
      const docType = (meta.documentType || meta.docType || '').toLowerCase();
      const org = (meta.organization || meta.entity || '').toLowerCase();
      const role = (meta.councilRole || meta.role || '').toLowerCase();

      return title.includes(query) || slug.includes(query) || docType.includes(query) || org.includes(query) || role.includes(query);
    });

    if (!filtered.length) {
      listEl.innerHTML = \`<div class="comtur-empty">Nenhum item encontrado.</div>\`;
      return;
    }

    listEl.innerHTML = filtered.map(item => {
      const isActive = activeId === item._id;
      const status = item.status || 'draft';
      const statusLabel = STATUS_LABELS[status] || status;
      const statusClass = \`is-\${status}\`;

      // 1. Council Member Card
      if (item.type === 'council_member') {
        const meta = item.metadata || {};
        const role = meta.councilRole || meta.role || 'Conselheiro(a)';
        const org = meta.organization || meta.entity || meta.segment || 'COMTUR';
        const repType = meta.representationType || 'Titular';
        const memberStatus = meta.memberStatus || (item.status === 'published' ? 'Em exercício' : 'Rascunho');
        const photoUrl = (item.media && item.media.find(m => m.type === 'photo' || m.type === 'image' || m.type === 'avatar')?.url) || meta.photoUrl || (item.media && item.media[0]?.url) || '';
        
        return \`
          <button class="comtur-list-item \${isActive ? 'is-active' : ''}" type="button" data-id="\${item._id}" style="padding: 10px 12px; width: 100%; text-align: left;">
            <div style="display: flex; gap: 10px; align-items: center;">
              <div style="width: 40px; height: 40px; border-radius: 50%; overflow: hidden; background: #e2e8f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1.5px solid var(--comtur-primary);">
                \${photoUrl ? \`<img src="\${photoUrl}" alt="" style="width:100%;height:100%;object-fit:cover;">\` : \`<span style="font-size: 1.2rem;">👤</span>\`}
              </div>
              <div style="flex: 1; min-width: 0;">
                <div class="comtur-list-title" style="margin-bottom: 2px; font-weight: 700; font-size: 0.92rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">\${escapeHtml(item.title || 'Conselheiro sem nome')}</div>
                <div style="font-size: 0.78rem; color: var(--comtur-primary); font-weight: 600; line-height: 1.2;">\${escapeHtml(role)} • \${escapeHtml(repType)}</div>
                <div style="font-size: 0.75rem; color: var(--comtur-text-muted); line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">\${escapeHtml(org)}</div>
              </div>
            </div>
            <div class="comtur-list-meta" style="margin-top: 6px; display: flex; justify-content: space-between; align-items: center;">
              <span class="comtur-badge \${statusClass}">\${statusLabel}</span>
              <span style="font-size: 0.72rem; font-weight: 600; color: #475569; text-transform: uppercase;">\${escapeHtml(memberStatus)}</span>
            </div>
          </button>
        \`;
      }

      // 2. Legislation Card (Minimal PDF Repository)
      if (item.type === 'legislation') {
        const meta = item.metadata || {};
        const docType = meta.documentType || meta.docType || 'Documento';
        const docDate = meta.documentDate ? new Date(meta.documentDate).toLocaleDateString('pt-BR') : (item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('pt-BR') : '');
        const pdfAttached = (item.media && item.media.some(m => m.kind === 'document' || m.mimeType === 'application/pdf' || (m.url && m.url.toLowerCase().endsWith('.pdf')))) || !!meta.pdfFile;

        return \`
          <button class="comtur-list-item \${isActive ? 'is-active' : ''}" type="button" data-id="\${item._id}" style="padding: 10px 12px; width: 100%; text-align: left;">
            <div style="display: flex; gap: 10px; align-items: center;">
              <div style="width: 36px; height: 36px; border-radius: var(--comtur-radius-md); background: \${pdfAttached ? '#fee2e2' : '#f1f5f9'}; color: \${pdfAttached ? '#dc2626' : '#64748b'}; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0; font-weight: 800;">
                \${pdfAttached ? '📄' : '📝'}
              </div>
              <div style="flex: 1; min-width: 0;">
                <div class="comtur-list-title" style="font-weight: 700; font-size: 0.92rem; margin-bottom: 2px; color: var(--comtur-primary-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  \${escapeHtml(item.title || 'Sem título')}
                </div>
                <div style="display: flex; gap: 6px; align-items: center; font-size: 0.78rem; color: var(--comtur-text-muted); line-height: 1.2;">
                  <span style="font-weight: 600; color: var(--comtur-primary);">\${escapeHtml(docType)}</span>
                  \${docDate ? \`<span>• \${docDate}</span>\` : ''}
                </div>
              </div>
            </div>
            <div class="comtur-list-meta" style="margin-top: 6px; display: flex; justify-content: space-between; align-items: center;">
              <span class="comtur-badge \${statusClass}">\${statusLabel}</span>
              <span style="font-size: 0.72rem; font-weight: 600; color: \${pdfAttached ? '#16a34a' : '#94a3b8'};">\${pdfAttached ? 'PDF ANEXO' : 'SEM PDF'}</span>
            </div>
          </button>
        \`;
      }

      // 3. Default Standard Card
      return \`
        <button class="comtur-list-item \${isActive ? 'is-active' : ''}" type="button" data-id="\${item._id}">
          <div class="comtur-list-title">\${escapeHtml(item.title || 'Sem título')}</div>
          <div class="comtur-list-meta">
            <span class="comtur-badge \${statusClass}">\${statusLabel}</span>
            <span>\${item.slug ? '/' + item.slug : ''}</span>
            \${item.featured ? '<span title="Em destaque">⭐</span>' : ''}
          </div>
        </button>
      \`;
    }).join('');

    listEl.querySelectorAll('.comtur-list-item').forEach(btn => {
      btn.onclick = () => {
        const item = allItems.find(i => i._id === btn.dataset.id);
        if (item) loadItemForEdit(item);
      };
    });
  }

  // --- LOAD ITEM FOR EDIT ---
  function loadItemForEdit(item) {
    if (!item) return;

    // Switch Category Tab if Needed
    if (item.type !== currentType) {
      onContentTypeChange(item.type, true);
    }

    $('id').value = item._id || '';
    $('type').value = item.type || currentType;

    const typeConfig = CONTENT_TYPES.find(c => c.id === item.type) || CONTENT_TYPES[0];
    $('formTitle').textContent = \`Editar \${typeConfig.label}: \${item.title || ''}\`;
    
    const status = item.status || 'draft';
    $('statusBadge').textContent = STATUS_LABELS[status] || status;
    $('statusBadge').className = \`comtur-status-badge is-\${status}\`;

    const meta = item.metadata || {};
    const contact = item.contact || {};

    if (item.type === 'gastronomy') {
      $('gastroName').value = item.title || '';
      $('gastroSlug').value = item.slug || '';
      $('gastroSlug').dataset.manual = 'true';
      $('gastroCategory').value = meta.category || 'restaurante';
      $('gastroPriceLevel').value = meta.priceLevel || 'moderado';
      $('gastroSummary').value = item.summary || '';
      $('gastroSummaryCount').textContent = \`\${$('gastroSummary').value.length} / 250\`;
      $('gastroBody').value = item.body || '';
      $('gastroHighlightBadge').value = meta.highlightBadge || '';
      $('gastroSignatureDishes').value = meta.signatureDishes || '';

      // Address
      const addr = item.location || meta.address || {};
      $('gastroStreet').value = addr.street || '';
      $('gastroNumber').value = addr.number || '';
      $('gastroComplement').value = addr.complement || '';
      $('gastroNeighborhood').value = addr.neighborhood || '';
      $('gastroReferencePoint').value = addr.referencePoint || '';
      $('gastroGoogleMapsUrl').value = meta.googleMapsUrl || '';

      // Contact
      $('gastroPhone').value = contact.phone || '';
      $('gastroWhatsapp').value = contact.whatsapp || '';
      $('gastroEmail').value = contact.email || '';
      $('gastroWebsite').value = contact.website || '';
      $('gastroInstagram').value = contact.instagram || '';

      // Chips
      renderChips('gastroAmenitiesList', GASTRO_AMENITIES, meta.amenities || []);
      renderChips('gastroDietaryList', GASTRO_DIETARY, meta.dietary || []);
      renderChips('gastroAccessibilityList', GASTRO_ACCESSIBILITY, meta.accessibility || []);
      renderChips('gastroPaymentList', GASTRO_PAYMENT, meta.paymentMethods || []);
      renderChips('gastroLanguagesList', GASTRO_LANGUAGES, meta.languages || []);
      renderHoursTable(meta.openingHours || {}, 'gastroHoursTable');

      // Gallery
      gastroMedia = Array.isArray(item.media) ? item.media : [];
      gastroCoverUrl = meta.coverUrl || (gastroMedia.length ? gastroMedia[0].url : '');
      renderGastroGallery();

      // Flags
      $('gastroFeatured').checked = item.featured === true;
      $('gastroPublishDate').value = item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 10) : '';
      if ($('btnArchiveGastro')) $('btnArchiveGastro').style.display = item.status === 'archived' ? 'none' : 'inline-flex';

    } else if (item.type === 'attraction') {
      $('attractionName').value = item.title || '';
      $('attractionSlug').value = item.slug || '';
      $('attractionSlug').dataset.manual = 'true';
      $('attractionCategory').value = meta.category || 'nature';
      $('attractionPriceType').value = meta.priceType || 'free';
      $('attractionSummary').value = item.summary || '';
      $('attractionSummaryCount').textContent = \`\${$('attractionSummary').value.length} / 250\`;
      $('attractionBody').value = item.body || '';
      $('attractionHighlightBadge').value = meta.highlightBadge || '';
      $('attractionVisitDuration').value = meta.visitDuration || '';
      $('attractionBestTimeToVisit').value = meta.bestTimeToVisit || '';

      // Address
      const addr = item.location || meta.address || {};
      $('attractionStreet').value = addr.street || '';
      $('attractionNumber').value = addr.number || '';
      $('attractionComplement').value = addr.complement || '';
      $('attractionNeighborhood').value = addr.neighborhood || '';
      $('attractionReferencePoint').value = addr.referencePoint || '';
      $('attractionGoogleMapsUrl').value = meta.googleMapsUrl || '';

      // Contact
      $('attractionPhone').value = contact.phone || '';
      $('attractionWhatsapp').value = contact.whatsapp || '';
      $('attractionEmail').value = contact.email || '';
      $('attractionWebsite').value = contact.website || '';
      $('attractionInstagram').value = contact.instagram || '';

      // Chips
      renderChips('attractionProfilesList', ATTRACTION_PROFILES, meta.profiles || []);
      renderChips('attractionFeaturesList', ATTRACTION_FEATURES, meta.features || []);
      renderChips('attractionAccessibilityList', ATTRACTION_ACCESSIBILITY, meta.accessibility || []);
      renderChips('attractionRestrictionsList', ATTRACTION_RESTRICTIONS, meta.restrictions || []);
      renderChips('attractionPaymentList', ATTRACTION_PAYMENT, meta.paymentMethods || []);
      renderHoursTable(meta.openingHours || {}, 'attractionHoursTable');
      renderRelatedEntities('attractionRelatedEntitiesList', meta.relatedEntities || []);

      // Gallery
      attractionMedia = Array.isArray(item.media) ? item.media : [];
      attractionCoverUrl = meta.coverUrl || (attractionMedia.length ? attractionMedia[0].url : '');
      renderAttractionGallery();

      // Flags
      $('attractionFeatured').checked = item.featured === true;
      $('attractionPublishDate').value = item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 10) : '';
      if ($('btnArchiveAttraction')) $('btnArchiveAttraction').style.display = item.status === 'archived' ? 'none' : 'inline-flex';

    } else if (item.type === 'event') {
      $('eventName').value = item.title || '';
      $('eventSlug').value = item.slug || '';
      $('eventSlug').dataset.manual = 'true';
      $('eventCategory').value = meta.category || 'cultural';
      $('eventPriceType').value = meta.priceType || 'free';
      $('eventSummary').value = item.summary || '';
      $('eventSummaryCount').textContent = \`\${$('eventSummary').value.length} / 250\`;
      $('eventBody').value = item.body || '';
      $('eventHighlightBadge').value = meta.highlightBadge || '';
      $('eventStartDate').value = meta.startDate ? new Date(meta.startDate).toISOString().slice(0, 10) : '';
      $('eventEndDate').value = meta.endDate ? new Date(meta.endDate).toISOString().slice(0, 10) : '';
      $('eventStartTime').value = meta.startTime || '';
      $('eventEndTime').value = meta.endTime || '';

      // Address
      const addr = item.location || meta.address || {};
      $('eventStreet').value = addr.street || '';
      $('eventNumber').value = addr.number || '';
      $('eventComplement').value = addr.complement || '';
      $('eventNeighborhood').value = addr.neighborhood || '';
      $('eventReferencePoint').value = addr.referencePoint || '';
      $('eventGoogleMapsUrl').value = meta.googleMapsUrl || '';

      // Contact & Organizer
      $('eventOrganizerName').value = meta.organizerName || '';
      $('eventPhone').value = contact.phone || '';
      $('eventWhatsapp').value = contact.whatsapp || '';
      $('eventEmail').value = contact.email || '';
      $('eventWebsite').value = contact.website || '';
      $('eventInstagram').value = contact.instagram || '';
      $('eventTicketUrl').value = meta.ticketUrl || '';

      // Sub-lists & Chips
      eventSchedule = Array.isArray(meta.schedule) ? meta.schedule : [];
      renderEventSchedule();
      eventDates = Array.isArray(meta.dates) ? meta.dates : [];
      renderEventDates();
      eventDocs = Array.isArray(meta.docs) ? meta.docs : [];
      renderEventDocs();
      renderChips('eventAudiencesList', EVENT_AUDIENCES, meta.audiences || []);
      renderChips('eventFeaturesList', EVENT_FEATURES, meta.features || []);
      renderChips('eventAccessibilityList', EVENT_ACCESSIBILITY, meta.accessibility || []);
      renderRelatedEntities('eventRelatedEntitiesList', meta.relatedEntities || []);
      populateEventVenueSelect(meta.venueId || '');

      // Gallery
      eventMedia = Array.isArray(item.media) ? item.media : [];
      eventCoverUrl = meta.coverUrl || (eventMedia.length ? eventMedia[0].url : '');
      renderEventGallery();

      // Flags
      $('eventFeatured').checked = item.featured === true;
      $('eventPublishDate').value = item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 10) : '';
      if ($('btnArchiveEvent')) $('btnArchiveEvent').style.display = item.status === 'archived' ? 'none' : 'inline-flex';

    } else if (item.type === 'lodging') {
      $('lodgingName').value = item.title || '';
      $('lodgingSlug').value = item.slug || '';
      $('lodgingSlug').dataset.manual = 'true';
      $('lodgingCategory').value = meta.category || 'pousada';
      $('lodgingPriceRange').value = meta.priceRange || 'medio';
      $('lodgingSummary').value = item.summary || '';
      $('lodgingSummaryCount').textContent = \`\${$('lodgingSummary').value.length} / 250\`;
      $('lodgingBody').value = item.body || '';
      $('lodgingCheckinTime').value = meta.checkinTime || '14:00';
      $('lodgingCheckoutTime').value = meta.checkoutTime || '12:00';
      $('lodgingTotalUnits').value = meta.totalUnits || '';
      $('lodgingBookingUrl').value = meta.bookingUrl || '';
      $('lodgingCadastur').value = meta.cadastur || '';
      $('lodgingPetPolicy').value = meta.petPolicy || 'no';
      toggleLodgingPetWrap(meta.petPolicy || 'no');

      // Address
      const addr = item.location || meta.address || {};
      $('lodgingStreet').value = addr.street || '';
      $('lodgingNumber').value = addr.number || '';
      $('lodgingComplement').value = addr.complement || '';
      $('lodgingNeighborhood').value = addr.neighborhood || '';
      $('lodgingReferencePoint').value = addr.referencePoint || '';
      $('lodgingGoogleMapsUrl').value = meta.googleMapsUrl || '';

      // Contact
      $('lodgingPhone').value = contact.phone || '';
      $('lodgingWhatsapp').value = contact.whatsapp || '';
      $('lodgingEmail').value = contact.email || '';
      $('lodgingWebsite').value = contact.website || '';
      $('lodgingInstagram').value = contact.instagram || '';

      // Rooms & Chips
      lodgingRooms = Array.isArray(meta.rooms) ? meta.rooms : [];
      renderLodgingRooms();
      renderLodgingChips(meta);
      renderHoursTable(meta.openingHours || {}, 'lodgingHoursTable');
      renderRelatedEntities('lodgingRelatedEntitiesList', meta.relatedEntities || []);

      // Gallery
      lodgingMedia = Array.isArray(item.media) ? item.media : [];
      lodgingCoverUrl = meta.coverUrl || (lodgingMedia.length ? lodgingMedia[0].url : '');
      renderLodgingGallery();

      // Flags
      $('lodgingFeatured').checked = item.featured === true;
      $('lodgingPublishDate').value = item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 10) : '';
      if ($('btnArchiveLodging')) $('btnArchiveLodging').style.display = item.status === 'archived' ? 'none' : 'inline-flex';

    } else if (item.type === 'route') {
      $('routeName').value = item.title || '';
      $('routeSlug').value = item.slug || '';
      $('routeSlug').dataset.manual = 'true';
      $('routeCategory').value = meta.category || 'nature';
      $('routeDifficulty').value = meta.difficulty || 'easy';
      $('routeEstimatedTime').value = meta.estimatedTime || '';
      $('routeTotalDistance').value = meta.totalDistance || '';
      $('routeTransportType').value = meta.transportType || 'walk';
      $('routeSummary').value = item.summary || '';
      $('routeSummaryCount').textContent = \`\${$('routeSummary').value.length} / 250\`;
      $('routeBody').value = item.body || '';
      $('routeStartPoint').value = meta.startPoint || '';
      $('routeEndPoint').value = meta.endPoint || '';
      $('routeGpxUrl').value = meta.gpxUrl || '';
      $('routeGoogleMapsRouteUrl').value = meta.googleMapsRouteUrl || '';

      // Stops & Chips
      routeStops = Array.isArray(meta.stops) ? meta.stops : [];
      renderRouteStops();
      renderRouteChips(meta);
      renderRelatedEntities('routeRelatedEntitiesList', meta.relatedEntities || []);

      // Gallery
      routeMedia = Array.isArray(item.media) ? item.media : [];
      routeCoverUrl = meta.coverUrl || (routeMedia.length ? routeMedia[0].url : '');
      renderRouteGallery();

      // Flags
      $('routeFeatured').checked = item.featured === true;
      $('routePublishDate').value = item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 10) : '';
      if ($('btnArchiveRoute')) $('btnArchiveRoute').style.display = item.status === 'archived' ? 'none' : 'inline-flex';

    } else if (item.type === 'shopping') {
      $('shopName').value = item.title || '';
      $('shopSlug').value = item.slug || '';
      $('shopSlug').dataset.manual = 'true';
      $('shopCategory').value = meta.category || 'artesanato';
      $('shopPriceLevel').value = meta.priceLevel || 'moderado';
      $('shopSummary').value = item.summary || '';
      $('shopSummaryCount').textContent = \`\${$('shopSummary').value.length} / 250\`;
      $('shopBody').value = item.body || '';
      $('shopFeaturedProducts').value = meta.featuredProducts || '';
      $('shopOnlineStoreUrl').value = meta.onlineStoreUrl || '';
      $('shopDeliveryAvailable').checked = meta.deliveryAvailable === true;

      // Address
      const addr = item.location || meta.address || {};
      $('shopStreet').value = addr.street || '';
      $('shopNumber').value = addr.number || '';
      $('shopComplement').value = addr.complement || '';
      $('shopNeighborhood').value = addr.neighborhood || '';
      $('shopReferencePoint').value = addr.referencePoint || '';
      $('shopGoogleMapsUrl').value = meta.googleMapsUrl || '';

      // Contact
      $('shopPhone').value = contact.phone || '';
      $('shopWhatsapp').value = contact.whatsapp || '';
      $('shopEmail').value = contact.email || '';
      $('shopWebsite').value = contact.website || '';
      $('shopInstagram').value = contact.instagram || '';

      // Chips
      renderShopChips(meta);
      renderHoursTable(meta.openingHours || {}, 'shopHoursTable');
      renderRelatedEntities('shopRelatedEntitiesList', meta.relatedEntities || []);

      // Gallery
      shopMedia = Array.isArray(item.media) ? item.media : [];
      shopCoverUrl = meta.coverUrl || (shopMedia.length ? shopMedia[0].url : '');
      renderShopGallery();

      // Flags
      $('shopFeatured').checked = item.featured === true;
      $('shopPublishDate').value = item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 10) : '';
      if ($('btnArchiveShopping')) $('btnArchiveShopping').style.display = item.status === 'archived' ? 'none' : 'inline-flex';

    } else if (item.type === 'service') {
      $('svcName').value = item.title || '';
      $('svcSlug').value = item.slug || '';
      $('svcSlug').dataset.manual = 'true';
      $('svcCategory').value = meta.category || 'cat_turismo';
      $('svcServiceScope').value = meta.serviceScope || 'publico';
      $('svcSummary').value = item.summary || '';
      $('svcSummaryCount').textContent = \`\${$('svcSummary').value.length} / 250\`;
      $('svcBody').value = item.body || '';
      $('svcResponsibleEntity').value = meta.responsibleEntity || '';
      $('svcNoPhysicalAttendance').checked = meta.noPhysicalAttendance === true;
      $('svcIs24h').checked = meta.is24h === true;
      $('svcEmergencyPhone').value = meta.emergencyPhone || '';

      // Address
      const addr = item.location || meta.address || {};
      $('svcStreet').value = addr.street || '';
      $('svcNumber').value = addr.number || '';
      $('svcComplement').value = addr.complement || '';
      $('svcNeighborhood').value = addr.neighborhood || '';
      $('svcReferencePoint').value = addr.referencePoint || '';
      $('svcGoogleMapsUrl').value = meta.googleMapsUrl || '';

      // Contact
      $('svcPhone').value = contact.phone || '';
      $('svcWhatsapp').value = contact.whatsapp || '';
      $('svcEmail').value = contact.email || '';
      $('svcWebsite').value = contact.website || '';
      $('svcInstagram').value = contact.instagram || '';

      // Chips & Category fields
      renderServiceChips(meta);
      renderHoursTable(meta.openingHours || {}, 'svcHoursTable');
      renderRelatedEntities('svcRelatedEntitiesList', meta.relatedEntities || []);
      svcUsefulDocs = Array.isArray(meta.usefulDocs) ? meta.usefulDocs : [];
      renderServiceDocs();
      updateServiceCategorySpecificFields();

      // Gallery
      svcMedia = Array.isArray(item.media) ? item.media : [];
      svcCoverUrl = meta.coverUrl || (svcMedia.length ? svcMedia[0].url : '');
      renderServiceGallery();

      // Flags
      $('svcFeatured').checked = item.featured === true;
      $('svcPublishDate').value = item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 10) : '';
      if ($('btnArchiveService')) $('btnArchiveService').style.display = item.status === 'archived' ? 'none' : 'inline-flex';

    } else if (item.type === 'council_member') {
      $('councilName').value = item.title || '';
      $('councilDisplayName').value = meta.displayName || item.title || '';
      $('councilRole').value = meta.councilRole || meta.role || 'Conselheiro(a)';
      $('councilRepresentationType').value = meta.representationType || 'Titular';
      $('councilSlug').value = item.slug || '';
      $('councilSlug').dataset.manual = 'true';
      $('councilDisplayName').dataset.manual = 'true';
      if (meta.photoAlt) $('councilPhotoAlt').dataset.manual = 'true';

      $('councilOrganization').value = meta.organization || meta.entity || '';
      $('councilSegment').value = meta.segment || 'Poder Público';
      $('councilOrganizationRole').value = meta.organizationRole || '';
      $('councilTermStart').value = meta.termStart ? new Date(meta.termStart).toISOString().slice(0, 10) : (meta.termStart || '');
      $('councilTermEnd').value = meta.termEnd ? new Date(meta.termEnd).toISOString().slice(0, 10) : (meta.termEnd || '');
      $('councilMemberStatus').value = meta.memberStatus || (item.status === 'published' ? 'Em exercício' : 'Em exercício');
      populateCouncilRelatedMemberSelect(meta.relatedMemberId || '');
      $('councilIsCurrent').checked = meta.isCurrent !== false;

      $('councilBio').value = item.summary || meta.bio || '';
      $('councilProfessionalArea').value = meta.professionalArea || '';
      $('councilTourismExperience').value = meta.tourismExperience || '';
      $('councilPublicEmail').value = contact.email || meta.publicEmail || '';
      $('councilPublicPhone').value = contact.phone || meta.publicPhone || '';
      $('councilShowPublicContact').checked = meta.showPublicContact === true;

      $('councilDisplayOrder').value = meta.displayOrder !== undefined ? meta.displayOrder : 1;
      $('councilShowOnPortal').checked = meta.showOnPortal !== false;
      $('councilFeaturedTop').checked = item.featured === true || meta.featuredTop === true;

      $('councilAppointmentAct').value = meta.appointmentAct || '';
      $('councilAppointmentDate').value = meta.appointmentDate ? new Date(meta.appointmentDate).toISOString().slice(0, 10) : (meta.appointmentDate || '');
      $('councilAppointmentDocUrl').value = meta.appointmentDocUrl || '';
      populateCouncilLegislationSelect(meta.appointmentDocumentId || meta.legislationId || '');

      const memberPhoto = (item.media && item.media.find(m => m.type === 'photo' || m.type === 'image' || m.type === 'avatar')) || (item.media && item.media[0]);
      councilPhotoUrl = memberPhoto?.url || meta.photoUrl || '';
      $('councilPhotoAlt').value = meta.photoAlt || (memberPhoto?.caption || \`Foto de \${item.title || 'Conselheiro'}\`);
      renderCouncilAvatarPreview(councilPhotoUrl);

      $('councilPublishDate').value = item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 10) : '';
      if ($('btnArchiveCouncil')) $('btnArchiveCouncil').style.display = item.status === 'archived' ? 'none' : 'inline-flex';

    } else if (item.type === 'legislation') {
      if ($('legisTitle')) $('legisTitle').value = item.title || '';
      if ($('legisDocType')) $('legisDocType').value = meta.documentType || meta.docType || 'Lei';
      const docDate = meta.documentDate || item.publishedAt || '';
      if ($('legisDocumentDate')) $('legisDocumentDate').value = docDate ? new Date(docDate).toISOString().slice(0, 10) : '';
      if ($('legisYear')) $('legisYear').value = meta.year || (docDate ? new Date(docDate).getFullYear() : new Date().getFullYear());
      if ($('legisSummary')) $('legisSummary').value = item.summary || meta.description || meta.ementa || '';
      if ($('legisSlug')) {
        $('legisSlug').value = item.slug || '';
        $('legisSlug').dataset.manual = 'true';
      }

      // PDF Attachment
      const pdfMedia = (item.media && item.media.find(m => m.kind === 'document' || m.mimeType === 'application/pdf' || (m.url && m.url.toLowerCase().endsWith('.pdf')))) || null;
      if (meta.pdfFile && meta.pdfFile.url) {
        legisPdfFile = meta.pdfFile;
      } else if (pdfMedia && pdfMedia.url) {
        legisPdfFile = {
          url: pdfMedia.url,
          name: pdfMedia.originalName || pdfMedia.title || 'documento.pdf',
          originalName: pdfMedia.originalName || pdfMedia.title || 'documento.pdf',
          size: pdfMedia.size || 0,
          sizeFormatted: pdfMedia.size ? formatBytes(pdfMedia.size) : 'PDF',
          mimeType: 'application/pdf'
        };
      } else {
        legisPdfFile = null;
      }
      renderLegisPdfPreview();

      if ($('btnArchiveLegis')) $('btnArchiveLegis').style.display = item.status === 'archived' ? 'none' : 'inline-flex';

    } else {
      // Standard / Default
      $('stdTitle').value = item.title || '';
      $('stdSlug').value = item.slug || '';
      $('stdSlug').dataset.manual = 'true';
      $('stdSummary').value = item.summary || '';
      $('stdBody').value = item.body || '';
      $('stdLocation').value = (typeof item.location === 'string' ? item.location : item.location?.street) || '';
      $('sharedFeatured').checked = item.featured === true;
    }

    // Mark Sidebar Item as Active
    renderList();
  }

  // --- BUILD PAYLOAD ---
  function buildPayload(statusToSave) {
    if (currentType === 'gastronomy') {
      const name = $('gastroName').value.trim();
      const slug = slugify($('gastroSlug').value) || slugify(name);
      const category = $('gastroCategory').value;
      const priceLevel = $('gastroPriceLevel').value;
      const summary = $('gastroSummary').value.trim();
      const body = $('gastroBody').value.trim();
      const highlightBadge = $('gastroHighlightBadge').value.trim();
      const signatureDishes = $('gastroSignatureDishes').value.trim();
      const street = $('gastroStreet').value.trim();
      const number = $('gastroNumber').value.trim();
      const complement = $('gastroComplement').value.trim();
      const neighborhood = $('gastroNeighborhood').value.trim();
      const referencePoint = $('gastroReferencePoint').value.trim();
      const googleMapsUrl = $('gastroGoogleMapsUrl').value.trim();
      const phone = $('gastroPhone').value.trim();
      const whatsapp = $('gastroWhatsapp').value.trim();
      const email = $('gastroEmail').value.trim();
      const website = $('gastroWebsite').value.trim();
      const instagram = $('gastroInstagram').value.trim();
      const amenities = getSelectedChips('gastroAmenitiesList');
      const dietary = getSelectedChips('gastroDietaryList');
      const accessibility = getSelectedChips('gastroAccessibilityList');
      const paymentMethods = getSelectedChips('gastroPaymentList');
      const languages = getSelectedChips('gastroLanguagesList');
      const openingHours = getHoursData('gastroHoursTable');
      const featured = $('gastroFeatured').checked;
      const publishedAt = $('gastroPublishDate').value ? new Date($('gastroPublishDate').value).toISOString() : undefined;

      return {
        type: 'gastronomy',
        title: name,
        slug,
        summary,
        body,
        featured,
        publishedAt,
        status: statusToSave || 'draft',
        location: { street, number, complement, neighborhood, referencePoint },
        contact: { phone, whatsapp, email, website, instagram },
        metadata: {
          category,
          priceLevel,
          highlightBadge,
          signatureDishes,
          googleMapsUrl,
          amenities,
          dietary,
          accessibility,
          paymentMethods,
          languages,
          openingHours,
          coverUrl: gastroCoverUrl || (gastroMedia.length ? gastroMedia[0].url : '')
        },
        media: gastroMedia
      };
    }

    if (currentType === 'attraction') {
      const name = $('attractionName').value.trim();
      const slug = slugify($('attractionSlug').value) || slugify(name);
      const category = $('attractionCategory').value;
      const priceType = $('attractionPriceType').value;
      const summary = $('attractionSummary').value.trim();
      const body = $('attractionBody').value.trim();
      const highlightBadge = $('attractionHighlightBadge').value.trim();
      const visitDuration = $('attractionVisitDuration').value.trim();
      const bestTimeToVisit = $('attractionBestTimeToVisit').value.trim();
      const street = $('attractionStreet').value.trim();
      const number = $('attractionNumber').value.trim();
      const complement = $('attractionComplement').value.trim();
      const neighborhood = $('attractionNeighborhood').value.trim();
      const referencePoint = $('attractionReferencePoint').value.trim();
      const googleMapsUrl = $('attractionGoogleMapsUrl').value.trim();
      const phone = $('attractionPhone').value.trim();
      const whatsapp = $('attractionWhatsapp').value.trim();
      const email = $('attractionEmail').value.trim();
      const website = $('attractionWebsite').value.trim();
      const instagram = $('attractionInstagram').value.trim();
      const profiles = getSelectedChips('attractionProfilesList');
      const features = getSelectedChips('attractionFeaturesList');
      const accessibility = getSelectedChips('attractionAccessibilityList');
      const restrictions = getSelectedChips('attractionRestrictionsList');
      const paymentMethods = getSelectedChips('attractionPaymentList');
      const openingHours = getHoursData('attractionHoursTable');
      const relatedEntities = getSelectedChips('attractionRelatedEntitiesList');
      const featured = $('attractionFeatured').checked;
      const publishedAt = $('attractionPublishDate').value ? new Date($('attractionPublishDate').value).toISOString() : undefined;

      return {
        type: 'attraction',
        title: name,
        slug,
        summary,
        body,
        featured,
        publishedAt,
        status: statusToSave || 'draft',
        location: { street, number, complement, neighborhood, referencePoint },
        contact: { phone, whatsapp, email, website, instagram },
        metadata: {
          category,
          priceType,
          highlightBadge,
          visitDuration,
          bestTimeToVisit,
          googleMapsUrl,
          profiles,
          features,
          accessibility,
          restrictions,
          paymentMethods,
          openingHours,
          relatedEntities,
          coverUrl: attractionCoverUrl || (attractionMedia.length ? attractionMedia[0].url : '')
        },
        media: attractionMedia
      };
    }

    if (currentType === 'event') {
      const name = $('eventName').value.trim();
      const slug = slugify($('eventSlug').value) || slugify(name);
      const category = $('eventCategory').value;
      const priceType = $('eventPriceType').value;
      const summary = $('eventSummary').value.trim();
      const body = $('eventBody').value.trim();
      const highlightBadge = $('eventHighlightBadge').value.trim();
      const startDate = $('eventStartDate').value ? new Date($('eventStartDate').value).toISOString() : undefined;
      const endDate = $('eventEndDate').value ? new Date($('eventEndDate').value).toISOString() : undefined;
      const startTime = $('eventStartTime').value.trim();
      const endTime = $('eventEndTime').value.trim();
      const street = $('eventStreet').value.trim();
      const number = $('eventNumber').value.trim();
      const complement = $('eventComplement').value.trim();
      const neighborhood = $('eventNeighborhood').value.trim();
      const referencePoint = $('eventReferencePoint').value.trim();
      const googleMapsUrl = $('eventGoogleMapsUrl').value.trim();
      const organizerName = $('eventOrganizerName').value.trim();
      const phone = $('eventPhone').value.trim();
      const whatsapp = $('eventWhatsapp').value.trim();
      const email = $('eventEmail').value.trim();
      const website = $('eventWebsite').value.trim();
      const instagram = $('eventInstagram').value.trim();
      const ticketUrl = $('eventTicketUrl').value.trim();
      const venueId = $('eventVenueSelect').value || undefined;
      const audiences = getSelectedChips('eventAudiencesList');
      const features = getSelectedChips('eventFeaturesList');
      const accessibility = getSelectedChips('eventAccessibilityList');
      const relatedEntities = getSelectedChips('eventRelatedEntitiesList');
      const featured = $('eventFeatured').checked;
      const publishedAt = $('eventPublishDate').value ? new Date($('eventPublishDate').value).toISOString() : undefined;

      return {
        type: 'event',
        title: name,
        slug,
        summary,
        body,
        featured,
        publishedAt,
        status: statusToSave || 'draft',
        location: { street, number, complement, neighborhood, referencePoint },
        contact: { phone, whatsapp, email, website, instagram },
        metadata: {
          category,
          priceType,
          highlightBadge,
          startDate,
          endDate,
          startTime,
          endTime,
          organizerName,
          googleMapsUrl,
          ticketUrl,
          venueId,
          schedule: eventSchedule,
          dates: eventDates,
          docs: eventDocs,
          audiences,
          features,
          accessibility,
          relatedEntities,
          coverUrl: eventCoverUrl || (eventMedia.length ? eventMedia[0].url : '')
        },
        media: eventMedia
      };
    }

    if (currentType === 'lodging') {
      const name = $('lodgingName').value.trim();
      const slug = slugify($('lodgingSlug').value) || slugify(name);
      const category = $('lodgingCategory').value;
      const priceRange = $('lodgingPriceRange').value;
      const summary = $('lodgingSummary').value.trim();
      const body = $('lodgingBody').value.trim();
      const checkinTime = $('lodgingCheckinTime').value.trim();
      const checkoutTime = $('lodgingCheckoutTime').value.trim();
      const totalUnits = parseInt($('lodgingTotalUnits').value, 10) || undefined;
      const bookingUrl = $('lodgingBookingUrl').value.trim();
      const cadastur = $('lodgingCadastur').value.trim();
      const petPolicy = $('lodgingPetPolicy').value;
      const petFeeDetails = $('lodgingPetFeeDetails') ? $('lodgingPetFeeDetails').value.trim() : '';
      const street = $('lodgingStreet').value.trim();
      const number = $('lodgingNumber').value.trim();
      const complement = $('lodgingComplement').value.trim();
      const neighborhood = $('lodgingNeighborhood').value.trim();
      const referencePoint = $('lodgingReferencePoint').value.trim();
      const googleMapsUrl = $('lodgingGoogleMapsUrl').value.trim();
      const phone = $('lodgingPhone').value.trim();
      const whatsapp = $('lodgingWhatsapp').value.trim();
      const email = $('lodgingEmail').value.trim();
      const website = $('lodgingWebsite').value.trim();
      const instagram = $('lodgingInstagram').value.trim();
      const features = getSelectedChips('lodgingFeaturesList');
      const services = getSelectedChips('lodgingServicesList');
      const mealTypes = getSelectedChips('lodgingMealTypesList');
      const dietary = getSelectedChips('lodgingDietaryList');
      const accessibility = getSelectedChips('lodgingAccessibilityList');
      const paymentMethods = getSelectedChips('lodgingPaymentList');
      const openingHours = getHoursData('lodgingHoursTable');
      const relatedEntities = getSelectedChips('lodgingRelatedEntitiesList');
      const featured = $('lodgingFeatured').checked;
      const publishedAt = $('lodgingPublishDate').value ? new Date($('lodgingPublishDate').value).toISOString() : undefined;

      return {
        type: 'lodging',
        title: name,
        slug,
        summary,
        body,
        featured,
        publishedAt,
        status: statusToSave || 'draft',
        location: { street, number, complement, neighborhood, referencePoint },
        contact: { phone, whatsapp, email, website, instagram },
        metadata: {
          category,
          priceRange,
          checkinTime,
          checkoutTime,
          totalUnits,
          bookingUrl,
          cadastur,
          petPolicy,
          petFeeDetails,
          googleMapsUrl,
          features,
          services,
          mealTypes,
          dietary,
          accessibility,
          paymentMethods,
          rooms: lodgingRooms,
          openingHours,
          relatedEntities,
          coverUrl: lodgingCoverUrl || (lodgingMedia.length ? lodgingMedia[0].url : '')
        },
        media: lodgingMedia
      };
    }

    if (currentType === 'route') {
      const name = $('routeName').value.trim();
      const slug = slugify($('routeSlug').value) || slugify(name);
      const category = $('routeCategory').value;
      const difficulty = $('routeDifficulty').value;
      const estimatedTime = $('routeEstimatedTime').value.trim();
      const totalDistance = $('routeTotalDistance').value.trim();
      const transportType = $('routeTransportType').value;
      const summary = $('routeSummary').value.trim();
      const body = $('routeBody').value.trim();
      const startPoint = $('routeStartPoint').value.trim();
      const endPoint = $('routeEndPoint').value.trim();
      const gpxUrl = $('routeGpxUrl').value.trim();
      const googleMapsRouteUrl = $('routeGoogleMapsRouteUrl').value.trim();
      const audiences = getSelectedChips('routeAudiencesList');
      const seasons = getSelectedChips('routeSeasonsList');
      const accessibility = getSelectedChips('routeAccessibilityList');
      const relatedEntities = getSelectedChips('routeRelatedEntitiesList');
      const featured = $('routeFeatured').checked;
      const publishedAt = $('routePublishDate').value ? new Date($('routePublishDate').value).toISOString() : undefined;

      return {
        type: 'route',
        title: name,
        slug,
        summary,
        body,
        featured,
        publishedAt,
        status: statusToSave || 'draft',
        metadata: {
          category,
          difficulty,
          estimatedTime,
          totalDistance,
          transportType,
          startPoint,
          endPoint,
          gpxUrl,
          googleMapsRouteUrl,
          stops: routeStops,
          audiences,
          seasons,
          accessibility,
          relatedEntities,
          coverUrl: routeCoverUrl || (routeMedia.length ? routeMedia[0].url : '')
        },
        media: routeMedia
      };
    }

    if (currentType === 'shopping') {
      const name = $('shopName').value.trim();
      const slug = slugify($('shopSlug').value) || slugify(name);
      const category = $('shopCategory').value;
      const priceLevel = $('shopPriceLevel').value;
      const summary = $('shopSummary').value.trim();
      const body = $('shopBody').value.trim();
      const featuredProducts = $('shopFeaturedProducts').value.trim();
      const onlineStoreUrl = $('shopOnlineStoreUrl').value.trim();
      const deliveryAvailable = $('shopDeliveryAvailable').checked;
      const street = $('shopStreet').value.trim();
      const number = $('shopNumber').value.trim();
      const complement = $('shopComplement').value.trim();
      const neighborhood = $('shopNeighborhood').value.trim();
      const referencePoint = $('shopReferencePoint').value.trim();
      const googleMapsUrl = $('shopGoogleMapsUrl').value.trim();
      const phone = $('shopPhone').value.trim();
      const whatsapp = $('shopWhatsapp').value.trim();
      const email = $('shopEmail').value.trim();
      const website = $('shopWebsite').value.trim();
      const instagram = $('shopInstagram').value.trim();
      const products = getSelectedChips('shopProductsList');
      const paymentMethods = getSelectedChips('shopPaymentList');
      const accessibility = getSelectedChips('shopAccessibilityList');
      const openingHours = getHoursData('shopHoursTable');
      const relatedEntities = getSelectedChips('shopRelatedEntitiesList');
      const featured = $('shopFeatured').checked;
      const publishedAt = $('shopPublishDate').value ? new Date($('shopPublishDate').value).toISOString() : undefined;

      return {
        type: 'shopping',
        title: name,
        slug,
        summary,
        body,
        featured,
        publishedAt,
        status: statusToSave || 'draft',
        location: { street, number, complement, neighborhood, referencePoint },
        contact: { phone, whatsapp, email, website, instagram },
        metadata: {
          category,
          priceLevel,
          featuredProducts,
          onlineStoreUrl,
          deliveryAvailable,
          googleMapsUrl,
          products,
          paymentMethods,
          accessibility,
          openingHours,
          relatedEntities,
          coverUrl: shopCoverUrl || (shopMedia.length ? shopMedia[0].url : '')
        },
        media: shopMedia
      };
    }

    if (currentType === 'service') {
      const name = $('svcName').value.trim();
      const slug = slugify($('svcSlug').value) || slugify(name);
      const category = $('svcCategory').value;
      const serviceScope = $('svcServiceScope').value;
      const summary = $('svcSummary').value.trim();
      const body = $('svcBody').value.trim();
      const responsibleEntity = $('svcResponsibleEntity').value.trim();
      const noPhysicalAttendance = $('svcNoPhysicalAttendance').checked;
      const is24h = $('svcIs24h').checked;
      const emergencyPhone = $('svcEmergencyPhone').value.trim();
      const street = $('svcStreet').value.trim();
      const number = $('svcNumber').value.trim();
      const complement = $('svcComplement').value.trim();
      const neighborhood = $('svcNeighborhood').value.trim();
      const referencePoint = $('svcReferencePoint').value.trim();
      const googleMapsUrl = $('svcGoogleMapsUrl').value.trim();
      const phone = $('svcPhone').value.trim();
      const whatsapp = $('svcWhatsapp').value.trim();
      const email = $('svcEmail').value.trim();
      const website = $('svcWebsite').value.trim();
      const instagram = $('svcInstagram').value.trim();
      const securityFeatures = getSelectedChips('svcSecurityFeaturesList');
      const bankingFeatures = getSelectedChips('svcBankingFeaturesList');
      const gasFeatures = getSelectedChips('svcGasFeaturesList');
      const accessibility = getSelectedChips('svcAccessibilityList');
      const languages = getSelectedChips('svcLanguagesList');
      const openingHours = getHoursData('svcHoursTable');
      const relatedEntities = getSelectedChips('svcRelatedEntitiesList');
      const featured = $('svcFeatured').checked;
      const publishedAt = $('svcPublishDate').value ? new Date($('svcPublishDate').value).toISOString() : undefined;

      return {
        type: 'service',
        title: name,
        slug,
        summary,
        body,
        featured,
        publishedAt,
        status: statusToSave || 'draft',
        location: { street, number, complement, neighborhood, referencePoint },
        contact: { phone, whatsapp, email, website, instagram },
        metadata: {
          category,
          serviceScope,
          responsibleEntity,
          noPhysicalAttendance,
          is24h,
          emergencyPhone,
          googleMapsUrl,
          securityFeatures,
          bankingFeatures,
          gasFeatures,
          accessibility,
          languages,
          usefulDocs: svcUsefulDocs,
          openingHours,
          relatedEntities,
          coverUrl: svcCoverUrl || (svcMedia.length ? svcMedia[0].url : '')
        },
        media: svcMedia
      };
    }

    if (currentType === 'council_member') {
      const name = $('councilName').value.trim();
      const displayName = $('councilDisplayName').value.trim() || name;
      const slug = slugify($('councilSlug').value) || slugify(name);
      const role = $('councilRole').value;
      const repType = $('councilRepresentationType').value;
      const organization = $('councilOrganization').value.trim();
      const segment = $('councilSegment').value;
      const orgRole = $('councilOrganizationRole').value.trim();
      const termStart = $('councilTermStart').value || undefined;
      const termEnd = $('councilTermEnd').value || undefined;
      const memberStatus = $('councilMemberStatus').value;
      const relatedMemberId = $('councilRelatedMemberSelect').value || undefined;
      const isCurrent = $('councilIsCurrent').checked;
      const bio = $('councilBio').value.trim();
      const profArea = $('councilProfessionalArea').value.trim();
      const tourismExp = $('councilTourismExperience').value.trim();
      const publicEmail = $('councilPublicEmail').value.trim();
      const publicPhone = $('councilPublicPhone').value.trim();
      const showPublicContact = $('councilShowPublicContact').checked;
      const displayOrder = parseInt($('councilDisplayOrder').value, 10) || 1;
      const showOnPortal = $('councilShowOnPortal').checked;
      const featuredTop = $('councilFeaturedTop').checked;
      const appointmentAct = $('councilAppointmentAct').value.trim();
      const appointmentDate = $('councilAppointmentDate').value || undefined;
      const appointmentDocUrl = $('councilAppointmentDocUrl').value.trim();
      const appointmentDocumentId = $('councilLegislationSelect').value || undefined;
      const photoAlt = $('councilPhotoAlt').value.trim() || \`Foto de \${displayName}\`;
      const publishedAt = $('councilPublishDate').value ? new Date($('councilPublishDate').value).toISOString() : undefined;

      const media = [];
      if (councilPhotoUrl) {
        media.push({
          type: 'photo',
          url: councilPhotoUrl,
          caption: photoAlt,
          alt: photoAlt,
          order: 0
        });
      }

      return {
        type: 'council_member',
        title: name,
        slug,
        summary: bio,
        body: bio,
        featured: featuredTop,
        publishedAt,
        status: statusToSave || 'draft',
        contact: {
          email: publicEmail,
          phone: publicPhone,
          publicEmail,
          publicPhone
        },
        metadata: {
          name,
          displayName,
          councilRole: role,
          role,
          representationType: repType,
          organization,
          entity: organization,
          segment,
          organizationRole: orgRole,
          termStart,
          termEnd,
          memberStatus,
          relatedMemberId,
          isCurrent,
          bio,
          professionalArea: profArea,
          tourismExperience: tourismExp,
          publicEmail,
          publicPhone,
          showPublicContact,
          displayOrder,
          showOnPortal,
          featuredTop,
          appointmentAct,
          appointmentDate,
          appointmentDocUrl,
          appointmentDocumentId,
          legislationId: appointmentDocumentId,
          photoUrl: councilPhotoUrl || '',
          photoAlt
        },
        media
      };
    }

    if (currentType === 'legislation') {
      const title = $('legisTitle').value.trim();
      const docType = $('legisDocType').value;
      const documentDate = $('legisDocumentDate').value || undefined;
      const year = parseInt($('legisYear').value, 10) || (documentDate ? new Date(documentDate).getFullYear() : new Date().getFullYear());
      const summary = $('legisSummary').value.trim();
      const slug = slugify($('legisSlug').value) || slugify(title);
      const publishedAt = documentDate ? new Date(documentDate).toISOString() : (statusToSave === 'published' ? new Date().toISOString() : undefined);

      const media = [];
      if (legisPdfFile && legisPdfFile.url) {
        media.push({
          kind: 'document',
          title: title,
          url: legisPdfFile.url,
          mimeType: 'application/pdf',
          size: legisPdfFile.size,
          originalName: legisPdfFile.originalName || legisPdfFile.name,
          isAccessible: true
        });
      }

      return {
        type: 'legislation',
        title,
        slug,
        summary,
        body: summary,
        featured: false,
        publishedAt,
        status: statusToSave || 'draft',
        metadata: {
          title,
          documentType: docType,
          docType,
          documentDate,
          year,
          description: summary,
          pdfFile: legisPdfFile ? {
            ...legisPdfFile,
            title
          } : null,
          showOnPortal: true,
          featured: false
        },
        media
      };
    }

    // Default / Standard
    const name = $('stdTitle').value.trim();
    const slug = slugify($('stdSlug').value) || slugify(name);
    return {
      type: currentType,
      title: name,
      slug,
      summary: $('stdSummary').value.trim(),
      body: $('stdBody').value.trim(),
      location: $('stdLocation').value.trim(),
      featured: $('sharedFeatured').checked,
      status: statusToSave || 'draft'
    };
  }

  // --- SAVE ACTION ---
  window.saveContent = async function(statusToSave) {
    const data = buildPayload(statusToSave);

    if (!data.title) {
      showNotice('Por favor, informe o título / nome antes de salvar.', true);
      return;
    }
    if (!data.slug) {
      showNotice('Por favor, informe o slug / identificador na URL.', true);
      return;
    }

    const id = $('id').value;
    const url = id ? \`/api/comtur/admin/content/\${id}\` : '/api/comtur/admin/content';
    const method = id ? 'PUT' : 'POST';

    try {
      const send = (window.SemitSession && typeof SemitSession.fetchAuth === 'function')
        ? SemitSession.fetchAuth.bind(SemitSession)
        : fetch;
      const res = await send(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (!res.ok) {
        showNotice(result.error || result.message || 'Erro ao salvar conteúdo.', true);
        return;
      }

      showNotice(\`Conteúdo salvo com sucesso como "\${STATUS_LABELS[statusToSave] || statusToSave}"!\`);
      await loadItems();
      const savedItem = allItems.find(i => i._id === (id || result._id || result.data?._id || result.item?._id));
      if (savedItem) loadItemForEdit(savedItem);
    } catch (err) {
      showNotice('Erro de rede ao salvar conteúdo.', true);
    }
  };

  // --- LOAD ALL ITEMS FROM API ---
  async function loadItems() {
    const listEl = $('list');
    try {
      const send = (window.SemitSession && typeof SemitSession.fetchAuth === 'function')
        ? SemitSession.fetchAuth.bind(SemitSession)
        : fetch;
      const res = await send('/api/comtur/admin/content');
      if (!res.ok) throw new Error(\`HTTP \${res.status}: Falha ao carregar conteúdos\`);
      const data = await res.json();
      allItems = Array.isArray(data) ? data : (data.data || data.items || []);
      renderList();

      const currentItem = allItems.find(i => i._id === $('id').value);
      if (currentType === 'attraction') {
        renderRelatedEntities('attractionRelatedEntitiesList', currentItem?.metadata?.relatedEntities || []);
      } else if (currentType === 'event') {
        populateEventVenueSelect(currentItem?.metadata?.venueId || '');
        renderRelatedEntities('eventRelatedEntitiesList', currentItem?.metadata?.relatedEntities || []);
      } else if (currentType === 'lodging') {
        renderRelatedEntities('lodgingRelatedEntitiesList', currentItem?.metadata?.relatedEntities || []);
      } else if (currentType === 'route') {
        renderRelatedEntities('routeRelatedEntitiesList', currentItem?.metadata?.relatedEntities || []);
      } else if (currentType === 'shopping') {
        renderRelatedEntities('shopRelatedEntitiesList', currentItem?.metadata?.relatedEntities || []);
      } else if (currentType === 'service') {
        renderRelatedEntities('svcRelatedEntitiesList', currentItem?.metadata?.relatedEntities || []);
      } else if (currentType === 'council_member') {
        populateCouncilRelatedMemberSelect(currentItem?.metadata?.relatedMemberId || '');
        populateCouncilLegislationSelect(currentItem?.metadata?.appointmentDocumentId || currentItem?.metadata?.legislationId || '');
      }
    } catch (err) {
      console.error('loadItems error:', err);
      if (listEl) {
        listEl.innerHTML = \`
          <div class="comtur-empty" style="color:var(--comtur-danger); padding: 16px 12px; text-align: center;">
            <div style="margin-bottom: 8px; font-weight: 600;">Não foi possível carregar os documentos.</div>
            <button type="button" class="comtur-btn comtur-btn-secondary comtur-btn-sm" onclick="loadItems()">🔄 Tentar novamente</button>
          </div>
        \`;
      }
    }
  }
  window.loadItems = loadItems;

  // --- INITIALIZATION ---
  function init() {
    const params = new URLSearchParams(window.location.search);
    const initialType = normalizeType(params.get('type') || params.get('category') || 'event');

    // 1. Event Listeners
    if ($('eventName')) {
      $('eventName').addEventListener('input', () => {
        if (!$('id').value && $('eventSlug') && !$('eventSlug').dataset.manual) {
          $('eventSlug').value = slugify($('eventName').value);
        }
      });
    }
    if ($('eventSlug')) {
      $('eventSlug').addEventListener('input', () => {
        $('eventSlug').dataset.manual = 'true';
      });
    }
    if ($('eventSummary')) {
      $('eventSummary').addEventListener('input', () => {
        if ($('eventSummaryCount')) $('eventSummaryCount').textContent = \`\${$('eventSummary').value.length} / 250\`;
      });
    }
    if ($('eventMultipleDates')) {
      $('eventMultipleDates').addEventListener('change', () => {
        if ($('eventDatesWrap')) $('eventDatesWrap').style.display = $('eventMultipleDates').checked ? 'block' : 'none';
        if ($('eventMultipleDates').checked && !eventDates.length) {
          eventDates.push({ date: '', startTime: '', endTime: '', label: '' });
          renderEventDates();
        }
      });
    }
    if ($('btnAddEventDate')) {
      $('btnAddEventDate').addEventListener('click', () => {
        eventDates.push({ date: '', startTime: '', endTime: '', label: '' });
        renderEventDates();
      });
    }
    if ($('btnAddEventSchedule')) {
      $('btnAddEventSchedule').addEventListener('click', () => {
        eventSchedule.push({ time: '', title: '', stage: '', performer: '', description: '' });
        renderEventSchedule();
      });
    }
    if ($('btnAddEventDoc')) {
      $('btnAddEventDoc').addEventListener('click', () => {
        eventDocs.push({ title: '', url: '', description: '' });
        renderEventDocs();
      });
    }
    if ($('eventFileInput')) {
      $('eventFileInput').addEventListener('change', (e) => {
        uploadMediaFiles(Array.from(e.target.files), eventMedia, 'eventUploadProgress', () => {
          if (!eventCoverUrl && eventMedia.length) eventCoverUrl = eventMedia[0].url;
          renderEventGallery();
        });
        e.target.value = '';
      });
    }

    // 2. Attraction Listeners
    if ($('attractionName')) {
      $('attractionName').addEventListener('input', () => {
        if (!$('id').value && $('attractionSlug') && !$('attractionSlug').dataset.manual) {
          $('attractionSlug').value = slugify($('attractionName').value);
        }
      });
    }
    if ($('attractionSlug')) {
      $('attractionSlug').addEventListener('input', () => {
        $('attractionSlug').dataset.manual = 'true';
      });
    }
    if ($('attractionSummary')) {
      $('attractionSummary').addEventListener('input', () => {
        if ($('attractionSummaryCount')) $('attractionSummaryCount').textContent = \`\${$('attractionSummary').value.length} / 250\`;
      });
    }
    if ($('attractionFreeVisit')) {
      $('attractionFreeVisit').addEventListener('change', () => {
        if ($('attractionHoursWrap')) $('attractionHoursWrap').style.display = $('attractionFreeVisit').checked ? 'none' : 'block';
      });
    }
    if ($('attractionFileInput')) {
      $('attractionFileInput').addEventListener('change', (e) => {
        uploadMediaFiles(Array.from(e.target.files), attractionMedia, 'attractionUploadProgress', () => {
          if (!attractionCoverUrl && attractionMedia.length) attractionCoverUrl = attractionMedia[0].url;
          renderAttractionGallery();
        });
        e.target.value = '';
      });
    }

    // 3. Gastronomy Listeners
    if ($('gastroName')) {
      $('gastroName').addEventListener('input', () => {
        if (!$('id').value && $('gastroSlug') && !$('gastroSlug').dataset.manual) {
          $('gastroSlug').value = slugify($('gastroName').value);
        }
      });
    }
    if ($('gastroSlug')) {
      $('gastroSlug').addEventListener('input', () => {
        $('gastroSlug').dataset.manual = 'true';
      });
    }
    if ($('gastroSummary')) {
      $('gastroSummary').addEventListener('input', () => {
        if ($('gastroSummaryCount')) $('gastroSummaryCount').textContent = \`\${$('gastroSummary').value.length} / 250\`;
      });
    }
    if ($('gastroFileInput')) {
      $('gastroFileInput').addEventListener('change', (e) => {
        uploadMediaFiles(Array.from(e.target.files), gastroMedia, 'gastroUploadProgress', () => {
          if (!gastroCoverUrl && gastroMedia.length) gastroCoverUrl = gastroMedia[0].url;
          renderGastroGallery();
        });
        e.target.value = '';
      });
    }

    // 4. Lodging Listeners
    if ($('lodgingName')) {
      $('lodgingName').addEventListener('input', () => {
        if (!$('id').value && $('lodgingSlug') && !$('lodgingSlug').dataset.manual) {
          $('lodgingSlug').value = slugify($('lodgingName').value);
        }
      });
    }
    if ($('lodgingSlug')) {
      $('lodgingSlug').addEventListener('input', () => {
        $('lodgingSlug').dataset.manual = 'true';
      });
    }
    if ($('lodgingSummary')) {
      $('lodgingSummary').addEventListener('input', () => {
        if ($('lodgingSummaryCount')) $('lodgingSummaryCount').textContent = \`\${$('lodgingSummary').value.length} / 250\`;
      });
    }
    if ($('btnAddLodgingRoom')) {
      $('btnAddLodgingRoom').addEventListener('click', () => {
        lodgingRooms.push({ name: '', capacity: 2, unitsCount: 1, bedType: '', price: '', amenities: ['ac', 'private_bathroom', 'tv', 'wifi', 'minibar'], description: '' });
        renderLodgingRooms();
      });
    }
    if ($('lodgingFileInput')) {
      $('lodgingFileInput').addEventListener('change', (e) => {
        uploadMediaFiles(Array.from(e.target.files), lodgingMedia, 'lodgingUploadProgress', () => {
          if (!lodgingCoverUrl && lodgingMedia.length) lodgingCoverUrl = lodgingMedia[0].url;
          renderLodgingGallery();
        });
        e.target.value = '';
      });
    }

    // 5. Route Listeners
    if ($('routeName')) {
      $('routeName').addEventListener('input', () => {
        if (!$('id').value && $('routeSlug') && !$('routeSlug').dataset.manual) {
          $('routeSlug').value = slugify($('routeName').value);
        }
      });
    }
    if ($('routeSlug')) {
      $('routeSlug').addEventListener('input', () => {
        $('routeSlug').dataset.manual = 'true';
      });
    }
    if ($('routeSummary')) {
      $('routeSummary').addEventListener('input', () => {
        if ($('routeSummaryCount')) $('routeSummaryCount').textContent = \`\${$('routeSummary').value.length} / 250\`;
      });
    }
    if ($('btnAddRouteStop')) {
      $('btnAddRouteStop').addEventListener('click', () => {
        routeStops.push({ stopType: 'attraction', entityId: '', title: '', customName: '', address: '', duration: '', description: '' });
        renderRouteStops();
      });
    }
    if ($('routeFileInput')) {
      $('routeFileInput').addEventListener('change', (e) => {
        uploadMediaFiles(Array.from(e.target.files), routeMedia, 'routeUploadProgress', () => {
          if (!routeCoverUrl && routeMedia.length) routeCoverUrl = routeMedia[0].url;
          renderRouteGallery();
        });
        e.target.value = '';
      });
    }

    // 6. Shopping Listeners
    if ($('shopName')) {
      $('shopName').addEventListener('input', () => {
        if (!$('id').value && $('shopSlug') && !$('shopSlug').dataset.manual) {
          $('shopSlug').value = slugify($('shopName').value);
        }
      });
    }
    if ($('shopSlug')) {
      $('shopSlug').addEventListener('input', () => {
        $('shopSlug').dataset.manual = 'true';
      });
    }
    if ($('shopSummary')) {
      $('shopSummary').addEventListener('input', () => {
        if ($('shopSummaryCount')) $('shopSummaryCount').textContent = \`\${$('shopSummary').value.length} / 250\`;
      });
    }
    if ($('shopFileInput')) {
      $('shopFileInput').addEventListener('change', (e) => {
        uploadMediaFiles(Array.from(e.target.files), shopMedia, 'shopUploadProgress', () => {
          if (!shopCoverUrl && shopMedia.length) shopCoverUrl = shopMedia[0].url;
          renderShopGallery();
        });
        e.target.value = '';
      });
    }

    // 7. Service Listeners
    if ($('svcName')) {
      $('svcName').addEventListener('input', () => {
        if (!$('id').value && $('svcSlug') && !$('svcSlug').dataset.manual) {
          $('svcSlug').value = slugify($('svcName').value);
        }
      });
    }
    if ($('svcSlug')) {
      $('svcSlug').addEventListener('input', () => {
        $('svcSlug').dataset.manual = 'true';
      });
    }
    if ($('svcSummary')) {
      $('svcSummary').addEventListener('input', () => {
        if ($('svcSummaryCount')) $('svcSummaryCount').textContent = \`\${$('svcSummary').value.length} / 250\`;
      });
    }
    if ($('svcCategory')) {
      $('svcCategory').addEventListener('change', () => {
        updateServiceCategorySpecificFields();
      });
    }
    if ($('svcIs24h')) {
      $('svcIs24h').addEventListener('change', (e) => {
        syncService24h(e.target.checked);
      });
    }
    if ($('svcOpen24h')) {
      $('svcOpen24h').addEventListener('change', (e) => {
        syncService24h(e.target.checked);
      });
    }
    if ($('svcNoPhysicalAttendance')) {
      $('svcNoPhysicalAttendance').addEventListener('change', (e) => {
        const isNoPhys = e.target.checked;
        const reqStreet = $('svcStreetReq');
        const reqNeigh = $('svcNeighborhoodReq');
        if (reqStreet) reqStreet.style.display = isNoPhys ? 'none' : 'inline';
        if (reqNeigh) reqNeigh.style.display = isNoPhys ? 'none' : 'inline';
      });
    }
    if ($('btnAddSvcDoc')) {
      $('btnAddSvcDoc').addEventListener('click', () => {
        svcUsefulDocs.push({ title: '', type: 'link', url: '', description: '' });
        renderServiceDocs();
      });
    }
    if ($('svcFileInput')) {
      $('svcFileInput').addEventListener('change', (e) => {
        uploadMediaFiles(Array.from(e.target.files), svcMedia, 'svcUploadProgress', () => {
          if (!svcCoverUrl && svcMedia.length) svcCoverUrl = svcMedia[0].url;
          renderServiceGallery();
        });
        e.target.value = '';
      });
    }

    // 8. Council Member Listeners
    if ($('councilName')) {
      $('councilName').addEventListener('input', () => {
        const val = $('councilName').value;
        if (!$('id').value && $('councilSlug') && !$('councilSlug').dataset.manual) {
          $('councilSlug').value = slugify(val);
        }
        if ($('councilDisplayName') && !$('councilDisplayName').dataset.manual) {
          $('councilDisplayName').value = val;
        }
        if ($('councilPhotoAlt') && !$('councilPhotoAlt').dataset.manual) {
          $('councilPhotoAlt').value = val ? \`Foto de \${val}\` : '';
        }
      });
    }
    if ($('councilDisplayName')) {
      $('councilDisplayName').addEventListener('input', () => {
        $('councilDisplayName').dataset.manual = 'true';
        if ($('councilPhotoAlt') && !$('councilPhotoAlt').dataset.manual) {
          const val = $('councilDisplayName').value || $('councilName').value;
          $('councilPhotoAlt').value = val ? \`Foto de \${val}\` : '';
        }
      });
    }
    if ($('councilSlug')) {
      $('councilSlug').addEventListener('input', () => {
        $('councilSlug').dataset.manual = 'true';
      });
    }
    if ($('councilPhotoAlt')) {
      $('councilPhotoAlt').addEventListener('input', () => {
        $('councilPhotoAlt').dataset.manual = 'true';
      });
    }
    if ($('councilPhotoInput')) {
      $('councilPhotoInput').addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          uploadCouncilPhoto(e.target.files[0]);
        }
        e.target.value = '';
      });
    }
    if ($('btnRemoveCouncilPhoto')) {
      $('btnRemoveCouncilPhoto').addEventListener('click', () => {
        councilPhotoUrl = '';
        renderCouncilAvatarPreview('');
      });
    }

    // 9. Legislation Listeners (Simplified)
    if ($('legisDocumentDate')) {
      $('legisDocumentDate').addEventListener('change', () => {
        if ($('legisDocumentDate').value && $('legisYear')) {
          $('legisYear').value = new Date($('legisDocumentDate').value).getFullYear();
        }
      });
    }
    if ($('legisTitle')) {
      $('legisTitle').addEventListener('input', () => {
        $('legisTitle').dataset.manual = 'true';
        if (!$('id').value && $('legisSlug') && !$('legisSlug').dataset.manual) {
          $('legisSlug').value = slugify($('legisTitle').value);
        }
      });
    }
    if ($('legisSlug')) {
      $('legisSlug').addEventListener('input', () => {
        $('legisSlug').dataset.manual = 'true';
      });
    }
    if ($('legisPdfFileInput')) {
      $('legisPdfFileInput').addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          uploadLegisPdf(e.target.files[0]);
        }
        e.target.value = '';
      });
    }

    // 10. Standard / Global Listeners
    if ($('stdTitle')) {
      $('stdTitle').addEventListener('input', () => {
        if (!$('id').value && $('stdSlug') && !$('stdSlug').dataset.manual) {
          $('stdSlug').value = slugify($('stdTitle').value);
        }
      });
    }
    if ($('stdSlug')) {
      $('stdSlug').addEventListener('input', () => {
        $('stdSlug').dataset.manual = 'true';
      });
    }

    // Category Selector
    if ($('contentTypeSelector')) {
      $('contentTypeSelector').addEventListener('change', (e) => {
        onContentTypeChange(e.target.value, true);
      });
    }

    // Search Input
    if ($('searchInput')) {
      $('searchInput').addEventListener('input', renderList);
    }

    // New item button
    if ($('btnNew')) {
      $('btnNew').addEventListener('click', () => resetForm(true));
    }

    // Browser History PopState
    window.addEventListener('popstate', (e) => {
      const type = (e.state && e.state.type) || new URLSearchParams(window.location.search).get('type') || 'event';
      onContentTypeChange(type, false);
    });

    // Initial Category Activation & Load
    onContentTypeChange(initialType, false);
    loadItems();
  }

  // Run init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
`;

const finalFileContent = htmlPortion + '\n' + cleanJs + '\n' + closingPortion;
fs.writeFileSync(filePath, finalFileContent, 'utf8');
console.log('Successfully wrote clean, full javascript block to comtur-content-admin.html!');
