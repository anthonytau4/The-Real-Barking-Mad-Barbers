// The price list and enquiry rules are shared by the site, static build and tests.
export const BUSINESS = {
  name: 'Barking Mad Barbers', phone: '027 247 2493', sms: '+64272472493',
  email: 'barkingmadbarbers@gmail.com', address: '5A Tawa Street, Tawa, Wellington',
  hours: 'Mon–Sat, 8:30am–3:00pm', url: 'https://barkingmadbarbers.com'
};
export const PROFILE_KEY = 'bmb_static_profile_v1';
export const INBOX_KEY = 'bmb_static_enquiries_v1';
export const SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Extra Large'];
export const PRICES = {
  'Full Groom': [80, 90, 110, 130, 150],
  'Wash & Dry': [45, 50, 55, 60, 70]
};
export const EXTRAS = { 'Face Tidy': 10, 'Nail Trim': 20, 'Teeth Brush': 10, 'Flea Shampoo': 20, 'Anal Gland Expression': 20 };
export const INCLUDED = {
  'Full Groom': ['Face Tidy', 'Nail Trim', 'Anal Gland Expression'],
  'Wash & Dry': ['Nail Trim', 'Anal Gland Expression']
};
export const money = value => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 }).format(value);
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));

export function estimateDogs(dogs) {
  const result = dogs.map((dog, i) => {
    const sizeIndex = SIZES.indexOf(dog.dog_size);
    const selected = [...new Set(dog.services || [])];
    const services = selected.filter(service => service !== 'Wash & Dry' || !selected.includes('Full Groom'));
    const groom = services.find(service => Object.hasOwn(PRICES, service));
    const items = services.map(service => ({
      service,
      amount: INCLUDED[groom]?.includes(service) ? 0 : Object.hasOwn(PRICES, service)
        ? PRICES[service][sizeIndex] ?? null : EXTRAS[service] ?? null
    }));
    return {
      name: dog.dog_name || `Dog ${i + 1}`, size: dog.dog_size, items,
      total: items.reduce((sum, item) => sum + (item.amount ?? 0), 0),
      complete: sizeIndex !== -1 && items.length > 0 && items.every(item => item.amount !== null)
    };
  });
  return { dogs: result, total: result.reduce((sum, dog) => sum + dog.total, 0), complete: result.length > 0 && result.every(dog => dog.complete) };
}

export function nzToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return ['year', 'month', 'day'].map(type => parts.find(p => p.type === type).value).join('-');
}
export function dateLabel(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return value || 'To arrange';
  return new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
}
export function stayError(dropOff, pickUp, today = nzToday()) {
  if (!dropOff || !pickUp) return 'Choose both drop-off and pick-up dates.';
  if (dropOff < today) return 'Choose a drop-off date today or later.';
  if (pickUp <= dropOff) return 'Pick-up must be after the drop-off date for an overnight stay.';
  return '';
}
export function smsUrl(body = '', userAgent = '') {
  if (!body) return `sms:${BUSINESS.sms}`;
  return `sms:${BUSINESS.sms}${/iPhone|iPad|iPod/i.test(userAgent) ? '&' : '?'}body=${encodeURIComponent(body)}`;
}
export function bookingMessage(data) {
  const contact = [`Name: ${data.owner_name || ''}`, `Phone: ${data.phone || ''}`, data.email ? `Email: ${data.email}` : ''].filter(Boolean);
  if (data.service_type === 'Dog Boarding') {
    return ["Hi Barking Mad Barbers, I'd like to enquire about dog boarding.", '',
      `Dog: ${data.boarding_dog_name}`, `Breed: ${data.boarding_breed}`, `Size: ${data.boarding_size}`,
      `Drop-off: ${dateLabel(data.drop_off)}`, `Pick-up: ${dateLabel(data.pick_up)}`,
      data.meet_greet ? `Meet & greet: ${data.meet_greet}` : '',
      data.boarding_notes ? `Care notes: ${data.boarding_notes}` : '',
      '', "I'll bring my dog's food and harness. Please confirm availability and price.", '', ...contact].filter(line => line !== undefined).join('\n');
  }
  const estimate = estimateDogs(data.dogs || []);
  return ["Hi Barking Mad Barbers, I'd like to enquire about grooming.", '',
    ...(data.dogs || []).flatMap((dog, i) => [
      `${i + 1}. ${dog.dog_name} — ${dog.breed}, ${dog.dog_size}`,
      `Services: ${estimate.dogs[i].items.map(item => `${item.service}${item.amount === 0 ? ' (included)' : ''}`).join(', ')}`,
      `Estimate: ${money(estimate.dogs[i].total)} NZD`,
      dog.dog_preferred_time ? `Preferred time: ${dog.dog_preferred_time}` : '', ''
    ]),
    `Preferred date: ${data.preferred_date ? dateLabel(data.preferred_date) : 'Flexible'}`,
    `Preferred time: ${data.preferred_time || 'Flexible'}`,
    data.notes ? `Notes: ${data.notes}` : '', '',
    estimate.complete ? `Estimated total: ${money(estimate.total)} NZD. Final price depends on breed and coat condition.` : '',
    'Please confirm availability and the final price.', '', ...contact].join('\n').replace(/\n{3,}/g, '\n\n');
}

export const ROUTES = {
  '/': ['Dog Grooming & Boarding in Tawa', 'Calm dog grooming and homely boarding in Tawa, Wellington. Full grooms from $80, wash and dry from $45. Enquire by text.'],
  '/services/': ['Services & Prices', 'Compare grooming prices for tiny through extra large dogs. Full groom, wash and dry, and extras at Barking Mad Barbers in Tawa.'],
  '/boarding/': ['Dog Boarding in Tawa', 'Homely dog boarding with familiar routines and personal care in Tawa, Wellington. Enquire about dates, availability and pricing.'],
  '/sanctuary/': ['Our Calm Sanctuary', 'A calm, appointment-only grooming space with patient, one-on-one care for your dog in Tawa.'],
  '/team/': ['Meet the Team', 'Meet the local, dog-loving family behind Barking Mad Barbers grooming and boarding in Tawa.'],
  '/our-family/': ['Our Dog-Loving Family', 'Meet our dog-loving family and share your dog’s photo with Barking Mad Barbers.'],
  '/helper/': ['Dog Care Questions', 'Answers about grooming, prices, boarding, matting and booking at Barking Mad Barbers.'],
  '/contact/': ['Contact & Visit', 'Find Barking Mad Barbers at 5A Tawa Street, Tawa, Wellington. Text 027 247 2493. Monday to Saturday, 8:30am to 3pm, by appointment.'],
  '/book/': ['Enquire About a Booking', 'Choose grooming or boarding, get an estimate and prepare a booking enquiry for Barking Mad Barbers. Appointments are confirmed by the team.'],
  '/sign-in/': ['Saved Details', 'Save your contact details on this device for your next enquiry.'],
  '/admin/': ['Local Enquiry History', 'Enquiries prepared on this browser only. This is not a shared business inbox.'],
  '/404/': ['Page Not Found', 'Find grooming, boarding, prices and booking enquiries at Barking Mad Barbers.']
};
export function routeKey(path = '/') {
  let clean;
  try { clean = decodeURIComponent(path).toLowerCase().replace(/\/index\.html$/, '/').replace(/\/+$/, '') || '/'; }
  catch { return '/404/'; }
  clean = clean === '/' ? clean : `${clean}/`;
  return Object.hasOwn(ROUTES, clean) ? clean : '/404/';
}
