(() => {
  const cfg = window.COG_CONFIG || {};

  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_PUBLISHABLE_KEY) {
    document.getElementById("experimentList").innerHTML =
      '<div class="card">Supabase configuration is missing.</div>';
    return;
  }

  const sb = window.supabase.createClient(
    cfg.SUPABASE_URL,
    cfg.SUPABASE_PUBLISHABLE_KEY
  );

  const experimentList = document.getElementById("experimentList");

  const authModal = document.getElementById("authModal");
  const authTitle = document.getElementById("authTitle");
  const authEmail = document.getElementById("authEmail");
  const authPassword = document.getElementById("authPassword");
  const authMessage = document.getElementById("authMessage");
  const authSubmit = document.getElementById("authSubmit");

  const loginOpen = document.getElementById("loginOpen");
  const registerOpen = document.getElementById("registerOpen");
  const loginTab = document.getElementById("loginTab");
  const registerTab = document.getElementById("registerTab");
  const authClose = document.getElementById("authClose");

  const logoutBtn = document.getElementById("logoutBtn");
  const userBadge = document.getElementById("userBadge");

  let authMode = "login";

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function loadExperiments() {
    experimentList.innerHTML =
      '<div class="card muted">იტვირთება...</div>';

    const { data, error } = await sb
      .from("experiments")
      .select("id,slug,name,description,status,version,created_at")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);

      experimentList.innerHTML =
        '<div class="card">ექსპერიმენტების ჩატვირთვა ვერ მოხერხდა.</div>';

      return;
    }

    if (!data || data.length === 0) {
      experimentList.innerHTML =
        '<div class="card muted">ამჟამად გამოქვეყნებული ექსპერიმენტები არ არის.</div>';

      return;
    }

    experimentList.innerHTML = data.map(exp => `
      <article class="card experiment-public-card">
        <div class="eyebrow">ექსპერიმენტი</div>

        <h3>${escapeHTML(exp.name)}</h3>

        <p class="muted">
          ${escapeHTML(exp.description || "აღწერა არ არის მითითებული.")}
        </p>

        <div class="actions">
          <a
            class="btn primary"
            href="run.html?slug=${encodeURIComponent(exp.slug)}"
          >
            მონაწილეობა
          </a>
        </div>
      </article>
    `).join("");
  }

  function setAuthMode(mode) {
    authMode = mode;

    const login = mode === "login";

    authTitle.textContent = login ? "შესვლა" : "რეგისტრაცია";
    authSubmit.textContent = login ? "შესვლა" : "რეგისტრაცია";

    loginTab.classList.toggle("primary", login);
    registerTab.classList.toggle("primary", !login);

    authPassword.autocomplete =
      login ? "current-password" : "new-password";

    authMessage.classList.add("hidden");
    authMessage.textContent = "";
  }

  function openAuth(mode) {
    setAuthMode(mode);
    authModal.classList.remove("hidden");
    authEmail.focus();
  }

  function closeAuth() {
    authModal.classList.add("hidden");
    authMessage.classList.add("hidden");
    authMessage.textContent = "";
  }

  async function refreshUser() {
    const {
      data: { user }
    } = await sb.auth.getUser();

    if (user) {
      userBadge.textContent = user.email || "User";
      userBadge.classList.remove("hidden");

      logoutBtn.classList.remove("hidden");
      loginOpen.classList.add("hidden");
      registerOpen.classList.add("hidden");
    } else {
      userBadge.classList.add("hidden");
      logoutBtn.classList.add("hidden");

      loginOpen.classList.remove("hidden");
      registerOpen.classList.remove("hidden");
    }
  }

  loginOpen.addEventListener("click", () => openAuth("login"));
  registerOpen.addEventListener("click", () => openAuth("register"));

  loginTab.addEventListener("click", () => setAuthMode("login"));
  registerTab.addEventListener("click", () => setAuthMode("register"));

  authClose.addEventListener("click", closeAuth);

  authModal.addEventListener("click", event => {
    if (event.target === authModal) closeAuth();
  });

  authSubmit.addEventListener("click", async () => {
    const email = authEmail.value.trim();
    const password = authPassword.value;

    authMessage.classList.remove("hidden");
    authMessage.textContent = "გთხოვთ დაელოდოთ...";

    if (!email || !password) {
      authMessage.textContent = "შეიყვანეთ Email და პაროლი.";
      return;
    }

    let result;

    if (authMode === "login") {
      result = await sb.auth.signInWithPassword({
        email,
        password
      });
    } else {
      result = await sb.auth.signUp({
        email,
        password
      });
    }

    if (result.error) {
      authMessage.textContent = result.error.message;
      return;
    }

    if (authMode === "register" && !result.data.session) {
      authMessage.textContent =
        "რეგისტრაცია დასრულდა. თუ Email confirmation ჩართულია, შეამოწმეთ ელფოსტა.";
      return;
    }

    closeAuth();
    await refreshUser();
  });

  logoutBtn.addEventListener("click", async () => {
    await sb.auth.signOut();
    await refreshUser();
  });

  sb.auth.onAuthStateChange(() => {
    setTimeout(refreshUser, 0);
  });

  loadExperiments();
  refreshUser();
})();
