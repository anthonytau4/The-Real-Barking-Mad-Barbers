import { BUSINESS as B, SIZES, PRICES, EXTRAS, INCLUDED, PROFILE_KEY, INBOX_KEY, estimateDogs, money, esc, nzToday, stayError, smsUrl, bookingMessage } from './site-core.js';
import { dogCard, icon } from './site-views.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const formData = form => Object.fromEntries([...new FormData(form)].map(([name, value]) => [name, typeof value === 'string' ? value.trim() : value]));
function stored(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function writeStored(key, data) { try { localStorage.setItem(key, JSON.stringify(data)); return true; } catch { return false; } }
function removeStored(key) { try { localStorage.removeItem(key); return true; } catch { return false; } }
function profile() { const data = stored(PROFILE_KEY, {}); return data && typeof data === 'object' && !Array.isArray(data) ? data : {}; }
function history() { const data = stored(INBOX_KEY, []); return Array.isArray(data) ? data.filter(item => item && typeof item === 'object') : []; }
function saveHistory(type, data) {
  writeStored(INBOX_KEY, [{ type, data, created_at: new Date().toLocaleString('en-NZ'), id: Date.now().toString(36) }, ...history()].slice(0, 100));
}
function announce(target, message, error = false) {
  target.innerHTML = `<div class="status${error ? ' error' : ''}">${esc(message)}</div>`;
}
async function copyText(text, target, preview, email = false) {
  let feedback = $('.copy-feedback', target);
  if (!feedback) { feedback = document.createElement('p'); feedback.className = 'copy-feedback status'; feedback.setAttribute('role', 'status'); target.append(feedback); }
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(text);
    feedback.textContent = `Copied. Paste the message into ${email ? `an email to ${B.email}` : `a text to ${B.phone}`}, then send it.`;
  } catch {
    if (preview) { preview.focus(); preview.select(); }
    feedback.textContent = 'Your browser couldn’t copy automatically. Select and copy the message above.';
  }
}
function prepareMessage(target, body, { email = false, subject = '', showPreview = true } = {}) {
  const url = email ? `mailto:${B.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` : smsUrl(body, navigator.userAgent);
  target.innerHTML = `<div class="status"><strong>Your ${email ? 'email' : 'text'} is ready.</strong><p>${email ? `Send it from your email app to ${B.email}. You can attach your photo there.` : `Send it from your messaging app to ${B.phone}. If your app doesn’t open, copy the message instead.`}</p>${showPreview ? `<label class="sr-only" for="${target.id}-preview">Prepared message</label><textarea id="${target.id}-preview" rows="7" readonly>${esc(body)}</textarea>` : ''}<div class="actions"><a class="button primary" href="${esc(url)}">Open ${email ? 'email' : 'text'} app ${icon('diagonal')}</a><button type="button" class="button outline" data-copy-message>Copy message</button></div></div>`;
  $('[data-copy-message]', target).addEventListener('click', () => copyText(body, target, $('textarea', target) || $('#booking-preview'), email));
  // Preparing an enquiry never means it has been delivered or confirmed.
  if (email || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) window.location.href = url;
}

function initNavigation() {
  const toggle = $('.menu-toggle'), nav = $('#mobile-nav'), about = $('.nav-details');
  const close = () => { toggle.setAttribute('aria-expanded', 'false'); nav.hidden = true; };
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded)); nav.hidden = expanded;
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!nav.hidden) { close(); toggle.focus(); }
    if (about.open) { about.open = false; $('summary', about).focus(); }
  });
  document.addEventListener('click', event => {
    if (!about.contains(event.target)) about.open = false;
    if (!nav.hidden && !$('.site-header').contains(event.target)) close();
  });
  document.addEventListener('focusin', event => {
    if (about.open && !about.contains(event.target)) about.open = false;
  });
  matchMedia('(min-width:981px)').addEventListener('change', event => { if (event.matches) close(); });
}
function initPrices() {
  $$('[name="price-size"]').forEach(input => input.addEventListener('change', () => {
    if (!input.checked) return;
    const i = SIZES.indexOf(input.value);
    $$('[data-price]').forEach(el => {
      el.textContent = money(PRICES[el.dataset.price][i]);
      el.nextElementSibling.textContent = `${input.value} dog · NZD`;
      const link = $('.button', el.closest('.service-card'));
      const url = new URL(link.href); url.searchParams.set('size', input.value); link.href = url.pathname + url.search;
    });
  }));
  if ($('[name="price-size"]:checked')) $('[name="price-size"]:checked').dispatchEvent(new Event('change'));
}

