const AS="/assets/",PHONE="027 247 2493",SMS="+64272472493",EMAIL="barkingmadbarbers@gmail.com";
const STORE="bmb_static_enquiries_v1",PROFILE="bmb_static_profile_v1";
const nav=[["Services","/services"],["Boarding","/boarding"]],aboutNav=[["Calm Sanctuary","/Sanctuary"],["Our Family","/our-family"],["Meet the Team","/team"],["Dog Care Helper","/helper"]],navEnd=[["Contact","/contact"]];
const prices={full:[["Tiny","$80"],["Small","$90"],["Medium","$110"],["Large","$130"]],wash:[["Tiny","$45"],["Small","$50"],["Medium","$55"],["Large","$60"]],boarding:[["Overnight stays","by arrangement"],["Comfortable routine","meals, rest and attention"],["Family-style care","treated like one of our own"]],extras:[["Flea Shampoo","$20"],["Nail Trim","$20"],["Teeth Brush","$10"],["Face Tidy","$10"],["Anal Gland Expression","$20"]]};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const icon=t=>`<span class="icon-sq">${t}</span>`;
const poster=c=>" <div class='"+(c||"poster-card")+"'><img class='unveil' src='"+AS+"hero-advert.png' alt='Barking Mad Barbers advert'></div>";
const navLink=([n,u])=>`<a href="${u}" data-link class="nav-link">${n}</a>`;
function setNav(){
  $(".nav-links").innerHTML=nav.map(navLink).join("")+
    `<div class="nav-drop"><button class="nav-link drop-btn" type="button" aria-haspopup="true" aria-expanded="false">About<span class="drop-caret">&#9662;</span></button><div class="drop-menu">${aboutNav.map(navLink).join("")}<div class="drop-divider"></div><a href="/sign-in" data-link class="nav-link">Saved details</a></div></div>`+
    navEnd.map(navLink).join("");
  $("#mobileDrawer").innerHTML=[...nav,...navEnd].map(navLink).join("")+
    `<div class="drawer-label">More</div>`+aboutNav.map(navLink).join("")+
    `<a href="/sign-in" data-link class="nav-link">Saved details</a><a href="/book" data-link class="btn btn-gold">Book Now</a>`;
  const drop=$(".nav-drop"),btn=$(".drop-btn");
  btn.onclick=e=>{e.stopPropagation();drop.classList.toggle("open");btn.setAttribute("aria-expanded",drop.classList.contains("open"))};
  document.addEventListener("click",e=>{if(!drop.contains(e.target)){drop.classList.remove("open");btn.setAttribute("aria-expanded","false")}});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"){drop.classList.remove("open");btn.setAttribute("aria-expanded","false")}});
}
function key(p=location.pathname){p=decodeURIComponent(p).replace(/\/+$/,"").toLowerCase()||"/";return p==="/"?"home":p.includes("family")?"our-family":p.includes("board")?"boarding":p.includes("sanctuary")?"sanctuary":p.includes("service")?"services":p.includes("team")?"team":p.includes("book")?"book":p.includes("helper")||p.includes("help")?"helper":p.includes("contact")?"contact":p.includes("sign")||p.includes("login")?"sign-in":p.includes("admin")?"admin":"home"}
function shell(title,kicker,copy,body){return `<div class="wrap page-hero"><div class="page-hero-grid"><div class="reveal-left"><div class="kicker">${kicker}</div><h1 class="page-title"><span class="rl"><span>${title}</span></span></h1><p class="lead fade-up">${copy}</p></div><div class="reveal-right">${poster("page-poster")}</div></div></div><div class="wrap">${body}</div>`}
function card(i,t,c,delay){return `<article class="card reveal stagger-${delay||1}">${icon(i)}<h3>${t}</h3><p>${c}</p></article>`}
function price(t,from,rows,copy){return `<article class="card price-card reveal-scale"><div class="price-top"><h3>${t}</h3><div class="from">${from}</div></div><div class="price-list"><p>${copy}</p>${rows.map(r=>`<div class="price-row"><span>${r[0]}</span><strong>${r[1]}</strong></div>`).join("")}</div></article>`}
function serviceBlock(){return `<section class="section"><div class="wrap"><div class="section-head reveal"><div><div class="kicker">Services</div><h2 class="section-title">Grooms, stays & genuine care.</h2></div><a href="/book" data-link class="btn btn-gold">Book Now</a></div><div class="grid grid-3">${price("Full Groom","from $80",prices.full,"Bath, blow dry, brush out, full body clip, face & feet finish, nail trim, ear clean and anal gland expression.")}${price("Wash & Dry","from $45",prices.wash,"Bath, blow dry, brush out, nail trim, anal gland expression and cologne.")}${price("Dog Boarding","ask us",prices.boarding,"Home-style boarding. Your dog stays comfortable with routine, attention and real care.")}</div></div></section>`}
function brandTitle(){return `<section class="brand-hero"><span class="float-tool ft-a" aria-hidden="true"><span class="tool-glyph">&#9986;</span></span><span class="float-tool ft-b" aria-hidden="true"><span class="tool-glyph">&#9986;</span></span><h1 class="brand-display brand-static">Barking Mad <span class="gold">Barbers</span></h1><canvas id="brandCanvas" class="hidden" aria-hidden="true"></canvas><div class="brand-rule"></div></section>`}
function home(){return `${brandTitle()}<section class="hero"><div class="wrap hero-grid"><div class="reveal-left"><div class="eyebrow">Tawa dog grooming & boarding</div><h1 class="display"><span class="rl"><span>Groomed with <span class="gold">Love.</span></span></span><span class="rl"><span>Treated like <span class="gold">Family.</span></span></span></h1><p class="lead fade-up">Beautiful grooms and cozy boarding where your dog is genuinely cared for — calm space, familiar routines, and proper attention while you're away.</p><div class="hero-actions fade-up"><a href="/book" data-link class="btn btn-gold pulse-anim">Book Dog Care</a><a href="/services" data-link class="btn btn-soft">View Services</a></div><div class="lead"><strong>Mon–Sat 8:30am – 3:00pm • Bookings only</strong></div></div><div class="reveal-right">${poster()}</div></div></section><section class="section"><div class="wrap"><div class="section-head reveal"><div><div class="kicker">Why Barking Mad</div><h2 class="section-title">Premium groom or stay. Zero stress.</h2></div><p class="section-copy">Your dog stays somewhere safe, follows their routine, gets one-on-one attention, and is treated like part of the family.</p></div><div class="grid grid-4">${card("Love","Calm Sanctuary","Peaceful, low-stress space where dogs feel safe and loved.",1)}${card("Home","Dog Boarding","A homely stay with care, company and routine.",2)}${card("Pro","Experienced Team","Skilled grooming with patient one-on-one attention.",3)}${card("Text","Text to Book","Tap Book Now, and your text app opens with everything ready to send.",4)}</div></div></section>${serviceBlock()}${cta()}`}
function services(){return shell('Services & <span class="gold">Prices</span>',"Premium grooming & boarding","Pick the service that suits your dog. Prices may vary for heavily matted coats. Boarding is arranged by enquiry.",`<div class="grid grid-3">${price("Full Groom","from $80",prices.full,"Bath, shampoo & condition, blow dry, brush out, full body clip, face & feet finish, nail trim, ear clean and anal gland expression.")}${price("Wash & Dry","from $45",prices.wash,"Bath, shampoo & condition, blow dry, brush out, nail trim, anal gland expression and cologne.")}${price("Dog Boarding","ask us",prices.boarding,"Comfortable boarding that feels like staying with people who actually love dogs — not a kennel.")}</div><section class="section"><div class="section-head reveal"><div><div class="kicker">Extras</div><h2 class="section-title">Add-on care.</h2></div></div><div class="grid grid-3">${prices.extras.map((r,i)=>`<article class="clean-card reveal stagger-${i+1}">${icon("Care")}<h3>${r[0]}</h3><p><strong class="gold">${r[1]}</strong> added to your groom.</p></article>`).join("")}</div></section>`)}
function boarding(){return shell('Dog <span class="gold">Boarding</span>',"Loved like family","Your dog stays in a calm, homely setting with familiar routines, real attention, and the kind of care you'd want from someone looking after your own pup.",`<div class="grid grid-3">${card("Home","A real home stay","Comfortable, personal, settled — with company and calm care.",1)}${card("Care","Routine kept intact","Meals, medication, sleep habits, quirks — we follow your dog's routine.",2)}${card("Love","Family-style love","We get to know your dog, reassure them, and treat them like ours.",3)}</div><section class="section"><div class="clean-card reveal" style="display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap"><div><div class="kicker">Boarding enquiries</div><h2 class="section-title">Tell us about your dog.</h2><p class="section-copy">Send dates, breed, size, temperament, and feeding needs.</p></div><a href="/book" data-link class="btn btn-gold pulse-anim">Book boarding</a></div></section>`)}
function sanctuary(){return shell('Calm <span class="gold">Sanctuary</span>',"Low-stress care","A quiet, appointment-only space for dogs who need patience, routine and kindness.",`<div class="grid grid-3">${card("Love","Calm first","We work around comfort, coat condition and confidence.",1)}${card("Paw","One-on-one","Less rush, less noise, more care for each dog.",2)}${card("Care","Clean & gentle","Gentle grooming products and a tidy finish every time.",3)}</div>`)}
function team(){return shell('Meet the <span class="gold">Team</span>',"Our team","The people behind every happy groom and cozy stay.",`<div class="grid grid-2"><article class="clean-card reveal stagger-1"><img class="unveil" src="${AS}team-dog.webp" alt="Team member with dog" style="border-radius:24px;aspect-ratio:1/1;object-fit:cover;margin-bottom:18px"><h3>Dog-loving care</h3><p>Friendly, calm and focused on a finish that suits your dog.</p></article><article class="clean-card reveal stagger-2"><img class="unveil" src="${AS}team-beach.webp" alt="Barking Mad family photo" style="border-radius:24px;aspect-ratio:1/1;object-fit:cover;margin-bottom:18px"><h3>Local Tawa family</h3><p>A Wellington grooming & boarding business with a warm, personal feel.</p></article></div>`)}
function family(){return shell('Our <span class="gold">Family</span>',"Loved like our own","Send photo links or family page requests by email.",`<div class="split"><form class="card form reveal stagger-1" id="galleryForm"><h3>Share your dog</h3><div class="form-grid"><div class="field"><label>Your name</label><input name="owner_name"></div><div class="field"><label>Email</label><input name="email" type="email"></div></div><div class="field"><label>Dog name</label><input name="dog_name" required></div><div class="field"><label>Photo URL</label><input name="image_url" placeholder="Paste a photo link"></div><div class="field"><label>Caption</label><textarea name="caption"></textarea></div><button class="btn btn-gold" type="submit">Email Photo Details</button><div id="galleryStatus"></div></form><form class="card form reveal stagger-2" id="requestForm"><h3>Send a request</h3><div class="form-grid"><div class="field"><label>Your name</label><input name="name" required></div><div class="field"><label>Email</label><input name="email" type="email"></div></div><div class="form-grid"><div class="field"><label>Phone</label><input name="phone"></div><div class="field"><label>Request type</label><input name="request_type"></div></div><div class="field"><label>Message</label><textarea name="message" required></textarea></div><button class="btn btn-dark" type="submit">Text Request</button><div id="requestStatus"></div></form></div>`)}
function serviceOptions(){return["Full Groom","Wash & Dry","Face Tidy","Nail Trim","Teeth Brush","Flea Shampoo"].map(s=>`<label><input type="checkbox" name="services" value="${s}">${s}</label>`).join("")}
function dogCardFun(i=1){return `<div class="dog-card-fun" data-dog="${i}"><div class="dog-card-header"><div class="dog-avatar">🐕</div><div class="dog-label">Dog ${i}</div><button class="btn btn-soft remove-dog" type="button" style="margin-left:auto;padding:8px 12px;font-size:12px">✕ Remove</button></div><div class="dog-card-body"><div class="form-grid"><div class="field"><label>Dog's name</label><input name="dog_name" required placeholder="What's their name?"></div><div class="field"><label>Size</label><select name="dog_size" required><option value="">Pick size</option><option>Tiny</option><option>Small</option><option>Medium</option><option>Large</option></select></div></div><div class="form-grid"><div class="field"><label>Breed</label><input name="breed" required placeholder="e.g. Poodle, Labrador"></div><div class="field"><label>Preferred time</label><input name="dog_preferred_time" placeholder="Morning / afternoon / any"></div></div><div class="field"><label>Pick their services 🐾</label><div class="checkbox-fun">${serviceOptions()}</div></div></div></div>`}
function boardingFieldsWizard(){return `<div class="form-grid"><div class="field"><label>Dog's name</label><input name="boarding_dog_name" required placeholder="Your dog's name"></div><div class="field"><label>Breed</label><input name="boarding_breed" required placeholder="e.g. Golden Retriever"></div></div><div class="form-grid"><div class="field"><label>Size</label><select name="boarding_size" required><option value="">Pick size</option><option>Tiny</option><option>Small</option><option>Medium</option><option>Large</option></select></div><div class="field"><label>Meet & greet date</label><input name="meet_greet" placeholder="When works for a meet?"></div></div><div class="form-grid"><div class="field"><label>Drop off</label><input name="drop_off" type="date" required></div><div class="field"><label>Pick up</label><input name="pick_up" type="date" required></div></div><div class="field"><label>Anything we should know?</label><textarea name="boarding_notes" placeholder="Feeding routine, medication, sleep habits, temperament..."></textarea></div>`}
function book(){
  return shell('Book Dog <span class="gold">Care</span>',"Grooming & boarding","Pick your service, add your dog's details, and we'll have your text ready to send in seconds.",`
<div class="booking-shell">
<div class="booking-form-card wizard" id="bookingWizard">
  <div class="booking-form-head"><div><h3 class="shimmer-text">Let's book your pup in! 🐾</h3><p>Quick & easy — just follow the steps.</p></div><span class="tag goldtag">3 steps</span></div>
  <div class="wizard-progress"><span class="wizard-step-dot active" data-step="1"></span><span class="wizard-connector"></span><span class="wizard-step-dot" data-step="2"></span><span class="wizard-connector"></span><span class="wizard-step-dot" data-step="3"></span></div>
  <form id="bookingForm">
    <div class="wizard-slide active" data-slide="1">
      <div class="wizard-emoji">✨</div>
      <h3 class="wizard-title">What does your dog need?</h3>
      <p class="wizard-subtitle">Pick the type of care and we'll ask the right questions.</p>
      <div class="service-pick">
        <div class="service-pick-card" data-value="Grooming" onclick="pickService(this)">
          <span class="pick-emoji">✂️</span>
          <div class="pick-title">Grooming</div>
          <div class="pick-desc">Full groom, wash & dry, or extras</div>
        </div>
        <div class="service-pick-card" data-value="Dog Boarding" onclick="pickService(this)">
          <span class="pick-emoji">🏠</span>
          <div class="pick-title">Dog Boarding</div>
          <div class="pick-desc">A comfy stay while you're away</div>
        </div>
      </div>
      <input type="hidden" name="service_type" id="serviceTypeHidden" value="Grooming">
      <div class="wizard-nav"><button type="button" class="btn btn-gold" onclick="wizardNext()">Next →</button></div>
    </div>
    <div class="wizard-slide" data-slide="2">
      <div class="wizard-emoji">🐕</div>
      <h3 class="wizard-title">Tell us about your dog</h3>
      <p class="wizard-subtitle">Add details so we can give them the best care.</p>
      <div class="form-grid"><div class="field"><label>Your name</label><input name="owner_name" required placeholder="Your full name"></div><div class="field"><label>Phone number</label><input name="phone" required placeholder="027 ..."></div></div>
      <div class="form-grid"><div class="field"><label>Email (optional)</label><input name="email" type="email" placeholder="you@email.com"></div><div class="field grooming-only"><label>Preferred date</label><input name="preferred_date" type="date"></div></div>
      <div class="field grooming-only"><label>Preferred time</label><input name="preferred_time" placeholder="Morning / afternoon / any time"></div>
      <div id="groomingPanel">
        <div id="dogsList">${dogCardFun(1)}</div>
        <button class="add-dog-fun" type="button" id="addDogBtn"><span class="add-icon">🐾</span> Add another dog</button>
        <div class="field" style="margin-top:14px"><label>Extra notes</label><textarea name="notes" placeholder="Anything else we should know?"></textarea></div>
      </div>
      <div id="boardingPanel" class="hidden">${boardingFieldsWizard()}</div>
      <div class="wizard-nav"><button type="button" class="btn btn-soft" onclick="wizardPrev()">← Back</button><button type="button" class="btn btn-gold" onclick="wizardNext()">Next →</button></div>
    </div>
    <div class="wizard-slide" data-slide="3">
      <div class="wizard-emoji">🚀</div>
      <h3 class="wizard-title">Ready to send!</h3>
      <p class="wizard-subtitle">Your text message is prepped. Hit send and you're done.</p>
      <label class="sms-consent"><input name="booking_sms_consent" type="checkbox" required><span>This will open your text app with the message ready to send to Barking Mad Barbers.</span></label>
      <div class="wizard-nav"><button type="button" class="btn btn-soft" onclick="wizardPrev()">← Back</button><button class="btn btn-gold" type="submit">Send Enquiry 🎉</button></div>
      <div id="bookingStatus" style="margin-top:16px"></div>
    </div>
  </form>
</div>
<aside class="booking-side">
  <div class="sms-notice reveal"><h3>Texting is best 📱</h3><p>Your enquiry opens as a ready-to-send text. No apps, no accounts — just tap send.</p><a class="btn btn-dark" id="textToBookBtn" href="sms:${SMS}">Quick text</a></div>
  <div class="clean-card reveal stagger-2"><h3>Good to know</h3><div class="note-list"><div class="note"><span class="dot"></span><span>Pick Grooming for the groom form.</span></div><div class="note"><span class="dot"></span><span>Pick Boarding for stay dates & care info.</span></div><div class="note"><span class="dot"></span><span>Final price depends on size, breed & coat condition.</span></div><div class="note"><span class="dot"></span><span>Bring your own food and harness for boarding stays.</span></div></div></div>
</aside>
</div>`)}
function helper(){let body=encodeURIComponent("Hi Barking Mad Barbers, I have a question about my dog.");return shell('Dog Care <span class="gold">Helper</span>',"Text the team","Got a question? Send it straight to us by text — nothing gets lost.",`<div class="chat-shell"><div class="chat-phone reveal-scale"><div class="chat-head"><div class="avatar">BM</div><div><div class="chat-name">Barking Mad Helper</div><div class="chat-presence">Text-friendly help</div></div></div><div class="chat-feed" id="chatFeed"><div class="msg-row bot"><div class="avatar">BM</div><div class="bubble">Need help with grooming, boarding, matting, pricing, or booking? Text us and we'll reply when we're free. 🐾</div></div></div><div class="chat-composer"><a class="btn btn-gold" style="width:100%" href="sms:${SMS}?body=${body}">Text us your question</a><p class="section-copy" style="margin:0">We text back as soon as we can — we might be with a dog!</p></div></div></div>`)}
function contact(){return shell('Contact <span class="gold">Us</span>',"Tawa, Wellington","Text to book, ask anything, or confirm what your dog needs.",`<div class="grid grid-3">${card("Text","Phone",PHONE,1)}${card("Book","Hours","Mon–Sat 8:30am – 3:00pm",2)}${card("Paw","Location","5A Tawa Street, Tawa Wellington",3)}</div><section class="section"><div class="split"><form class="card form reveal stagger-1" id="contactForm"><h3>Message the team</h3><div class="form-grid"><div class="field"><label>Name</label><input name="name" required></div><div class="field"><label>Phone</label><input name="phone"></div></div><div class="field"><label>Email</label><input name="email" type="email"></div><div class="field"><label>Message</label><textarea name="message" required></textarea></div><button class="btn btn-gold" type="submit">Send as text</button><div id="contactStatus"></div></form><div class="clean-card reveal stagger-2"><h3>Email</h3><p><a href="mailto:${EMAIL}">${EMAIL}</a></p><p>Texting is always fastest. If you need a call, text first and we'll ring you back.</p><div class="hero-actions"><a class="btn btn-gold" href="/book" data-link>Book online</a><a class="btn btn-soft" href="sms:${SMS}">Text now</a></div></div></div></section>`)}
function signIn(){return shell('Saved <span class="gold">Details</span>',"Save on this device","Store your name, email and phone on this device so forms auto-fill next time.",`<div class="split"><form class="card form reveal stagger-1" id="profileForm"><div class="field"><label>Name</label><input name="name"></div><div class="field"><label>Email</label><input name="email" type="email"></div><div class="field"><label>Phone</label><input name="phone"></div><button class="btn btn-gold" type="submit">Save Details</button><div id="signinStatus"></div></form><div class="clean-card reveal stagger-2" id="profileBox"></div></div>`)}
function admin(){return shell('Static <span class="gold">Enquiries</span>',"Local browser only","Shows enquiries saved on this browser. Real customer messages arrive by text or email.",`<div class="clean-card reveal"><h3>No server</h3><p>No login, no database, no shared dashboard. Customer enquiries arrive by text and email through the public booking forms.</p><div class="hero-actions"><button class="btn btn-soft" onclick="renderInbox()">Refresh local inbox</button><button class="btn btn-soft" onclick="clearInbox()">Clear local inbox</button></div></div><section class="section"><div id="adminStatus"></div><div id="staticInbox" class="admin-list"></div></section>`)}
function cta(){return `<section class="section"><div class="wrap"><div class="clean-card reveal" style="display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap"><div><div class="kicker">Ready?</div><h2 class="section-title">Make their next groom or stay feel <span class="shimmer-text">premium.</span></h2><p class="section-copy">Book calm care at 5A Tawa Street, Tawa Wellington.</p></div><a href="/book" data-link class="btn btn-gold pulse-anim">Message to book</a></div></div></section>`}
function render(){const views={home,services,boarding,sanctuary,"our-family":family,team,book,helper,contact,"sign-in":signIn,admin};const app=$("#app");app.classList.remove("page-enter","page-exit");void app.offsetWidth;app.innerHTML=(views[key()]||home)();app.classList.add("page-enter");$$("a.nav-link").forEach(a=>a.classList.toggle("active",key(new URL(a.href).pathname)===key()));const db=$(".drop-btn");if(db)db.classList.toggle("active",$$(".drop-menu a.nav-link").some(a=>key(new URL(a.href).pathname)===key()));bindLinks();bindForms();scrollTo(0,0);if(key()==="sign-in")renderProfile();if(key()==="admin")renderInbox();initBrand();collectUnveil();initCardSprings();initReveal()}
let navTimer=null;
function navigate(path){
  if(navTimer)return;
  if(key(path)===key()){history.pushState({},"",path);scrollTo(0,0);return}
  const app=$("#app");
  if(REDUCED){history.pushState({},"",path);render();return}
  app.classList.remove("page-enter");
  app.classList.add("page-exit");
  navTimer=setTimeout(()=>{navTimer=null;history.pushState({},"",path);render()},230);
}
function bindLinks(){$$("[data-link]").forEach(a=>a.onclick=e=>{let u=new URL(a.href);if(u.origin===location.origin){e.preventDefault();$("#mobileDrawer").classList.remove("open");$(".nav-drop")?.classList.remove("open");navigate(u.pathname)}})}
function toggleMenu(){$("#mobileDrawer").classList.toggle("open")}
addEventListener("popstate",render);
function fd(f){return Object.fromEntries(new FormData(f).entries())}
function dogs(){return $$(".dog-card-fun").map(e=>{let g=n=>e.querySelector(`[name="${n}"]`)?.value.trim()||"",services=[...e.querySelectorAll('[name="services"]:checked')].map(x=>x.value);return{dog_name:g("dog_name"),dog_size:g("dog_size"),breed:g("breed"),dog_preferred_time:g("dog_preferred_time"),service:services.join(", "),services}})}
function refreshDogs(){$$(".dog-card-fun").forEach((e,i)=>{e.querySelector(".dog-label").textContent=`Dog ${i+1}`;let r=e.querySelector(".remove-dog");r.classList.toggle("hidden",$$(".dog-card-fun").length===1);r.onclick=()=>{e.remove();refreshDogs();updateWizard()}})}

