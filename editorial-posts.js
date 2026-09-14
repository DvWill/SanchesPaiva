const EDITORIAL_POSTS = (() => {
  const slug = 'ocidental-gastro-movimenta-comercio-cultura-e-turismo';
  const title = 'Ocidental Gastrô movimenta comércio, cultura e turismo em Cidade Ocidental';
  const excerpt = 'Realizado no Lago Jacob, o festival reuniu gastronomia, música, lazer e valorização dos empreendedores locais.';
  const sections = {
    intro: [
      'Milhares de pessoas passaram pelo Lago Jacob para conferir a primeira edição do Ocidental Gastrô, o maior festival gastronômico já realizado em Cidade Ocidental. O evento reuniu culinária, música, lazer, turismo e valorização dos empreendedores da região em um dos principais cartões-postais do município.',
      'A realização foi resultado da parceria entre o Governo de Goiás, por meio da Lei Goyazes, o Instituto Idheias e a Prefeitura Municipal de Cidade Ocidental.'
    ],
    gastronomy: [
      'Mais de 15 restaurantes da região participaram da feira, acompanhados por artesãos e comerciantes de Cidade Ocidental. A proposta foi apresentar ao público a diversidade da culinária local, ampliar a visibilidade dos empreendedores e estimular o consumo dentro do próprio município.',
      'Com opções variadas e preços acessíveis, o festival transformou o Lago Jacob em um grande ponto de encontro entre moradores, visitantes e negócios locais.'
    ],
    culture: [
      'A programação também contou com atrações musicais, espaço infantil e tirolesa, oferecendo atividades para diferentes públicos.',
      'No sábado (08), a música ficou por conta da banda TRIPOP e da dupla Jhonny & Rahony. No domingo, a programação começou ao meio-dia e recebeu Riko Fernandes, Anna Martins, Roni & Ricardo e Marco Sales & Joel.'
    ],
    organization: [
      'A realização do Ocidental Gastrô mobilizou diferentes áreas do poder público e instituições parceiras. A integração entre Governo de Goiás, Instituto Idheias e Prefeitura Municipal foi fundamental para viabilizar a estrutura, a programação e o suporte oferecido aos participantes e ao público.',
      'As secretarias municipais e demais equipes envolvidas trabalharam na preparação do espaço, organização dos expositores, segurança, limpeza, atendimento, programação cultural e acolhimento dos visitantes.'
    ],
    impact: [
      'O circuito gastronômico acontece em apenas cinco municípios goianos, e Cidade Ocidental está entre eles. Além da programação cultural e da estrutura preparada para receber as famílias, o festival movimenta restaurantes, artesãos, comerciantes, profissionais da cultura, prestadores de serviços e o setor turístico.',
      'A escolha do Lago Jacob também fortalece a imagem do município como destino de lazer e convivência, mostrando à população e aos visitantes o potencial econômico e turístico da cidade.'
    ],
    closing: 'O Ocidental Gastrô encerrou sua primeira edição mostrando a força da culinária, da cultura e do empreendedorismo de Cidade Ocidental. A combinação de sabores, música, lazer e turismo transformou o Lago Jacob em um espaço de celebração da identidade local.'
  };
  const images = [
    {url:'/assets/images/ocidental-gastro/cozinha-panela-gigante.webp',alt:'Equipe de cozinha diante de uma grande panela com prato preparado durante o Ocidental Gastrô',width:2000,height:1500,caption:'Gastronomia e trabalho em equipe marcaram a programação no Lago Jacob.'},
    {url:'/assets/images/ocidental-gastro/preparo-panela-noite.webp',alt:'Participantes ao lado de uma grande panela durante o preparo de comida à noite',width:1400,height:1867,caption:'O preparo dos pratos também integrou a experiência do festival.'},
    {url:'/assets/images/ocidental-gastro/visitantes-panela-gastronomica.webp',alt:'Grupo de participantes reunido ao redor de uma grande panela no evento',width:1400,height:1050,caption:'Participantes reunidos em torno de uma das experiências gastronômicas.'},
    {url:'/assets/images/ocidental-gastro/palco-evento.webp',alt:'Grupo reunido no palco montado para a programação cultural do Ocidental Gastrô',width:1400,height:1050,caption:'O palco recebeu a programação musical e cultural do festival.'},
    {url:'/assets/images/ocidental-gastro/produtos-locais-familia.webp',alt:'Visitantes exibem uma seleção de produtos artesanais durante o evento',width:1400,height:1867,caption:'Produtos locais aproximaram visitantes e empreendedores.'},
    {url:'/assets/images/ocidental-gastro/equipe-santiago-bbq.webp',alt:'Equipe de um estabelecimento gastronômico reunida em seu espaço no festival',width:1400,height:1050,caption:'Restaurantes da região apresentaram a diversidade da culinária local.'},
    {url:'/assets/images/ocidental-gastro/expositores-prosa-temperada.webp',alt:'Expositores de alimentação em uma tenda amarela do Ocidental Gastrô',width:1400,height:647,caption:'Empreendedores receberam o público em estruturas montadas no Lago Jacob.'},
    {url:'/assets/images/ocidental-gastro/expositora-acai.webp',alt:'Expositora de açaí apresenta um produto em seu estande no festival',width:1400,height:647,caption:'Variedade e preços acessíveis fizeram parte da proposta do evento.'},
    {url:'/assets/images/ocidental-gastro/expositora-caldos.webp',alt:'Expositora de caldos posa em seu espaço de atendimento no festival',width:1400,height:647,caption:'Negócios locais ganharam visibilidade durante os dois dias.'},
    {url:'/assets/images/ocidental-gastro/expositora-parada-sabor.webp',alt:'Expositora em uma barraca de lanches preparada para atender o público',width:1400,height:647,caption:'A estrutura reuniu diferentes opções de alimentação.'},
    {url:'/assets/images/ocidental-gastro/expositoras-doces.webp',alt:'Expositoras apresentam doces embalados em um estande do evento',width:1400,height:647,caption:'Doces e produtos artesanais também integraram a feira.'},
    {url:'/assets/images/ocidental-gastro/expositores-gastronomia.webp',alt:'Equipe de um estabelecimento gastronômico em seu estande',width:1400,height:647,caption:'Os participantes divulgaram seus cardápios e serviços.'},
    {url:'/assets/images/ocidental-gastro/expositores-gastronomia-cardapio.webp',alt:'Expositores mostram o cardápio do Ocidental Gastrô dentro de uma tenda',width:1400,height:647,caption:'O circuito valorizou quem produz e empreende na cidade.'},
    {url:'/assets/images/ocidental-gastro/equipe-banca-sabor.webp',alt:'Equipe de cozinha reunida em uma tenda gastronômica',width:1400,height:647,caption:'Profissionais da gastronomia movimentaram a economia local.'},
    {url:'/assets/images/ocidental-gastro/equipe-acaraje.webp',alt:'Equipe de um estande de acarajé reunida no festival',width:1400,height:647,caption:'Sabores diversos representaram a cidade no evento.'},
    {url:'/assets/images/ocidental-gastro/equipe-organizacao-centro-artesao.webp',alt:'Equipe de organização reunida no Centro de Convivência e Capacitação de Artesãos',width:1400,height:1050,caption:'Instituições e equipes municipais atuaram em parceria.'},
    {url:'/assets/images/ocidental-gastro/equipe-casa-artesao.webp',alt:'Equipe reunida diante da Casa do Artesão de Cidade Ocidental',width:1400,height:1867,caption:'O trabalho de preparação reuniu representantes e equipes locais.'},
    {url:'/assets/images/ocidental-gastro/vistoria-estrutura-lago.webp',alt:'Equipe realiza vistoria em uma área próxima ao Lago Jacob',width:1400,height:1050,caption:'O espaço foi vistoriado durante a preparação da estrutura.'},
    {url:'/assets/images/ocidental-gastro/lago-jacob.webp',alt:'Equipe observa o Lago Jacob durante a preparação do evento',width:1400,height:1050,caption:'O Lago Jacob foi o cenário escolhido para o festival.'},
    {url:'/assets/images/ocidental-gastro/marca-ocidental-gastro.webp',alt:'Marca gráfica do evento Ocidental Gastrô',width:900,height:900,caption:'Ocidental Gastrô: gastronomia, cultura e turismo.'}
  ];
  const content = [
    ...sections.intro,
    '## Sabores que representam a cidade', ...sections.gastronomy,
    '## Muito além da gastronomia', ...sections.culture,
    '> “Estou amando o evento: música boa, comida ótima e com preço bem democrático.” — Jéssica, moradora de Cidade Ocidental',
    '## Uma organização construída em parceria', ...sections.organization,
    '> “A atuação do Governo do Estado e da lei de incentivo torna esses eventos possíveis, somada ao apoio que os municípios oferecem. Em Cidade Ocidental, tivemos todo o suporte da Prefeitura.” — Marcelo Soares, presidente do Instituto Idheias',
    '## Um evento que movimenta toda a cidade', ...sections.impact,
    '> “Essa feira é uma experiência gastronômica e turística que pretendemos realizar por muitos anos.” — Sanches Paiva, secretário municipal de Indústria, Comércio e Turismo à época do evento',
    sections.closing
  ].join('\n\n');
  return {
    [slug]: {
      id: `editorial-${slug}`,
      slug,
      title,
      excerpt,
      content,
      category: 'Eventos e desenvolvimento',
      location: 'Lago Jacob • Cidade Ocidental (GO)',
      cover_url: images[0].url,
      cover_alt: images[0].alt,
      cover_width: images[0].width,
      cover_height: images[0].height,
      seo_title: title,
      seo_description: 'Ocidental Gastrô reúne milhares de pessoas no Lago Jacob com gastronomia, música, lazer e valorização dos empreendedores de Cidade Ocidental.',
      tags: ['Ocidental Gastrô','gastronomia','cultura','turismo','empreendedorismo','Lago Jacob'],
      featured: true,
      reading_time: 6,
      status: 'published',
      layout: 'ocidental-gastro',
      source_name: 'Prefeitura Municipal de Cidade Ocidental',
      highlight: 'Uma experiência criada para valorizar a gastronomia local e aproximar a população dos empreendedores da cidade.',
      stats: [
        {value:'Milhares',label:'de visitantes'},
        {value:15,prefix:'Mais de ',label:'restaurantes'},
        {value:2,label:'dias de programação'},
        {value:5,prefix:'Um dos ',label:'municípios participantes do circuito em Goiás'}
      ],
      sections,
      attractions: ['TRIPOP','Jhonny & Rahony','Riko Fernandes','Anna Martins','Roni & Ricardo','Marco Sales & Joel'],
      partners: ['Governo de Goiás','Lei Goyazes','Instituto Idheias','Prefeitura Municipal de Cidade Ocidental','Secretarias municipais','Câmara Municipal — apoio institucional','Secretaria Municipal de Indústria, Comércio, Trabalho e Turismo'],
      quotes: {
        resident:{text:'Estou amando o evento: música boa, comida ótima e com preço bem democrático.',credit:'Jéssica, moradora de Cidade Ocidental'},
        institute:{text:'A atuação do Governo do Estado e da lei de incentivo torna esses eventos possíveis, somada ao apoio que os municípios oferecem. Em Cidade Ocidental, tivemos todo o suporte da Prefeitura.',credit:'Marcelo Soares, presidente do Instituto Idheias'},
        tourism:{text:'Essa feira é uma experiência gastronômica e turística que pretendemos realizar por muitos anos.',credit:'Sanches Paiva, secretário municipal de Indústria, Comércio e Turismo à época do evento'}
      },
      images,
      gallery: images
    }
  };
})();

