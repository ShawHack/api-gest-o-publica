import 'package:flutter/material.dart';
import 'package:prefeitura_app/features/garca_pet/domain/institutional/garca_pet_media_urls.dart';

enum InstitutionalPageId {
  sobre,
  castracao,
  vacinacao,
  sama,
  zoologico,
}

class InstitutionalSection {
  const InstitutionalSection({
    required this.title,
    this.paragraphs = const [],
    this.bullets = const [],
  });

  final String title;
  final List<String> paragraphs;
  final List<String> bullets;
}

class InstitutionalPageContent {
  const InstitutionalPageContent({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.heroImageUrl,
    required this.icon,
    required this.sections,
    this.badges = const [],
    this.contactLines = const [],
  });

  final InstitutionalPageId id;
  final String title;
  final String subtitle;
  final String? heroImageUrl;
  final IconData icon;
  final List<String> badges;
  final List<InstitutionalSection> sections;
  final List<String> contactLines;
}

/// Conteúdos institucionais espelhando o site GarçaPet (`/garcapet/*`).
abstract final class InstitutionalContent {
  static const contactPhone = '(14) 3407-6600';
  static const contactEmail = 'sama@garca.sp.gov.br';
  static const contactAddress = 'Rua Vital Soares, 670 - Williams - Garça/SP';

  static List<InstitutionalPageContent> all() => [
        sobre,
        castracao,
        vacinacao,
        sama,
        zoologico,
      ];

  static InstitutionalPageContent? byId(InstitutionalPageId id) {
    for (final page in all()) {
      if (page.id == id) return page;
    }
    return null;
  }

  static final sobre = InstitutionalPageContent(
    id: InstitutionalPageId.sobre,
    title: 'Sobre o GarçaPet',
    subtitle: 'Tecnologia e compaixão a serviço dos animais de Garça',
    heroImageUrl: GarcaPetMediaUrls.samaMedia(
      'sobre.24e78844b929350861d2.png',
    ),
    icon: Icons.pets,
    badges: ['Adoção responsável', 'Transparência', 'Gestão pública'],
    sections: [
      InstitutionalSection(
        title: 'O que é o Garça Pet',
        paragraphs: [
          'O Garça Pet é uma plataforma digital desenvolvida pela Prefeitura Municipal de Garça. O projeto nasceu da união entre tecnologia e compaixão, com o objetivo de transformar a realidade da causa animal na cidade, criando pontes entre quem quer ajudar e os animais que mais precisam.',
          'Por meio de uma plataforma integrada, facilitamos processos que antes eram burocráticos ou desconhecidos pela população, trazendo transparência e eficiência para a gestão da fauna urbana.',
        ],
      ),
      InstitutionalSection(
        title: 'Nossa missão',
        paragraphs: [
          'O Garça Pet foi criado para organizar, fortalecer e dar visibilidade às ações de adoção de pets no município, centralizando informações e facilitando o contato entre animais que aguardam um lar e pessoas interessadas em adotar de forma consciente e responsável.',
          'Mais do que divulgar animais, o Garça Pet incentiva escolhas duradouras, baseadas no respeito à vida animal e na responsabilidade a longo prazo.',
        ],
      ),
      InstitutionalSection(
        title: 'Como funciona',
        bullets: [
          'Qualquer usuário cadastrado pode divulgar um pet que precise de um novo lar.',
          'Interessados conhecem os pets disponíveis e iniciam o processo de adoção com seriedade.',
          'A SAMA acompanha denúncias, solicitações de plantio de árvores e ações de bem-estar animal.',
          'Ao conectar a Secretaria de Meio Ambiente à população, o Garça Pet acelera atendimentos e aumenta as chances de um animal encontrar um lar.',
        ],
      ),
    ],
    contactLines: [
      'Dúvidas: $contactPhone',
      contactEmail,
      contactAddress,
    ],
  );

