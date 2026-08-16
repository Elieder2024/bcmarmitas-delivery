/* ==========================================
   BC MARMITAS - APPLICATION LOGIC (JS)
   Balneário Camboriú - Santa Catarina
   ========================================== */

const state = {
  fulfillmentMode: 'delivery', // 'delivery' or 'pickup'
  activeBuilderSize: null, // { key: 'media', title: 'Marmita Média', basePrice: 13.00 }
  cart: [],
  orders: [
    {
      id: 'BC-7810',
      clientName: 'Cliente Centro BC',
      address: 'Av. Brasil, 1500 - Apto 402, Centro - BC',
      items: '1x Marmita Média (Bife de Alcatra, Arroz, Feijão, Farofa, Salada) + 1x Coca-Cola Lata 350ml',
      total: 18.00,
      paymentMethod: 'PIX',
      status: 'EM_PREPARO',
      date: 'Hoje, 12:15'
    }
  ],
  drinks: [
    { id: 'drk_1', name: 'Coca-Cola Lata 350ml', price: 5.00, icon: '🥤' },
    { id: 'drk_2', name: 'Coca-Cola Zero Lata 350ml', price: 5.00, icon: '🥤' },
    { id: 'drk_3', name: 'Guaraná Antarctica Lata 350ml', price: 5.00, icon: '🥤' },
    { id: 'drk_4', name: 'Fanta Laranja Lata 350ml', price: 5.00, icon: '🥤' },
    { id: 'drk_5', name: 'Sprite Lata 350ml', price: 5.00, icon: '🥤' },
    { id: 'drk_6', name: 'Suco Del Valle Uva Lata 350ml', price: 5.00, icon: '🧃' }
  ],
  extras: [
    { id: 'ext_1', name: 'Ovo Frito Gema Mole', price: 2.00, icon: '🍳' },
    { id: 'ext_2', name: 'Porção Extra de Bacon Crocante', price: 3.00, icon: '🥓' },
    { id: 'ext_3', name: 'Queijo Muçarela Gratinado', price: 3.00, icon: '🧀' },
    { id: 'ext_4', name: 'Porção Extra de Batata Frita', price: 6.00, icon: '🍟' }
  ],
  kitchenProteins: [
    { id: 'prot_1', name: '🥩 Bife de Alcatra Acebolado', desc: 'Bife macio grelhado com bastante cebola na chapa' },
    { id: 'prot_2', name: '🍗 Peito de Frango Grelhado', desc: 'Filezinho suculento temperado com ervas finas e limão' },
    { id: 'prot_3', name: '🧀 Parmegiana de Frango Gratinada', desc: 'Empanado crocante, molho de tomate caseiro e queijo derretido' },
    { id: 'prot_4', name: '🍲 Strogonoff de Carne Tradicional', desc: 'Tiras de carne macia no molho cremoso com champignon' }
  ]
};

// Storage Persistence
function saveStateToStorage() {
  try {
    localStorage.setItem('bcmarmitas_orders', JSON.stringify(state.orders));
    localStorage.setItem('bcmarmitas_proteins', JSON.stringify(state.kitchenProteins));
  } catch (e) {
    console.error('Erro ao salvar estado:', e);
  }
}

async function loadStateFromStorage() {
  try {
    const res = await fetch('/api/orders');
    if (res.ok) {
      const orders = await res.json();
      
      // Detect order status updates for customer audio alerts
      if (state.lastStatusMap && state.currentUser) {
        orders.forEach(o => {
          if (o.clientPhone === state.currentUser.phone) {
            const prev = state.lastStatusMap[o.id];
            if (prev && prev !== o.status) {
              if (o.status === 'SAIU_ENTREGA') {
                showToast(`🛵 Seu pedido ${o.id} SAIU PARA ENTREGA!`, 'info');
                playNotificationSound('status');
              } else if (o.status === 'ENTREGUE') {
                showToast(`🎉 Seu pedido ${o.id} FOI ENTREGUE! Bom apetite!`, 'success');
                playNotificationSound('status');
              }
            }
          }
        });
      }

      state.lastStatusMap = {};
      orders.forEach(o => { state.lastStatusMap[o.id] = o.status; });
      state.orders = orders;
    }
  } catch (e) {}

  try {
    const resP = await fetch('/api/proteins');
    if (resP.ok) {
      const prots = await resP.json();
      state.kitchenProteins = prots;
    }
  } catch(e) {}

  try {
    const resD = await fetch('/api/drinks');
    if (resD.ok) {
      const drks = await resD.json();
      state.drinks = drks.map(d => ({ ...d, icon: d.icon || '🥤' }));
      renderDrinksCatalog();
    }
  } catch(e) {}

  try {
    const resPr = await fetch('/api/menu-prices');
    if (resPr.ok) {
      const prs = await resPr.json();
      state.menuPrices = prs;
      updateDynamicCardPrices(prs);
    }
  } catch(e) {}

  renderUserOrdersTracker();
}

function updateDynamicCardPrices(prs) {
  if (!prs) return;
  const pCard = document.querySelector('.marmita-card[onclick*="pequena"] .marmita-price');
  const mCard = document.querySelector('.marmita-card[onclick*="media"] .marmita-price');
  const gCard = document.querySelector('.marmita-card[onclick*="grande"] .marmita-price');

  if (pCard && prs.pequena) pCard.innerText = `R$ ${(parseFloat(prs.pequena) || 0).toFixed(2).replace('.', ',')}`;
  if (mCard && prs.media) mCard.innerText = `R$ ${(parseFloat(prs.media) || 0).toFixed(2).replace('.', ',')}`;
  if (gCard && prs.grande) gCard.innerText = `R$ ${(parseFloat(prs.grande) || 0).toFixed(2).replace('.', ',')}`;
}