Object.assign(EDITORIAL_POSTS, (() => {
  const slug = '3-feirao-do-emprego-supera-2300-atendimentos';
  const title = '3º Feirão do Emprego supera 2,3 mil atendimentos em Cidade Ocidental';
  const excerpt = 'Realizada no Balão do Friburgo, a iniciativa aproximou trabalhadores e empresas e ampliou o acesso da população a qualificação profissional, crédito e serviços públicos.';
  const sections = {
    intro: [
      'A terceira edição do Feirão do Emprego movimentou o Balão do Friburgo nos dias 30 de novembro e 1º de dezembro de 2023. Durante os dois dias de programação, milhares de moradores buscaram oportunidades profissionais, capacitação e diferentes serviços oferecidos à comunidade.',
      'Ao final da edição, o evento contabilizou mais de 2.300 atendimentos e quase R$ 300 mil destinados a bolsas de qualificação e crédito social, reforçando a importância da integração entre políticas de emprego, formação profissional e incentivo ao empreendedorismo.'
    ],
    opportunities: [
      'O Balão do Friburgo foi escolhido para aproximar os serviços dos moradores de bairros como Nápoles, Friburgo, São Matheus, Mossoró e Remanso. A iniciativa buscou atender principalmente pessoas que encontravam mais dificuldade para acessar oportunidades de emprego e qualificação.',
      'Empresas e candidatos puderam trocar informações, realizar entrevistas e participar de processos de recrutamento em um único local. Para quem buscava o primeiro emprego ou uma recolocação profissional, o Feirão representou uma oportunidade de contato direto com o mercado de trabalho.'
    ],
    qualification: [
      'Além da intermediação de vagas, o público teve acesso a inscrições em cursos gratuitos de capacitação e qualificação profissional oferecidos pelo Colégio Tecnológico do Estado de Goiás, o Cotec.',
      'A programação também contou com orientações do Sebrae, atendimento da Goiás Fomento e suporte da Sala do Empreendedor. A proposta foi oferecer caminhos tanto para quem procurava emprego quanto para quem desejava abrir, fortalecer ou ampliar um pequeno negócio.',
      'Entre as áreas de capacitação divulgadas estavam culinária, panificação, massas e molhos, tortas salgadas, cabeleireiro, escovista e barbeiro.'
    ],
    partnership: [
      'O 3º Feirão do Emprego foi promovido pelas Secretarias de Estado do Entorno e da Retomada, em parceria com a Prefeitura de Cidade Ocidental e a Secretaria Municipal de Indústria, Comércio, Turismo e Trabalho.',
      'A iniciativa também contou com a participação da UGF, do Cotec, do Goiás Social, do Sebrae, da Goiás Fomento, da Sala do Empreendedor e de equipes municipais responsáveis pelos diferentes atendimentos.',
      'A união entre Estado e Município permitiu reunir oportunidades de emprego, qualificação, empreendedorismo e serviços sociais em uma mesma estrutura.'
    ],
    results: [
      'Os resultados demonstraram o alcance da iniciativa. Além dos mais de 2.300 atendimentos realizados, o evento registrou quase R$ 300 mil em investimentos relacionados a bolsas de qualificação e crédito social.',
      'Em uma ação articulada com a área municipal de Meio Ambiente, quase 100 atendimentos envolveram o recolhimento de resíduos eletrônicos e a distribuição de mudas.',
      'Mais do que concentrar serviços durante dois dias, o Feirão fortaleceu a conexão entre trabalhadores, empresas, instituições de ensino e programas públicos de geração de emprego e renda.'
    ],
    closing: 'A terceira edição do Feirão do Emprego mostrou como ações integradas podem ampliar o acesso da população ao mercado de trabalho. Ao reunir vagas, capacitação, crédito, empreendedorismo e serviços sociais no Balão do Friburgo, a iniciativa levou oportunidades para mais perto dos moradores e contribuiu para o desenvolvimento de Cidade Ocidental.'
  };
  const images = [
    {url:'/assets/images/feirao-emprego/equipe-feirao.webp',alt:'Grupo de profissionais reunido sob a estrutura de entrada do 3º Feirão do Emprego',width:1600,height:1200,caption:'Equipes e instituições parceiras reunidas na estrutura do Feirão do Emprego.'},
    {url:'/assets/images/feirao-emprego/entrada-feirao.webp',alt:'Entrada do Feirão do Emprego com fila de participantes e arco de balões verdes e laranjas',width:1600,height:1200,caption:'A estrutura recebeu moradores durante os dois dias de programação.'},
    {url:'/assets/images/feirao-emprego/publico-atendimentos.webp',alt:'Público sentado na área de espera montada para os atendimentos do Feirão do Emprego',width:1600,height:1200,caption:'Moradores aguardam atendimento na área preparada para o público.'},
    {url:'/assets/images/feirao-emprego/atendimento-servicos.webp',alt:'Equipes realizam atendimentos em computadores enquanto participantes aguardam no local',width:1600,height:1200,caption:'Serviços e orientações foram concentrados em uma mesma estrutura.'},
    {url:'/assets/images/feirao-emprego/orientacao-publico.webp',alt:'Profissional orienta participantes reunidos diante do palco do Feirão do Emprego',width:1600,height:1200,caption:'O público também participou de momentos de informação e orientação.'},
    {url:'/assets/images/feirao-emprego/atendimento-meio-ambiente.webp',alt:'Duas pessoas diante do espaço de atendimento dedicado ao meio ambiente',width:1200,height:1600,caption:'A programação incluiu ações e atendimentos ligados ao meio ambiente.'},
    {url:'/assets/images/feirao-emprego/equipe-parcerias.webp',alt:'Grupo de profissionais reunido em um espaço institucional de Cidade Ocidental',width:1600,height:1200,caption:'A realização mobilizou equipes estaduais, municipais e instituições parceiras.'},
    {url:'/assets/images/feirao-emprego/reuniao-organizacao.webp',alt:'Grupo reunido em um escritório durante a organização das ações do evento',width:1600,height:1200,caption:'O trabalho de preparação integrou diferentes áreas e equipes.'},
    {url:'/assets/images/feirao-emprego/participantes-feirao.webp',alt:'Três participantes reunidos na área interna do Feirão do Emprego',width:1200,height:1600,caption:'Encontros com a comunidade marcaram a terceira edição do Feirão.'}
  ];
  const services = [
    'Intermediação de vagas de emprego',
    'Entrevistas e recrutamento',
    'Inscrições em cursos gratuitos do Cotec',
    'Segunda via de certidões',
    'Orientações sobre CadÚnico',
    'Informações sobre o Goiás Social',
    'Atendimento odontológico',
    'Serviços de beleza e autoestima',
    'Atendimento do Sebrae',
    'Orientações da Goiás Fomento',
    'Sala do Empreendedor',
    'Coleta de resíduos eletrônicos',
    'Distribuição de mudas'
  ];
  const partners = ['Secretarias de Estado do Entorno e da Retomada','Prefeitura de Cidade Ocidental','Secretaria Municipal de Indústria, Comércio, Turismo e Trabalho','UGF','Cotec','Goiás Social','Sebrae','Goiás Fomento','Sala do Empreendedor'];
  const content = [
    ...sections.intro,
    '## Oportunidades mais perto da população', ...sections.opportunities,
    '> “Nossa intenção aqui era trazer a oferta para o público que mais se encontra em situação de vulnerabilidade.” — Sanches Paiva, então secretário municipal de Indústria, Comércio, Turismo e Trabalho',
    '## Qualificação para gerar emprego e renda', ...sections.qualification,
    '## Serviços reunidos em um só lugar', ...services.map(service=>`- ${service}`),
    '## Uma realização construída em parceria', ...sections.partnership,
    '## Resultados para o município', ...sections.results,
    '## Trabalho e oportunidade mais próximos de quem precisa', sections.closing
  ].join('\n\n');
  return {
    [slug]: {
      id: `editorial-${slug}`,
      slug,
      title,
      excerpt,
      content,
      category: 'Emprego e desenvolvimento',
      location: 'Balão do Friburgo • Cidade Ocidental (GO)',
      location_name: 'Cidade Ocidental, Goiás',
      published_at: '2023-12-03',
      date_label: '3 de dezembro de 2023',
      cover_url: images[0].url,
      cover_alt: images[0].alt,
      cover_width: images[0].width,
      cover_height: images[0].height,
      seo_title: '3º Feirão do Emprego supera 2,3 mil atendimentos | Cidade Ocidental',
      seo_title_exact: true,
      seo_description: 'O 3º Feirão do Emprego realizou mais de 2.300 atendimentos em Cidade Ocidental, reunindo vagas, qualificação, crédito e serviços públicos.',
      tags: ['Feirão do Emprego','emprego','qualificação profissional','Goiás Social','Cidade Ocidental'],
      featured: true,
      reading_time: 7,
      status: 'published',
      layout: 'feirao-emprego',
      source_name: 'Prefeitura Municipal de Cidade Ocidental',
      source_label: 'Fonte das informações: Prefeitura Municipal de Cidade Ocidental.',
      stats: [
        {value:2300,prefixLabel:'Mais de',format:'pt-BR',label:'atendimentos'},
        {value:2,label:'dias de programação'},
        {value:300,prefixLabel:'Quase',prefix:'R$ ',suffix:' mil',label:'em qualificação e crédito social'},
        {value:100,prefixLabel:'Quase',label:'atendimentos ambientais'}
      ],
      sections,
      services,
      partners,
      quotes: {
        opportunity:{text:'Nossa intenção aqui era trazer a oferta para o público que mais se encontra em situação de vulnerabilidade.',credit:'Sanches Paiva, então secretário municipal de Indústria, Comércio, Turismo e Trabalho'}
      },
      images,
      gallery: images
    }
  };
})());