  static final castracao = InstitutionalPageContent(
    id: InstitutionalPageId.castracao,
    title: 'Castração',
    subtitle: 'Campanha de Castração Solidária',
    heroImageUrl: GarcaPetMediaUrls.samaMedia(
      'castracaoimg.c3fae5a2463b257c3638.png',
    ),
    icon: Icons.health_and_safety_outlined,
    badges: ['Gratuita', 'Saúde pública', 'Bem-estar animal'],
    sections: [
      InstitutionalSection(
        title: 'A importância da castração',
        paragraphs: [
          'A castração é muito mais do que um procedimento cirúrgico: é um ato fundamental de responsabilidade social e cuidado com a saúde pública e o bem-estar animal.',
          'Ao optar pela castração, você contribui diretamente para o controle populacional, evitando que milhares de animais acabem em situações de abandono e sofrimento nas ruas.',
        ],
      ),
      InstitutionalSection(
        title: 'Benefícios da castração responsável',
        bullets: [
          'Reduz comportamentos indesejados e agressividade por dominância.',
          'Em fêmeas, diminui drasticamente o risco de câncer de mama e infecções uterinas.',
          'Em machos, previne tumores de testículo e problemas na próstata.',
          'Contribui para uma cidade mais saudável para pessoas e animais.',
        ],
      ),
      InstitutionalSection(
        title: 'Como participar',
        paragraphs: [
          'Castrar um animal é uma decisão de amor e responsabilidade. O processo envolve etapas importantes para garantir a segurança e o bem-estar do seu pet.',
        ],
        bullets: [
          '1. Solicite a castração pela plataforma ou presencialmente na SAMA.',
          '2. Com o comprovante em mãos, dirija-se à SAMA no Bosque Municipal para obter a autorização (segunda a sexta, 8h às 16h).',
          '3. Agende o procedimento na Clínica Bichos e Cia — Av. Dr. Labieno da Costa Machado, 5, Garça/SP.',
        ],
      ),
      InstitutionalSection(
        title: 'Programa municipal',
        paragraphs: [
          'A Prefeitura de Garça, através da SAMA e SEMADS, oferece acesso a esse procedimento vital para famílias de baixa renda, garantindo que a situação financeira não seja um impedimento para o cuidado responsável com nossos amigos de quatro patas.',
        ],
      ),
    ],
    contactLines: [
      'Dúvidas? Entre em contato com a SAMA ou SEMADS.',
      contactPhone,
      contactEmail,
    ],
  );

  static final vacinacao = InstitutionalPageContent(
    id: InstitutionalPageId.vacinacao,
    title: 'Vacinação',
    subtitle: 'Campanha de Vacinação Antirrábica',
    heroImageUrl: GarcaPetMediaUrls.vacinacaoBannerMobile,
    icon: Icons.vaccines_outlined,
    badges: ['Gratuita', 'Saúde animal', 'Prevenção da raiva'],
    sections: [
      InstitutionalSection(
        title: 'Campanha de Vacinação Antirrábica',
        paragraphs: [
          'A Prefeitura Municipal disponibiliza vacinação antirrábica gratuita para cães e gatos, com o objetivo de proteger os animais e reduzir o risco de transmissão da raiva para a população.',
        ],
      ),
      InstitutionalSection(
        title: 'A importância da vacinação',
        bullets: [
          'Medida essencial de saúde pública e proteção animal.',
          'Contribui para o controle da raiva e para a segurança da população.',
          'Mantém cães e gatos protegidos contra uma doença grave e fatal.',
          'Reforça a responsabilidade dos tutores com o bem-estar dos pets.',
        ],
      ),
      InstitutionalSection(
        title: 'Benefícios da vacinação responsável',
        bullets: [
          'Prevenção: reduz o risco de infecção e transmissão da raiva.',
          'Proteção coletiva: fortalece a cobertura vacinal no município.',
          'Cuidado contínuo: reforça o acompanhamento anual dos animais.',
          'Acesso gratuito: facilita a adesão das famílias ao cuidado preventivo.',
        ],
      ),
      InstitutionalSection(
        title: 'O que você precisa saber',
        bullets: [
          'Animais com menos de 6 meses não devem ser vacinados.',
          'Cadelas prenhas não devem receber a vacina antirrábica.',
          'Não é obrigatório apresentar carteira de vacinação.',
          'Não é necessário cadastro prévio para atendimento.',
          'Cães devem estar com guia; gatos, em caixa de transporte.',
        ],
      ),
    ],
    contactLines: [
      contactPhone,
      contactEmail,
      contactAddress,
    ],
  );