// DOM Initialization
document.addEventListener('DOMContentLoaded', () => {
  loadStateFromStorage();
  renderDrinksCatalog();
  renderExtrasCatalog();
  updateCartUI();

  // Polling automático em tempo real para o celular do cliente (a cada 2s)
  setInterval(loadStateFromStorage, 2000);
});

// Render Drinks Catalog
function renderDrinksCatalog() {
  const container = document.getElementById('drinks-container');
  if (!container) return;

  container.innerHTML = state.drinks.map(d => `
    <div class="item-row-card">
      <div class="item-row-info">
        <h5>${d.icon} ${d.name}</h5>
        <span>R$ ${d.price.toFixed(2).replace('.', ',')}</span>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="addDrinkToCart('${d.id}')">
        <i class="fa-solid fa-plus text-red"></i> Adicionar
      </button>
    </div>
  `).join('');
}

// Render Extras Catalog
function renderExtrasCatalog() {
  const container = document.getElementById('extras-container');
  if (!container) return;

  container.innerHTML = state.extras.map(e => `
    <div class="item-row-card">
      <div class="item-row-info">
        <h5>${e.icon} ${e.name}</h5>
        <span>R$ ${e.price.toFixed(2).replace('.', ',')}</span>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="addExtraToCart('${e.id}')">
        <i class="fa-solid fa-plus text-red"></i> Adicionar
      </button>
    </div>
  `).join('');
}

// Fulfillment mode (Delivery vs Pickup)
function setFulfillmentMode(mode) {
  state.fulfillmentMode = mode;
  document.getElementById('f-btn-delivery').classList.toggle('active', mode === 'delivery');
  document.getElementById('f-btn-pickup').classList.toggle('active', mode === 'pickup');

  const addrDisplay = document.getElementById('delivery-address-display');
  if (addrDisplay) {
    if (mode === 'delivery') {
      addrDisplay.innerText = 'Entregar em: Centro, Balneário Camboriú (20-30 min)';
    } else {
      addrDisplay.innerText = 'Retirar no Balcão: Rua 1500, Centro - Balneário Camboriú (Pronto em 15 min)';
    }
  }

  const selectBairro = document.getElementById('checkout-bairro-bc');
  if (selectBairro) {
    if (mode === 'pickup') {
      selectBairro.value = 'Retirada Balcao';
    } else {
      selectBairro.value = 'Centro';
    }
    updateDeliveryFeeBC();
  }
}

// Marmita Builder Modal Logic
function openMarmitaBuilderModal(key, title, fallbackPrice) {
  try {
    let basePrice = parseFloat(fallbackPrice) || 10.00;
    if (state.menuPrices && state.menuPrices[key]) {
      basePrice = parseFloat(state.menuPrices[key]) || basePrice;
    }

    state.activeBuilderSize = { key, title, basePrice };

    const titleEl = document.getElementById('builder-modal-title');
    const priceEl = document.getElementById('builder-modal-price');
    if (titleEl) titleEl.innerText = `Montar ${title}`;
    if (priceEl) priceEl.innerText = `Valor Base: R$ ${basePrice.toFixed(2).replace('.', ',')}`;

    // Populate proteins dynamically
    const protContainer = document.getElementById('protein-options-container');
    if (protContainer && state.kitchenProteins && state.kitchenProteins.length) {
      protContainer.innerHTML = state.kitchenProteins.map((p, idx) => `
        <label class="radio-option">
          <input type="radio" name="marmita-protein" value="${p.name}" ${idx === 0 ? 'checked' : ''} />
          <div class="radio-content">
            <strong>${p.name}</strong>
            <small>${p.desc}</small>
          </div>
        </label>
      `).join('');
    }

    // Populate drinks dynamically inside builder
    const drinkContainer = document.getElementById('drink-selection-container');
    if (drinkContainer && state.drinks) {
      const noDrinkHtml = `
        <label class="radio-option">
          <input type="radio" name="marmita-drink" value="sem_bebida" data-price="0.00" onchange="calcBuilderTotal()" checked />
          <div class="radio-content">
            <strong>❌ Sem Bebida</strong>
            <small>Apenas a marmita caprichada</small>
          </div>
        </label>
      `;
      const drinksHtml = state.drinks.map(d => {
        const pNum = parseFloat(d.price) || 0;
        return `
          <label class="radio-option">
            <input type="radio" name="marmita-drink" value="${d.name}" data-price="${pNum}" onchange="calcBuilderTotal()" />
            <div class="radio-content">
              <strong>${d.icon || '🥤'} ${d.name} (+ R$ ${pNum.toFixed(2).replace('.', ',')})</strong>
              <small>Geladinha</small>
            </div>
          </label>
        `;
      }).join('');
      drinkContainer.innerHTML = noDrinkHtml + drinksHtml;
    }

    // Reset notes
    const notesEl = document.getElementById('marmita-notes');
    if (notesEl) notesEl.value = '';

    calcBuilderTotal();
  } catch(e) {
    console.error('Erro ao abrir builder:', e);
  }

  const modal = document.getElementById('modal-marmita-builder');
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
  }
}