Object.assign(EDITORIAL_POSTS, (() => {
  const slug = 'turismo-religioso-valoriza-vocacao-e-identidade-cultural';
  const title = 'Turismo religioso fortalece a fé, a tradição e a identidade de Cidade Ocidental';
  const excerpt = 'Balão da Santa, Via-Sacra e Arraiá do Jardim da Imaculada mostram como devoção, cultura e convivência comunitária ajudam a contar a história do município.';
  const sections = {
    intro: [
      'Cidade Ocidental guarda uma relação especial com a fé e com as tradições religiosas. Essa identidade pode ser percebida em espaços públicos, celebrações, encenações e festas que reúnem moradores, visitantes e comunidades religiosas ao longo do ano.',
      'O Balão da Santa, a Via-Sacra e o Arraiá do Jardim da Imaculada representam diferentes formas de vivenciar essa vocação. Enquanto um espaço se consolida como ponto de devoção e referência urbana, as celebrações levam oração, cultura, arte e convivência comunitária para diferentes lugares do município.',
      'Os registros reunidos nesta página mostram três momentos marcantes dessa relação entre fé, memória e identidade local.'
    ],
    balao: [
      'A Praça Nossa Senhora das Graças, conhecida popularmente como Balão da Santa, tornou-se um ponto de referência para quem vive ou passa por Cidade Ocidental. Localizado nas proximidades do lago, o espaço reúne simbolismo religioso, memória e identidade urbana.',
      'A reforma da praça foi entregue em dezembro de 2023, em uma programação marcada por missa campal e pela consagração de Cidade Ocidental ao Imaculado Coração de Maria. A revitalização proporcionou um ambiente mais acolhedor para momentos de oração, encontros comunitários e visitação.',
      'Mais do que um marco na paisagem, o Balão da Santa representa a presença da devoção mariana no cotidiano da população e funciona como um símbolo de boas-vindas para a cidade.'
    ],
    viaSacra: [
      'A Via-Sacra é uma das manifestações mais simbólicas do calendário cristão. Em Cidade Ocidental, a celebração reúne oração, encenação e participação popular para recordar os passos de Jesus Cristo até a crucificação.',
      'Os registros mostram a preparação dos personagens, as cenas representadas e os momentos de reflexão vividos durante o percurso. A participação da comunidade transforma a encenação em uma experiência coletiva, aproximando diferentes gerações por meio da fé e da tradição.',
      'Além de seu significado religioso, a Via-Sacra também valoriza a expressão artística local. Figurinos, interpretação, cenários e trabalho voluntário contribuem para preservar uma celebração que une espiritualidade, cultura e memória.'
    ],
    arraia: [
      'O Arraiá do Jardim da Imaculada reúne a tradição das festas juninas com a identidade religiosa do Santuário Jardim da Imaculada. A celebração cria um ambiente de encontro entre famílias, religiosos, voluntários e visitantes.',
      'Com decoração colorida, comidas típicas, apresentações e momentos de confraternização, o evento valoriza costumes populares que fazem parte da cultura brasileira. A programação também contribui para aproximar a comunidade do Santuário e fortalecer os vínculos entre fé, cultura e participação social.',
      'O Arraiá mostra que o turismo religioso também pode ser construído por meio da alegria, da hospitalidade e da convivência. A cada edição, o espaço recebe pessoas que participam não apenas das atividades religiosas, mas também da vida cultural de Cidade Ocidental.'
    ],
    history: [
      'Localizado no bairro Ocidental Park, o Jardim da Imaculada começou a ser estruturado em 1977 com a presença de missionários franciscanos. O convento foi estabelecido canonicamente em 1978 e, em 8 de dezembro de 2003, o local foi reconhecido como Santuário.',
      'Administrado pela Ordem dos Frades Menores Conventuais, o espaço mantém missas, confissões, momentos de adoração, retiros, encontros formativos e celebrações que recebem moradores e visitantes de diferentes regiões.',
      'Sua trajetória ajuda a explicar por que a religiosidade ocupa uma posição tão importante na história, na cultura e no potencial turístico de Cidade Ocidental.'
    ],
    closing: [
      'Do Balão da Santa ao Jardim da Imaculada, passando pelas encenações da Via-Sacra, Cidade Ocidental preserva manifestações que unem espiritualidade, cultura e pertencimento.',
      'Esses espaços e celebrações ajudam a manter vivas as tradições, fortalecem os vínculos entre os moradores e ampliam o potencial do município para receber visitantes interessados em conhecer sua história e sua vocação religiosa.'
    ]
  };
  const images = [
    {group:'balao',url:'/assets/media/turismo-religioso/balao-da-santa/balao-da-santa-01.webp',alt:'Sanches Paiva diante do monumento mariano na Praça Nossa Senhora das Graças.',width:1200,height:1600,caption:'Sanches Paiva durante a inauguração da Praça Nossa Senhora das Graças, conhecida como Balão da Santa.'},
    {group:'balao',url:'/assets/media/turismo-religioso/balao-da-santa/balao-da-santa-02.webp',alt:'Participantes voltados para o monumento mariano durante celebração no Balão da Santa.',width:1200,height:1600,caption:'Momento de devoção diante do monumento mariano no Balão da Santa.'},
    {group:'balao',url:'/assets/media/turismo-religioso/balao-da-santa/balao-da-santa-03.webp',alt:'Sanches Paiva e participantes ao lado da placa de inauguração da Praça Nossa Senhora das Graças.',width:1200,height:1600,caption:'Sanches Paiva durante o registro da inauguração da Praça Nossa Senhora das Graças.'},
    {group:'balao',url:'/assets/media/turismo-religioso/balao-da-santa/balao-da-santa-04.webp',alt:'Sanches Paiva participa de leitura durante celebração religiosa ao ar livre.',width:1200,height:1600,caption:'Sanches Paiva durante a celebração que marcou a entrega da praça.'},
    {group:'viaSacra',url:'/assets/media/turismo-religioso/via-sacra/via-sacra-01.webp',alt:'Sanches Paiva conversa com participante caracterizado para a representação da Via-Sacra.',width:1200,height:1600,caption:'Sanches Paiva junto a um participante da encenação da Via-Sacra.'},
    {group:'viaSacra',url:'/assets/media/turismo-religioso/via-sacra/via-sacra-02.webp',alt:'Cruz iluminada durante celebração e encenação da Via-Sacra.',width:900,height:1600,caption:'A cruz iluminada compõe uma das cenas da representação da Via-Sacra.'},
    {group:'viaSacra',url:'/assets/media/turismo-religioso/via-sacra/via-sacra-03.webp',alt:'Sanches Paiva ao lado de participante caracterizado para a representação da Via-Sacra.',width:1200,height:1600,caption:'Sanches Paiva com participante caracterizado para a encenação religiosa.'},
    {group:'viaSacra',url:'/assets/media/turismo-religioso/via-sacra/via-sacra-04.webp',alt:'Encenação de uma das estações da Via-Sacra em Cidade Ocidental, acompanhada pela comunidade.',width:462,height:1000,caption:'A comunidade acompanha uma das cenas representadas durante o percurso da Via-Sacra.'},
    {group:'viaSacra',url:'/assets/media/turismo-religioso/via-sacra/via-sacra-05.webp',alt:'Sanches Paiva e participante ao lado do ator caracterizado para representar Jesus na Via-Sacra.',width:1200,height:1600,caption:'Registro com o participante que interpretou Jesus na representação da Via-Sacra.'},
    {group:'arraia',url:'/assets/media/turismo-religioso/arraia-da-imaculada/arraia-imaculada-01.webp',alt:'Montagem com Sanches Paiva junto a uma imagem mariana e participantes da programação comunitária.',width:1084,height:1084,caption:'Sanches Paiva durante programação comunitária no Jardim da Imaculada.'},
    {group:'arraia',url:'/assets/media/turismo-religioso/arraia-da-imaculada/arraia-imaculada-02.webp',alt:'Montagem com encontros de Sanches Paiva e participantes em ambiente decorado para o Arraiá da Imaculada.',width:1084,height:1084,caption:'Convivência e encontros durante o Arraiá do Jardim da Imaculada.'},
    {group:'arraia',url:'/assets/media/turismo-religioso/arraia-da-imaculada/arraia-imaculada-03.webp',alt:'Montagem com famílias, participantes e Sanches Paiva durante o Arraiá do Jardim da Imaculada.',width:1084,height:1084,caption:'Famílias e comunidade reunidas na programação do Arraiá da Imaculada.'},
    {group:'arraia',url:'/assets/media/turismo-religioso/arraia-da-imaculada/arraia-imaculada-04.webp',alt:'Sanches Paiva ao lado de religioso durante o Arraiá do Jardim da Imaculada.',width:1200,height:1600,caption:'Sanches Paiva durante programação comunitária no Jardim da Imaculada.'},
    {group:'arraia',url:'/assets/media/turismo-religioso/arraia-da-imaculada/arraia-imaculada-05.webp',alt:'Sanches Paiva junto a uma imagem mariana em espaço decorado no Jardim da Imaculada.',width:1200,height:1600,caption:'Fé e tradição presentes na decoração do Arraiá do Jardim da Imaculada.'}
  ];
  const content = [
    '## Fé que também movimenta a cultura e o turismo', ...sections.intro,
    '## Assista: a inauguração do Balão da Santa',
    'O registro mostra um dos momentos da inauguração da Praça Nossa Senhora das Graças, espaço conhecido pela população como Balão da Santa.',
    '## Balão da Santa: devoção transformada em referência da cidade', ...sections.balao,
    '## Via-Sacra: fé, reflexão e participação da comunidade', ...sections.viaSacra,
    '## Arraiá da Imaculada: tradição, alegria e convivência', ...sections.arraia,
    '## Um patrimônio religioso de Cidade Ocidental', ...sections.history,
    '## Uma identidade construída pela fé e pela comunidade', ...sections.closing,
    '> Valorizar o turismo religioso também é preservar a memória e a identidade de Cidade Ocidental.'
  ].join('\n\n');
  const wordCount = content.trim().split(/\s+/).length;
  return {
    [slug]: {
      id: `editorial-${slug}`,
      slug,
      title,
      excerpt,
      content,
      category: 'Identidade, turismo e cultura',
      location: 'Cidade Ocidental (GO)',
      location_name: 'Cidade Ocidental, Goiás',
      cover_url: images[9].url,
      cover_alt: images[9].alt,
      cover_width: images[9].width,
      cover_height: images[9].height,
      seo_title: 'Turismo religioso em Cidade Ocidental: fé, cultura e tradição',
      seo_title_exact: true,
      seo_description: 'Conheça o Balão da Santa, a Via-Sacra e o Arraiá do Jardim da Imaculada, manifestações que fortalecem a fé e a identidade de Cidade Ocidental.',
      tags: ['turismo religioso','Balão da Santa','Via-Sacra','Jardim da Imaculada','Cidade Ocidental'],
      featured: false,
      reading_time: Math.max(1,Math.ceil(wordCount/220)),
      status: 'published',
      layout: 'turismo-religioso',
      source_name: 'Prefeitura Municipal de Cidade Ocidental, Santuário Jardim da Imaculada e registros fotográficos cedidos para esta publicação',
      source_label: 'Fontes das informações: Prefeitura Municipal de Cidade Ocidental, Santuário Jardim da Imaculada e registros fotográficos cedidos para esta publicação.',
      highlight: 'Valorizar o turismo religioso também é preservar a memória e a identidade de Cidade Ocidental.',
      sections,
      video: {
        url:'/assets/media/turismo-religioso/balao-da-santa/inauguracao-balao-da-santa.mp4',
        poster:'/assets/media/turismo-religioso/balao-da-santa/inauguracao-balao-da-santa-poster.webp',
        posterWidth:1600,
        posterHeight:900,
        title:'Assista: a inauguração do Balão da Santa',
        description:'O registro mostra um dos momentos da inauguração da Praça Nossa Senhora das Graças, espaço conhecido pela população como Balão da Santa.',
        caption:'Registro da inauguração da Praça Nossa Senhora das Graças, conhecida como Balão da Santa.'
      },
      hero: [images[1],images[5],images[12]],
      images,
      gallery: images,
      finalGallery: [3,6,8,10]
    }
  };
})());

if (typeof module === 'object' && module.exports) module.exports = EDITORIAL_POSTS;
if (typeof window !== 'undefined') window.EDITORIAL_POSTS = EDITORIAL_POSTS;
