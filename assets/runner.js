(() => {
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const list = $('experimentList');
  const search = $('experimentSearch');
  const modal = $('authModal');
  const title = $('authTitle');
  const email = $('authEmail');
  const password = $('authPassword');
  const msg = $('authMessage');
  const submit = $('authSubmit');
  let mode = 'login';
  let studies = [];

  const classify = exp => {
    const s = `${exp.name || ''} ${exp.description || ''} ${exp.slug || ''}`.toLowerCase();
    if (s.includes('auditory') || s.includes('audio') || s.includes('sound')) return {kind:'auditory', category:'AUDITORY PERCEPTION', fallback:'ბგერითი აღქმისა და ფიქსირებული განწყობის ექსპერიმენტი.'};
    if (s.includes('vertical') || s.includes('line')) return {kind:'visual', category:'VISUAL PERCEPTION', fallback:'ვიზუალური აღქმისა და ფიქსირებული განწყობის ექსპერიმენტი.'};
    if (s.includes('uznadze') || s.includes('circle') || s.includes('fixed set')) return {kind:'fixedset', category:'PERCEPTION · FIXED SET', fallback:'უზნაძის ფიქსირებული განწყობის ვიზუალური ექსპერიმენტი.'};
    return {kind:'general', category:'COGNITIVE EXPERIMENT', fallback:'კოგნიტური და ექსპერიმენტული ფსიქოლოგიის კვლევა.'};
  };

  const visualMarkup = kind => {
    if (kind === 'auditory') return '<div class="audio-visual"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>';
    if (kind === 'visual') return '<div class="line-visual"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>';
    if (kind === 'fixedset') return '<div class="circle-visual"></div>';
    return '<div class="general-visual"><i></i><i></i><i></i></div>';
  };

  function renderStudies(rows) {
    if (!rows.length) {
      list.innerHTML = '<div class="empty-card">ამჟამად ამ ძიებას შესაბამისი გამოქვეყნებული ექსპერიმენტი არ მოიძებნა.</div>';
      return;
    }
    list.innerHTML = rows.map(exp => {
      const meta = classify(exp);
      const description = exp.description || meta.fallback;
      return `<article class="study-card" data-kind="${meta.kind}">
        <div class="study-visual">${visualMarkup(meta.kind)}</div>
        <div class="study-body">
          <div class="study-category">${meta.category}</div>
          <h3>${esc(exp.name)}</h3>
          <p class="study-description">${esc(description)}</p>
          <a class="study-action" href="run.html?exp=${encodeURIComponent(exp.slug)}">კვლევაში მონაწილეობა <span aria-hidden="true">→</span></a>
        </div>
      </article>`;
    }).join('');
  }

  async function loadExperiments() {
    try {
      studies = await CogDB.experiments(false);
      renderStudies(studies);
    } catch (error) {
      list.innerHTML = `<div class="empty-card">ექსპერიმენტების ჩატვირთვა ვერ მოხერხდა: ${esc(error.message)}</div>`;
    }
  }

  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    renderStudies(!q ? studies : studies.filter(exp => `${exp.name || ''} ${exp.description || ''}`.toLowerCase().includes(q)));
  });

  function setMode(next) {
    mode = next;
    const reg = mode === 'register';
    title.textContent = reg ? 'რეგისტრაცია' : 'შესვლა';
    submit.textContent = reg ? 'ანგარიშის შექმნა' : 'შესვლა';
    $('loginTab').classList.toggle('active', !reg);
    $('registerTab').classList.toggle('active', reg);
    password.autocomplete = reg ? 'new-password' : 'current-password';
    msg.classList.add('hidden');
    msg.classList.remove('danger');
  }

  function openAuth(next) { setMode(next); modal.classList.remove('hidden'); setTimeout(() => email.focus(), 0); }
  function closeAuth() { modal.classList.add('hidden'); password.value = ''; msg.classList.add('hidden'); }

  $('loginOpen').onclick = () => openAuth('login');
  $('registerOpen').onclick = () => openAuth('register');
  $('loginTab').onclick = () => setMode('login');
  $('registerTab').onclick = () => setMode('register');
  $('authClose').onclick = closeAuth;
  modal.onclick = event => { if (event.target === modal) closeAuth(); };
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeAuth(); });

  async function refreshUser() {
    const user = await CogDB.user();
    const badge = $('userBadge');
    if (!user) {
      badge.classList.add('hidden'); $('loginOpen').classList.remove('hidden'); $('registerOpen').classList.remove('hidden'); $('logoutBtn').classList.add('hidden');
      return;
    }
    badge.textContent = user.email || 'Signed in';
    badge.classList.remove('hidden'); $('loginOpen').classList.add('hidden'); $('registerOpen').classList.add('hidden'); $('logoutBtn').classList.remove('hidden');
  }

  submit.onclick = async () => {
    const em = email.value.trim(), pw = password.value;
    if (!em || !pw) { msg.textContent = 'შეიყვანეთ Email და პაროლი.'; msg.className = 'auth-message danger'; return; }
    if (mode === 'register' && pw.length < 6) { msg.textContent = 'პაროლი უნდა შეიცავდეს მინიმუმ 6 სიმბოლოს.'; msg.className = 'auth-message danger'; return; }
    submit.disabled = true;
    try {
      if (mode === 'register') {
        const data = await CogDB.signUp(em, pw);
        if (data.session) { closeAuth(); await refreshUser(); }
        else { msg.textContent = 'ანგარიში შეიქმნა. თუ Email confirmation ჩართულია, შეამოწმეთ ელფოსტა.'; msg.className = 'auth-message'; }
      } else { await CogDB.signIn(em, pw); closeAuth(); await refreshUser(); }
    } catch (error) { msg.textContent = error.message; msg.className = 'auth-message danger'; }
    finally { submit.disabled = false; }
  };

  $('logoutBtn').onclick = async () => { await CogDB.signOut(); await refreshUser(); };
  Promise.all([loadExperiments(), refreshUser()]).catch(console.error);
})();
