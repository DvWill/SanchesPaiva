(() => {
  const partnerships = [
    {
      id: 'cristovao-tormin',
      partner: 'Cristóvão Tormin',
      role: 'Deputado Estadual',
      accent: 'turquoise',
      image: null,
      expectedImage: 'assets/parcerias/cristovao-tormin.webp',
      description: 'Parceria em saúde, bem-estar animal e turismo religioso.',
      results: [
        {
          id: 'mutirao-saude',
          category: 'Saúde',
          title: 'Mutirão da Saúde',
          summary: 'A parceria viabilizou recursos para ampliar os atendimentos médicos e levar serviços de saúde a diferentes bairros de Cidade Ocidental.',
          benefits: 'Ampliação do acesso da população a atendimentos médicos e serviços de saúde nos bairros.',
          image: null,
          expectedImage: 'assets/parcerias/mutirao-saude.webp',
          imageAlt: 'Atendimentos do Mutirão da Saúde em Cidade Ocidental',
          metadata: { amount: null, year: null, lawNumber: null, beneficiaries: null, officialSource: null }
        },
        {
          id: 'castracao-animal',
          category: 'Bem-estar animal',
          title: 'Castração animal',
          summary: 'A parceria garantiu mais de 600 castrações gratuitas de cães e gatos, promovendo saúde pública, controle populacional e bem-estar animal.',
          benefits: 'Atendimento gratuito, prevenção em saúde pública e apoio ao controle populacional de cães e gatos.',
          image: null,
          expectedImage: 'assets/parcerias/castracao-animal.webp',
          imageAlt: 'Ação de castração gratuita de cães e gatos em Cidade Ocidental',
          metadata: { amount: null, year: null, lawNumber: null, beneficiaries: 'Mais de 600 castrações', officialSource: null }
        },
        {
          id: 'santuario-imaculada',
          category: 'Turismo religioso',
          title: 'Santuário Jardim da Imaculada',
          summary: 'A articulação fortaleceu o reconhecimento da importância religiosa, cultural e histórica do Santuário Jardim da Imaculada para Cidade Ocidental e para Goiás.',
          benefits: 'Valorização do patrimônio religioso, cultural e histórico do município e fortalecimento do turismo religioso.',
          image: null,
          expectedImage: 'assets/parcerias/santuario-imaculada.webp',
          imageAlt: 'Santuário Jardim da Imaculada em Cidade Ocidental',
          metadata: { amount: null, year: null, lawNumber: null, beneficiaries: null, officialSource: null }
        }
      ]
    },
    {
      id: 'leda-borges',
      partner: 'Lêda Borges',
      role: 'Deputada Federal',
      accent: 'yellow',
      image: null,
      expectedImage: 'assets/parcerias/leda-borges.webp',
      description: 'Parceria em cultura, tradição e infraestrutura.',
      results: [
        {
          id: 'festival-canta-jardim',
          category: 'Cultura',
          title: 'Festival Canta Jardim',
          summary: 'A articulação garantiu recursos para fortalecer um dos principais eventos culturais e musicais da região.',
          benefits: 'Fortalecimento da programação cultural e musical e valorização de um evento importante para a região.',
          image: null,
          expectedImage: 'assets/parcerias/festival-canta-jardim.webp',
          imageAlt: 'Público durante o Festival Canta Jardim',
          metadata: { amount: null, year: null, lawNumber: null, beneficiaries: null, officialSource: null }
        },
        {
          id: 'arraia-imaculada',
          category: 'Tradição',
          title: 'Apoio ao Arraiá da Imaculada',
          summary: 'A parceria contribuiu com recursos para ampliar a estrutura e fortalecer a realização do tradicional Arraiá da Imaculada.',
          benefits: 'Apoio à estrutura do evento, à tradição comunitária e à continuidade da celebração cultural e religiosa.',
          image: 'assets/parcerias/arraia-imaculada.webp',
          imagePosition: 'center 24%',
          imageAlt: 'Sanches Paiva e Frei Domilson no Arraiá da Imaculada, sob bandeirolas coloridas',
          metadata: { amount: null, year: null, lawNumber: null, beneficiaries: null, officialSource: null }
        },
        {
          id: 'asfalto-friburgo',
          category: 'Infraestrutura',
          title: 'Asfalto para o Friburgo A e B',
          summary: 'A parceria viabilizou recursos para obras de capeamento asfáltico em ruas dos bairros Friburgo A e Friburgo B.',
          benefits: 'Melhoria da mobilidade urbana e das condições de circulação nos bairros Friburgo A e Friburgo B.',
          image: null,
          expectedImage: 'assets/parcerias/asfalto-friburgo.webp',
          imageAlt: 'Obra de capeamento asfáltico nos bairros Friburgo A e Friburgo B',
          metadata: { amount: null, year: null, lawNumber: null, beneficiaries: null, officialSource: null }
        }
      ]
    }
  ];

  if (typeof module !== 'undefined' && module.exports) module.exports = partnerships;
  if (typeof document === 'undefined') return;

  const panels = document.querySelector('#partnership-panels');
  const dialog = document.querySelector('#partnership-dialog');
  if (!panels || !dialog) return;

  const modalMedia = dialog.querySelector('.partnership-modal__media');
  const modalRole = dialog.querySelector('.partnership-modal__role');
  const modalPartner = dialog.querySelector('.partnership-modal__partner');
  const modalTitle = dialog.querySelector('.partnership-modal__title');
  const modalDescription = dialog.querySelector('.partnership-modal__description');
  const modalBenefits = dialog.querySelector('.partnership-modal__benefits');
  const modalMetadata = dialog.querySelector('.partnership-modal__metadata');
  const modalSource = dialog.querySelector('.partnership-modal__source');
  let returnFocus = null;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function createPlaceholder(label, className = '') {
    const placeholder = element('div', `partnership-placeholder ${className}`.trim());
    placeholder.setAttribute('role', 'img');
    placeholder.setAttribute('aria-label', `Fotografia necessária: ${label}`);
    const icon = element('span', 'partnership-placeholder__icon', '▧');
    icon.setAttribute('aria-hidden', 'true');
    placeholder.append(icon, element('small', '', 'Imagem em breve'), element('strong', '', label));
    return placeholder;
  }

  function createImage(source, alt, className, position = '') {
    const image = element('img', className);
    image.src = source;
    image.alt = alt;
    image.loading = 'lazy';
    image.decoding = 'async';
    if (position) image.style.objectPosition = position;
    return image;
  }

  function createResultCard(partner, result) {
    const card = element('button', 'partnership-result');
    card.type = 'button';
    card.dataset.partnership = partner.id;
    card.dataset.result = result.id;
    card.setAttribute('aria-label', `Saiba mais sobre ${result.title}, parceria com ${partner.partner}`);

    const media = element('span', 'partnership-result__media');
    media.append(result.image
      ? createImage(result.image, result.imageAlt, 'partnership-result__image', result.imagePosition)
      : createPlaceholder(result.title, 'partnership-result__placeholder'));

    const body = element('span', 'partnership-result__body');
    body.append(
      element('span', 'partnership-result__category', result.category),
      element('strong', 'partnership-result__title', result.title),
      element('span', 'partnership-result__summary', result.summary),
      element('span', 'partnership-result__link', 'Saiba mais →')
    );
    card.append(media, body);
    card.addEventListener('click', () => openDialog(partner, result, card));
    return card;
  }

  function createPanel(partner) {
    const article = element('article', `partnership-panel partnership-panel--${partner.accent}`);
    article.setAttribute('aria-labelledby', `partner-${partner.id}`);
    const header = element('header', 'partnership-panel__header');
    const portrait = element('div', 'partnership-panel__portrait');
    portrait.append(partner.image
      ? createImage(partner.image, `Retrato de ${partner.partner}`, 'partnership-panel__portrait-image')
      : createPlaceholder(`retrato de ${partner.partner}`, 'partnership-panel__portrait-placeholder'));
    const identity = element('div', 'partnership-panel__identity');
    const role = element('span', 'partnership-panel__role', partner.role);
    const name = element('h3', 'partnership-panel__name', partner.partner);
    name.id = `partner-${partner.id}`;
    identity.append(role, name, element('i', 'partnership-panel__rule'), element('p', 'partnership-panel__description', partner.description));
    header.append(portrait, identity);

    const results = element('div', 'partnership-panel__results');
    results.setAttribute('aria-label', `Resultados da parceria com ${partner.partner}`);
    partner.results.forEach((result) => results.append(createResultCard(partner, result)));
    article.append(header, results);
    return article;
  }

  function addMetadata(label, value) {
    if (!value) return;
    const item = element('div', 'partnership-modal__metadata-item');
    item.append(element('dt', '', label), element('dd', '', value));
    modalMetadata.append(item);
  }

  function openDialog(partner, result, trigger) {
    returnFocus = trigger;
    modalMedia.replaceChildren(result.image
      ? createImage(result.image, result.imageAlt, 'partnership-modal__image', result.imagePosition)
      : createPlaceholder(result.title, 'partnership-modal__placeholder'));
    modalRole.textContent = result.category;
    modalPartner.textContent = `${partner.role} ${partner.partner}`;
    modalTitle.textContent = result.title;
    modalDescription.textContent = result.summary;
    modalBenefits.textContent = result.benefits;
    modalMetadata.replaceChildren();
    addMetadata('Valor do recurso', result.metadata.amount);
    addMetadata('Ano', result.metadata.year);
    addMetadata('Número da lei', result.metadata.lawNumber);
    addMetadata('Pessoas beneficiadas', result.metadata.beneficiaries);
    modalMetadata.hidden = !modalMetadata.children.length;
    modalSource.textContent = result.metadata.officialSource
      ? `Fonte oficial: ${result.metadata.officialSource}`
      : 'Fonte oficial e dados complementares aguardam confirmação documental.';
    document.body.classList.add('partnership-modal-open');
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    dialog.querySelector('.partnership-modal__close').focus();
  }

  function closeDialog() {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  partnerships.forEach((partner) => panels.append(createPanel(partner)));
  dialog.querySelectorAll('[data-close-partnership]').forEach((button) => button.addEventListener('click', closeDialog));
  dialog.addEventListener('click', (event) => { if (event.target === dialog) closeDialog(); });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('partnership-modal-open');
    returnFocus?.focus({ preventScroll: true });
  });
  dialog.addEventListener('cancel', () => document.body.classList.remove('partnership-modal-open'));
})();