// === WIZARD LOGIC ===
let currentStep=1;
function pickService(el){
  $$(".service-pick-card").forEach(c=>c.classList.remove("selected"));
  el.classList.add("selected");
  const v=el.dataset.value;
  $("#serviceTypeHidden").value=v;
}
function wizardNext(){
  if(currentStep>=3)return;
  const form=$("#bookingForm");
  // Validate current slide inputs
  const slide=$(`.wizard-slide[data-slide="${currentStep}"]`);
  const inputs=slide.querySelectorAll("input[required],select[required],textarea[required]");
  for(const inp of inputs){
    if(inp.closest(".hidden"))continue;
    if(inp.type==="checkbox"){if(!inp.checked){inp.focus();inp.reportValidity();return}}
    else if(!inp.value.trim()){inp.focus();inp.reportValidity();return}
  }
  currentStep++;
  updateWizard();
}
function wizardPrev(){
  if(currentStep<=1)return;
  currentStep--;
  updateWizard();
}
function updateWizard(){
  const type=$("#serviceTypeHidden")?.value||"Grooming";
  const isBoarding=type==="Dog Boarding";
  // Toggle panels
  $("#groomingPanel")?.classList.toggle("hidden",isBoarding);
  $("#boardingPanel")?.classList.toggle("hidden",!isBoarding);
  $$(".grooming-only").forEach(el=>el.classList.toggle("hidden",isBoarding));
  // Disable hidden fields
  $$("#groomingPanel input,#groomingPanel select,#groomingPanel textarea").forEach(el=>{el.disabled=isBoarding});
  $$("#boardingPanel input,#boardingPanel select,#boardingPanel textarea").forEach(el=>{el.disabled=!isBoarding});
  // Show/hide slides
  $$(".wizard-slide").forEach(s=>{s.classList.toggle("active",+s.dataset.slide===currentStep)});
  // Update progress dots
  $$(".wizard-step-dot").forEach(d=>{
    const s=+d.dataset.step;
    d.classList.toggle("active",s===currentStep);
    d.classList.toggle("done",s<currentStep);
  });
  $$(".wizard-connector").forEach((c,i)=>{c.classList.toggle("done",i<currentStep-1)});
}