function initBooking() {
  const form = $('#booking-form');
  if (!form) return;
  let step = 1, dogId = 1, lastSavedMessage = '';
  const readDogs = () => $$('.dog-card', form).map(card => ({
    dog_name: $('[name="dog_name"]', card).value.trim(), dog_size: $('[name="dog_size"]', card).value,
    breed: $('[name="breed"]', card).value.trim(), dog_preferred_time: $('[name="dog_preferred_time"]', card).value.trim(),
    services: $$('[name="services"]:checked', card).map(input => input.value)
  }));
  const isBoarding = () => form.elements.service_type.value === 'Dog Boarding';
  const read = () => ({ ...formData(form), dogs: isBoarding() ? [] : readDogs() });
  const showStep = (next, focus = true) => {
    step = next;
    $$('[data-step]', form).forEach(section => { section.hidden = Number(section.dataset.step) !== step; });
    $$('[data-step-indicator]').forEach(indicator => {
      const number = Number(indicator.dataset.stepIndicator);
      if (number === step) indicator.setAttribute('aria-current', 'step'); else indicator.removeAttribute('aria-current');
      indicator.classList.toggle('complete', number < step);
    });
    if (step === 3) $('#booking-preview').value = bookingMessage(read());
    if (focus) {
      const heading = $(`[data-step="${step}"] h2`, form);
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({block:'start',behavior:'instant'});
    }
  };
  const updateDates = () => {
    form.elements.preferred_date.min = nzToday();
    form.elements.drop_off.min = nzToday();
    const drop = form.elements.drop_off.value;
    if (drop) {
      const next = new Date(`${drop}T12:00:00Z`); next.setUTCDate(next.getUTCDate() + 1);
      form.elements.pick_up.min = next.toISOString().slice(0, 10);
    } else form.elements.pick_up.min = nzToday();
  };
  const updateEstimate = () => {
    const aside = $('#booking-estimate');
    $('.aside-guide').hidden = isBoarding();
    $('.estimate-card>.fine-print').hidden = isBoarding();
    if (isBoarding()) {
      aside.innerHTML = '<p>Boarding prices are by arrangement.</p><div class="estimate-total"><span>Your stay</span><strong>Let’s talk</strong></div><p class="fine-print">We’ll confirm availability and cost for your dates when we reply.</p>';
      return;
    }
    const dogs = readDogs(), estimate = estimateDogs(dogs);
    $$('.dog-card', form).forEach((card, i) => {
      const current = estimate.dogs[i], selected = dogs[i].services;
      const main = selected.includes('Full Groom') ? 'Full Groom' : selected.includes('Wash & Dry') ? 'Wash & Dry' : '';
      $$('[name="services"]', card).forEach(input => {
        const service = input.value;
        const amount = INCLUDED[main]?.includes(service) ? 0 : PRICES[service]?.[SIZES.indexOf(current.size)] ?? EXTRAS[service];
        $('[data-option-price]', input.closest('label')).textContent = amount === 0 ? 'Included in your groom' : amount === undefined ? `from ${money(PRICES[service][0])}` : money(amount);
      });
      $('.dog-subtotal', card).textContent = current.complete ? `Estimated price: ${money(current.total)} NZD` : 'Choose a size and service to see an estimate.';
    });
    aside.innerHTML = estimate.dogs.map(dog => `<div class="estimate-dog"><h3>${esc(dog.name)}${dog.size ? ` <small>· ${esc(dog.size)}</small>` : ''}</h3>${dog.items.length ? dog.items.map(item => `<div class="estimate-line"><span>${esc(item.service)}</span><strong>${item.amount === null ? 'Choose size' : item.amount === 0 ? 'Included' : money(item.amount)}</strong></div>`).join('') : '<p>Choose their services.</p>'}</div>`).join('') + `<div class="estimate-total"><span>${estimate.complete ? 'Estimated total' : 'Subtotal so far'}</span><strong>${estimate.dogs.some(d => d.items.length) ? money(estimate.total) : '—'}</strong></div>${estimate.complete ? '' : '<p class="fine-print">Choose a size and service for each dog to complete the estimate.</p>'}`;
  };
  const updatePanels = () => {
    const boarding = isBoarding();
    for (const [id, hidden] of [['grooming-fields', boarding], ['boarding-fields', !boarding]]) {
      const panel = $(`#${id}`); panel.hidden = hidden;
      $$('input,select,textarea,button', panel).forEach(input => { input.disabled = hidden; });
    }
    updateDates(); updateEstimate();
  };
  const validate = () => {
    updateDates();
    const error = $('#booking-error'); error.hidden = true;
    for (const control of $$('[data-step="2"] input,[data-step="2"] select,[data-step="2"] textarea', form)) {
      if (control.disabled) continue;
      if (control.required && ['text','tel'].includes(control.type)) control.value = control.value.trim();
      if (!control.checkValidity()) { showStep(2, false); control.focus(); control.reportValidity(); return false; }
    }
    if (isBoarding()) {
      const message = stayError(form.elements.drop_off.value, form.elements.pick_up.value);
      if (message) { error.textContent = message; error.hidden = false; showStep(2, false); form.elements.pick_up.focus(); return false; }
    } else {
      for (const card of $$('.dog-card', form)) {
        const valid = Boolean($('[name="services"]:checked', card));
        $('[data-services-error]', card).hidden = valid;
        $$('[name="services"]', card).forEach(input => {
          if (!valid) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
        });
        if (!valid) { showStep(2, false); $('[name="services"]', card).focus(); return false; }
      }
    }
    return true;
  };
  const savePrepared = data => {
    const body = bookingMessage(data);
    if (body !== lastSavedMessage) { saveHistory('booking', data); lastSavedMessage = body; }
    if (form.elements.remember_details.checked) writeStored(PROFILE_KEY, {name:data.owner_name,email:data.email,phone:data.phone});
    return body;
  };
  $$('[data-next]', form).forEach(button => button.addEventListener('click', () => { if (step === 1 || validate()) showStep(step + 1); }));
  $$('[data-back]', form).forEach(button => button.addEventListener('click', () => showStep(step - 1)));
  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'service_type') updatePanels();
    if (input.name === 'drop_off') updateDates();
    if (input.name === 'services') {
      const card = input.closest('.dog-card');
      if (input.checked && Object.hasOwn(PRICES, input.value)) $$('[name="services"]', card).forEach(other => { if (other !== input && Object.hasOwn(PRICES, other.value)) other.checked = false; });
      $('[data-services-error]', card).hidden = true;
      $$('[name="services"]', card).forEach(other => other.removeAttribute('aria-invalid'));
    }
    updateEstimate();
  });
  form.addEventListener('input', event => { if (event.target.name === 'dog_name') updateEstimate(); });
  $('.add-dog', form).addEventListener('click', () => {
    $('#dogs-list').insertAdjacentHTML('beforeend', dogCard(++dogId));
    renumberDogs(); updateEstimate();
    $('.dog-card:last-child [name="dog_name"]', form).focus();
  });
  function renumberDogs() {
    const cards = $$('.dog-card', form);
    cards.forEach((card, i) => {
      $('[data-dog-number]', card).textContent = i + 1;
      $('[data-dog-heading]', card).textContent = `Dog ${i + 1}`;
      const button = $('.remove-dog', card); button.hidden = cards.length === 1;
      button.setAttribute('aria-label', `Remove dog ${i + 1}`);
    });
  }
  form.addEventListener('click', event => {
    const remove = event.target.closest('.remove-dog');
    if (remove) { remove.closest('.dog-card').remove(); renumberDogs(); updateEstimate(); $('.add-dog').focus(); }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (step < 3) { if (step === 1 || validate()) showStep(step + 1); return; }
    if (!validate()) return;
    prepareMessage($('#booking-status'), savePrepared(read()), {showPreview:false});
  });
  $('.copy-booking', form).addEventListener('click', () => {
    if (!validate()) return;
    copyText(savePrepared(read()), $('#booking-status'), $('#booking-preview'));
  });
  const saved = profile();
  for (const [field, key] of [['owner_name','name'],['phone','phone'],['email','email']]) if (typeof saved[key] === 'string') form.elements[field].value = saved[key];
  const params = new URLSearchParams(location.search), service = params.get('service'), size = params.get('size'), extra = params.get('extra');
  if (service === 'boarding') form.elements.service_type.value = 'Dog Boarding';
  if (SIZES.includes(size)) $('[name="dog_size"]', form).value = size;
  const serviceName = service === 'full' ? 'Full Groom' : service === 'wash' ? 'Wash & Dry' : Object.hasOwn(EXTRAS, extra) ? extra : '';
  if (serviceName) $$('[name="services"]', form).find(input => input.value === serviceName).checked = true;
  updatePanels(); showStep(1, false);
}

