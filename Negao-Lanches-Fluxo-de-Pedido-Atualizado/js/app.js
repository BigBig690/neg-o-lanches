(() => {
  'use strict';

  const CART_KEY = 'negao-lanches-cart-v3';
  const WHATSAPP_NUMBER = '5514996135661'; // Confirmar o número oficial da loja antes de divulgar.
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  let catalog = { products: [], addons: [], borders: [] };
  let activeCategory = 'Todos';
  let toastTimer;

  const brl = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const number = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  const productFor = id => catalog.products.find(product => product.id === id);
  const imageFor = product => {
    const image = product?.image || '';
    return image.startsWith('/') ? `assets/images/${image.split('/').pop()}` : image;
  };
  const isBuyable = product => product && product.available === true && product.pendingConfirmation !== true;
  const isPizza = product => /pizza/i.test(product?.category || '');
  const isLanched = product => /Lanches com|Lanches especiais/i.test(product?.category || '');
  const extraGroup = product => isPizza(product) ? 'pizza' : isLanched(product) ? 'lanches' : product?.id === 'chapeirao' ? 'chapeirao' : '';

  function readCart() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter(line => line && typeof line.id === 'string' && Number.isFinite(Number(line.qty)) && Number(line.qty) > 0) : [];
    } catch { return []; }
  }
  function writeCart(lines) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(lines)); } catch { showToast('Não foi possível salvar o carrinho neste navegador.'); }
    updateCartBadges();
  }
  function selectedAddons(line) {
    return (line.addons || []).map(id => catalog.addons.find(addon => addon.id === id)).filter(Boolean);
  }
  function lineUnitPrice(line) {
    const product = productFor(line.id);
    if (!product) return 0;
    const additions = selectedAddons(line).reduce((sum, addon) => sum + Number(addon.price || 0), 0);
    const border = catalog.borders.find(item => item.id === line.borderId);
    return number(Number(product.price || 0) + additions + Number(border?.price || 0));
  }
  function cartTotal(lines = readCart()) { return number(lines.reduce((sum, line) => sum + lineUnitPrice(line) * Number(line.qty || 0), 0)); }
  function cartCount(lines = readCart()) { return lines.reduce((sum, line) => sum + Number(line.qty || 0), 0); }
  function updateCartBadges() { $$('[data-cart-count]').forEach(badge => { badge.textContent = String(cartCount()); }); }

  function showToast(message) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }
  function create(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }
  function safeImage(img, product) {
    const source = imageFor(product);
    img.src = source;
    img.alt = product.imageAlt || product.name;
    img.loading = 'lazy';
    img.addEventListener('error', () => {
      if (!img.dataset.fallbackTried && source.endsWith('.jpg')) {
        img.dataset.fallbackTried = 'true';
        img.src = source.replace(/\.jpg$/i, '.svg');
      }
    });
  }

  function setupNavigation() {
    const toggle = $('#menuToggle');
    const nav = $('#mainNav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      toggle.textContent = open ? '×' : '☰';
    });
    $$('a', nav).forEach(link => link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Abrir menu');
      toggle.textContent = '☰';
    }));
  }

  function renderHome() {
    const grid = $('#productGrid');
    if (!grid) return;
    const searchInput = $('#productSearch');
    const count = $('#resultCount');
    const categoriesRoot = $('#categoryList');
    const categories = ['Todos', ...new Set(catalog.products.map(product => product.category).filter(Boolean))];

    const renderCategories = () => {
      categoriesRoot.replaceChildren();
      categories.forEach(category => {
        const button = create('button', `category-chip${category === activeCategory ? ' active' : ''}`, category);
        button.type = 'button';
        button.setAttribute('aria-pressed', String(category === activeCategory));
        button.addEventListener('click', () => { activeCategory = category; renderCategories(); renderProducts(); });
        categoriesRoot.append(button);
      });
    };
    const renderProducts = () => {
      const query = (searchInput?.value || '').trim().toLocaleLowerCase('pt-BR');
      const items = catalog.products.filter(product => {
        const categoryMatch = activeCategory === 'Todos' || product.category === activeCategory;
        const fullText = `${product.name} ${product.category} ${product.description || ''}`.toLocaleLowerCase('pt-BR');
        return categoryMatch && fullText.includes(query);
      });
      grid.replaceChildren();
      if (count) count.textContent = `${items.length} ${items.length === 1 ? 'item' : 'itens'} encontrados`;
      if (!items.length) {
        const empty = create('div', 'empty-results');
        empty.append(create('h3', '', 'Não encontramos esse item'), create('p', '', 'Tente outro nome ou selecione outra categoria.'));
        grid.append(empty);
        return;
      }
      const fragment = document.createDocumentFragment();
      items.forEach(product => {
        const card = create('article', 'product-card');
        const media = create('div', 'product-media');
        const img = create('img'); safeImage(img, product); media.append(img);
        if (!isBuyable(product)) media.append(create('span', 'product-tag', 'Consulte a loja'));
        const body = create('div', 'product-body');
        body.append(create('p', 'product-category', product.category || 'Cardápio'));
        body.append(create('h3', '', product.name));
        body.append(create('p', 'product-description', product.description || 'Uma opção do cardápio do Negão Lanches.'));
        const bottom = create('div', 'product-bottom');
        bottom.append(create('span', 'product-price', brl(product.price)));
        const choose = create('a', 'product-choose', isBuyable(product) ? 'Escolher item →' : 'Indisponível');
        if (isBuyable(product)) choose.href = `pedido.html?id=${encodeURIComponent(product.id)}`;
        else { choose.href = '#'; choose.setAttribute('aria-disabled', 'true'); choose.addEventListener('click', event => { event.preventDefault(); showToast('Este item ainda não está disponível para compra online.'); }); }
        bottom.append(choose); body.append(bottom); card.append(media, body); fragment.append(card);
      });
      grid.append(fragment);
    };
    searchInput?.addEventListener('input', renderProducts);
    renderCategories(); renderProducts();
  }

  function renderProductPage() {
    const id = new URLSearchParams(location.search).get('id');
    if (!id) { location.replace('index.html#cardapio'); return; }
    const product = productFor(id);
    const name = $('#detailName');
    if (!product) {
      name.textContent = 'Não encontramos esse produto';
      $('#detailDescription').textContent = 'Volte ao cardápio e escolha outro item.';
      $('#detailPrice').textContent = '';
      $('#addToCart').disabled = true;
      $('#productError').hidden = false;
      $('#productError').textContent = 'Produto não encontrado no catálogo.';
      return;
    }
    document.title = `${product.name} | Negão Lanches`;
    name.textContent = product.name;
    $('#crumbProduct').textContent = product.name;
    $('#detailCategory').textContent = product.category || 'Cardápio';
    $('#detailDescription').textContent = product.description || 'Uma opção do cardápio do Negão Lanches.';
    $('#detailPrice').textContent = brl(product.price);
    safeImage($('#detailImage'), product);
    const addBtn = $('#addToCart');
    const error = $('#productError');
    if (!isBuyable(product)) {
      addBtn.disabled = true;
      addBtn.textContent = 'Indisponível para compra';
      error.hidden = false;
      error.textContent = 'Este produto está temporariamente indisponível para pedido online. Escolha outro item do cardápio.';
      return;
    }

    let quantity = 1;
    $('#qtyMinus').addEventListener('click', () => { quantity = Math.max(1, quantity - 1); $('#qtyValue').textContent = String(quantity); });
    $('#qtyPlus').addEventListener('click', () => { quantity = Math.min(30, quantity + 1); $('#qtyValue').textContent = String(quantity); });

    const addonArea = $('#addonArea');
    const group = extraGroup(product);
    const availableAddons = catalog.addons.filter(addon => addon.group === group && addon.available !== false && addon.pendingConfirmation !== true);
    if (availableAddons.length) {
      addonArea.append(create('span', 'option-title', 'Quer adicionar algo? (opcional)'));
      const list = create('div', 'addon-list');
      availableAddons.forEach(addon => {
        const label = create('label', 'addon-option');
        const checkbox = create('input'); checkbox.type = 'checkbox'; checkbox.name = 'addon'; checkbox.value = addon.id;
        const addonName = create('span', 'addon-name', addon.name);
        const price = create('span', 'addon-price', `+ ${brl(addon.price)}`);
        label.append(checkbox, addonName, price); list.append(label);
      });
      addonArea.append(list);
    }
    if (isPizza(product)) {
      const doughGroup = create('div', 'field'); doughGroup.style.marginTop = '18px';
      const doughLabel = create('label', '', 'Tipo de massa'); doughLabel.htmlFor = 'pizzaDough';
      const dough = create('select'); dough.id = 'pizzaDough'; dough.className = 'search-input'; dough.style.height = '48px';
      ['Fina', 'Média', 'Grossa'].forEach(value => { const option = create('option', '', value); option.value = value; dough.append(option); });
      doughGroup.append(doughLabel, dough); addonArea.append(doughGroup);
      const availableBorders = catalog.borders.filter(border => border.available !== false && border.pendingConfirmation !== true);
      if (availableBorders.length) {
        const borderGroup = create('div', 'field'); borderGroup.style.marginTop = '18px';
        const label = create('label', '', 'Borda recheada (opcional)'); label.htmlFor = 'pizzaBorder';
        const select = create('select'); select.id = 'pizzaBorder'; select.className = 'search-input'; select.style.height = '48px';
        const standard = create('option', '', 'Sem borda recheada'); standard.value = '';
        select.append(standard);
        availableBorders.forEach(border => { const option = create('option', '', `${border.name} (+ ${brl(border.price)})`); option.value = border.id; select.append(option); });
        borderGroup.append(label, select); addonArea.append(borderGroup);
      }
    }

    addBtn.addEventListener('click', () => {
      if (!isBuyable(product)) return;
      const addons = $$('input[name="addon"]:checked', addonArea).map(input => input.value).sort();
      const dough = $('#pizzaDough')?.value || '';
      const borderId = $('#pizzaBorder')?.value || '';
      const note = $('#itemNote').value.trim();
      const cart = readCart();
      const fingerprint = JSON.stringify({ id: product.id, addons, dough, borderId, note });
      const existing = cart.find(line => JSON.stringify({ id: line.id, addons: [...(line.addons || [])].sort(), dough: line.dough || '', borderId: line.borderId || '', note: line.note || '' }) === fingerprint);
      if (existing) existing.qty = Math.min(99, Number(existing.qty) + quantity);
      else cart.push({ key: `${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, id: product.id, qty: quantity, addons, dough, borderId, note });
      writeCart(cart);
      location.href = 'carrinho.html?adicionado=1';
    });
  }

  function optionDescription(line) {
    const result = [];
    const addons = selectedAddons(line);
    if (addons.length) result.push(`Adicionais: ${addons.map(a => a.name).join(', ')}`);
    if (line.dough) result.push(`Massa ${line.dough.toLowerCase()}`);
    const border = catalog.borders.find(item => item.id === line.borderId);
    if (border) result.push(`Borda: ${border.name}`);
    if (line.note) result.push(`Obs.: ${line.note}`);
    return result;
  }
  function adjustLine(key, amount) {
    const cart = readCart();
    const line = cart.find(item => item.key === key);
    if (!line) return;
    line.qty = Math.max(0, Math.min(99, Number(line.qty) + amount));
    writeCart(line.qty ? cart : cart.filter(item => item.key !== key));
    renderCartPage();
  }
  function removeLine(key) { writeCart(readCart().filter(item => item.key !== key)); renderCartPage(); }

  function renderCartPage() {
    const root = $('#cartContent');
    if (!root) return;
    const cart = readCart();
    root.replaceChildren();
    if (!cart.length) {
      const empty = create('div', 'empty-cart');
      empty.append(create('h2', '', 'Seu carrinho está vazio'), create('p', '', 'Escolha um lanche do cardápio para começar seu pedido.'));
      const link = create('a', 'btn btn-primary btn-large', 'Explorar cardápio →'); link.href = 'index.html#cardapio';
      empty.append(link); root.append(empty);
      $('#continueCheckout').setAttribute('aria-disabled', 'true');
      $('#continueCheckout').classList.add('disabled');
    } else {
      const title = create('h2', '', `${cartCount(cart)} ${cartCount(cart) === 1 ? 'item no carrinho' : 'itens no carrinho'}`);
      title.style.marginBottom = '17px'; root.append(title);
      const list = create('div', 'cart-list');
      cart.forEach(line => {
        const product = productFor(line.id);
        if (!product) return;
        const row = create('article', 'cart-row');
        const img = create('img'); safeImage(img, product);
        const info = create('div', 'cart-info'); info.append(create('h3', '', product.name));
        optionDescription(line).forEach(text => info.append(create('p', '', text)));
        const controls = create('div', 'cart-controls');
        const qtyControl = create('div', 'quantity-control');
        const minus = create('button', '', '−'); minus.type = 'button'; minus.setAttribute('aria-label', `Diminuir quantidade de ${product.name}`); minus.addEventListener('click', () => adjustLine(line.key, -1));
        const output = create('output', '', line.qty);
        const plus = create('button', '', '+'); plus.type = 'button'; plus.setAttribute('aria-label', `Aumentar quantidade de ${product.name}`); plus.addEventListener('click', () => adjustLine(line.key, 1));
        qtyControl.append(minus, output, plus);
        const remove = create('button', 'remove-item', 'Remover'); remove.type = 'button'; remove.addEventListener('click', () => removeLine(line.key));
        controls.append(qtyControl, remove); info.append(controls);
        row.append(img, info, create('strong', 'line-price', brl(lineUnitPrice(line) * line.qty)));
        list.append(row);
      });
      root.append(list);
      $('#continueCheckout').removeAttribute('aria-disabled');
      $('#continueCheckout').classList.remove('disabled');
    }
    $('#summaryCount').textContent = String(cartCount(cart));
    $('#summarySubtotal').textContent = brl(cartTotal(cart));
    $('#summaryTotal').textContent = brl(cartTotal(cart));
    updateCartBadges();
  }

  function renderCheckoutSummary() {
    const root = $('#checkoutSummary');
    if (!root) return;
    const cart = readCart(); root.replaceChildren();
    if (!cart.length) {
      root.append(create('p', 'muted', 'Seu carrinho está vazio. Volte ao cardápio para adicionar itens.'));
      $('#checkoutForm').querySelector('button[type="submit"]').disabled = true;
      $('#checkoutTotal').textContent = brl(0);
      return;
    }
    const list = create('ul', 'summary-list');
    cart.forEach(line => {
      const product = productFor(line.id); if (!product) return;
      const li = create('li');
      const name = create('span', '', `${line.qty} × ${product.name}`);
      const price = create('strong', '', brl(lineUnitPrice(line) * line.qty));
      li.append(name, price); list.append(li);
      optionDescription(line).forEach(description => {
        const opt = create('li'); opt.style.fontSize = '.75rem'; opt.style.paddingLeft = '10px';
        opt.append(create('span', '', `↳ ${description}`));
        list.append(opt);
      });
    });
    root.append(list);
    $('#checkoutTotal').textContent = brl(cartTotal(cart));
  }

  function setupCheckout() {
    const form = $('#checkoutForm');
    const addressField = $('#addressField');
    const address = $('#customerAddress');
    const payment = $('#paymentMethod');
    const syncFields = () => {
      const mode = $('input[name="fulfillment"]:checked', form)?.value || 'Entrega';
      const isDelivery = mode === 'Entrega';
      addressField.hidden = !isDelivery;
      address.required = isDelivery;
    };
    $$('input[name="fulfillment"]', form).forEach(radio => radio.addEventListener('change', syncFields));
    payment.addEventListener('change', syncFields);
    syncFields();
    form.addEventListener('submit', event => {
      event.preventDefault();
      const error = $('#checkoutError');
      const data = {
        name: $('#customerName').value.trim(),
        phone: $('#customerPhone').value.trim(),
        fulfillment: $('input[name="fulfillment"]:checked', form)?.value || 'Entrega',
        address: $('#customerAddress').value.trim(),
        payment: $('#paymentMethod').value,
        notes: $('#orderNotes').value.trim()
      };
      const fail = message => { error.textContent = message; error.hidden = false; error.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
      const cart = readCart();
      if (!cart.length) return fail('Seu carrinho está vazio. Adicione algum item antes de finalizar.');
      if (data.name.length < 2) return fail('Informe seu nome para continuar.');
      if (data.phone.replace(/\D/g, '').length < 10) return fail('Informe um telefone com DDD válido.');
      if (data.fulfillment === 'Entrega' && data.address.length < 8) return fail('Informe o endereço completo para a entrega.');
      error.hidden = true;
      const message = [
        '*NOVO PEDIDO — NEGÃO LANCHES*', '',
        `*Cliente:* ${data.name}`, `*WhatsApp:* ${data.phone}`, `*Recebimento:* ${data.fulfillment}`,
        ...(data.fulfillment === 'Entrega' ? [`*Endereço:* ${data.address}`] : []),
        `*Pagamento:* ${data.payment}`,
        '', '*ITENS DO PEDIDO*',
        ...cart.flatMap(line => {
          const product = productFor(line.id); if (!product) return [];
          return [`• ${line.qty} × ${product.name} — ${brl(lineUnitPrice(line) * line.qty)}`, ...optionDescription(line).map(option => `   - ${option}`)];
        }), '', `*Subtotal dos produtos:* ${brl(cartTotal(cart))}`,
        '*Taxa de entrega:* a confirmar com a loja.',
        ...(data.notes ? ['', `*Observações gerais:* ${data.notes}`] : []), '', 'Aguardo a confirmação do pedido, prazo e valor final.'
      ].join('\n');
      const link = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
      const opened = window.open(link, '_blank');
      if (opened) opened.opener = null;
      else location.href = link;
      showToast('WhatsApp aberto com o resumo. Revise e toque em enviar.');
    });
  }

  async function start() {
    setupNavigation();
    updateCartBadges();
    try {
      const response = await fetch('data/catalog.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error(`Erro carregando catálogo (${response.status})`);
      catalog = await response.json();
    } catch (error) {
      console.error(error);
      const target = $('#productGrid') || $('#detailDescription') || $('#cartContent') || $('#checkoutSummary');
      if (target) target.textContent = 'Não foi possível carregar o cardápio. Atualize a página e tente novamente.';
      return;
    }
    if (document.body.dataset.page === 'home') renderHome();
    if (document.body.dataset.page === 'product') renderProductPage();
    if (document.body.dataset.page === 'cart') {
      renderCartPage();
      if (new URLSearchParams(location.search).get('adicionado') === '1') showToast('Item adicionado ao carrinho.');
    }
    if (document.body.dataset.page === 'checkout') {
      renderCheckoutSummary(); setupCheckout();
    }
    updateCartBadges();
  }

  document.addEventListener('DOMContentLoaded', start);
})();