function bookingBody(d){if(d.service_type==="Dog Boarding"){return["Hi Barking Mad Barbers, I'd like to enquire about Dog Boarding.","",`Dog name: ${d.boarding_dog_name||""}`,`Breed: ${d.boarding_breed||""}`,`Size: ${d.boarding_size||""}`,`Meet & greet: ${d.meet_greet||""}`,`Drop off: ${d.drop_off||""}`,`Pick up: ${d.pick_up||""}`,"",`Notes: ${d.boarding_notes||""}`,"","I'll bring my own food and harness.","",[`Cheers`,d.owner_name||"",d.phone||""].filter(Boolean).join(" ")].filter((l,i,a)=>l||a[i-1]!=="").join("\n")}let ds=d.dogs||dogs(),pref=(d.preferred_time||"").trim(),date=(d.preferred_date||"").trim(),times=ds.map((x,i)=>`Dog ${i+1} (${x.dog_preferred_time||pref||"any time"})`),has=ds.some(x=>x.dog_preferred_time);let appt=has?["Preferred times:",...times,date?`Date: ${date}`:""].filter(Boolean).join("\n"):pref&&!/^whenever$/i.test(pref)?`Preferred time: ${[pref,date].filter(Boolean).join(" ")}`:`Preferred time: ${["any",date].filter(Boolean).join(" ")}`;let services=ds.flatMap((x,i)=>x.service?[`Dog ${i+1} services: ${x.service}`]:[]);return["Hi Barking Mad Barbers, I'd like to book grooming.","",`Service: ${d.service_type||"Grooming"}`,"",...ds.map((x,i)=>`${i+1}. ${x.dog_name||"Dog"} — ${[x.dog_size,x.breed].filter(Boolean).join(", ")}`),"",...services,"",appt,d.notes?`Notes: ${d.notes}`:"","",["Cheers,",d.owner_name||"",d.phone||""].filter(Boolean).join(" ")].filter((l,i,a)=>l||a[i-1]!=="").join("\n")}
function sms(body){let b=encodeURIComponent(body);return /iPhone|iPad|iPod/i.test(navigator.userAgent)?`sms:${SMS}&body=${b}`:`sms:${SMS}?body=${b}`}
function save(type,data){let a=JSON.parse(localStorage.getItem(STORE)||"[]");a.unshift({id:Date.now().toString(36),type,created_at:new Date().toLocaleString(),data});localStorage.setItem(STORE,JSON.stringify(a.slice(0,100)))}
function fallback(el,body,url,label="Open text message"){el.innerHTML=`<div class="status good sms-open-card"><strong>✅ Your message is ready!</strong><p>If your text app didn't open, copy the message below and send it to ${PHONE}.</p><textarea class="sms-preview" readonly>${esc(body)}</textarea><div class="hero-actions"><button class="btn btn-gold" type="button" id="copyMsg">Copy text</button><a class="btn btn-soft" href="${url}">${label}</a></div></div>`;$("#copyMsg").onclick=async()=>{try{await navigator.clipboard.writeText(body);$("#copyMsg").textContent="Copied ✓"}catch{$("#copyMsg").textContent="Select and copy"}}}
function openSms(body,el){let url=sms(body);fallback(el,body,url);if(/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent))location.href=url}
function profile(){try{return JSON.parse(localStorage.getItem(PROFILE)||"null")}catch{return null}}
function bindForms(){
  let b=$("#bookingForm");
  if(b){
    currentStep=1;
    updateWizard();
    refreshDogs();
    let p=profile();
    if(p)["owner_name","email","phone"].forEach(n=>{if(b[n])b[n].value=n==="owner_name"?p.name||"":p[n]||""});
    let open=()=>{
      if(!b.reportValidity())return;
      let first=dogs()[0]||{},data={...fd(b),service_type:$("#serviceTypeHidden")?.value||"Grooming",dogs:dogs(),dog_name:first.dog_name||"",dog_size:first.dog_size||"",breed:first.breed||""},body=bookingBody(data);
      save("booking",data);openSms(body,$("#bookingStatus"));
      miniConfetti();
    };
    $("#addDogBtn").onclick=()=>{$("#dogsList").insertAdjacentHTML("beforeend",dogCardFun($$(".dog-card-fun").length+1));refreshDogs();updateWizard()};
    $("#textToBookBtn").onclick=e=>{e.preventDefault();open()};
    b.onsubmit=e=>{e.preventDefault();open()};
  }
  let s=$("#profileForm");
  if(s){let p=profile();if(p){s.name.value=p.name||"";s.email.value=p.email||"";s.phone.value=p.phone||""}s.onsubmit=e=>{e.preventDefault();localStorage.setItem(PROFILE,JSON.stringify(fd(s)));$("#signinStatus").innerHTML='<div class="status good">✅ Saved on this device.</div>';renderProfile()}}
  let c=$("#contactForm");
  if(c)c.onsubmit=e=>{e.preventDefault();let d=fd(c),body=[`Name: ${d.name||""}`,`Phone: ${d.phone||""}`,`Email: ${d.email||""}`,"",d.message||""].join("\n");save("contact",d);openSms(body,$("#contactStatus"))};
  let g=$("#galleryForm");
  if(g)g.onsubmit=e=>{e.preventDefault();let d=fd(g),body=[`Owner: ${d.owner_name||""}`,`Email: ${d.email||""}`,`Dog: ${d.dog_name||""}`,`Photo URL: ${d.image_url||""}`,"",`Caption: ${d.caption||""}`].join("\n");save("gallery",d);location.href=`mailto:${EMAIL}?subject=${encodeURIComponent("Barking Mad Barbers photo submission")}&body=${encodeURIComponent(body)}`;$("#galleryStatus").innerHTML='<div class="status good">✅ Opening email with photo details.</div>'};
  let r=$("#requestForm");
  if(r)r.onsubmit=e=>{e.preventDefault();let d=fd(r),body=[`Request type: ${d.request_type||"Request"}`,`Name: ${d.name||""}`,`Phone: ${d.phone||""}`,`Email: ${d.email||""}`,"",d.message||""].join("\n");save("request",d);openSms(body,$("#requestStatus"))};
}
function miniConfetti(){
  const canvas=document.createElement("canvas");
  canvas.className="confetti-burst";
  document.body.appendChild(canvas);
  const ctx=canvas.getContext("2d");
  canvas.width=innerWidth;canvas.height=innerHeight;
  const pieces=Array.from({length:60},()=>({
    x:innerWidth/2,y:innerHeight/2,
    vx:(Math.random()-.5)*16,vy:Math.random()*-14-4,
    r:3+Math.random()*5,
    color:["#b7832a","#e7c778","#f2dfae","#8f6116","#fff"][Math.floor(Math.random()*5)],
    rot:Math.random()*360,rv:(Math.random()-.5)*12
  }));
  let frame=0;
  (function loop(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for(const p of pieces){
      p.vy+=.4;p.x+=p.vx;p.y+=p.vy;p.rot+=p.rv;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot*Math.PI/180);
      ctx.fillStyle=p.color;ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r);
      ctx.restore();
    }
    frame++;
    if(frame<80)requestAnimationFrame(loop);
    else canvas.remove();
  })();
}
function append(who,text){let f=$("#chatFeed"),row=document.createElement("div");row.className="msg-row "+(who==="me"?"me":"bot");row.innerHTML=who==="me"?`<div class="bubble">${esc(text)}</div>`:`<div class="avatar">BM</div><div class="bubble">${esc(text)}</div>`;f.appendChild(row);f.scrollTop=f.scrollHeight}
function reply(t){let q=t.toLowerCase();if(q.includes("board")||q.includes("stay"))return"For boarding, tap Book Now → Dog Boarding → add dates, care info, and send. Easy!";if(q.includes("price")||q.includes("cost")||q.includes("full"))return"Full grooms: $80 tiny, $90 small, $110 medium, $130 large. Final price depends on coat & condition.";if(q.includes("wash"))return"Wash & Dry: $45 tiny, $50 small, $55 medium, $60 large.";if(q.includes("knot")||q.includes("matt"))return"For matting, book a Full Groom and mention the coat condition — extra charge may apply.";if(q.includes("flea"))return"Flea shampoo is $20 extra added to any groom.";if(q.includes("hour")||q.includes("open"))return"Mon–Sat 8:30am – 3:00pm, bookings only.";if(q.includes("book"))return"Tap Book Now — pick your service, add dog details, hit send. Your text app does the rest!";return"Great question! Text it to us at "+PHONE+" and we'll reply when we're free. 🐾"}
function renderProfile(){let p=profile(),box=$("#profileBox");box.innerHTML=p?`<h3>Saved details</h3><p><strong>${esc(p.name||"")}</strong><br>${esc(p.email||"")}<br>${esc(p.phone||"")}</p><button class="btn btn-soft" onclick="localStorage.removeItem(PROFILE);render()">Clear saved details</button>`:"<h3>Your saved details</h3><p>Nothing saved yet.</p>"}
function renderInbox(){let el=$("#staticInbox");if(!el)return;let a=JSON.parse(localStorage.getItem(STORE)||"[]");$("#adminStatus").innerHTML='<div class="status">Local only — customer messages arrive by text or email.</div>';el.innerHTML=a.length?a.map(x=>`<article class="booking-item"><div class="booking-top"><strong>${esc(x.type)}</strong><span class="tag">${esc(x.created_at)}</span></div><pre style="white-space:pre-wrap;font:inherit">${esc(JSON.stringify(x.data,null,2))}</pre></article>`).join(""):'<div class="status">No local enquiries.</div>'}
function clearInbox(){localStorage.removeItem(STORE);renderInbox()}

