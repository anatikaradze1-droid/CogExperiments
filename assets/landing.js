(() => {
  const $ = id => document.getElementById(id);

  const esc = value =>
    String(value ?? '').replace(
      /[&<>"']/g,
      c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[c])
    );

  const list = $('experimentList');
  const search = $('experimentSearch');

  let studies = [];


  const classify = exp => {
    const s =
      `${exp.name || ''} ${exp.description || ''} ${exp.slug || ''}`
        .toLowerCase();

    if (
      s.includes('auditory') ||
      s.includes('audio') ||
      s.includes('sound')
    ) {
      return {
        kind: 'auditory',
        category: 'AUDITORY PERCEPTION'
      };
    }

    if (
      s.includes('vertical') ||
      s.includes('line')
    ) {
      return {
        kind: 'visual',
        category: 'VISUAL PERCEPTION'
      };
    }

    if (
      s.includes('uznadze') ||
      s.includes('circle') ||
      s.includes('fixed set')
    ) {
      return {
        kind: 'fixedset',
        category: 'PERCEPTION · FIXED SET'
      };
    }

    return {
      kind: 'general',
      category: 'COGNITIVE EXPERIMENT'
    };
  };


  const visualMarkup = kind => {
    if (kind === 'auditory') {
      return `
        <div class="audio-visual">
          <i></i>
          <i></i>
          <i></i>
          <i></i>
          <i></i>
          <i></i>
          <i></i>
          <i></i>
          <i></i>
        </div>
      `;
    }

    if (kind === 'visual') {
      return `
        <div class="line-visual">
          <i></i>
          <i></i>
          <i></i>
          <i></i>
          <i></i>
          <i></i>
          <i></i>
        </div>
      `;
    }

    if (kind === 'fixedset') {
      return `
        <div class="circle-visual"></div>
      `;
    }

    return `
      <div class="general-visual">
        <i></i>
        <i></i>
        <i></i>
      </div>
    `;
  };


  function renderStudies(rows) {
    if (!list) return;

    if (!rows.length) {
      list.innerHTML = `
        <div class="empty-card">
          ამჟამად ამ ძიებას შესაბამისი გამოქვეყნებული
          ექსპერიმენტი არ მოიძებნა.
        </div>
      `;
      return;
    }

    list.innerHTML = rows
      .map(exp => {
        const meta = classify(exp);

        const description =
          exp.description ||
          'კვლევის მოკლე აღწერა ჯერ არ არის მითითებული.';

        return `
          <article
            class="study-card"
            data-kind="${meta.kind}"
          >

            <div class="study-visual">
              ${visualMarkup(meta.kind)}
            </div>

            <div class="study-body">

              <div class="study-category">
                ${meta.category}
              </div>

              <h3>
                ${esc(exp.name)}
              </h3>

              <p class="study-description">
                ${esc(description)}
              </p>

              <a
                class="study-action"
                href="run.html?exp=${encodeURIComponent(exp.slug)}"
              >
                კვლევაში მონაწილეობა
                <span aria-hidden="true">→</span>
              </a>

            </div>

          </article>
        `;
      })
      .join('');
  }


  async function loadExperiments() {
    if (!list) return;

    list.innerHTML = `
      <div class="loading-card">
        იტვირთება...
      </div>
    `;

    try {
      const rows = await CogDB.experiments(false);

      studies = Array.isArray(rows)
        ? rows.filter(exp => exp.status === 'published')
        : [];

      renderStudies(studies);
    }

    catch (error) {
      console.error(error);

      list.innerHTML = `
        <div class="empty-card">
          ექსპერიმენტების ჩატვირთვა ვერ მოხერხდა:
          ${esc(error.message)}
        </div>
      `;
    }
  }


  if (search) {
    search.addEventListener('input', () => {
      const q =
        search.value
          .trim()
          .toLowerCase();

      if (!q) {
        renderStudies(studies);
        return;
      }

      const filtered = studies.filter(exp => {
        const text =
          `${exp.name || ''} ${exp.description || ''} ${exp.slug || ''}`
            .toLowerCase();

        return text.includes(q);
      });

      renderStudies(filtered);
    });
  }


  loadExperiments()
    .catch(error => {
      console.error(error);
    });

})();
