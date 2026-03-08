/**
 * ============================================================
 *  JCOSASI Landing Page — script.js
 * ============================================================
 */
const $ = (id) => document.getElementById(id);
const set = (id, html) => { const el = $(id); if (el) el.innerHTML = html; };
const setText = (id, text) => { const el = $(id); if (el) el.textContent = text; };

function buildNavLogo(logo, org) {
  if (logo.use_image && logo.path) {
    return `<img src="${logo.path}" alt="${logo.alt}" class="logo-img-nav" />
      <div class="nav-logo-text"><span class="logo-kanji">${org.nama_singkat}</span><span class="logo-sub">${org.periode}</span></div>`;
  }
  return `<div class="logo-placeholder logo-placeholder-nav" title="Logo belum tersedia — ubah di content.js">
      <span class="logo-placeholder-icon">🌸</span><span class="logo-placeholder-text">LOGO</span></div>
    <div class="nav-logo-text"><span class="logo-kanji">${org.nama_singkat}</span><span class="logo-sub">${org.periode}</span></div>`;
}

function buildHeroLogoDeco(logo, org) {
  if (logo.use_image && logo.path) {
    return `<img src="${logo.path}" alt="${logo.alt}" class="hlp-img" /><span class="hlp-hint">${org.nama_singkat}</span>`;
  }
  return `<div class="hlp-box" title="Ganti logo di content.js">
      <span class="hlp-icon">🌸</span><span class="hlp-label">LOGO<br/>${org.nama_singkat}</span></div>
    <span class="hlp-hint">Tambahkan logo di<br/>content.js → logo.path</span>`;
}

function buildVcLogo(logo) {
  if (logo.use_image && logo.path) return `<img src="${logo.path}" alt="${logo.alt}" class="vc-logo-img" />`;
  return `<div class="vc-logo-ph"><span>🌸</span><span>LOGO</span></div>`;
}

function buildOrgPhoto(photo, icon) {
  if (photo) return `<div class="org-photo"><img src="${photo}" alt="foto" /></div>`;
  return `<div class="org-photo"><div class="org-photo-ph"><span class="org-ph-icon">${icon}</span><span class="org-ph-text">Foto</span></div></div>`;
}

function buildOrgCard(data) {
  const namaClass  = data.nama.includes('[')  ? 'org-nama placeholder'  : 'org-nama';
  const kelasClass = data.kelas.includes('[') ? 'org-kelas placeholder' : 'org-kelas';
  return `${buildOrgPhoto(data.photo, data.icon)}
    <div class="org-jabatan">${data.jabatan}</div>
    <div class="${namaClass}">${data.nama}</div>
    <div class="${kelasClass}">${data.kelas}</div>
    <div class="org-desc">${data.desc}</div>`;
}