// === DOT FIELD (kept intact) ===
function dotField(){
  if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  const c=document.createElement("canvas");c.id="dotField";c.setAttribute("aria-hidden","true");document.body.prepend(c);
  const ctx=c.getContext("2d");let W=0,H=0,dots=[],mx=-9999,my=-9999;
  const REPEL=140,PUSH=1.5,SPRING=.012,FRICTION=.9;
  function seed(){
    W=c.width=innerWidth;H=c.height=innerHeight;
    const n=Math.max(40,Math.min(140,Math.round(W*H/15000)));
    dots=Array.from({length:n},()=>{const hx=Math.random()*W,hy=Math.random()*H;
      return{hx,hy,x:hx,y:hy,vx:0,vy:0,r:1+Math.random()*1.9,a:.2+Math.random()*.45,gold:Math.random()<.72,ph:Math.random()*6.283,sp:.002+Math.random()*.004}});
  }
  seed();addEventListener("resize",seed);
  addEventListener("pointermove",e=>{mx=e.clientX;my=e.clientY});
  addEventListener("pointerdown",e=>{mx=e.clientX;my=e.clientY});
  document.addEventListener("mouseleave",()=>{mx=my=-9999});
  (function tick(t){
    ctx.clearRect(0,0,W,H);
    for(const d of dots){
      const dx=d.x-mx,dy=d.y-my,dist=Math.hypot(dx,dy)||1;
      if(dist<REPEL){const f=(REPEL-dist)/REPEL*PUSH;d.vx+=dx/dist*f;d.vy+=dy/dist*f}
      const wob=Math.sin(t*d.sp+d.ph)*10;
      d.vx+=(d.hx+wob-d.x)*SPRING;d.vy+=(d.hy-wob*.6-d.y)*SPRING;
      d.vx*=FRICTION;d.vy*=FRICTION;d.x+=d.vx;d.y+=d.vy;
      const agitated=Math.min(1,Math.hypot(d.vx,d.vy)/3);
      ctx.beginPath();ctx.arc(d.x,d.y,d.r+agitated*.9,0,6.2832);
      ctx.fillStyle=d.gold?`rgba(183,131,42,${Math.min(.85,d.a+agitated*.4)})`:`rgba(11,10,7,${d.a*.4+agitated*.2})`;
      ctx.fill();
    }
    requestAnimationFrame(tick);
  })(0);
}

