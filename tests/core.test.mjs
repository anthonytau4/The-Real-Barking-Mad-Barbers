import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateDogs, bookingMessage, smsUrl, nzToday, stayError, routeKey, esc, SIZES } from '../site-core.js';
const dog = (size, services, name = 'Charlie') => ({dog_name:name,dog_size:size,breed:'Cavoodle',services});

test('published prices cover all five dog sizes', () => {
  const full = [80,90,110,130,150], wash = [45,50,55,60,70];
  SIZES.forEach((size,i) => {
    assert.equal(estimateDogs([dog(size,['Full Groom'])]).total,full[i]);
    assert.equal(estimateDogs([dog(size,['Wash & Dry'])]).total,wash[i]);
  });
});
test('included extras and duplicate packages are never charged twice', () => {
  const estimate = estimateDogs([dog('Extra Large',['Full Groom','Wash & Dry','Nail Trim','Face Tidy','Anal Gland Expression','Teeth Brush','Teeth Brush'])]);
  assert.equal(estimate.total,160);
  assert.equal(estimate.dogs[0].items.length,5);
  assert.equal(estimate.dogs[0].items.find(x=>x.service==='Nail Trim').amount,0);
});
test('wash packages include nails and glands, but charge for face tidy', () => {
  assert.equal(estimateDogs([dog('Tiny',['Wash & Dry','Nail Trim','Anal Gland Expression','Face Tidy'])]).total,55);
});
test('multi-dog enquiries total each dog separately, including standalone extras', () => {
  const estimate = estimateDogs([dog('Large',['Full Groom','Flea Shampoo']),dog('Small',['Wash & Dry','Face Tidy']),dog('Tiny',['Nail Trim'])]);
  assert.equal(estimate.complete,true);
  assert.deepEqual(estimate.dogs.map(x=>x.total),[150,60,20]);
  assert.equal(estimate.total,230);
});
test('incomplete or unknown inputs cannot produce a completed estimate', () => {
  assert.equal(estimateDogs([]).complete,false);
  assert.equal(estimateDogs([dog('', ['Full Groom'])]).complete,false);
  assert.equal(estimateDogs([dog('Medium',[])]).complete,false);
  assert.equal(estimateDogs([dog('Medium',['Unknown service'])]).complete,false);
});
test('booking messages preserve contact, per-dog times and estimated price', () => {
  const body = bookingMessage({service_type:'Grooming',owner_name:'Test Owner',phone:'027 000 0000',email:'test@example.com',preferred_date:'2026-11-10',preferred_time:'Morning',dogs:[{...dog('Extra Large',['Full Groom','Teeth Brush']),dog_preferred_time:'10am'},dog('Tiny',['Nail Trim'],'Poppy')]});
  for (const text of ['Charlie','Poppy','10 Nov 2026','10am','Morning','test@example.com','Estimated total: $180 NZD','Please confirm availability']) assert.ok(body.includes(text), text);
});
test('boarding text includes dates, routine and a request for confirmation', () => {
  const body = bookingMessage({service_type:'Dog Boarding',boarding_dog_name:'Molly',boarding_breed:'Labrador',boarding_size:'Large',drop_off:'2026-11-10',pick_up:'2026-11-12',boarding_notes:'Dinner at 6pm',owner_name:'Test',phone:'0270000000',email:'test@example.com'});
  for (const text of ['Molly','10 Nov 2026','12 Nov 2026','Dinner at 6pm','food and harness','confirm availability','test@example.com']) assert.ok(body.includes(text), text);
  assert.ok(!body.includes('Estimated total'));
});
test('date validation uses Auckland dates and requires an overnight stay', () => {
  assert.equal(nzToday(new Date('2026-10-04T12:30:00Z')),'2026-10-05');
  assert.equal(stayError('2026-10-06','2026-10-07','2026-10-05'),'');
  assert.ok(stayError('2026-10-04','2026-10-07','2026-10-05'));
  assert.ok(stayError('2026-10-06','2026-10-06','2026-10-05'));
  assert.ok(stayError('2026-10-07','2026-10-06','2026-10-05'));
});
test('SMS handoff encodes punctuation and uses platform-specific separators', () => {
  const body = 'Charlie & Poppy\n$180 + extras?';
  assert.equal(smsUrl(body,'iPhone'),`sms:+64272472493&body=${encodeURIComponent(body)}`);
  assert.equal(smsUrl(body,'Android'),`sms:+64272472493?body=${encodeURIComponent(body)}`);
});
test('exact route matching preserves legacy URLs and rejects unknown paths', () => {
  assert.equal(routeKey('/Sanctuary'),'/sanctuary/');
  assert.equal(routeKey('/boarding/index.html'),'/boarding/');
  assert.equal(routeKey('/something-about-services'),'/404/');
  assert.equal(routeKey('/%zz'),'/404/');
});
test('customer text is escaped before HTML interpolation', () => {
  assert.equal(esc('<img src=x onerror="1"> &'), '&lt;img src=x onerror=&quot;1&quot;&gt; &amp;');
});