function initForms() {
  const contact = $('#contact-form');
  contact?.addEventListener('submit', event => {
    event.preventDefault(); const data = formData(contact);
    if (!data.name || !data.message) { announce($('#contact-status'), 'Please add your name and a message.', true); return; }
    const body = ['Hi Barking Mad Barbers,', '', data.message, '', `Name: ${data.name}`, data.phone ? `Phone: ${data.phone}` : '', data.email ? `Email: ${data.email}` : ''].filter(Boolean).join('\n');
    saveHistory('contact', data); prepareMessage($('#contact-status'), body);
  });
  const gallery = $('#gallery-form');
  gallery?.addEventListener('submit', event => {
    event.preventDefault(); const data = formData(gallery);
    if (!data.dog_name) { announce($('#gallery-status'), 'Please add your dog’s name.', true); return; }
    const body = [`Dog: ${data.dog_name}`, `Owner: ${data.owner_name || ''}`, `Email: ${data.email || ''}`, `Photo link: ${data.image_url || 'I will attach a photo to this email.'}`, '', `Caption: ${data.caption || ''}`].join('\n');
    saveHistory('gallery', data); prepareMessage($('#gallery-status'), body, {email:true,subject:'Barking Mad Barbers photo submission'});
  });
  const details = $('#profile-form');
  if (details) {
    const fill = () => { const data = profile(); ['name','phone','email'].forEach(name => { details.elements[name].value = typeof data[name] === 'string' ? data[name] : ''; }); };
    fill();
    details.addEventListener('submit', event => {
      event.preventDefault(); const saved = writeStored(PROFILE_KEY, formData(details));
      announce($('#profile-status'), saved ? 'Your details are saved on this device.' : 'This browser couldn’t save your details. You can still make an enquiry.', !saved);
    });
    $('#clear-profile').addEventListener('click', () => {
      const cleared = removeStored(PROFILE_KEY); fill();
      announce($('#profile-status'), cleared ? 'Your saved details have been cleared from this device.' : 'This browser couldn’t clear the saved details.', !cleared);
    });
  }
  const inbox = $('#local-inbox');
  if (inbox) {
    const render = () => {
      const items = history();
      inbox.innerHTML = items.length ? items.map(item => `<article class="history-item"><h2>${esc(item.type)} · ${esc(item.created_at)}</h2><pre>${esc(JSON.stringify(item.data, null, 2))}</pre></article>`).join('') : '<p>No enquiries have been prepared on this device yet.</p>';
    };
    render();
    $('#clear-inbox').addEventListener('click', () => {
      const cleared = removeStored(INBOX_KEY); render();
      announce($('#inbox-status'), cleared ? 'Local history cleared.' : 'This browser couldn’t clear its history.', !cleared);
    });
  }
}
initNavigation(); initPrices(); initBooking(); initForms();