// === BRAND PARTICLE DOTS (kept intact) ===
const REDUCED=matchMedia("(prefers-reduced-motion: reduce)").matches;
const MOUSE={x:-9999,y:-9999};
addEventListener("pointermove",e=>{MOUSE.x=e.clientX;MOUSE.y=e.clientY});
document.addEventListener("mouseleave",()=>{MOUSE.x=MOUSE.y=-9999});
let brandState=null;
function initBrand(){
  brandState=null;
  const cv=document.getElementById("brandCanvas");
  if(!cv||REDUCED)return;
  const hero=cv.closest(".brand-hero"),staticEl=hero.querySelector(".brand-static"),tools=[...hero.querySelectorAll(".float-tool")];
  const dpr=Math.min(2,devicePixelRatio||1),ctx=cv.getContext("2d");
  const state={cv,parts:[],w:0,h:0};
  function build(){
    const w=Math.max(280,Math.min(1140,hero.clientWidth-40)),narrow=w<560;
    const lines=narrow?["BARKING MAD","BARBERS"]:["BARKING MAD BARBERS"];
    const font=s=>`600 ${s}px Georgia, "Times New Roman", serif`;
    const off=document.createElement("canvas"),oc=off.getContext("2d");
    let fs=narrow?w/6.4:w/9.5;
    oc.font=font(fs);
    const widest=Math.max(...lines.map(ln=>oc.measureText(ln).width));
    fs*=Math.min(1,(w*.96)/widest);
    const h=Math.round(fs*1.3*lines.length+16);
    state.w=w;state.h=h;
    cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);
    cv.style.width=w+"px";cv.style.height=h+"px";
    off.width=w;off.height=h;
    oc.fillStyle="#000";oc.textAlign="center";oc.textBaseline="middle";
    oc.font=font(fs);
    lines.forEach((ln,i)=>oc.fillText(ln,w/2,(i+.62)*fs*1.3+8));
    const img=oc.getImageData(0,0,w,h).data;
    state.amp=Math.max(1,Math.min(2.5,fs*.022));
    let gap=Math.max(3,Math.round(w/230)),pts=[];
    do{
      pts=[];
      for(let y=2;y<h;y+=gap)for(let x=2;x<w;x+=gap)if(img[(y*w+x)*4+3]>128)pts.push([x,y]);
      if(pts.length>1700)gap++;
    }while(pts.length>1700);
    state.parts=pts.map(([x,y])=>{
      const g=x/w,R=Math.round(143+(231-143)*g),G=Math.round(97+(199-97)*g),B=Math.round(22+(120-22)*g);
      return{hx:x,hy:y,x:x+(Math.random()-.5)*w*.4,y:y+(Math.random()-.5)*120,vx:0,vy:0,
        r:gap*.36+Math.random()*.65,ph:Math.random()*6.283,c:`rgba(${R},${G},${B},`,a:.7+Math.random()*.3};
    });
  }
  build();
  staticEl.classList.add("sr-only");
  cv.classList.remove("hidden");
  brandState=state;
  let lastW=hero.clientWidth;
  const onResize=()=>{if(brandState===state&&cv.isConnected&&Math.abs(hero.clientWidth-lastW)>40){lastW=hero.clientWidth;build()}};
  addEventListener("resize",onResize);
  (function loop(t){
    if(!cv.isConnected||brandState!==state){removeEventListener("resize",onResize);return}
    const r=cv.getBoundingClientRect(),mx=MOUSE.x-r.left,my=MOUSE.y-r.top;
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,state.w,state.h);
    for(const p of state.parts){
      const amp=state.amp||2.4,tx=p.hx+Math.sin(t*.0011+p.ph)*amp,ty=p.hy+Math.cos(t*.0009+p.ph)*amp*.9;
      const dx=p.x-mx,dy=p.y-my,dist=Math.hypot(dx,dy)||1;
      if(dist<95){const f=(95-dist)/95*1.3;p.vx+=dx/dist*f;p.vy+=dy/dist*f}
      p.vx+=(tx-p.x)*.045;p.vy+=(ty-p.y)*.045;
      p.vx*=.86;p.vy*=.86;p.x+=p.vx;p.y+=p.vy;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,6.2832);ctx.fillStyle=p.c+p.a+")";ctx.fill();
    }
    const px=(MOUSE.x/innerWidth-.5),py=(MOUSE.y/innerHeight-.5);
    tools.forEach((tl,i)=>{if(MOUSE.x>-999)tl.style.transform=`translate(${px*(i?-16:24)}px,${py*(i?-12:18)}px)`});
    requestAnimationFrame(loop);
  })(0);
}