function closeMarmitaBuilderModal() {
  const modal = document.getElementById('modal-marmita-builder');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
}

function calcBuilderTotal() {
  if (!state.activeBuilderSize) return;

  let total = state.activeBuilderSize.basePrice;

  const drinkRadio = document.querySelector('input[name="marmita-drink"]:checked');
  if (drinkRadio) {
    const drinkPrice = parseFloat(drinkRadio.getAttribute('data-price')) || 0;
    total += drinkPrice;
  }

  const priceEl = document.getElementById('builder-final-price');
  if (priceEl) priceEl.innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

function confirmAddMarmitaToCart() {
  if (!state.activeBuilderSize) return;

  const selectedSides = [];
  document.querySelectorAll('input[name="marmita-sides"]:checked').forEach(cb => {
    selectedSides.push(cb.value);
  });

  const proteinRadio = document.querySelector('input[name="marmita-protein"]:checked');
  const protein = proteinRadio ? proteinRadio.value : 'Carne';

  const drinkRadio = document.querySelector('input[name="marmita-drink"]:checked');
  let drinkText = '';
  let drinkPrice = 0;
  if (drinkRadio && drinkRadio.value !== 'sem_bebida') {
    drinkText = drinkRadio.value;
    drinkPrice = parseFloat(drinkRadio.getAttribute('data-price')) || 0;
  }

  const notes = document.getElementById('marmita-notes').value.trim();

  const finalUnitPrice = state.activeBuilderSize.basePrice + drinkPrice;

  const sidesSummary = selectedSides.length ? selectedSides.join(', ') : 'Sem acompanhamentos';
  const detailsString = `Base: ${sidesSummary} | Carne: ${protein}${drinkText ? ' | Bebida: ' + drinkText : ''}${notes ? ' | Obs: ' + notes : ''}`;

  state.cart.push({
    id: 'marmita_' + Date.now(),
    type: 'marmita',
    title: `${state.activeBuilderSize.title} (${protein})`,
    details: detailsString,
    price: finalUnitPrice,
    qty: 1
  });

  updateCartUI();
  closeMarmitaBuilderModal();
  showToast(`${state.activeBuilderSize.title} adicionada ao seu pedido!`, 'success');
}

// Add Drink to Cart
function addDrinkToCart(drinkId) {
  const drink = state.drinks.find(d => d.id === drinkId);
  if (!drink) return;

  const existing = state.cart.find(i => i.id === drink.id);
  if (existing) {
    existing.qty += 1;
  } else {
    state.cart.push({
      id: drink.id,
      type: 'drink',
      title: drink.name,
      details: 'Refrigerante Lata 350ml',
      price: drink.price,
      qty: 1
    });
  }

  updateCartUI();
  showToast(`"${drink.name}" adicionado ao pedido!`, 'success');
}

// Add Extra to Cart
function addExtraToCart(extraId) {
  const extra = state.extras.find(e => e.id === extraId);
  if (!extra) return;

  const existing = state.cart.find(i => i.id === extra.id);
  if (existing) {
    existing.qty += 1;
  } else {
    state.cart.push({
      id: extra.id,
      type: 'extra',
      title: extra.name,
      details: 'Porção Extra',
      price: extra.price,
      qty: 1
    });
  }

  updateCartUI();
  showToast(`"${extra.name}" adicionado ao pedido!`, 'success');
}

// Update Cart UI & Balneário Camboriú Delivery Fees
function updateCartUI() {
  const navBadge = document.getElementById('nav-cart-count');
  const itemsContainer = document.getElementById('cart-items-container');
  const subtotalEl = document.getElementById('cart-subtotal');
  const feeEl = document.getElementById('cart-fee-display');
  const totalEl = document.getElementById('cart-total-price');

  const stickyBar = document.getElementById('sticky-cart-bar');
  const stickyCount = document.getElementById('sticky-cart-count');
  const stickyTotal = document.getElementById('sticky-cart-total');

  const totalItemsCount = state.cart.reduce((sum, item) => sum + item.qty, 0);
  if (navBadge) navBadge.innerText = totalItemsCount;

  if (totalItemsCount > 0) {
    if (stickyBar) stickyBar.style.display = 'flex';
    if (stickyCount) stickyCount.innerText = totalItemsCount;
  } else {
    if (stickyBar) stickyBar.style.display = 'none';
  }

  let subtotal = 0;

  if (itemsContainer) {
    if (state.cart.length === 0) {
      itemsContainer.innerHTML = `
        <div style="text-align: center; padding: 2rem 1rem; color: var(--color-muted);">
          <i class="fa-solid fa-utensils" style="font-size: 2.5rem; margin-bottom: 0.5rem; display: block; opacity: 0.5;"></i>
          <p>Seu pedido está vazio.</p>
        </div>
      `;
    } else {
      itemsContainer.innerHTML = state.cart.map(item => {
        const itemTotal = item.price * item.qty;
        subtotal += itemTotal;

        return `
          <div class="cart-item-row">
            <div class="cart-item-info">
              <strong>${item.title}</strong>
              <small style="display: block; margin-top: 0.2rem; color: var(--color-muted);">${item.details}</small>
              <strong style="color: var(--color-red); margin-top: 0.2rem; display: block;">R$ ${item.price.toFixed(2).replace('.', ',')} un</strong>
            </div>
            <div class="cart-qty-controls">
              <button class="btn-qty" onclick="changeCartItemQty('${item.id}', -1)">-</button>
              <strong style="font-size: 0.85rem;">${item.qty}</strong>
              <button class="btn-qty" onclick="changeCartItemQty('${item.id}', 1)">+</button>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  const selectBairro = document.getElementById('checkout-bairro-bc');
  let fee = 3.00;
  if (selectBairro) {
    const selectedOpt = selectBairro.options[selectBairro.selectedIndex];
    if (selectedOpt) fee = parseFloat(selectedOpt.getAttribute('data-fee')) || 0;
  }

  const grandTotal = subtotal + fee;

  if (subtotalEl) subtotalEl.innerText = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
  if (feeEl) feeEl.innerHTML = fee === 0 ? '<span class="text-success">SEM TAXA (BALCÃO)</span>' : `R$ ${fee.toFixed(2).replace('.', ',')}`;
  if (totalEl) totalEl.innerText = `R$ ${grandTotal.toFixed(2).replace('.', ',')}`;
  if (stickyTotal) stickyTotal.innerText = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
}

function updateDeliveryFeeBC() {
  updateCartUI();
}

function changeCartItemQty(id, delta) {
  const index = state.cart.findIndex(i => i.id === id);
  if (index === -1) return;

  state.cart[index].qty += delta;
  if (state.cart[index].qty <= 0) {
    state.cart.splice(index, 1);
  }

  updateCartUI();
}

function clearCart() {
  state.cart = [];
  updateCartUI();
}

function toggleCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-drawer-overlay');
  if (drawer && overlay) {
    drawer.classList.toggle('active');
    overlay.classList.toggle('active');
  }
}

// Checkout & Proceed to Payment
function proceedToCheckoutPayment() {
  if (state.cart.length === 0) {
    showToast('Seu pedido está vazio! Escolha sua marmita ou bebida primeiro.', 'warning');
    return;
  }

  const addressInput = document.getElementById('checkout-address-input');
  if (!addressInput || addressInput.value.trim() === '') {
    showToast('Por favor, informe a rua e número para a entrega em BC.', 'warning');
    if (addressInput) addressInput.focus();
    return;
  }

  const methodSelect = document.getElementById('checkout-payment-method');
  const method = methodSelect ? methodSelect.value : 'pix';

  if (method === 'pix') {
    document.getElementById('cart-step-items').style.display = 'none';
    document.getElementById('cart-step-pix').style.display = 'block';
    document.getElementById('cart-footer-actions').style.display = 'none';
  } else {
    confirmPaymentAndSendToKitchen();
  }
}

async function confirmPaymentAndSendToKitchen() {
  const address = document.getElementById('checkout-address-input').value.trim();
  const selectBairro = document.getElementById('checkout-bairro-bc');
  const bairro = selectBairro ? selectBairro.value : 'Centro';

  const itemsText = state.cart.map(i => `${i.qty}x ${i.title}`).join(' | ');

  let subtotal = state.cart.reduce((s, i) => s + (i.price * i.qty), 0);
  let fee = 3.00;
  if (selectBairro) {
    const opt = selectBairro.options[selectBairro.selectedIndex];
    if (opt) fee = parseFloat(opt.getAttribute('data-fee')) || 0;
  }
  let total = subtotal + fee;

  const clientName = state.currentUser ? state.currentUser.name : 'Cliente BC';
  const clientPhone = state.currentUser ? state.currentUser.phone : '';

  const newOrder = {
    id: 'BC-' + Math.floor(1000 + Math.random() * 9000),
    clientName: clientName,
    clientPhone: clientPhone,
    address: `${address}, Bairro: ${bairro} (Balneário Camboriú)`,
    items: itemsText,
    total: total,
    paymentMethod: 'PIX / Cartão',
    status: 'EM_PREPARO',
    date: 'Hoje, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  try {
    await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrder)
    });
  } catch (e) {
    console.error('Erro ao enviar pedido para a API:', e);
  }

  state.orders.unshift(newOrder);
  saveStateToStorage();

  clearCart();
  toggleCartDrawer();

  // Reset drawer steps
  document.getElementById('cart-step-items').style.display = 'block';
  document.getElementById('cart-step-pix').style.display = 'none';
  document.getElementById('cart-footer-actions').style.display = 'flex';

  openMyOrdersModal();
  playNotificationSound('status');
  showToast('Pedido enviado para a cozinha! Acompanhe o preparo ao vivo.', 'success');
}

function playNotificationSound(type = 'status') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.2); // A5

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  } catch(e) {}
}

const OWNER_CREDENTIALS = {
  email: 'dono@bcmarmitas.com.br',
  password: '123'
};

// Kitchen Admin Panel (Cozinha)
function openKitchenAdminModal() {
  const isAuth = sessionStorage.getItem('bc_owner_auth') === 'true';
  if (!isAuth) {
    openOwnerLoginModal();
    return;
  }

  const modal = document.getElementById('modal-kitchen-admin');
  if (modal) modal.classList.add('active');
  renderKitchenOrders();
  renderKitchenProteins();
}

function openOwnerLoginModal() {
  const modal = document.getElementById('modal-owner-login');
  if (modal) modal.classList.add('active');
}

function closeOwnerLoginModal() {
  const modal = document.getElementById('modal-owner-login');
  if (modal) modal.classList.remove('active');
}

function fillOwnerCredentialsFast() {
  const emailInput = document.getElementById('owner-email');
  const passInput = document.getElementById('owner-password');
  if (emailInput) emailInput.value = OWNER_CREDENTIALS.email;
  if (passInput) passInput.value = OWNER_CREDENTIALS.password;
  showToast('Dados do Dono preenchidos!', 'info');
}

function toggleOwnerPasswordVisibility() {
  const input = document.getElementById('owner-password');
  const icon = document.getElementById('owner-eye-icon');
  if (!input) return;

  if (input.type === 'password') {
    input.type = 'text';
    if (icon) icon.className = 'fa-solid fa-eye-slash';
  } else {
    input.type = 'password';
    if (icon) icon.className = 'fa-solid fa-eye';
  }
}

function handleOwnerLogin(e) {
  e.preventDefault();

  const email = document.getElementById('owner-email').value.trim().toLowerCase();
  const pass = document.getElementById('owner-password').value.trim();

  if (email === OWNER_CREDENTIALS.email && pass === OWNER_CREDENTIALS.password) {
    sessionStorage.setItem('bc_owner_auth', 'true');
    closeOwnerLoginModal();

    const modal = document.getElementById('modal-kitchen-admin');
    if (modal) modal.classList.add('active');

    renderKitchenOrders();
    renderKitchenProteins();
    showToast('Login de Dono realizado com sucesso! Bem-vindo à cozinha.', 'success');
  } else {
    showToast('E-mail ou senha incorretos!', 'warning');
  }
}

function handleOwnerLogout() {
  sessionStorage.removeItem('bc_owner_auth');
  closeKitchenAdminModal();
  showToast('Sessão do Dono encerrada.', 'info');
}

function closeKitchenAdminModal() {
  const modal = document.getElementById('modal-kitchen-admin');
  if (modal) modal.classList.remove('active');
}

function switchKitchenTab(tabName, btn) {
  document.querySelectorAll('.partner-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.partner-tab-pane').forEach(p => p.classList.remove('active'));

  if (btn) btn.classList.add('active');

  const paneMap = {
    'orders': 'pane-kitchen-orders',
    'menu': 'pane-kitchen-menu'
  };

  const activePane = document.getElementById(paneMap[tabName]);
  if (activePane) activePane.classList.add('active');
}

function renderKitchenOrders() {
  const list = document.getElementById('kitchen-orders-list');
  const countBadge = document.getElementById('kitchen-orders-count');
  if (!list) return;

  if (countBadge) countBadge.innerText = state.orders.length;

  if (state.orders.length === 0) {
    list.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-muted);">Nenhum pedido na cozinha no momento.</td></tr>`;
    return;
  }

  list.innerHTML = state.orders.map(o => `
    <tr>
      <td><strong>${o.id}</strong><br/><small style="color: var(--color-muted);">${o.date}</small></td>
      <td><strong>${o.clientName}</strong><br/><small>${o.address}</small></td>
      <td>${o.items}</td>
      <td><strong class="text-red">R$ ${o.total.toFixed(2).replace('.', ',')}</strong></td>
      <td>
        <span class="status-pill ${o.status === 'ENTREGUE' ? 'status-delivered' : 'status-pending'}">
          ${o.status === 'EM_PREPARO' ? '🍳 No Fogão' : (o.status === 'SAIU_ENTREGA' ? '🛵 Saiu p/ Entrega' : '✅ Entregue')}
        </span>
      </td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="advanceKitchenOrderStatus('${o.id}')">
          <i class="fa-solid fa-angles-right"></i> Avançar
        </button>
      </td>
    </tr>
  `).join('');
}

function advanceKitchenOrderStatus(orderId) {
  const order = state.orders.find(o => o.id === orderId);
  if (!order) return;

  if (order.status === 'EM_PREPARO') {
    order.status = 'SAIU_ENTREGA';
    showToast(`Marmita ${order.id} saiu para entrega no endereço! 🛵`, 'info');
  } else if (order.status === 'SAIU_ENTREGA') {
    order.status = 'ENTREGUE';
    showToast(`Marmita ${order.id} entregue com sucesso ao cliente! 🎉`, 'success');
  } else {
    showToast(`Pedido ${order.id} já foi finalizado.`, 'info');
  }

  saveStateToStorage();
  renderKitchenOrders();
  renderUserOrdersTracker(); // Sincroniza em tempo real para a tela do cliente!
}

function renderKitchenProteins() {
  const list = document.getElementById('kitchen-proteins-list');
  if (!list) return;

  list.innerHTML = state.kitchenProteins.map(p => `
    <tr>
      <td><strong>${p.name}</strong></td>
      <td>${p.desc}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="deleteKitchenProtein('${p.id}')">
          <i class="fa-solid fa-trash text-red"></i> Excluir
        </button>
      </td>
    </tr>
  `).join('');
}

function handleAddKitchenProtein(e) {
  e.preventDefault();

  const name = document.getElementById('new-protein-name').value.trim();
  const desc = document.getElementById('new-protein-desc').value.trim();

  state.kitchenProteins.push({
    id: 'prot_' + Date.now(),
    name: name,
    desc: desc
  });

  saveStateToStorage();
  renderKitchenProteins();
  e.target.reset();
  showToast(`Nova opção "${name}" adicionada ao cardápio de carnes!`, 'success');
}

function deleteKitchenProtein(id) {
  if (!confirm('Excluir esta opção de carne do cardápio?')) return;

  state.kitchenProteins = state.kitchenProteins.filter(p => p.id !== id);
  saveStateToStorage();
  renderKitchenProteins();
  showToast('Opção removida do cardápio.', 'info');
}

// User Orders Tracker Modal
function renderUserOrdersTracker() {
  const container = document.getElementById('user-orders-tracker-list');
  if (!container) return;

  if (state.orders.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--color-muted);">Você ainda não fez pedidos hoje.</p>';
    return;
  }

  container.innerHTML = state.orders.map(o => {
    const priceNum = parseFloat(o.total) || 0;
    return '<div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1rem; box-shadow: var(--shadow-sm);">' +
      '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">' +
        '<h4 style="font-family: var(--font-heading); font-size: 1.1rem; color: var(--color-dark);">BC MARMITAS</h4>' +
        '<strong style="color: var(--color-red);">' + o.id + '</strong>' +
      '</div>' +
      '<p style="font-size: 0.8rem; color: var(--color-muted); margin-bottom: 0.75rem;">' + o.items + '</p>' +
      '<small style="display: block; color: var(--color-dark); font-weight: 700; margin-bottom: 0.5rem;">📍 ' + o.address + '</small>' +
      '<div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 800; padding: 0.5rem 0; border-top: 1px dashed var(--border-color);">' +
        '<span>Total: R$ ' + priceNum.toFixed(2).replace('.', ',') + '</span>' +
        '<span class="text-success">' + o.paymentMethod + '</span>' +
      '</div>' +
      '<div style="margin-top: 0.75rem; background: #ffffff; padding: 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">' +
        '<strong style="font-size: 0.78rem; color: var(--color-muted); display: block; margin-bottom: 0.5rem;">RASTREAMENTO DO PEDIDO EM BC:</strong>' +
        '<div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; font-weight: 800; position: relative;">' +
          '<div style="text-align: center; color: ' + (o.status === 'EM_PREPARO' ? 'var(--color-red)' : '#64748b') + ';">' +
            '<i class="fa-solid fa-kitchen-set" style="font-size: 1.2rem; display: block; margin-bottom: 2px;"></i>' +
            '<span>🍳 No Fogão</span>' +
          '</div>' +
          '<div style="text-align: center; color: ' + (o.status === 'SAIU_ENTREGA' ? 'var(--color-red)' : '#64748b') + ';">' +
            '<i class="fa-solid fa-motorcycle" style="font-size: 1.2rem; display: block; margin-bottom: 2px;"></i>' +
            '<span>🛵 A Caminho</span>' +
          '</div>' +
          '<div style="text-align: center; color: ' + (o.status === 'ENTREGUE' ? 'var(--color-emerald)' : '#64748b') + ';">' +
            '<i class="fa-solid fa-circle-check" style="font-size: 1.2rem; display: block; margin-bottom: 2px;"></i>' +
            '<span>🎉 Entregue</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div style="margin-top: 0.75rem; display: flex; justify-content: flex-end;">' +
        '<button class="btn btn-primary btn-sm" onclick="openOrderReceiptModal(\'' + o.id + '\')">' +
          '<i class="fa-solid fa-receipt"></i> Ver Cupom / Comprovante' +
        '</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

// --- CUPOM / COMPROVANTE DIGITAL ---
let activeReceiptOrder = null;

function openOrderReceiptModal(orderId) {
  const order = state.orders.find(o => o.id === orderId);
  if (!order) return;

  activeReceiptOrder = order;

  const container = document.getElementById('receipt-modal-body');
  if (!container) return;

  const priceNum = parseFloat(order.total) || 0;

  container.innerHTML = `
    <div id="printable-receipt-content" style="background: #ffffff; border: 1px dashed #cbd5e1; padding: 1.25rem; border-radius: var(--radius-sm); font-family: 'Courier New', Courier, monospace; color: #0f172a;">
      <div style="text-align: center; border-bottom: 2px dashed #94a3b8; padding-bottom: 0.75rem; margin-bottom: 0.75rem;">
        <h3 style="font-size: 1.1rem; font-weight: 900; margin-bottom: 2px;">🍱 BC MARMITAS - COMIDA CASEIRA</h3>
        <p style="font-size: 0.75rem;">Marmitas Quentinhas e Deliciosas</p>
        <p style="font-size: 0.7rem;">Balneário Camboriú - SC • Tel/WA: (47) 99999-9999</p>
      </div>

      <div style="font-size: 0.78rem; border-bottom: 1px dashed #cbd5e1; padding-bottom: 0.5rem; margin-bottom: 0.5rem;">
        <div><strong>PEDIDO Nº:</strong> <span style="font-weight: 900; color: #dc2626;">${order.id}</span></div>
        <div><strong>DATA/HORA:</strong> ${order.date || 'Hoje'}</div>
        <div><strong>CLIENTE:</strong> ${order.clientName || 'Cliente'}</div>
        <div><strong>TELEFONE:</strong> ${order.clientPhone || 'Não informado'}</div>
        <div><strong>ENDEREÇO:</strong> ${order.address}</div>
      </div>

      <div style="font-size: 0.78rem; border-bottom: 1px dashed #cbd5e1; padding-bottom: 0.5rem; margin-bottom: 0.5rem;">
        <div style="font-weight: 800; margin-bottom: 4px;">ITENS DO PEDIDO:</div>
        <p style="white-space: pre-wrap; font-size: 0.75rem; line-height: 1.4;">${order.items}</p>
      </div>

      <div style="font-size: 0.82rem; font-weight: 800; display: flex; justify-content: space-between; border-bottom: 2px dashed #94a3b8; padding-bottom: 0.5rem; margin-bottom: 0.75rem;">
        <span>FORMA PAGO: ${order.paymentMethod || 'PIX / Cartão'}</span>
        <span style="font-size: 1rem; color: #dc2626;">TOTAL: R$ ${priceNum.toFixed(2).replace('.', ',')}</span>
      </div>

      <div style="text-align: center; font-size: 0.7rem; color: #64748b;">
        <p>Agradecemos a sua preferência!</p>
        <p>Bom apetite! 🍱❤️</p>
      </div>
    </div>
  `;

  const modal = document.getElementById('modal-receipt');
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
  }
}

function closeReceiptModal() {
  const modal = document.getElementById('modal-receipt');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
}

function sendReceiptWhatsApp() {
  if (!activeReceiptOrder) return;
  const o = activeReceiptOrder;
  const priceNum = parseFloat(o.total) || 0;

  const msg = `*🍱 COMPROVANTE BC MARMITAS*%0A` +
    `*Pedido:* ${o.id}%0A` +
    `*Data:* ${o.date || 'Hoje'}%0A` +
    `*Cliente:* ${o.clientName}%0A` +
    `*Endereço:* ${o.address}%0A%0A` +
    `*Itens:* ${o.items}%0A%0A` +
    `*Pagamento:* ${o.paymentMethod}%0A` +
    `*TOTAL:* R$ ${priceNum.toFixed(2).replace('.', ',')}%0A%0A` +
    `_Obrigado pela preferência! Bom apetite! 🍱❤️_`;

  const phone = o.clientPhone ? o.clientPhone.replace(/\D/g, '') : '5547999999999';
  window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${msg}`, '_blank');
}

function printOrderReceipt() {
  const content = document.getElementById('printable-receipt-content');
  if (!content) return;

  const printWin = window.open('', '', 'width=400,height=600');
  printWin.document.write(`
    <html>
      <head>
        <title>Cupom - ${activeReceiptOrder ? activeReceiptOrder.id : 'Pedido'}</title>
        <style>
          body { font-family: monospace; padding: 10px; margin: 0; }
          @media print {
            @page { margin: 0; size: auto; }
          }
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body>
    </html>
  `);
  printWin.document.close();
  printWin.focus();
  setTimeout(() => {
    printWin.print();
    printWin.close();
  }, 250);
}

// --- PROGRAMA DE FIDELIDADE (JS) ---
state.currentUser = null;
state.rewards = [];

// Load user session from localStorage if available
try {
  const savedUser = localStorage.getItem('bcmarmitas_customer');
  if (savedUser) state.currentUser = JSON.parse(savedUser);
} catch(e) {}

function openLoyaltyModal() {
  const modal = document.getElementById('modal-loyalty');
  if (modal) modal.classList.add('active');
  updateLoyaltyUI();
  fetchRewardsCatalog();
}

function closeLoyaltyModal() {
  const modal = document.getElementById('modal-loyalty');
  if (modal) modal.classList.remove('active');
}

function switchLoyaltyAuthTab(tab) {
  const btnLogin = document.getElementById('btn-loyalty-tab-login');
  const btnReg = document.getElementById('btn-loyalty-tab-reg');
  const formLogin = document.getElementById('form-loyalty-login');
  const formReg = document.getElementById('form-loyalty-register');

  if (tab === 'login') {
    btnLogin.classList.add('active');
    btnReg.classList.remove('active');
    formLogin.style.display = 'block';
    formReg.style.display = 'none';
  } else {
    btnReg.classList.add('active');
    btnLogin.classList.remove('active');
    formReg.style.display = 'block';
    formLogin.style.display = 'none';
  }
}

async function handleLoyaltyRegister(e) {
  e.preventDefault();
  const name = document.getElementById('loyalty-reg-name').value.trim();
  const rawPhone = document.getElementById('loyalty-reg-phone').value.trim();
  const phone = rawPhone.replace(/\D/g, '');
  const password = document.getElementById('loyalty-reg-pass').value.trim();

  try {
    const res = await fetch('/api/customers/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, password })
    });
    const data = await res.json();
    if (res.ok && data.status === 'ok') {
      state.currentUser = data.customer;
      localStorage.setItem('bcmarmitas_customer', JSON.stringify(state.currentUser));
      showToast(data.message || 'Conta criada com sucesso!', 'success');
      updateLoyaltyUI();
    } else {
      showToast(data.message || 'Erro ao criar conta.', 'warning');
    }
  } catch(e) {
    showToast('Erro de conexão ao cadastrar.', 'warning');
  }
}

async function handleLoyaltyLogin(e) {
  e.preventDefault();
  const rawPhone = document.getElementById('loyalty-login-phone').value.trim();
  const phone = rawPhone.replace(/\D/g, '');
  const password = document.getElementById('loyalty-login-pass').value.trim();

  try {
    const res = await fetch('/api/customers/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    });
    const data = await res.json();
    if (res.ok && data.status === 'ok') {
      state.currentUser = data.customer;
      localStorage.setItem('bcmarmitas_customer', JSON.stringify(state.currentUser));
      showToast(`Bem-vindo de volta, ${state.currentUser.name}!`, 'success');
      updateLoyaltyUI();
    } else {
      showToast(data.message || 'WhatsApp ou senha incorretos. Se for seu primeiro acesso, clique na aba "Criar Nova Conta" ao lado!', 'warning');
    }
  } catch(e) {
    showToast('Erro de conexão ao entrar.', 'warning');
  }
}

function handleLoyaltyLogout() {
  state.currentUser = null;
  localStorage.removeItem('bcmarmitas_customer');
  updateLoyaltyUI();
  showToast('Você saiu da sua conta de fidelidade.', 'info');
}

function updateLoyaltyUI() {
  const authDiv = document.getElementById('loyalty-auth-container');
  const dashDiv = document.getElementById('loyalty-dashboard-container');

  if (state.currentUser) {
    if (authDiv) authDiv.style.display = 'none';
    if (dashDiv) dashDiv.style.display = 'block';

    const nameEl = document.getElementById('loyalty-user-name');
    const phoneEl = document.getElementById('loyalty-user-phone');
    const ptsEl = document.getElementById('loyalty-user-points');

    if (nameEl) nameEl.innerText = `Olá, ${state.currentUser.name}!`;
    if (phoneEl) phoneEl.innerText = `Whats: ${state.currentUser.phone}`;
    if (ptsEl) ptsEl.innerText = `⭐ ${state.currentUser.points} Pontos`;

    renderRewardsCatalog();
  } else {
    if (authDiv) authDiv.style.display = 'block';
    if (dashDiv) dashDiv.style.display = 'none';
  }
}

async function fetchRewardsCatalog() {
  try {
    const res = await fetch('/api/rewards');
    if (res.ok) {
      state.rewards = await res.json();
      renderRewardsCatalog();
    }
  } catch(e) {}
}

function renderRewardsCatalog() {
  const container = document.getElementById('rewards-catalog-list');
  if (!container) return;

  if (state.rewards.length === 0) {
    container.innerHTML = `<p style="text-align: center; color: var(--color-muted);">Nenhum prêmio disponível no momento.</p>`;
    return;
  }

  const userPts = state.currentUser ? state.currentUser.points : 0;

  container.innerHTML = state.rewards.map(r => {
    const canAfford = userPts >= r.points;
    return `
      <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; box-shadow: var(--shadow-sm);">
        <div>
          <h5 style="font-size: 0.95rem; color: var(--color-dark); margin-bottom: 0.2rem;">${r.name}</h5>
          <p style="font-size: 0.78rem; color: var(--color-muted);">${r.desc || ''}</p>
          <span style="font-size: 0.8rem; font-weight: 800; color: #dc2626; margin-top: 0.2rem; display: inline-block;">⭐ ${r.points} Pontos</span>
        </div>
        <button class="btn btn-sm ${canAfford ? 'btn-primary btn-red' : 'btn-secondary'}" 
                onclick="redeemRewardItem('${r.id}')" ${canAfford ? '' : 'disabled style="opacity: 0.5;"'}>
          ${canAfford ? '<i class="fa-solid fa-gift"></i> Resgatar' : 'Faltam Pontos'}
        </button>
      </div>
    `;
  }).join('');
}

async function redeemRewardItem(rewardId) {
  const reward = state.rewards.find(r => r.id === rewardId);
  if (!reward || !state.currentUser) return;

  if (state.currentUser.points < reward.points) {
    showToast('Você não possui pontos suficientes para este resgate.', 'warning');
    return;
  }

  try {
    const res = await fetch('/api/customers/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: state.currentUser.phone, points: reward.points })
    });
    const data = await res.json();
    if (res.ok && data.status === 'ok') {
      state.currentUser = data.customer;
      localStorage.setItem('bcmarmitas_customer', JSON.stringify(state.currentUser));
      
      // Apply reward to cart automatically!
      state.cart.push({
        id: 'rew_cart_' + Date.now(),
        type: 'reward',
        title: `🎁 PRÊMIO: ${reward.name}`,
        details: 'Resgate de Pontos Fidelidade',
        price: reward.type === 'discount' ? -reward.value : 0.00,
        qty: 1
      });

      updateCartUI();
      updateLoyaltyUI();
      closeLoyaltyModal();
      showToast(`🎉 Você resgatou "${reward.name}"! Item adicionado ao seu pedido.`, 'success');
    } else {
      showToast(data.message || 'Erro ao resgatar.', 'warning');
    }
  } catch(e) {
    showToast('Erro de conexão ao resgatar.', 'warning');
  }
}

function openMyOrdersModal() {
  const modal = document.getElementById('modal-my-orders');
  if (!modal) return;
  modal.classList.add('active');
  renderUserOrdersTracker();
}

function closeMyOrdersModal() {
  const modal = document.getElementById('modal-my-orders');
  if (modal) modal.classList.remove('active');
}

// Scroll to Catalog Section
function scrollToSection(secId, btn) {
  document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const sec = document.getElementById(secId);
  if (sec) {
    sec.scrollIntoView({ behavior: 'smooth' });
  }
}

// Copy PIX Code
function copyPixCode() {
  const input = document.getElementById('pix-copy-input');
  if (input) {
    input.select();
    navigator.clipboard.writeText(input.value);
    showToast('Chave PIX da BC Marmitas copiada!', 'success');
  }
}

// Toast Notification Helper
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fa-solid fa-circle-info"></i> ${msg}`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}
