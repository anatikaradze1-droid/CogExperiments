(() => {

  const app =
    document.getElementById(
      'consentApp'
    );


  const esc = value =>
    String(value ?? '').replace(
      /[&<>"']/g,
      c => ({
        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;',
        "'":'&#39;'
      }[c])
    );


  const slug =
    new URLSearchParams(
      location.search
    ).get('exp');


  function defaultConsent() {

    return `კვლევაში მონაწილეობა ნებაყოფლობითია.

ექსპერიმენტის განმავლობაში შეგროვდება თქვენი პასუხები და კვლევის დიზაინიდან გამომდინარე შესაძლოა დაფიქსირდეს რეაქციის დროც.

კვლევის მონაცემები გამოიყენება მხოლოდ კვლევითი მიზნებისთვის.

თქვენ შეგიძლიათ ნებისმიერ დროს შეწყვიტოთ მონაწილეობა ექსპერიმენტის დასრულებამდე.`;

  }


  function render(exp) {

    const info =
      exp.config?.study_info || {};


    const consentText =
      info.consent_text ||
      defaultConsent();


    document.title =
      `Consent — ${exp.name}`;


    app.innerHTML = `
      <div class="study-page">

        <div class="consent-card">


          <a
            class="study-back"
            href="study.html?exp=${encodeURIComponent(exp.slug)}"
          >
            ← კვლევის ინფორმაციაზე დაბრუნება
          </a>


          <header class="consent-header">

            <div class="study-eyebrow">
              INFORMED CONSENT
            </div>

            <h1>
              ინფორმირებული თანხმობა
            </h1>

            <p>
              გთხოვთ, გაეცნოთ ქვემოთ მოცემულ ინფორმაციას
              და დაადასტუროთ თანხმობა კვლევაში მონაწილეობაზე.
            </p>

          </header>


          <section class="consent-body">

            <div class="consent-study">

              <div class="consent-study-label">
                STUDY
              </div>

              <h2>
                ${esc(exp.name)}
              </h2>

            </div>


            <div class="consent-text">
              ${esc(consentText)}
            </div>


            <div class="consent-options">


              <label class="consent-option">

                <input
                  id="consentRead"
                  type="checkbox"
                >

                <span>
                  გავეცანი კვლევის შესახებ ინფორმაციას
                  და მქონდა შესაძლებლობა გამეცნო
                  მონაწილეობის პირობები.
                </span>

              </label>


              <label class="consent-option">

                <input
                  id="consentVoluntary"
                  type="checkbox"
                >

                <span>
                  მესმის, რომ კვლევაში მონაწილეობა
                  ნებაყოფლობითია.
                </span>

              </label>


              <label class="consent-option">

                <input
                  id="consentData"
                  type="checkbox"
                >

                <span>
                  ვეთანხმები ჩემი ექსპერიმენტული
                  მონაცემების კვლევითი მიზნებისთვის
                  გამოყენებას.
                </span>

              </label>


              <label class="consent-option">

                <input
                  id="consentParticipate"
                  type="checkbox"
                >

                <span>
                  ვადასტურებ, რომ მსურს ამ კვლევაში
                  მონაწილეობა.
                </span>

              </label>


            </div>


            <div class="consent-action">

              <a
                class="consent-cancel"
                href="research.html"
              >
                არ ვეთანხმები
              </a>


              <button
                id="startExperiment"
                class="consent-start"
                type="button"
                disabled
              >
                ექსპერიმენტის დაწყება →
              </button>

            </div>

          </section>

        </div>

      </div>
    `;


    const checks = [
      document.getElementById(
        'consentRead'
      ),

      document.getElementById(
        'consentVoluntary'
      ),

      document.getElementById(
        'consentData'
      ),

      document.getElementById(
        'consentParticipate'
      )
    ];


    const start =
      document.getElementById(
        'startExperiment'
      );


    const refresh = () => {

      start.disabled =
        !checks.every(
          checkbox =>
            checkbox.checked
        );

    };


    checks.forEach(
      checkbox => {

        checkbox.addEventListener(
          'change',
          refresh
        );

      }
    );


    start.onclick = () => {

      if (start.disabled) {
        return;
      }


      /*
        Save a lightweight consent record
        in this browser.

        Later we can also store consent
        version + timestamp in Supabase.
      */

      localStorage.setItem(
        `cogexperiments-consent-${exp.slug}`,
        JSON.stringify({
          accepted:true,
          accepted_at:
            new Date().toISOString(),
          version:
            info.consent_version || 1
        })
      );


      location.href =
        `run.html?exp=${encodeURIComponent(exp.slug)}&consent=1`;

    };

  }


  async function boot() {

    if (!slug) {

      app.innerHTML = `
        <div class="study-error">
          კვლევის ბმული არასწორია.
        </div>
      `;

      return;

    }


    try {

      const exp =
        await CogDB.experimentBySlug(
          slug
        );


      if (!exp) {

        app.innerHTML = `
          <div class="study-error">
            კვლევა ვერ მოიძებნა.
          </div>
        `;

        return;

      }


      render(exp);

    }

    catch (error) {

      console.error(error);


      app.innerHTML = `
        <div class="study-error">
          ინფორმირებული თანხმობის გვერდის
          ჩატვირთვა ვერ მოხერხდა:
          ${esc(error.message)}
        </div>
      `;

    }

  }


  boot();

})();