// === SCROLL REVEAL ===
function initReveal(){
  if(REDUCED)return;
  const els=$$(".reveal,.reveal-left,.reveal-right,.reveal-scale");
  const obs=new IntersectionObserver((entries)=>{
    entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add("visible");obs.unobserve(e.target)}});
  },{threshold:0.12,rootMargin:"0px 0px -40px 0px"});
  els.forEach(el=>obs.observe(el));
}

// === UNVEIL (kept intact) ===
let unveilEls=[];
function collectUnveil(){unveilEls=REDUCED?[]:$$(".unveil");applyUnveil()}
function applyUnveil(){
  const vh=innerHeight;
  for(const el of unveilEls){
    if(!el.isConnected)continue;
    const r=el.getBoundingClientRect();
    let p=(vh-r.top)/(vh*.55);p=Math.max(0,Math.min(1,p));
    const e=1-Math.pow(1-p,2);
    el.style.clipPath=`inset(${(1-e)*16}% ${(1-e)*26}% round 24px)`;
    el.style.transform=`scale(${1.32-.32*e})`;
    el.style.filter=`brightness(${.55+.45*e})`;
  }
}
addEventListener("scroll",()=>requestAnimationFrame(applyUnveil),{passive:true});
addEventListener("resize",()=>requestAnimationFrame(applyUnveil));