document.addEventListener('DOMContentLoaded', () => {
  const C = CONTENT, O = C.org, L = C.logo, KT = C.kontak;

  document.title = C.meta.title;

  /* NAV */
  set('navLogoWrap', buildNavLogo(L, O));
  set('navLinks', C.nav.links.map(l => `<li><a href="${l.href}">${l.label}</a></li>`).join(''));
  set('mobileLinks', C.nav.links.map(l => `<li><a href="${l.href}" class="mm-link">${l.label}</a></li>`).join(''));

  /* HERO */
  set('heroBadge', C.hero.badge);
  set('heroJp', C.hero.jp_accent);
  set('heroHeadline', C.hero.headline);
  set('heroSubtitle', C.hero.subtitle);
  set('heroDesc', C.hero.desc);
  set('heroHighlights', C.hero.highlights.map(h => `<div class="hl-item"><span class="hl-icon">✦</span> ${h}</div>`).join(''));
  const cta = $('heroCta');
  if (cta) { cta.href = C.hero.cta_href; cta.innerHTML = `${C.hero.cta_text} <span>→</span>`; }
  set('heroLogoDeco', buildHeroLogoDeco(L, O));

  /* TENTANG */
  set('tentangLabel', C.tentang.label);
  set('tentangHeading', C.tentang.heading);
  set('tentangPara1', C.tentang.para1);
  set('tentangPara2', C.tentang.para2);
  set('tentangStats', C.tentang.stats.map(s =>
    `<div class="stat"><span class="stat-num">${s.num}</span><span class="stat-label">${s.label}</span></div>`).join(''));
  set('vcBadge', C.tentang.card.badge);
  set('vcYear',  C.tentang.card.year);
  set('vcTags',  C.tentang.card.tags.map(t => `<span class="tag">${t}</span>`).join(''));
  set('vcMotto', C.tentang.card.motto);
  set('vcLogoBox', buildVcLogo(L));

  /* VISI MISI */
  set('vmLabel', C.visiMisi.label);
  set('vmHeading', C.visiMisi.heading);
  set('visiJudul', C.visiMisi.visi.judul);
  set('visiTeks', C.visiMisi.visi.teks);
  set('misiLabel', C.visiMisi.misi_label);
  set('misiList', C.visiMisi.misi.map((m, i) =>
    `<li><span class="misi-num">${String(i+1).padStart(2,'0')}</span><span>${m}</span></li>`).join(''));

  /* PROKER */
  set('prokerLabel', C.proker.label);
  set('prokerHeading', C.proker.heading);
  set('prokerDesc', C.proker.desc);
  set('prokerGrid', C.proker.items.map((p, i) => {
    const delay = i % 2 === 1 ? ' delay-1' : '';
    let extra = '';
    if (p.chips)   extra = `<div class="pc-sub-programs">${p.chips.map(c=>`<span class="sub-p">${c}</span>`).join('')}</div>`;
    else if (p.akademik) extra = `<div class="akademik-list">${p.akademik.map(a=>`<div class="ak-item"><strong>${a.judul}</strong><p>${a.desc}</p></div>`).join('')}</div>`;
    else if (p.mb) extra = `<div class="mb-grid">${p.mb.map(m=>`<div class="mb-item">${m}</div>`).join('')}</div>`;
    else if (p.org) extra = `<div class="org-list">${p.org.map(o=>`<div class="org-item"><span class="org-dot"></span><strong>${o.judul}</strong> — ${o.desc}</div>`).join('')}</div>`;
    return `<div class="proker-card fade-up${delay}" data-cat="${p.cat}">
      <div class="pc-header"><span class="pc-num">${p.num}</span><span class="pc-tag ${p.tag_class}">${p.tag}</span></div>
      <div class="pc-icon">${p.icon}</div><h3>${p.judul}</h3><p>${p.desc}</p>
      <div class="pc-detail">${p.detail.map(d=>`<div class="pc-detail-item"><span class="pd-label">${d.label}</span><span>${d.val}</span></div>`).join('')}</div>
      ${extra}</div>`;
  }).join(''));

  /* TIMELINE */
  set('tlLabel', C.timeline.label);
  set('tlHeading', C.timeline.heading);
  const dirs = ['fade-left','fade-right','fade-left','fade-right','fade-left'];
  set('tlWrapper', C.timeline.items.map((t,i) =>
    `<div class="tl-item ${dirs[i]||'fade-up'}">
      <div class="${t.soft?'tl-dot tl-dot-soft':'tl-dot'}"></div>
      <div class="${t.soft?'tl-content tl-content-soft':'tl-content'}">
        <div class="tl-month">${t.bulan}</div><h4>${t.judul}</h4><p>${t.desc}</p>
        <span class="tl-date">${t.tanggal}</span></div></div>`).join(''));

  /* PENGURUS */
  const P = C.pengurus;
  set('pengurusLabel', P.label);
  set('pengurusHeading', P.heading);
  set('pengurusDesc', P.desc);
  set('pengurusNote', `<span class="pn-icon">📋</span><p>${P.catatan}</p>`);
  set('orgKetua',      buildOrgCard(P.struktur.ketua));
  set('orgWakil',      buildOrgCard(P.struktur.wakil));
  set('orgSekretaris', buildOrgCard(P.struktur.sekretaris));
  set('orgBendahara',  buildOrgCard(P.struktur.bendahara));
  set('orgBidang', P.bidang.map((b,i) => {
    const delays = ['','delay-1','delay-2','delay-3'];
    return `<div class="org-card org-card-bidang fade-up ${delays[i]||''}">${buildOrgCard(b)}</div>`;
  }).join(''));

  /* KONTAK */
  const KS = C.kontakSection;
  set('kontakLabel', KS.label);
  set('kontakHeading', KS.heading);
  set('kontakDesc', KS.desc);
  setText('kontakSekolah', O.sekolah);
  setText('kontakAlamat', O.alamat);
  set('kontakEmail', `<a href="mailto:${KT.email}">${KT.email}</a> <em>(perbarui di content.js)</em>`);
  const smIcons = {
    instagram:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`,
    tiktok:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.2 8.2 0 004.79 1.53V6.77a4.85 4.85 0 01-1.02-.08z"/></svg>`,
    youtube:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>`
  };
  const smList = [
    {key:'instagram',label:'Instagram',show:KT.show_instagram,url:KT.instagram},
    {key:'tiktok',   label:'TikTok',   show:KT.show_tiktok,   url:KT.tiktok},
    {key:'youtube',  label:'YouTube',  show:KT.show_youtube,  url:KT.youtube},
  ];
  set('sosmedLinks', smList.filter(s=>s.show).map(s=>
    `<a href="${s.url}" class="sm-btn" target="_blank" rel="noopener">${smIcons[s.key]} ${s.label}</a>`).join(''));
  set('kcBadge', KS.card.badge);
  set('kcYear',  KS.card.year);
  set('kcBody',  KS.card.stats.map(s=>`<div class="kc-stat"><span>${s.num}</span><small>${s.label}</small></div>`).join(''));
  set('kcJpQuote', KS.card.jp_quote);
  set('kcIdQuote', KS.card.id_quote);

  /* FOOTER */
  set('footerFull',   O.nama_lengkap);
  set('footerSchool', `${O.sekolah} · Est. ${O.tahun_berdiri}`);
  set('footerCopy', C.footer.copy);
  set('footerJp',   C.footer.jp_closing);

  /* ── NAVBAR SCROLL ── */
  const navbar = $('navbar');
  window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY>60), {passive:true});

  /* ── HAMBURGER ── */
  const ham = $('hamburger'), mob = $('mobileMenu');
  ham.addEventListener('click', () => mob.classList.toggle('open'));
  document.querySelectorAll('.mm-link').forEach(l=>l.addEventListener('click',()=>mob.classList.remove('open')));
  document.addEventListener('click', e=>{ if(!ham.contains(e.target)&&!mob.contains(e.target)) mob.classList.remove('open'); });

  /* ── SCROLL ANIMATIONS ── */
  const obs = new IntersectionObserver(entries=>entries.forEach(e=>{
    if(e.isIntersecting) e.target.classList.add('visible');
  }), {threshold:0.1, rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll('.fade-up,.fade-left,.fade-right').forEach(el=>obs.observe(el));

  /* ── PROKER FILTER ── */
  document.querySelectorAll('.filter-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      document.querySelectorAll('.proker-card').forEach(card=>{
        const show = f==='all' || (card.dataset.cat||'').includes(f);
        card.classList.toggle('hidden',!show);
        if(show){ card.classList.remove('visible'); requestAnimationFrame(()=>requestAnimationFrame(()=>card.classList.add('visible'))); }
      });
    });
  });

  /* ── ACTIVE NAV ── */
  document.querySelectorAll('section[id]').forEach(s=>{
    new IntersectionObserver(entries=>entries.forEach(e=>{
      if(e.isIntersecting){
        const id=e.target.getAttribute('id');
        document.querySelectorAll('.nav-links a').forEach(l=>l.classList.toggle('active',l.getAttribute('href')===`#${id}`));
      }
    }),{threshold:0.4}).observe(s);
  });

  /* ── HERO LOAD ── */
  setTimeout(()=>{
    document.querySelectorAll('#hero .fade-up').forEach((el,i)=>setTimeout(()=>el.classList.add('visible'),i*130));
  },120);

  /* ── SAKURA ── */
  const ss=document.createElement('style');
  ss.textContent=`@keyframes sakuraFall{0%{transform:translateY(0) rotate(0deg);opacity:1}50%{transform:translateY(40vh) rotate(180deg) translateX(20px);opacity:.7}100%{transform:translateY(100vh) rotate(360deg) translateX(-20px);opacity:0}}
  .nav-links a.active{color:var(--purple-mid)}.nav-links a.active::after{transform:scaleX(1)}#navbar.scrolled .nav-links a.active{color:var(--white)}`;
  document.head.appendChild(ss);
  setInterval(()=>{
    const hero=$('hero');if(!hero)return;
    const p=document.createElement('div');
    const sz=4+Math.random()*6;
    p.style.cssText=`position:absolute;width:${sz}px;height:${sz}px;background:rgba(255,180,210,${.2+Math.random()*.3});border-radius:50% 0 50% 0;left:${Math.random()*100}%;top:-10px;pointer-events:none;z-index:1;animation:sakuraFall ${4+Math.random()*5}s linear forwards;`;
    hero.appendChild(p);p.addEventListener('animationend',()=>p.remove());
  },1000);
});
