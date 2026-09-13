(() => {

  const app =
    document.getElementById('studyApp');


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


  const classify = exp => {

    const text =
      `${exp.name || ''} ${exp.description || ''} ${exp.slug || ''}`
        .toLowerCase();


    if (
      text.includes('auditory') ||
      text.includes('audio') ||
      text.includes('sound')
    ) {
      return {
        category:'Auditory Perception',
        task:'Auditory task'
      };
    }


    if (
      text.includes('vertical') ||
      text.includes('line')
    ) {
      return {
        category:'Visual Perception',
        task:'Visual task'
      };
    }


    if (
      text.includes('uznadze') ||
      text.includes('circle') ||
      text.includes('fixed set')
    ) {
      return {
        category:'Perception · Fixed Set',
        task:'Visual perception task'
      };
    }


    return {
      category:'Cognitive Experiment',
      task:'Cognitive task'
    };

  };


  function estimateDuration(config) {

    const elements =
      config?.elements || [];


    let totalMs = 0;


    for (const el of elements) {

      if (el.type === 'block') {

        const trials =
          Number(el.trials) || 0;

        const exposure =
          Number(el.exposure_ms) || 0;

        const isi =
          Number(el.isi_ms) || 0;


        totalMs +=
          trials * (exposure + isi);

      }


      if (el.type === 'break') {

        totalMs +=
          Number(el.duration_ms) || 0;

      }

    }


    if (!totalMs) {
      return null;
    }


    /*
      Adds a little time for instructions,
      participant responses and transitions.
    */

    const estimated =
      Math.ceil(
        (totalMs / 60000) * 1.25
      );


    return Math.max(
      3,
      estimated
    );

  }


  function defaultProcedure(meta) {

    if (meta.task === 'Auditory task') {

      return `ექსპერიმენტის განმავლობაში მოისმენთ აუდიტორულ სტიმულებს და ეკრანზე მოცემული ინსტრუქციის მიხედვით შეაფასებთ მათ.

პასუხები დაფიქსირდება კლავიატურის ან ეკრანზე წარმოდგენილი პასუხის ღილაკების საშუალებით.`;

    }


    if (
      meta.task ===
      'Visual perception task'
    ) {

      return `ექსპერიმენტის განმავლობაში ეკრანზე წარმოდგენილი იქნება ვიზუალური სტიმულები. თქვენი დავალება იქნება მათი შეფასება მოცემული ინსტრუქციის შესაბამისად.

ექსპერიმენტი შედგება რამდენიმე ეტაპისგან. თითოეულ ეტაპზე გთხოვთ უპასუხოთ მხოლოდ წარმოდგენილი სტიმულის მიხედვით.`;

    }


    return `ექსპერიმენტის განმავლობაში მოგეთხოვებათ ეკრანზე წარმოდგენილ სტიმულებზე პასუხის გაცემა მოცემული ინსტრუქციების შესაბამისად.

კვლევის კონკრეტული დავალება და პასუხის ფორმატი აგიხსნით ექსპერიმენტის დაწყებამდე.`;

  }


  function defaultPrivacy() {

    return `კვლევის ფარგლებში შეგროვდება ექსპერიმენტული შესრულების მონაცემები, მათ შორის თქვენი პასუხები და, საჭიროების შემთხვევაში, რეაქციის დრო.

პლატფორმა არ ითხოვს თქვენს სახელსა და გვარს. კვლევის მონაცემები დაკავშირებულია მონაწილის კოდთან და გამოიყენება კვლევითი ანალიზისთვის.`;

  }


  function defaultEligibility() {

    return `კვლევაში მონაწილეობა ნებაყოფლობითია. ექსპერიმენტის დაწყებამდე გაეცანით ინსტრუქციას და დარწმუნდით, რომ შეგიძლიათ დავალების შესრულება შესაბამის მოწყობილობაზე.`;

  }


  function render(exp) {

    const config =
      exp.config || {};


    const info =
      config.study_info || {};


    const meta =
      classify(exp);


    const duration =
      info.duration_minutes ||
      estimateDuration(config);


    const description =
      info.summary ||
      exp.description ||
      'ეს კვლევა წარმოადგენს CogExperiments-ის პლატფორმაზე განხორციელებულ კოგნიტურ ექსპერიმენტს.';


    const about =
      info.about ||
      description;


    const procedure =
      info.procedure ||
      defaultProcedure(meta);


    const privacy =
      info.privacy ||
      defaultPrivacy();


    const eligibility =
      info.eligibility ||
      defaultEligibility();


    const category =
      info.category ||
      meta.category;


    const task =
      info.task ||
      meta.task;


    const device =
      info.device ||
      (
        config.calibration?.enabled
          ? 'Desktop / Laptop'
          : 'Computer'
      );


    const participation =
      info.participation ||
      'Anonymous';


    document.title =
      `${exp.name} — CogExperiments`;


    app.innerHTML = `
      <div class="study-page">

        <a
          class="study-back"
          href="research.html"
        >
          ← ყველა კვლევა
        </a>


        <section class="study-hero">

          <div>

            <div class="study-eyebrow">
              ${esc(category).toUpperCase()}
            </div>

            <h1 class="study-title">
              ${esc(exp.name)}
            </h1>

            <p class="study-summary">
              ${esc(description)}
            </p>

          </div>


          <div class="study-meta">

            <div class="study-meta-item">
              <span class="study-meta-label">
                Duration
              </span>

              <span class="study-meta-value">
                ${
                  duration
                    ? `~${esc(duration)} min`
                    : 'Varies'
                }
              </span>
            </div>


            <div class="study-meta-item">
              <span class="study-meta-label">
                Task
              </span>

              <span class="study-meta-value">
                ${esc(task)}
              </span>
            </div>


            <div class="study-meta-item">
              <span class="study-meta-label">
                Device
              </span>

              <span class="study-meta-value">
                ${esc(device)}
              </span>
            </div>


            <div class="study-meta-item">
              <span class="study-meta-label">
                Participation
              </span>

              <span class="study-meta-value">
                ${esc(participation)}
              </span>
            </div>

          </div>

        </section>


        <section class="study-content">

          <aside class="study-side">

            <div class="study-side-label">
              STUDY INFORMATION
            </div>

            <p>
              Please read the information
              before deciding whether to
              participate.
            </p>

          </aside>


          <div class="study-sections">

            <section class="study-info-section">
              <h2>
                კვლევის შესახებ
              </h2>

              <p>
                ${esc(about)}
              </p>
            </section>


            <section class="study-info-section">
              <h2>
                რას გავაკეთებ?
              </h2>

              <p>
                ${esc(procedure)}
              </p>
            </section>


            <section class="study-info-section">
              <h2>
                ვინ შეიძლება მიიღოს მონაწილეობა?
              </h2>

              <p>
                ${esc(eligibility)}
              </p>
            </section>


            <section class="study-info-section">
              <h2>
                მონაცემები და კონფიდენციალურობა
              </h2>

              <p>
                ${esc(privacy)}
              </p>
            </section>


            <div class="study-continue">

              <p>
                შემდეგ ეტაპზე გაეცნობით
                მონაწილეობის ინფორმირებულ თანხმობას.
              </p>

              <a
                class="study-primary"
                href="consent.html?exp=${encodeURIComponent(exp.slug)}"
              >
                თანხმობაზე გადასვლა
                <span aria-hidden="true">
                  →
                </span>
              </a>

            </div>

          </div>

        </section>

      </div>
    `;

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
          კვლევის ინფორმაციის ჩატვირთვა ვერ მოხერხდა:
          ${esc(error.message)}
        </div>
      `;

    }

  }


  boot();

})();