// === CARD SPRINGS (kept intact) ===
function initCardSprings(){
  if(REDUCED)return;
  $$(".price-card").forEach(card=>{
    let rx=0,ry=0,s=1,vrx=0,vry=0,vs=0,trx=0,tryy=0,ts=1,raf=null,hover=false;
    const STIFF=.14,DAMP=.74;
    function loop(){
      vrx+=(trx-rx)*STIFF;vry+=(tryy-ry)*STIFF;vs+=(ts-s)*STIFF;
      vrx*=DAMP;vry*=DAMP;vs*=DAMP;
      rx+=vrx;ry+=vry;s+=vs;
      card.style.transform=`perspective(900px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) scale(${s.toFixed(4)})`;
      const energy=Math.abs(vrx)+Math.abs(vry)+Math.abs(vs)+Math.abs(trx-rx)+Math.abs(tryy-ry)+Math.abs(ts-s);
      if(hover||energy>.003)raf=requestAnimationFrame(loop);
      else{raf=null;card.style.transform=""}
    }
    const kick=()=>{if(!raf)raf=requestAnimationFrame(loop)};
    card.addEventListener("pointermove",e=>{
      if(e.pointerType&&e.pointerType!=="mouse")return;
      const r=card.getBoundingClientRect();
      hover=true;
      tryy=((e.clientX-r.left)/r.width-.5)*9;
      trx=(.5-(e.clientY-r.top)/r.height)*8;
      ts=1.035;kick();
    });
    card.addEventListener("pointerleave",()=>{hover=false;trx=0;tryy=0;ts=1;kick()});
  });
}

setNav();render();dotField();