  static final sama = InstitutionalPageContent(
    id: InstitutionalPageId.sama,
    title: 'Conheça a SAMA',
    subtitle: 'Secretaria de Agricultura e Meio Ambiente',
    heroImageUrl: GarcaPetMediaUrls.samaMedia(
      'capasama.bab15cca48e95b644622.png',
    ),
    icon: Icons.eco_outlined,
    badges: ['Meio ambiente', 'Agricultura', 'Fauna urbana'],
    sections: [
      InstitutionalSection(
        title: 'SAMA — Secretaria de Agricultura e Meio Ambiente',
        paragraphs: [
          'A SAMA é o braço da Prefeitura Municipal de Garça responsável por políticas de meio ambiente, agricultura e bem-estar animal, atuando em parceria com a população por meio do Garça Pet.',
        ],
      ),
      InstitutionalSection(
        title: 'Atuação no Garça Pet',
        bullets: [
          'Analisa solicitações de adoção e acompanha o bem-estar dos animais.',
          'Orienta sobre castração solidária e vacinação antirrábica.',
          'Recebe denúncias e solicitações de plantio de árvores.',
          'Agenda entrega de mudas e, quando necessário, auxilia no plantio.',
        ],
      ),
      InstitutionalSection(
        title: 'Compromisso com a cidade',
        paragraphs: [
          'A equipe técnica da SAMA oferece orientações sobre plantio correto, cuidados veterinários e gestão responsável da fauna urbana, contribuindo para um ambiente urbano mais saudável e agradável para todos.',
        ],
      ),
    ],
    contactLines: [
      'Bosque Municipal – Garça/SP',
      'Atendimento: segunda a sexta, 8h às 16h',
      contactPhone,
      contactEmail,
    ],
  );

  static final zoologico = InstitutionalPageContent(
    id: InstitutionalPageId.zoologico,
    title: 'Zoológico',
    subtitle: 'Zoológico Municipal de Garça',
    heroImageUrl: GarcaPetMediaUrls.samaMedia(
      'capazoo.42a1025214d3d086de02.jpeg',
    ),
    icon: Icons.park_outlined,
    badges: ['Natureza', 'Educação ambiental', 'Lazer'],
    sections: [
      InstitutionalSection(
        title: 'Um destino para toda a família',
        paragraphs: [
          'O Zoológico Municipal de Garça abriga uma vasta coleção de árvores nativas e centenárias. Caminhar por nossas trilhas é uma oportunidade única de observar a fauna e a flora da região.',
          'Com áreas de descanso e banheiros acessíveis, o zoológico é o destino perfeito para um passeio inesquecível em meio à natureza preservada de Garça.',
        ],
      ),
      InstitutionalSection(
        title: 'Conservação e educação',
        paragraphs: [
          'Nosso zoológico desempenha um papel fundamental na conservação e na educação ambiental, conectando visitantes à biodiversidade local.',
          'A iniciativa interativa de ponta desenvolvida para zoológicos modernos permite uma experiência educativa e envolvente para todas as idades.',
        ],
      ),
      InstitutionalSection(
        title: 'Visitação',
        bullets: [
          'Trilhas e espaços ao ar livre para observação da natureza.',
          'Estrutura pensada para tornar a experiência moderna e inesquecível.',
          'Consulte horários e informações atualizadas com a Prefeitura ou SAMA.',
        ],
      ),
    ],
    contactLines: [
      contactPhone,
      contactEmail,
    ],
  );
}
