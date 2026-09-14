(() => {
  const A = document.getElementById('app');
  const badge = document.getElementById('modeBadge');
  const logout = document.getElementById('logoutBtn');

  badge.textContent = CogDB.demo
    ? 'DEMO MODE'
    : 'LIVE / SUPABASE';


  const esc = s =>
    String(s ?? '').replace(
      /[&<>"']/g,
      c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[c])
    );


  const uid = () =>
    crypto.randomUUID();


  const slugify = s =>
    s
      .toLowerCase()
      .trim()
      .replace(
        /[^\p{L}\p{N}]+/gu,
        '-'
      )
      .replace(
        /^-|-$/g,
        ''
      );


  let content;


  const imageMeta = a =>
    new Promise(res => {
      if (
        !(a.type || '')
          .startsWith('image/')
      ) {
        return res(a);
      }

      const im = new Image();

      im.onload = () =>
        res({
          ...a,
          natural_width:
            im.naturalWidth,
          natural_height:
            im.naturalHeight
        });

      im.onerror = () =>
        res(a);

      im.src = a.url;
    });


  const defaultResponses = () => [
    {
      key: '1',
      label: 'მარცხენა დიდია'
    },
    {
      key: '2',
      label: 'ტოლია'
    },
    {
      key: '3',
      label: 'მარჯვენა დიდია'
    }
  ];


  const instruction = (
    title = 'ინსტრუქცია',
    text = '',
    button_text = 'გაგრძელება'
  ) => ({
    id: uid(),
    type: 'instruction',
    title,
    text,
    button_text
  });


  const breakEl = (
    minutes = 0,
    title = 'შუალედი',
    text = ''
  ) => ({
    id: uid(),
    type: 'break',
    duration_ms:
      minutes * 60000,
    title,
    text,
    button_text:
      'გაგრძელება'
  });


  const blankBlock = (
    name = 'Block 1'
  ) => ({
    id: uid(),
    type: 'block',
    name,
    trials: 10,
    exposure_ms: 1000,
    isi_ms: 1000,
    response_window:
      'until_next_stimulus',
    response_window_ms: 2500,
    save: true,
    stimuli: [],
    stimulus_order:
      'sequential',
    presentation: 'single',
    pair_gap_mm: 15,
    fixation: {
      mode: 'red_dot',
      size_mm: 4,
      asset: null
    },
    instructions: '',
    show_instructions: false,
    stop_rule: null,
    adaptive_role: 'none',
    adaptive_direction_a_key:
      '1',
    adaptive_equal_key:
      '2',
    adaptive_direction_b_key:
      '3',
    adaptive_threshold:
      0.70
  });


  /*
    =====================================================
    PARTICIPANT INFORMATION
    =====================================================
  */


  const participantQuestion = (
    type = 'short_text',
    label = ''
  ) => ({
    id: uid(),

    type,

    label,

    required: false,

    placeholder: '',

    options:
      (
        type === 'single_choice' ||
        type === 'multiple_choice' ||
        type === 'dropdown'
      )
        ? [
            'Option 1',
            'Option 2'
          ]
        : []
  });


  const defaultParticipantInfo = () => ({
    enabled: false,

    title:
      'მონაწილის ინფორმაცია',

    introduction:
      'გთხოვთ, შეავსოთ ქვემოთ მოცემული ინფორმაცია ექსპერიმენტის დაწყებამდე.',

    questions: []
  });


  function normalizeParticipantInfo(
    cfg = {}
  ) {
    const saved =
      cfg.participant_info ||
      {};


    const base =
      defaultParticipantInfo();


    const questions =
      Array.isArray(
        saved.questions
      )
        ? saved.questions.map(
            q => ({
              id:
                q.id || uid(),

              type:
                q.type ||
                'short_text',

              label:
                q.label || '',

              required:
                q.required === true,

              placeholder:
                q.placeholder || '',

              options:
                Array.isArray(
                  q.options
                )
                  ? q.options
                  : []
            })
          )
        : [];


    return {
      ...base,
      ...saved,
      questions
    };
  }


  function fixedSetPreset() {
    return {
      template:
        'uznadze_fixed_set',

      responses:
        defaultResponses(),

      completion_message:
        'ექსპერიმენტი დასრულდა. გმადლობთ მონაწილეობისთვის.',

      calibration: {
        enabled: true,
        reference_width_mm:
          85.60,
        reference_label:
          'სტანდარტული საბანკო/ID ბარათი'
      },

      fixed_set: {
        practice_trials: 3,
        control_trials: 15,
        set_trials: 15,

        critical_max_trials:
          40,

        critical_stop_key:
          '2',

        critical_stop_count:
          10,

        exposure_ms: 1000,
        isi_ms: 1500,

        response_window:
          'until_next_stimulus',

        small_mm: 40,
        equal_mm: 60,
        large_mm: 80,

        fixation_mm: 3,
        pair_gap_mm: 15,

        set_stimulus_order:
          'balanced_pseudorandom',

        break_ms: 300000,

        natural_asymmetry_threshold:
          0.70
      },

      participant_info:
        defaultParticipantInfo(),

      elements: [
        instruction(
          'ინსტრუქცია',
          'ეკრანზე გამოჩნდება ფიგურები; ფიგურები შეიძლება იყოს ტოლი ან მათ შორის შეიძლება იყოს განსხვავება. თქვენი ამოცანაა შეადაროთ მათი ზომები ერთმანეთს, დააფიქსიროთ მცირე სხვაობაც კი და კლავიატურის შესაბამის ღილაკზე ხელის დაჭერით უპასუხოთ: თუ მარცხენაა დიდი, აჭერთ კლავიატურაზე „1“-ს; თუ ტოლია, აჭერთ „2“-ს; თუ მარჯვენაა დიდი, აჭერთ „3“-ს. ექსპერიმენტის მიმდინარეობისას უყურეთ წერტილს, რომელიც ეკრანის შუაშია მოცემული. მეორე წყვილის გამოჩენამდე უნდა მოასწროთ პირველის შეფასება და პასუხის გაცემა.'
        ),

        instruction(
          'სავარჯიშო ცდები',
          'ახლა შესრულდება 3 სავარჯიშო ცდა.'
        ),

        {
          id: uid(),
          type:
            'fixedset_stage',
          stage: 'practice',
          name: 'Practice'
        },

        instruction(
          'სავარჯიშო დასრულებულია',
          'სავარჯიშო ნაწილი დასრულებულია. როცა მზად იქნებით, დაიწყეთ ძირითადი ექსპერიმენტი.'
        ),

        {
          id: uid(),
          type:
            'fixedset_stage',
          stage: 'control',
          name: 'Control'
        },

        {
          ...breakEl(
            5,
            '5-წუთიანი შუალედი',
            'გადაერთეთ სხვა აქტივობაზე და ნუ უყურებთ ექსპერიმენტულ სტიმულებს.'
          ),
          role:
            'control_set_break'
        },

        {
          id: uid(),
          type:
            'fixedset_stage',
          stage: 'set',
          name:
            'Set / Induction'
        },

        {
          id: uid(),
          type:
            'fixedset_stage',
          stage: 'critical',
          name: 'Critical'
        }
      ]
    };
  }


  const builtAsset = (
    name,
    type,
    url,
    extra = {}
  ) => ({
    name,
    type,
    url,
    ...extra
  });


  const visualFix = () => ({
    mode: 'red_dot',
    size_mm: 3,
    asset: null
  });


  const noFix = () => ({
    mode: 'none',
    size_mm: 3,
    asset: null
  });


  const adaptiveBlock = (
    name,
    trials,
    stimuli,
    role = 'none',
    save = true,
    fixation = visualFix(),
    exposure_ms = 1000,
    isi_ms = 1500
  ) => ({
    id: uid(),
    type: 'block',
    name,
    trials,
    exposure_ms,
    isi_ms,

    response_window:
      'until_next_stimulus',

    response_window_ms:
      exposure_ms + isi_ms,

    save,
    stimuli,

    stimulus_order:
      'sequential',

    presentation:
      'single',

    pair_gap_mm:
      15,

    fixation,

    instructions:
      '',

    show_instructions:
      false,

    stop_rule:
      null,

    adaptive_role:
      role,

    adaptive_direction_a_key:
      '1',

    adaptive_equal_key:
      '2',

    adaptive_direction_b_key:
      '3',

    adaptive_threshold:
      0.70
  });


  function verticalLinesPreset() {
    const eq =
      builtAsset(
        '01_equal_60_60.png',
        'image/png',
        'assets/stimuli/vertical/01_equal_60_60.png',
        {
          natural_width: 1200,
          natural_height: 1000,
          scale_mode: 'canvas',
          width_mm: 120,
          height_mm: 100,
          lock_aspect: true,

          reference_box: {
            x_pct: 0,
            y_pct: 0,
            w_pct: 100,
            h_pct: 100
          }
        }
      );


    const left =
      builtAsset(
        '02_large_left_80_40.png',
        'image/png',
        'assets/stimuli/vertical/02_large_left_80_40.png',
        {
          natural_width: 1200,
          natural_height: 1000,
          scale_mode: 'canvas',
          width_mm: 120,
          height_mm: 100,
          lock_aspect: true,

          reference_box: {
            x_pct: 0,
            y_pct: 0,
            w_pct: 100,
            h_pct: 100
          }
        }
      );


    const right =
      builtAsset(
        '03_large_right_40_80.png',
        'image/png',
        'assets/stimuli/vertical/03_large_right_40_80.png',
        {
          natural_width: 1200,
          natural_height: 1000,
          scale_mode: 'canvas',
          width_mm: 120,
          height_mm: 100,
          lock_aspect: true,

          reference_box: {
            x_pct: 0,
            y_pct: 0,
            w_pct: 100,
            h_pct: 100
          }
        }
      );


    const practice =
      adaptiveBlock(
        'Practice',
        3,
        [eq],
        'none',
        false,
        visualFix()
      );


    const control =
      adaptiveBlock(
        'Control',
        15,
        [eq],
        'control',
        true,
        visualFix()
      );


    const set =
      adaptiveBlock(
        'Set / Induction',
        15,
        [
          left,
          right
        ],
        'set',
        true,
        visualFix()
      );


    const critical =
      adaptiveBlock(
        'Critical',
        40,
        [eq],
        'critical',
        true,
        visualFix()
      );


    critical.stop_rule = {
      type:
        'consecutive_response',
      key: '2',
      count: 10
    };


    return {
      template:
        'generic',

      preset_kind:
        'vertical_fixed_set',

      responses:
        defaultResponses(),

      completion_message:
        'ექსპერიმენტი დასრულებულია. გმადლობთ მონაწილეობისთვის.',

      calibration: {
        enabled: true,

        reference_width_mm:
          85.60,

        reference_label:
          'სტანდარტული საბანკო/ID ბარათი'
      },

      participant_info:
        defaultParticipantInfo(),

      elements: [
        instruction(
          'ინსტრუქცია',
          'ეკრანზე გამოჩნდება ორი ვერტიკალური ხაზი. ხაზები შეიძლება იყოს ტოლი ან მათ შორის შეიძლება იყოს განსხვავება. შეადარეთ მათი სიმაღლეები ერთმანეთს და დააფიქსირეთ მცირე სხვაობაც კი.\n\n1 — მარცხენა უფრო დიდია\n2 — ტოლია\n3 — მარჯვენა უფრო დიდია\n\nექსპერიმენტის მიმდინარეობისას უყურეთ ეკრანის შუაში მოცემულ წითელ წერტილს.'
        ),

        instruction(
          'სავარჯიშო',
          'ახლა დაიწყება 3 სავარჯიშო ცდა. სავარჯიშო ცდები მონაცემთა ანალიზში არ ჩაითვლება.'
        ),

        practice,

        instruction(
          'სავარჯიშო დასრულებულია',
          'სავარჯიშო დასრულებულია. ახლა დაიწყება ექსპერიმენტის ძირითადი ნაწილი. დავალება იგივე რჩება. როცა მზად იქნებით, დააჭირეთ დაწყებას.',
          'ექსპერიმენტის დაწყება'
        ),

        control,

        breakEl(
          5,
          '5-წუთიანი შუალედი',
          'გადაერთეთ სხვა აქტივობაზე და ნუ უყურებთ ექსპერიმენტულ სტიმულებს.'
        ),

        set,

        critical
      ]
    };
  }
    function auditoryPreset() {
    const eq =
      builtAsset(
        '01_equal_equal.wav',
        'audio/wav',
        'assets/stimuli/auditory/01_equal_equal.wav'
      );


    const loudQuiet =
      builtAsset(
        '02_set_loud_quiet.wav',
        'audio/wav',
        'assets/stimuli/auditory/02_set_loud_quiet.wav'
      );


    const quietLoud =
      builtAsset(
        '03_set_quiet_loud.wav',
        'audio/wav',
        'assets/stimuli/auditory/03_set_quiet_loud.wav'
      );


    const responses = [
      {
        key: '1',
        label:
          'პირველი უფრო ხმამაღალია'
      },

      {
        key: '2',
        label:
          'თანაბრად ხმამაღალია'
      },

      {
        key: '3',
        label:
          'მეორე უფრო ხმამაღალია'
      }
    ];


    const practice =
      adaptiveBlock(
        'Practice',
        3,
        [eq],
        'none',
        false,
        noFix(),
        2500,
        1500
      );


    const control =
      adaptiveBlock(
        'Control',
        15,
        [eq],
        'control',
        true,
        noFix(),
        2500,
        1500
      );


    const set =
      adaptiveBlock(
        'Set / Induction',
        15,
        [
          loudQuiet,
          quietLoud
        ],
        'set',
        true,
        noFix(),
        2500,
        1500
      );


    const critical =
      adaptiveBlock(
        'Critical',
        40,
        [eq],
        'critical',
        true,
        noFix(),
        2500,
        1500
      );


    critical.stop_rule = {
      type:
        'consecutive_response',
      key: '2',
      count: 10
    };


    return {
      template:
        'generic',

      preset_kind:
        'auditory_fixed_set',

      responses,

      completion_message:
        'ექსპერიმენტი დასრულებულია. გმადლობთ მონაწილეობისთვის.',

      calibration: {
        enabled: false,

        reference_width_mm:
          85.60,

        reference_label:
          'სტანდარტული საბანკო/ID ბარათი'
      },

      participant_info:
        defaultParticipantInfo(),

      elements: [
        instruction(
          'ინსტრუქცია',
          'ყურსასმენებში მოისმენთ ერთმანეთის მიყოლებით წარმოდგენილ ორ ბგერას. ბგერები შეიძლება იყოს თანაბრად ხმამაღალი ან მათ ხმამაღლობას შორის შეიძლება იყოს განსხვავება.\n\nთქვენი ამოცანაა შეადაროთ ორი ბგერის ხმამაღლობა ერთმანეთს და დააფიქსიროთ მცირე განსხვავებაც კი.\n\n1 — პირველი ბგერა უფრო ხმამაღალია\n2 — ორივე ბგერა თანაბრად ხმამაღალია\n3 — მეორე ბგერა უფრო ხმამაღალია\n\nყურადღებით მოუსმინეთ ორივე ბგერას და მხოლოდ ამის შემდეგ დააფიქსირეთ პასუხი. ექსპერიმენტის მიმდინარეობისას არ შეცვალოთ მოწყობილობის ხმის დონე.'
        ),

        instruction(
          'სავარჯიშო',
          'ახლა დაიწყება სავარჯიშო ნაწილი. მოისმენთ ერთმანეთის მიყოლებით ორ ბგერას. შეადარეთ მათი ხმამაღლობა და უპასუხეთ 1, 2 ან 3 ღილაკით. სავარჯიშო ცდების შედეგები ექსპერიმენტის მონაცემებში არ ჩაითვლება.'
        ),

        practice,

        instruction(
          'სავარჯიშო დასრულებულია',
          'სავარჯიშო დასრულებულია.\n\nახლა დაიწყება ექსპერიმენტის ძირითადი ნაწილი. დავალება იგივე რჩება:\n\n1 — პირველი ბგერა უფრო ხმამაღალია\n2 — ორივე ბგერა თანაბრად ხმამაღალია\n3 — მეორე ბგერა უფრო ხმამაღალია\n\nექსპერიმენტის განმავლობაში არ შეცვალოთ მოწყობილობის ხმის დონე.',
          'ექსპერიმენტის დაწყება'
        ),

        control,

        breakEl(
          5,
          '5-წუთიანი შუალედი',
          'ექსპერიმენტის შემდეგი ნაწილი დაიწყება 5 წუთის შემდეგ. გთხოვთ, ამ დროის განმავლობაში არ შეცვალოთ მოწყობილობის ხმის დონე.'
        ),

        set,

        critical
      ]
    };
  }


  function presetConfig(
    preset
  ) {
    if (
      preset === 'fixed'
    ) {
      return fixedSetPreset();
    }

    if (
      preset === 'vertical'
    ) {
      return verticalLinesPreset();
    }

    if (
      preset === 'auditory'
    ) {
      return auditoryPreset();
    }

    return {
      template: 'generic',

      responses:
        defaultResponses(),

      calibration: {
        enabled: true,
        reference_width_mm:
          85.60
      },

      participant_info:
        defaultParticipantInfo(),

      elements: [
        instruction(),
        blankBlock()
      ],

      completion_message:
        'გმადლობთ მონაწილეობისთვის.'
    };
  }


  function presetMeta(
    preset,
    cfg
  ) {
    if (
      preset === 'fixed' ||
      cfg?.template ===
        'uznadze_fixed_set'
    ) {
      return {
        name:
          'Uznadze Fixed Set — Circles',
        slug:
          'uznadze-fixed-set-circles'
      };
    }


    if (
      preset === 'vertical' ||
      cfg?.preset_kind ===
        'vertical_fixed_set'
    ) {
      return {
        name:
          'Vertical Lines — Fixed Set',
        slug:
          'vertical-lines-fixed-set'
      };
    }


    if (
      preset === 'auditory' ||
      cfg?.preset_kind ===
        'auditory_fixed_set'
    ) {
      return {
        name:
          'Auditory Fixed Set',
        slug:
          'auditory-fixed-set'
      };
    }


    return {
      name: '',
      slug: ''
    };
  }


  function defaultStudyInfo(
    cfg = {}
  ) {
    const kind =
      cfg?.preset_kind ||
      cfg?.template ||
      '';


    const consent_items = [
      'გავეცანი კვლევის შესახებ ინფორმაციას და მქონდა შესაძლებლობა გამეცნო მონაწილეობის პირობები.',
      'მესმის, რომ კვლევაში მონაწილეობა ნებაყოფლობითია.',
      'ვეთანხმები ჩემი ექსპერიმენტული მონაცემების კვლევითი მიზნებისთვის გამოყენებას.',
      'ვადასტურებ, რომ მსურს ამ კვლევაში მონაწილეობა.'
    ];


    if (
      kind ===
      'auditory_fixed_set'
    ) {
      return {
        category:
          'Auditory Perception',

        duration_minutes:
          13,

        task:
          'Auditory task',

        device:
          'Computer',

        participation:
          'Anonymous',

        summary: '',
        about: '',
        procedure: '',
        eligibility: '',
        privacy: '',
        consent_text: '',
        consent_version: 1,
        consent_items
      };
    }


    if (
      kind ===
      'vertical_fixed_set'
    ) {
      return {
        category:
          'Visual Perception',

        duration_minutes:
          12,

        task:
          'Visual perception task',

        device:
          'Desktop / Laptop',

        participation:
          'Anonymous',

        summary: '',
        about: '',
        procedure: '',
        eligibility: '',
        privacy: '',
        consent_text: '',
        consent_version: 1,
        consent_items
      };
    }


    if (
      kind ===
      'uznadze_fixed_set'
    ) {
      return {
        category:
          'Perception · Fixed Set',

        duration_minutes:
          12,

        task:
          'Visual perception task',

        device:
          'Desktop / Laptop',

        participation:
          'Anonymous',

        summary: '',
        about: '',
        procedure: '',
        eligibility: '',
        privacy: '',
        consent_text: '',
        consent_version: 1,
        consent_items
      };
    }


    return {
      category:
        'Cognitive Experiment',

      duration_minutes:
        '',

      task:
        'Cognitive task',

      device:
        'Computer',

      participation:
        'Anonymous',

      summary: '',
      about: '',
      procedure: '',
      eligibility: '',
      privacy: '',
      consent_text: '',
      consent_version: 1,
      consent_items
    };
  }


  /*
    =====================================================
    ADMIN NAVIGATION / BROWSER HISTORY
    =====================================================
  */


  const ADMIN_HISTORY_KEY =
    'cogexperiments-admin';


  function adminState(
    view = 'experiments',
    arg = null
  ) {
    return {
      app:
        ADMIN_HISTORY_KEY,
      view,
      arg:
        arg ?? null
    };
  }


  function isAdminState(
    state
  ) {
    return (
      state &&
      state.app ===
        ADMIN_HISTORY_KEY
    );
  }


  function currentAdminView() {
    return isAdminState(
      history.state
    )
      ? history.state.view
      : null;
  }


  async function navigate(
    view,
    arg = null
  ) {
    history.pushState(
      adminState(
        view,
        arg
      ),
      '',
      location.href
    );

    await renderRoute(
      view,
      arg
    );
  }


  async function replaceRoute(
    view,
    arg = null
  ) {
    history.replaceState(
      adminState(
        view,
        arg
      ),
      '',
      location.href
    );

    await renderRoute(
      view,
      arg
    );
  }


  async function backToExperiments() {
    if (
      currentAdminView() ===
      'edit'
    ) {
      history.back();
      return;
    }

    await replaceRoute(
      'experiments'
    );
  }


  window.addEventListener(
    'popstate',
    event => {
      if (
        isAdminState(
          event.state
        )
      ) {
        renderRoute(
          event.state.view,
          event.state.arg
        ).catch(
          err => {
            console.error(err);
          }
        );
      }
    }
  );


  async function boot() {
    const u =
      await CogDB.user();


    if (
      !u &&
      !CogDB.demo
    ) {
      return auth();
    }


    if (
      !CogDB.demo &&
      !(await CogDB.admin())
    ) {
      return denied(u);
    }


    if (
      CogDB.demo
    ) {
      const es =
        await CogDB.experiments(
          true
        );


      if (!es.length) {
        const demoCfg =
          fixedSetPreset();


        demoCfg.study_info =
          defaultStudyInfo(
            demoCfg
          );


        demoCfg.participant_info =
          defaultParticipantInfo();


        await CogDB.saveExperiment({
          id: uid(),

          name:
            'Uznadze Fixed Set',

          slug:
            'uznadze-fixed-set',

          description:
            'ფიქსირებული განწყობის ვიზუალური ექსპერიმენტი',

          status:
            'published',

          version: 1,

          config:
            demoCfg,

          created_at:
            new Date()
              .toISOString()
        });
      }
    }


    logout.classList.remove(
      'hidden'
    );


    logout.onclick =
      async () => {
        await CogDB.signOut();
        location.reload();
      };


    shell();


    if (
      !isAdminState(
        history.state
      )
    ) {
      history.replaceState(
        adminState(
          'experiments'
        ),
        '',
        location.href
      );
    }


    const state =
      history.state;


    await renderRoute(
      state.view ||
        'experiments',

      state.arg ?? null
    );
  }


  function auth() {
    A.innerHTML = `
      <section class="card login">

        <h2>
          Admin login
        </h2>

        <div class="field">
          <label>
            Email
          </label>

          <input id="em">
        </div>

        <div class="field">
          <label>
            Password
          </label>

          <input
            id="pw"
            type="password">
        </div>

        <div
          id="err"
          class="alert danger hidden">
        </div>

        <button
          id="authGo"
          class="btn primary">
          შესვლა
        </button>

      </section>
    `;


    const authGo =
      document.getElementById(
        'authGo'
      );


    const em =
      document.getElementById(
        'em'
      );


    const pw =
      document.getElementById(
        'pw'
      );


    const err =
      document.getElementById(
        'err'
      );


    authGo.onclick =
      async () => {
        try {
          await CogDB.signIn(
            em.value.trim(),
            pw.value
          );

          location.reload();
        }

        catch (e) {
          err.textContent =
            e.message;

          err.classList.remove(
            'hidden'
          );
        }
      };
  }


  function denied(u) {
    A.innerHTML = `
      <section class="card login">

        <h2>
          Access denied
        </h2>

        <p>
          ${esc(
            u?.email || ''
          )}
          არ არის Admin სიაში.
        </p>

      </section>
    `;
  }


  function shell() {
    A.innerHTML = `
      <div class="layout">

        <aside class="card sidebar">

          <button
            class="navbtn"
            data-go="experiments">
            Experiments
          </button>

          <button
            class="navbtn"
            data-go="new">
            + Create experiment
          </button>

          <button
            class="navbtn"
            data-go="results">
            Results
          </button>

          <button
            class="navbtn"
            data-go="setup">
            Setup
          </button>

        </aside>

        <section id="content">
        </section>

      </div>
    `;


    content =
      document.getElementById(
        'content'
      );


    document
      .querySelectorAll(
        '[data-go]'
      )
      .forEach(
        b => {
          b.onclick =
            () =>
              navigate(
                b.dataset.go
              );
        }
      );
  }


  async function renderRoute(
    n,
    arg = null
  ) {
    document
      .querySelectorAll(
        '.navbtn'
      )
      .forEach(
        b => {
          b.classList.toggle(
            'active',

            b.dataset.go ===
              (
                n === 'edit' ||
                n === 'builder'
                  ? 'experiments'
                  : n
              )
          );
        }
      );


    if (
      n === 'experiments'
    ) {
      return list();
    }


    if (
      n === 'new'
    ) {
      return chooseNew();
    }


    if (
      n === 'builder'
    ) {
      return builder(
        null,
        arg
      );
    }


    if (
      n === 'edit'
    ) {
      return builder(
        arg
      );
    }


    if (
      n === 'results'
    ) {
      return results();
    }


    if (
      n === 'setup'
    ) {
      return setup();
    }


    return replaceRoute(
      'experiments'
    );
  }
    async function list() {
    const es =
      await CogDB.experiments(
        true
      );


    content.innerHTML = `
      <div class="section-head">

        <div>
          <h2>
            Experiments
          </h2>

          <p class="muted">
            Universal image / audio / video
            experiment builder with calibrated
            visual stimuli.
          </p>
        </div>

        <button
          id="newBtn"
          class="btn primary">
          + Create experiment
        </button>

      </div>


      <div class="table-wrap">

        <table>

          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Study page</th>
              <th></th>
            </tr>
          </thead>

          <tbody>

            ${es
              .map(
                e => `
                  <tr>

                    <td>
                      <b>
                        ${esc(e.name)}
                      </b>

                      <br>

                      <span class="muted">
                        ${esc(e.slug)}
                      </span>
                    </td>

                    <td>
                      ${esc(e.status)}
                    </td>

                    <td>
                      ${
                        e.status ===
                        'published'
                          ? `
                            <a
                              href="study.html?exp=${encodeURIComponent(
                                e.slug
                              )}"
                              target="_blank">
                              Open
                            </a>
                          `
                          : '—'
                      }
                    </td>

                    <td>

                      <button
                        class="btn small"
                        data-edit="${esc(
                          e.id
                        )}">
                        Edit
                      </button>

                      <button
                        class="btn small danger"
                        data-delete="${esc(
                          e.id
                        )}">
                        Delete
                      </button>

                    </td>

                  </tr>
                `
              )
              .join('')}

          </tbody>

        </table>

      </div>
    `;


    document
      .getElementById(
        'newBtn'
      )
      .onclick =
        () =>
          navigate(
            'new'
          );


    document
      .querySelectorAll(
        '[data-edit]'
      )
      .forEach(
        b => {
          b.onclick =
            () =>
              navigate(
                'edit',
                b.dataset.edit
              );
        }
      );


    document
      .querySelectorAll(
        '[data-delete]'
      )
      .forEach(
        b => {
          b.onclick =
            async () => {
              if (
                confirm(
                  'წავშალოთ?'
                )
              ) {
                await CogDB
                  .deleteExperiment(
                    b.dataset.delete
                  );

                await list();
              }
            };
        }
      );
  }


  function chooseNew() {
    content.innerHTML = `
      <div class="grid two">

        <button
          class="choice-card"
          id="blank">

          <h3>
            Blank experiment
          </h3>

          <p>
            Universal image / audio / video
            builder.
          </p>

        </button>


        <button
          class="choice-card"
          id="fixed">

          <h3>
            Fixed Set — Circles
          </h3>

          <p>
            Built-in calibrated
            40/60/80 mm circles.
          </p>

        </button>


        <button
          class="choice-card"
          id="vertical">

          <h3>
            Fixed Set — Vertical Lines
          </h3>

          <p>
            Built-in calibrated
            60/60, 80/40 and 40/80
            line stimuli.
          </p>

        </button>


        <button
          class="choice-card"
          id="auditory">

          <h3>
            Auditory Fixed Set
          </h3>

          <p>
            Built-in verified two-tone
            WAV stimuli with 2:1 digital
            amplitude manipulation.
          </p>

        </button>

      </div>
    `;


    document.getElementById(
      'blank'
    ).onclick =
      () =>
        navigate(
          'builder',
          'blank'
        );


    document.getElementById(
      'fixed'
    ).onclick =
      () =>
        navigate(
          'builder',
          'fixed'
        );


    document.getElementById(
      'vertical'
    ).onclick =
      () =>
        navigate(
          'builder',
          'vertical'
        );


    document.getElementById(
      'auditory'
    ).onclick =
      () =>
        navigate(
          'builder',
          'auditory'
        );
  }


  async function builder(
    id,
    preset
  ) {
    const es =
      await CogDB.experiments(
        true
      );


    const old =
      id
        ? es.find(
            x =>
              x.id === id
          )
        : null;


    let cfg =
      structuredClone(
        old?.config ||
        presetConfig(
          preset
        )
      );


    const pm =
      presetMeta(
        preset,
        cfg
      );


    cfg.calibration =
      cfg.calibration || {
        enabled: true,
        reference_width_mm:
          85.60
      };


    cfg.study_info = {
      ...defaultStudyInfo(
        cfg
      ),

      ...(
        cfg.study_info ||
        {}
      )
    };


    if (
      !Array.isArray(
        cfg.study_info
          .consent_items
      ) ||
      !cfg.study_info
        .consent_items.length
    ) {
      cfg.study_info
        .consent_items =
        defaultStudyInfo(
          cfg
        ).consent_items;
    }


    /*
      Old experiments may not have
      participant_info yet.
    */

    cfg.participant_info =
      normalizeParticipantInfo(
        cfg
      );


    let studyInfo =
      cfg.study_info;


    let participantInfo =
      cfg.participant_info;


    let participantQuestions =
      participantInfo.questions;


    let responses =
      cfg.responses ||
      defaultResponses();


    let elements =
      cfg.elements || [];


    content.innerHTML = `
      <div class="section-head">

        <div>

          <h2>
            ${
              old
                ? 'Edit'
                : 'Create'
            }
            experiment
          </h2>

          <p class="muted">
            Free timeline, image/audio/video stimuli,
            calibrated visual sizing,
            pseudorandom order and research-safe
            response handling.
          </p>

        </div>


        <span class="badge">
          ${
            cfg.template ===
            'uznadze_fixed_set'
              ? 'FIXED SET'
              : 'GENERIC'
          }
        </span>

      </div>


      <div class="grid two">

        <section class="card">

          <h3>
            General
          </h3>


          <div class="field">

            <label>
              Name
            </label>

            <input
              id="nm"
              value="${esc(
                old?.name ||
                pm.name
              )}">

          </div>


          <div class="field">

            <label>
              URL slug
            </label>

            <input
              id="sl"
              value="${esc(
                old?.slug ||
                pm.slug
              )}">

          </div>


          <div class="field">

            <label>
              Description
            </label>

            <textarea id="ds">${esc(
              old?.description ||
              ''
            )}</textarea>

          </div>


          <div class="field">

            <label>
              Completion message
            </label>

            <textarea id="cm">${esc(
              cfg.completion_message ||
              ''
            )}</textarea>

          </div>


          <div class="field">

            <label>
              Status
            </label>

            <select id="st">

              <option
                value="draft"
                ${
                  !old ||
                  old?.status ===
                    'draft'
                    ? 'selected'
                    : ''
                }>
                Draft
              </option>

              <option
                value="published"
                ${
                  old?.status ===
                  'published'
                    ? 'selected'
                    : ''
                }>
                Published
              </option>

              <option
                value="archived"
                ${
                  old?.status ===
                  'archived'
                    ? 'selected'
                    : ''
                }>
                Archived
              </option>

            </select>

          </div>


          <label class="checkline">

            <input
              id="cal_enabled"
              type="checkbox"
              ${
                cfg.calibration
                  .enabled !== false
                  ? 'checked'
                  : ''
              }>

            Physical calibration required

          </label>

        </section>


        <section class="card">

          <div class="section-head">

            <h3>
              Response keys
            </h3>

            <button
              id="addR"
              class="btn small">
              + Add
            </button>

          </div>

          <div id="resp">
          </div>

        </section>

      </div>


      <!-- =================================================
           STUDY INFORMATION
           ================================================= -->

      <section class="card">

        <div class="section-head">

          <div>

            <h3>
              Study Information
            </h3>

            <p class="muted">
              ინფორმაცია, რომელიც გამოჩნდება
              Study Details და Consent გვერდებზე.
            </p>

          </div>

        </div>


        <div class="grid two">

          <div class="field">

            <label>
              Category
            </label>

            <input
              id="si_category"
              value="${esc(
                studyInfo.category ||
                ''
              )}"
              placeholder="e.g. Visual Perception">

          </div>


          <div class="field">

            <label>
              Duration (minutes)
            </label>

            <input
              id="si_duration"
              type="number"
              min="1"
              step="1"
              value="${esc(
                studyInfo.duration_minutes ??
                ''
              )}"
              placeholder="e.g. 10">

          </div>


          <div class="field">

            <label>
              Task
            </label>

            <input
              id="si_task"
              value="${esc(
                studyInfo.task ||
                ''
              )}"
              placeholder="e.g. Visual perception task">

          </div>


          <div class="field">

            <label>
              Device
            </label>

            <input
              id="si_device"
              value="${esc(
                studyInfo.device ||
                ''
              )}"
              placeholder="e.g. Desktop / Laptop">

          </div>


          <div class="field">

            <label>
              Participation
            </label>

            <input
              id="si_participation"
              value="${esc(
                studyInfo.participation ||
                ''
              )}"
              placeholder="e.g. Anonymous">

          </div>


          <div class="field">

            <label>
              Consent version
            </label>

            <input
              id="si_consent_version"
              type="number"
              min="1"
              step="1"
              value="${esc(
                studyInfo.consent_version ??
                1
              )}">

          </div>

        </div>


        <div class="field">

          <label>
            Summary
          </label>

          <textarea
            id="si_summary"
            placeholder="მოკლე აღწერა, რომელიც გამოჩნდება კვლევის სათაურის ქვეშ.">${esc(
              studyInfo.summary ||
              ''
            )}</textarea>

        </div>


        <div class="field">

          <label>
            About this study
          </label>

          <textarea
            id="si_about"
            placeholder="კვლევის მიზანი და ზოგადი აღწერა.">${esc(
              studyInfo.about ||
              ''
            )}</textarea>

        </div>


        <div class="field">

          <label>
            Procedure / What will participants do?
          </label>

          <textarea
            id="si_procedure"
            placeholder="რას გააკეთებს მონაწილე ექსპერიმენტის დროს?">${esc(
              studyInfo.procedure ||
              ''
            )}</textarea>

        </div>


        <div class="field">

          <label>
            Eligibility
          </label>

          <textarea
            id="si_eligibility"
            placeholder="ვინ შეიძლება მიიღოს მონაწილეობა?">${esc(
              studyInfo.eligibility ||
              ''
            )}</textarea>

        </div>


        <div class="field">

          <label>
            Privacy / Data handling
          </label>

          <textarea
            id="si_privacy"
            placeholder="რა მონაცემები გროვდება და როგორ გამოიყენება?">${esc(
              studyInfo.privacy ||
              ''
            )}</textarea>

        </div>


        <div class="field">

          <label>
            Informed consent text
          </label>

          <textarea
            id="si_consent_text"
            placeholder="ინფორმირებული თანხმობის ძირითადი ტექსტი.">${esc(
              studyInfo.consent_text ||
              ''
            )}</textarea>

        </div>


        <div class="field">

          <label>
            Consent checkbox 1
          </label>

          <textarea
            id="si_consent_1">${esc(
              studyInfo
                .consent_items?.[0] ||
              ''
            )}</textarea>

        </div>


        <div class="field">

          <label>
            Consent checkbox 2
          </label>

          <textarea
            id="si_consent_2">${esc(
              studyInfo
                .consent_items?.[1] ||
              ''
            )}</textarea>

        </div>


        <div class="field">

          <label>
            Consent checkbox 3
          </label>

          <textarea
            id="si_consent_3">${esc(
              studyInfo
                .consent_items?.[2] ||
              ''
            )}</textarea>

        </div>


        <div class="field">

          <label>
            Consent checkbox 4
          </label>

          <textarea
            id="si_consent_4">${esc(
              studyInfo
                .consent_items?.[3] ||
              ''
            )}</textarea>

        </div>

      </section>


      <!-- =================================================
           PARTICIPANT INFORMATION
           ================================================= -->

      <section class="card">

        <div class="section-head">

          <div>

            <h3>
              Participant Information
            </h3>

            <p class="muted">
              შექმენი კითხვები, რომლებიც მონაწილემ
              ექსპერიმენტის დაწყებამდე უნდა შეავსოს.
            </p>

          </div>


          <button
            id="addParticipantQuestion"
            class="btn small">
            + Add question
          </button>

        </div>


        <label class="checkline">

          <input
            id="pi_enabled"
            type="checkbox"
            ${
              participantInfo.enabled
                ? 'checked'
                : ''
            }>

          Collect participant information

        </label>


        <div class="grid two">

          <div class="field">

            <label>
              Page title
            </label>

            <input
              id="pi_title"
              value="${esc(
                participantInfo.title ||
                ''
              )}">

          </div>

        </div>


        <div class="field">

          <label>
            Introduction
          </label>

          <textarea
            id="pi_intro">${esc(
              participantInfo.introduction ||
              ''
            )}</textarea>

        </div>


        <div id="participantQuestions">
        </div>

      </section>


      ${
        cfg.template ===
        'uznadze_fixed_set'
          ? fixedHTML(
              cfg.fixed_set
            )
          : ''
      }


      <div
        class="section-head timeline-head">

        <div>

          <h2>
            Experiment timeline
          </h2>

          <p class="muted">
            Instruction / Block / Break —
            შენს მიერ არჩეული რიგით.
          </p>

        </div>


        <div class="row">

          <button
            id="addI"
            class="btn">
            + Instruction
          </button>

          <button
            id="addB"
            class="btn">
            + Block
          </button>

          <button
            id="addBreak"
            class="btn">
            + Break
          </button>

        </div>

      </div>


      <div id="elements">
      </div>


      <div class="row">

        <button
          id="save"
          class="btn primary">
          Save experiment
        </button>

        <button
          id="cancel"
          class="btn">
          Cancel
        </button>

      </div>
    `;


    const nm =
      document.getElementById(
        'nm'
      );


    const sl =
      document.getElementById(
        'sl'
      );


    const ds =
      document.getElementById(
        'ds'
      );


    const cm =
      document.getElementById(
        'cm'
      );


    const st =
      document.getElementById(
        'st'
      );


    const cal_enabled =
      document.getElementById(
        'cal_enabled'
      );


    const si_category =
      document.getElementById(
        'si_category'
      );


    const si_duration =
      document.getElementById(
        'si_duration'
      );


    const si_task =
      document.getElementById(
        'si_task'
      );


    const si_device =
      document.getElementById(
        'si_device'
      );


    const si_participation =
      document.getElementById(
        'si_participation'
      );


    const si_consent_version =
      document.getElementById(
        'si_consent_version'
      );


    const si_summary =
      document.getElementById(
        'si_summary'
      );


    const si_about =
      document.getElementById(
        'si_about'
      );


    const si_procedure =
      document.getElementById(
        'si_procedure'
      );


    const si_eligibility =
      document.getElementById(
        'si_eligibility'
      );


    const si_privacy =
      document.getElementById(
        'si_privacy'
      );


    const si_consent_text =
      document.getElementById(
        'si_consent_text'
      );


    const si_consent_1 =
      document.getElementById(
        'si_consent_1'
      );


    const si_consent_2 =
      document.getElementById(
        'si_consent_2'
      );


    const si_consent_3 =
      document.getElementById(
        'si_consent_3'
      );


    const si_consent_4 =
      document.getElementById(
        'si_consent_4'
      );


    const pi_enabled =
      document.getElementById(
        'pi_enabled'
      );


    const pi_title =
      document.getElementById(
        'pi_title'
      );


    const pi_intro =
      document.getElementById(
        'pi_intro'
      );


    const addParticipantQuestion =
      document.getElementById(
        'addParticipantQuestion'
      );


    const participantQuestionsBox =
      document.getElementById(
        'participantQuestions'
      );


    const addR =
      document.getElementById(
        'addR'
      );


    const addI =
      document.getElementById(
        'addI'
      );


    const addB =
      document.getElementById(
        'addB'
      );


    const addBreak =
      document.getElementById(
        'addBreak'
      );


    const cancel =
      document.getElementById(
        'cancel'
      );
        nm.oninput =
      () => {
        if (
          !old &&
          !sl.dataset.touched
        ) {
          sl.value =
            slugify(
              nm.value
            );
        }
      };


    sl.oninput =
      () => {
        sl.dataset.touched =
          '1';
      };


    addR.onclick =
      () => {
        responses.push({
          key: '',
          label: ''
        });

        renderResponses();
      };


    addI.onclick =
      () => {
        elements.push(
          instruction()
        );

        renderElements();
      };


    addB.onclick =
      () => {
        elements.push(
          blankBlock(
            `Block ${
              elements.filter(
                e =>
                  e.type ===
                  'block'
              ).length + 1
            }`
          )
        );

        renderElements();
      };


    addBreak.onclick =
      () => {
        elements.push(
          breakEl()
        );

        renderElements();
      };


    addParticipantQuestion.onclick =
      () => {
        participantQuestions.push(
          participantQuestion()
        );

        renderParticipantQuestions();
      };


    cancel.onclick =
      () =>
        backToExperiments();


    /*
      =====================================================
      PARTICIPANT QUESTION BUILDER
      =====================================================
    */


    function questionUsesOptions(
      type
    ) {
      return (
        type ===
          'single_choice' ||
        type ===
          'multiple_choice' ||
        type ===
          'dropdown'
      );
    }


    function questionTypeLabel(
      type
    ) {
      if (
        type ===
        'number'
      ) {
        return 'Number';
      }


      if (
        type ===
        'single_choice'
      ) {
        return 'Single choice';
      }


      if (
        type ===
        'multiple_choice'
      ) {
        return 'Multiple choice';
      }


      if (
        type ===
        'dropdown'
      ) {
        return 'Dropdown';
      }


      return 'Short text';
    }


    function participantQuestionHTML(
      q,
      i
    ) {
      const usesOptions =
        questionUsesOptions(
          q.type
        );


      return `
        <section
          class="card element-card"
          data-pq-card="${i}">

          <div class="section-head">

            <div>

              <h3>
                QUESTION ${i + 1}
              </h3>

              <p class="muted">
                ${esc(
                  questionTypeLabel(
                    q.type
                  )
                )}
              </p>

            </div>


            <div class="row">

              <button
                type="button"
                class="btn small"
                data-pq-up="${i}"
                ${
                  i === 0
                    ? 'disabled'
                    : ''
                }>
                ↑
              </button>

              <button
                type="button"
                class="btn small"
                data-pq-down="${i}"
                ${
                  i ===
                  participantQuestions.length -
                    1
                    ? 'disabled'
                    : ''
                }>
                ↓
              </button>

              <button
                type="button"
                class="btn small danger"
                data-pq-delete="${i}">
                Remove
              </button>

            </div>

          </div>


          <div class="grid two">

            <div class="field">

              <label>
                Question type
              </label>

              <select
                data-pq-type="${i}">

                <option
                  value="short_text"
                  ${
                    q.type ===
                    'short_text'
                      ? 'selected'
                      : ''
                  }>
                  Short text
                </option>

                <option
                  value="number"
                  ${
                    q.type ===
                    'number'
                      ? 'selected'
                      : ''
                  }>
                  Number
                </option>

                <option
                  value="single_choice"
                  ${
                    q.type ===
                    'single_choice'
                      ? 'selected'
                      : ''
                  }>
                  Single choice
                </option>

                <option
                  value="multiple_choice"
                  ${
                    q.type ===
                    'multiple_choice'
                      ? 'selected'
                      : ''
                  }>
                  Multiple choice
                </option>

                <option
                  value="dropdown"
                  ${
                    q.type ===
                    'dropdown'
                      ? 'selected'
                      : ''
                  }>
                  Dropdown
                </option>

              </select>

            </div>


            <div class="field">

              <label>
                Required
              </label>

              <label class="checkline">

                <input
                  type="checkbox"
                  data-pq-required="${i}"
                  ${
                    q.required
                      ? 'checked'
                      : ''
                  }>

                Participant must answer

              </label>

            </div>

          </div>


          <div class="field">

            <label>
              Question
            </label>

            <input
              data-pq-label="${i}"
              value="${esc(
                q.label ||
                ''
              )}"
              placeholder="e.g. რამდენი წლის ხართ?">

          </div>


          ${
            (
              q.type ===
                'short_text' ||
              q.type ===
                'number'
            )
              ? `
                <div class="field">

                  <label>
                    Placeholder
                  </label>

                  <input
                    data-pq-placeholder="${i}"
                    value="${esc(
                      q.placeholder ||
                      ''
                    )}"
                    placeholder="Optional">

                </div>
              `
              : ''
          }


          ${
            usesOptions
              ? `
                <div class="field">

                  <label>
                    Answer options
                  </label>

                  <p class="muted">
                    თითო ვარიანტი ცალკე ხაზზე.
                  </p>

                  <textarea
                    data-pq-options="${i}"
                    placeholder="Option 1&#10;Option 2">${esc(
                      (
                        q.options ||
                        []
                      ).join(
                        '\n'
                      )
                    )}</textarea>

                </div>
              `
              : ''
          }

        </section>
      `;
    }


    function renderParticipantQuestions() {
      if (
        !participantQuestionsBox
      ) {
        return;
      }


      if (
        !participantQuestions.length
      ) {
        participantQuestionsBox
          .innerHTML = `
            <div
              class="muted-panel"
              style="
                margin-top:16px;
                padding:16px;
              ">

              <p class="muted">
                ჯერ არცერთი კითხვა არ არის დამატებული.
                დააჭირე “+ Add question”.
              </p>

            </div>
          `;

        return;
      }


      participantQuestionsBox
        .innerHTML =
        participantQuestions
          .map(
            participantQuestionHTML
          )
          .join('');


      document
        .querySelectorAll(
          '[data-pq-type]'
        )
        .forEach(
          input => {
            input.onchange =
              () => {
                const i =
                  +input.dataset
                    .pqType;


                const q =
                  participantQuestions[
                    i
                  ];


                q.type =
                  input.value;


                if (
                  questionUsesOptions(
                    q.type
                  ) &&
                  (
                    !Array.isArray(
                      q.options
                    ) ||
                    !q.options.length
                  )
                ) {
                  q.options = [
                    'Option 1',
                    'Option 2'
                  ];
                }


                if (
                  !questionUsesOptions(
                    q.type
                  )
                ) {
                  q.options = [];
                }


                renderParticipantQuestions();
              };
          }
        );


      document
        .querySelectorAll(
          '[data-pq-label]'
        )
        .forEach(
          input => {
            input.oninput =
              () => {
                participantQuestions[
                  +input.dataset
                    .pqLabel
                ].label =
                  input.value;
              };
          }
        );


      document
        .querySelectorAll(
          '[data-pq-required]'
        )
        .forEach(
          input => {
            input.onchange =
              () => {
                participantQuestions[
                  +input.dataset
                    .pqRequired
                ].required =
                  input.checked;
              };
          }
        );


      document
        .querySelectorAll(
          '[data-pq-placeholder]'
        )
        .forEach(
          input => {
            input.oninput =
              () => {
                participantQuestions[
                  +input.dataset
                    .pqPlaceholder
                ].placeholder =
                  input.value;
              };
          }
        );


      document
        .querySelectorAll(
          '[data-pq-options]'
        )
        .forEach(
          input => {
            input.oninput =
              () => {
                participantQuestions[
                  +input.dataset
                    .pqOptions
                ].options =
                  input.value
                    .split('\n')
                    .map(
                      x =>
                        x.trim()
                    )
                    .filter(Boolean);
              };
          }
        );


      document
        .querySelectorAll(
          '[data-pq-delete]'
        )
        .forEach(
          button => {
            button.onclick =
              () => {
                participantQuestions
                  .splice(
                    +button.dataset
                      .pqDelete,
                    1
                  );

                renderParticipantQuestions();
              };
          }
        );


      document
        .querySelectorAll(
          '[data-pq-up]'
        )
        .forEach(
          button => {
            button.onclick =
              () => {
                const i =
                  +button.dataset
                    .pqUp;


                if (
                  i <= 0
                ) {
                  return;
                }


                [
                  participantQuestions[
                    i - 1
                  ],
                  participantQuestions[
                    i
                  ]
                ] = [
                  participantQuestions[
                    i
                  ],
                  participantQuestions[
                    i - 1
                  ]
                ];


                renderParticipantQuestions();
              };
          }
        );


      document
        .querySelectorAll(
          '[data-pq-down]'
        )
        .forEach(
          button => {
            button.onclick =
              () => {
                const i =
                  +button.dataset
                    .pqDown;


                if (
                  i >=
                  participantQuestions
                    .length - 1
                ) {
                  return;
                }


                [
                  participantQuestions[
                    i
                  ],
                  participantQuestions[
                    i + 1
                  ]
                ] = [
                  participantQuestions[
                    i + 1
                  ],
                  participantQuestions[
                    i
                  ]
                ];


                renderParticipantQuestions();
              };
          }
        );
    }


    function fixedHTML(
      fs = {}
    ) {
      return `
        <section
          class="card preset-settings">

          <h3>
            Fixed Set scientific settings
          </h3>


          <div class="inline">

            <div class="field">
              <label>
                Practice
              </label>

              <input
                id="fs_practice"
                type="number"
                min="1"
                max="3"
                value="${
                  fs.practice_trials ??
                  3
                }">
            </div>


            <div class="field">
              <label>
                Control
              </label>

              <input
                id="fs_control"
                type="number"
                min="15"
                value="${
                  fs.control_trials ??
                  15
                }">
            </div>


            <div class="field">
              <label>
                Set
              </label>

              <input
                id="fs_set"
                type="number"
                value="${
                  fs.set_trials ??
                  15
                }">
            </div>

          </div>


          <div class="inline">

            <div class="field">
              <label>
                Critical max
              </label>

              <input
                id="fs_critical"
                type="number"
                max="40"
                value="${
                  fs.critical_max_trials ??
                  40
                }">
            </div>


            <div class="field">
              <label>
                Consecutive equal stop
              </label>

              <input
                id="fs_stop"
                type="number"
                value="${
                  fs.critical_stop_count ??
                  10
                }">
            </div>


            <div class="field">
              <label>
                Asymmetry threshold
              </label>

              <input
                id="fs_threshold"
                type="number"
                step=".01"
                value="${
                  fs.natural_asymmetry_threshold ??
                  0.70
                }">
            </div>

          </div>


          <div class="inline">

            <div class="field">
              <label>
                Exposure ms
              </label>

              <input
                id="fs_exposure"
                type="number"
                value="${
                  fs.exposure_ms ??
                  1000
                }">
            </div>


            <div class="field">
              <label>
                ISI ms
              </label>

              <input
                id="fs_isi"
                type="number"
                value="${
                  fs.isi_ms ??
                  1500
                }">
            </div>


            <div class="field">
              <label>
                Break sec
              </label>

              <input
                id="fs_break"
                type="number"
                value="${
                  (
                    fs.break_ms ??
                    300000
                  ) / 1000
                }">
            </div>

          </div>


          <div class="inline">

            <div class="field">
              <label>
                Set variation order
              </label>

              <select id="fs_set_order">
                <option
                  value="balanced_pseudorandom"
                  ${
                    (
                      fs.set_stimulus_order ||
                      'balanced_pseudorandom'
                    ) ===
                    'balanced_pseudorandom'
                      ? 'selected'
                      : ''
                  }>
                  Balanced pseudorandom
                </option>

                <option
                  value="fixed_left"
                  ${
                    fs.set_stimulus_order ===
                    'fixed_left'
                      ? 'selected'
                      : ''
                  }>
                  Fixed — large left
                </option>

                <option
                  value="fixed_right"
                  ${
                    fs.set_stimulus_order ===
                    'fixed_right'
                      ? 'selected'
                      : ''
                  }>
                  Fixed — large right
                </option>
              </select>
            </div>


            <div class="field">
              <label>
                Critical stop key
              </label>

              <input
                id="fs_stop_key"
                type="text"
                value="${
                  esc(
                    fs.critical_stop_key ??
                    '2'
                  )
                }">
            </div>

          </div>


          <div class="inline">

            <div class="field">
              <label>
                Fixation mm
              </label>

              <input
                id="fs_fixation"
                type="number"
                step=".1"
                value="${
                  fs.fixation_mm ??
                  3
                }">
            </div>


            <div class="field">
              <label>
                Pair gap mm
              </label>

              <input
                id="fs_gap"
                type="number"
                step=".1"
                value="${
                  fs.pair_gap_mm ??
                  15
                }">
            </div>

          </div>


          <div class="inline">

            <div class="field">
              <label>
                Small mm
              </label>

              <input
                id="fs_small"
                type="number"
                value="${
                  fs.small_mm ??
                  40
                }">
            </div>


            <div class="field">
              <label>
                Equal mm
              </label>

              <input
                id="fs_equal"
                type="number"
                value="${
                  fs.equal_mm ??
                  60
                }">
            </div>


            <div class="field">
              <label>
                Large mm
              </label>

              <input
                id="fs_large"
                type="number"
                value="${
                  fs.large_mm ??
                  80
                }">
            </div>

          </div>


          <p class="muted">
            <b>Response window:</b>
            stimulus onset → next stimulus onset.
            ISI-ში დაჭერილი პასუხი წინა
            trial-ს ეკუთვნის.
          </p>

        </section>
      `;
    }


    function renderResponses() {
      const resp =
        document.getElementById(
          'resp'
        );


      resp.innerHTML =
        responses
          .map(
            (r, i) => `
              <div class="row">

                <input
                  style="width:90px"
                  data-rk="${i}"
                  value="${esc(r.key)}">

                <input
                  style="flex:1"
                  data-rl="${i}"
                  value="${esc(r.label)}">

                <button
                  class="btn small"
                  data-rd="${i}">
                  ×
                </button>

              </div>

              <br>
            `
          )
          .join('');


      document
        .querySelectorAll(
          '[data-rk]'
        )
        .forEach(
          x => {
            x.oninput =
              () => {
                responses[
                  +x.dataset.rk
                ].key =
                  x.value;
              };
          }
        );


      document
        .querySelectorAll(
          '[data-rl]'
        )
        .forEach(
          x => {
            x.oninput =
              () => {
                responses[
                  +x.dataset.rl
                ].label =
                  x.value;
              };
          }
        );


      document
        .querySelectorAll(
          '[data-rd]'
        )
        .forEach(
          x => {
            x.onclick =
              () => {
                responses.splice(
                  +x.dataset.rd,
                  1
                );

                renderResponses();
              };
          }
        );
    }


    renderResponses();
    renderParticipantQuestions();
        function stimHTML(
      s,
      i,
      j
    ) {
      const visual =
        (s.type || '')
          .startsWith(
            'image/'
          );


      s.scale_mode =
        s.scale_mode ||
        'canvas';


      s.reference_box =
        s.reference_box || {
          x_pct: 0,
          y_pct: 0,
          w_pct: 100,
          h_pct: 100
        };


      const box =
        s.reference_box;


      const ar =
        s.natural_width &&
        s.natural_height
          ? `style="aspect-ratio:${s.natural_width}/${s.natural_height};height:auto"`
          : '';


      return `
        <div class="stim-card">

          ${
            visual
              ? `
                <div
                  class="stim-preview-wrap"
                  ${ar}>

                  <img
                    src="${s.url}"
                    class="stim-preview">

                  <div
                    class="ref-box"
                    style="
                      left:${
                        box.x_pct || 0
                      }%;
                      top:${
                        box.y_pct || 0
                      }%;
                      width:${
                        box.w_pct || 100
                      }%;
                      height:${
                        box.h_pct || 100
                      }%;
                    ">
                  </div>

                </div>
              `
              : `
                <div class="stim-file-icon">
                  ${esc(
                    (
                      s.type ||
                      'file'
                    ).split('/')[0]
                  )}
                </div>
              `
          }


          <div class="stim-meta">

            <b>
              ${esc(s.name)}
            </b>


            ${
              visual
                ? `
                  <div
                    class="field compact">

                    <label>
                      Physical scaling
                    </label>

                    <select
                      data-stimstr="${i}:${j}"
                      data-sk="scale_mode">

                      <option
                        value="canvas"
                        ${
                          s.scale_mode !==
                          'reference_box'
                            ? 'selected'
                            : ''
                        }>
                        Whole image canvas
                      </option>

                      <option
                        value="reference_box"
                        ${
                          s.scale_mode ===
                          'reference_box'
                            ? 'selected'
                            : ''
                        }>
                        Measured object / reference box
                      </option>

                    </select>

                  </div>


                  <div
                    class="stim-section ${
                      s.scale_mode ===
                      'reference_box'
                        ? 'muted-panel'
                        : ''
                    }">

                    <b>
                      Whole canvas size
                    </b>

                    <div class="stim-dims">

                      <label>
                        Width mm

                        <input
                          type="number"
                          step=".1"
                          min="0"
                          data-stim="${i}:${j}"
                          data-sk="width_mm"
                          value="${
                            s.width_mm ??
                            ''
                          }"
                          placeholder="auto">
                      </label>


                      <label>
                        Height mm

                        <input
                          type="number"
                          step=".1"
                          min="0"
                          data-stim="${i}:${j}"
                          data-sk="height_mm"
                          value="${
                            s.height_mm ??
                            ''
                          }"
                          placeholder="auto">
                      </label>

                    </div>

                  </div>


                  <div class="stim-section">

                    <b>
                      Reference box inside image
                    </b>

                    <p class="muted">
                      მონიშნე stimulus-ის ის ნაწილი,
                      რომლის რეალური ზომაც იცი.
                      მნიშვნელობები არის image-ის
                      პროცენტები.
                    </p>


                    <div class="ref-grid">

                      <label>
                        X %

                        <input
                          type="number"
                          step=".1"
                          data-box="${i}:${j}"
                          data-bk="x_pct"
                          value="${
                            box.x_pct ??
                            0
                          }">
                      </label>


                      <label>
                        Y %

                        <input
                          type="number"
                          step=".1"
                          data-box="${i}:${j}"
                          data-bk="y_pct"
                          value="${
                            box.y_pct ??
                            0
                          }">
                      </label>


                      <label>
                        W %

                        <input
                          type="number"
                          step=".1"
                          min=".1"
                          max="100"
                          data-box="${i}:${j}"
                          data-bk="w_pct"
                          value="${
                            box.w_pct ??
                            100
                          }">
                      </label>


                      <label>
                        H %

                        <input
                          type="number"
                          step=".1"
                          min=".1"
                          max="100"
                          data-box="${i}:${j}"
                          data-bk="h_pct"
                          value="${
                            box.h_pct ??
                            100
                          }">
                      </label>

                    </div>


                    <div class="stim-dims">

                      <label>
                        Reference width mm

                        <input
                          type="number"
                          step=".1"
                          min="0"
                          data-stim="${i}:${j}"
                          data-sk="reference_width_mm"
                          value="${
                            s.reference_width_mm ??
                            ''
                          }"
                          placeholder="optional">
                      </label>


                      <label>
                        Reference height mm

                        <input
                          type="number"
                          step=".1"
                          min="0"
                          data-stim="${i}:${j}"
                          data-sk="reference_height_mm"
                          value="${
                            s.reference_height_mm ??
                            ''
                          }"
                          placeholder="optional">
                      </label>

                    </div>


                    <p class="muted">
                      Reference Box რეჟიმში
                      საკმარისია ერთი რეალური
                      განზომილება
                      (მაგ. ხაზის სიმაღლე 60 mm).
                      image-ის დანარჩენი გეომეტრია
                      იგივე მასშტაბით დარჩება.
                    </p>

                  </div>


                  <label class="checkline">

                    <input
                      type="checkbox"
                      data-stim="${i}:${j}"
                      data-sk="lock_aspect"
                      ${
                        s.lock_aspect !==
                        false
                          ? 'checked'
                          : ''
                      }>

                    Lock aspect ratio

                  </label>
                `
                : ''
            }


            <button
              class="btn small danger"
              data-remstim="${i}:${j}">
              Remove
            </button>

          </div>

        </div>
      `;
    }


    function elementHTML(
      e,
      i
    ) {
      const tools = `
        <div class="element-tools">

          <button
            class="btn small"
            data-up="${i}">
            ↑
          </button>

          <button
            class="btn small"
            data-down="${i}">
            ↓
          </button>

          <button
            class="btn small danger"
            data-del="${i}">
            Remove
          </button>

        </div>
      `;


      if (
        e.type ===
        'instruction'
      ) {
        return `
          <section
            class="card element-card">

            <div class="section-head">

              <h3>
                INSTRUCTION —
                ${esc(e.title)}
              </h3>

              ${tools}

            </div>


            <div class="field">

              <label>
                Title
              </label>

              <input
                data-el="${i}"
                data-k="title"
                value="${esc(
                  e.title
                )}">

            </div>


            <div class="field">

              <label>
                Text
              </label>

              <textarea
                class="instruction-editor"
                data-el="${i}"
                data-k="text">${esc(
                  e.text
                )}</textarea>

            </div>


            <div class="field">

              <label>
                Button
              </label>

              <input
                data-el="${i}"
                data-k="button_text"
                value="${esc(
                  e.button_text ||
                  'გაგრძელება'
                )}">

            </div>

          </section>
        `;
      }


      if (
        e.type ===
        'break'
      ) {
        return `
          <section
            class="card element-card">

            <div class="section-head">

              <h3>
                BREAK —
                ${esc(e.title)}
              </h3>

              ${tools}

            </div>


            <div class="inline">

              <div class="field">

                <label>
                  Title
                </label>

                <input
                  data-el="${i}"
                  data-k="title"
                  value="${esc(
                    e.title
                  )}">

              </div>


              <div class="field">

                <label>
                  Duration sec
                </label>

                <input
                  type="number"
                  data-el="${i}"
                  data-k="duration_sec"
                  value="${
                    (
                      e.duration_ms ||
                      0
                    ) / 1000
                  }">

              </div>


              <div class="field">

                <label>
                  Button
                </label>

                <input
                  data-el="${i}"
                  data-k="button_text"
                  value="${esc(
                    e.button_text ||
                    'გაგრძელება'
                  )}">

              </div>

            </div>


            <div class="field">

              <label>
                Message
              </label>

              <textarea
                data-el="${i}"
                data-k="text">${esc(
                  e.text ||
                  ''
                )}</textarea>

            </div>

          </section>
        `;
      }


      if (
        e.type ===
        'fixedset_stage'
      ) {
        const fs =
          cfg.fixed_set || {};

        let stageFields = '';

        if (
          e.stage ===
          'practice'
        ) {
          stageFields = `
            <div class="grid two">

              <div class="field">
                <label>
                  Trials
                </label>

                <input
                  data-fixed-stage-field="practice_trials"
                  data-fixed-stage-type="number"
                  type="number"
                  min="1"
                  max="3"
                  value="${
                    fs.practice_trials ??
                    3
                  }">
              </div>

              <div class="field">
                <label>
                  Stimulus
                </label>

                <input
                  value="Equal circles"
                  disabled>
              </div>

            </div>
          `;
        }

        else if (
          e.stage ===
          'control'
        ) {
          stageFields = `
            <div class="grid two">

              <div class="field">
                <label>
                  Trials
                </label>

                <input
                  data-fixed-stage-field="control_trials"
                  data-fixed-stage-type="number"
                  type="number"
                  min="1"
                  value="${
                    fs.control_trials ??
                    15
                  }">
              </div>

              <div class="field">
                <label>
                  Equal circle size (mm)
                </label>

                <input
                  data-fixed-stage-field="equal_mm"
                  data-fixed-stage-type="number"
                  type="number"
                  step=".1"
                  value="${
                    fs.equal_mm ??
                    60
                  }">
              </div>

            </div>
          `;
        }

        else if (
          e.stage ===
          'set'
        ) {
          stageFields = `
            <div class="grid two">

              <div class="field">
                <label>
                  Trials
                </label>

                <input
                  data-fixed-stage-field="set_trials"
                  data-fixed-stage-type="number"
                  type="number"
                  min="1"
                  value="${
                    fs.set_trials ??
                    15
                  }">
              </div>

              <div class="field">
                <label>
                  Variation order
                </label>

                <select
                  data-fixed-stage-field="set_stimulus_order">

                  <option
                    value="balanced_pseudorandom"
                    ${
                      (
                        fs.set_stimulus_order ||
                        'balanced_pseudorandom'
                      ) ===
                      'balanced_pseudorandom'
                        ? 'selected'
                        : ''
                    }>
                    Balanced pseudorandom
                  </option>

                  <option
                    value="fixed_left"
                    ${
                      fs.set_stimulus_order ===
                      'fixed_left'
                        ? 'selected'
                        : ''
                    }>
                    Fixed — large left
                  </option>

                  <option
                    value="fixed_right"
                    ${
                      fs.set_stimulus_order ===
                      'fixed_right'
                        ? 'selected'
                        : ''
                    }>
                    Fixed — large right
                  </option>

                </select>
              </div>

              <div class="field">
                <label>
                  Small circle (mm)
                </label>

                <input
                  data-fixed-stage-field="small_mm"
                  data-fixed-stage-type="number"
                  type="number"
                  step=".1"
                  value="${
                    fs.small_mm ??
                    40
                  }">
              </div>

              <div class="field">
                <label>
                  Large circle (mm)
                </label>

                <input
                  data-fixed-stage-field="large_mm"
                  data-fixed-stage-type="number"
                  type="number"
                  step=".1"
                  value="${
                    fs.large_mm ??
                    80
                  }">
              </div>

            </div>
          `;
        }

        else if (
          e.stage ===
          'critical'
        ) {
          stageFields = `
            <div class="grid two">

              <div class="field">
                <label>
                  Maximum trials
                </label>

                <input
                  data-fixed-stage-field="critical_max_trials"
                  data-fixed-stage-type="number"
                  type="number"
                  min="1"
                  max="40"
                  value="${
                    fs.critical_max_trials ??
                    40
                  }">
              </div>

              <div class="field">
                <label>
                  Equal circle size (mm)
                </label>

                <input
                  data-fixed-stage-field="equal_mm"
                  data-fixed-stage-type="number"
                  type="number"
                  step=".1"
                  value="${
                    fs.equal_mm ??
                    60
                  }">
              </div>

              <div class="field">
                <label>
                  Stop after consecutive responses
                </label>

                <input
                  data-fixed-stage-field="critical_stop_count"
                  data-fixed-stage-type="number"
                  type="number"
                  min="1"
                  value="${
                    fs.critical_stop_count ??
                    10
                  }">
              </div>

              <div class="field">
                <label>
                  Stop response key
                </label>

                <input
                  data-fixed-stage-field="critical_stop_key"
                  value="${esc(
                    fs.critical_stop_key ??
                    '2'
                  )}">
              </div>

            </div>
          `;
        }

        return `
          <section
            class="card element-card preset-element">

            <div class="section-head">

              <h3>
                FIXED SET —
                ${esc(e.name)}
              </h3>

              ${tools}

            </div>

            <p class="muted">
              Calibrated generated circles.
              Stage:
              ${esc(e.stage)}
            </p>

            ${stageFields}

            <div class="grid two">

              <div class="field">
                <label>
                  Exposure (ms)
                </label>

                <input
                  data-fixed-stage-field="exposure_ms"
                  data-fixed-stage-type="number"
                  type="number"
                  min="1"
                  value="${
                    fs.exposure_ms ??
                    1000
                  }">
              </div>

              <div class="field">
                <label>
                  ISI (ms)
                </label>

                <input
                  data-fixed-stage-field="isi_ms"
                  data-fixed-stage-type="number"
                  type="number"
                  min="0"
                  value="${
                    fs.isi_ms ??
                    1500
                  }">
              </div>

              <div class="field">
                <label>
                  Fixation size (mm)
                </label>

                <input
                  data-fixed-stage-field="fixation_mm"
                  data-fixed-stage-type="number"
                  type="number"
                  min="0"
                  step=".1"
                  value="${
                    fs.fixation_mm ??
                    3
                  }">
              </div>

              <div class="field">
                <label>
                  Pair gap (mm)
                </label>

                <input
                  data-fixed-stage-field="pair_gap_mm"
                  data-fixed-stage-type="number"
                  type="number"
                  min="0"
                  step=".1"
                  value="${
                    fs.pair_gap_mm ??
                    15
                  }">
              </div>

            </div>

          </section>
        `;
      }


      e.fixation =
        e.fixation || {
          mode:
            'red_dot',
          size_mm: 4,
          asset: null
        };


      return `
        <section
          class="card element-card">

          <div class="section-head">

            <h3>
              BLOCK —
              ${esc(e.name)}
            </h3>

            ${tools}

          </div>


          <div class="inline">

            <div class="field">

              <label>
                Name
              </label>

              <input
                data-el="${i}"
                data-k="name"
                value="${esc(
                  e.name
                )}">

            </div>


            <div class="field">

              <label>
                Trials
              </label>

              <input
                type="number"
                data-el="${i}"
                data-k="trials"
                value="${
                  e.trials || 1
                }">

            </div>


            <div class="field">

              <label>
                Save
              </label>

              <select
                data-el="${i}"
                data-k="save">

                <option
                  value="true"
                  ${
                    e.save !== false
                      ? 'selected'
                      : ''
                  }>
                  Yes
                </option>

                <option
                  value="false"
                  ${
                    e.save === false
                      ? 'selected'
                      : ''
                  }>
                  No
                </option>

              </select>

            </div>

          </div>


          <div class="inline">

            <div class="field">

              <label>
                Exposure ms
              </label>

              <input
                type="number"
                data-el="${i}"
                data-k="exposure_ms"
                value="${
                  e.exposure_ms ||
                  1000
                }">

            </div>


            <div class="field">

              <label>
                ISI ms
              </label>

              <input
                type="number"
                data-el="${i}"
                data-k="isi_ms"
                value="${
                  e.isi_ms ||
                  0
                }">

            </div>


            <div class="field">

              <label>
                Response window
              </label>

              <select
                data-el="${i}"
                data-k="response_window">

                <option
                  value="until_next_stimulus"
                  ${
                    e.response_window ===
                      'until_next_stimulus' ||
                    !e.response_window
                      ? 'selected'
                      : ''
                  }>
                  Until next stimulus
                </option>

                <option
                  value="exposure_only"
                  ${
                    e.response_window ===
                    'exposure_only'
                      ? 'selected'
                      : ''
                  }>
                  Exposure only
                </option>

                <option
                  value="custom_ms"
                  ${
                    e.response_window ===
                    'custom_ms'
                      ? 'selected'
                      : ''
                  }>
                  Custom ms
                </option>

              </select>

            </div>

          </div>


          <div class="inline">

            <div class="field">

              <label>
                Custom response ms
              </label>

              <input
                type="number"
                data-el="${i}"
                data-k="response_window_ms"
                value="${
                  e.response_window_ms ??
                  (
                    (+e.exposure_ms ||
                      1000) +
                    (+e.isi_ms ||
                      0)
                  )
                }">

            </div>


            <div class="field">

              <label>
                Presentation
              </label>

              <select
                data-el="${i}"
                data-k="presentation">

                <option
                  value="single"
                  ${
                    e.presentation !==
                    'pair'
                      ? 'selected'
                      : ''
                  }>
                  Single / complete scene image
                </option>

                <option
                  value="pair"
                  ${
                    e.presentation ===
                    'pair'
                      ? 'selected'
                      : ''
                  }>
                  Pair (two separate uploaded objects)
                </option>

              </select>

            </div>


            <div class="field">

              <label>
                Stimulus order
              </label>

              <select
                data-el="${i}"
                data-k="stimulus_order">

                <option
                  value="sequential"
                  ${
                    e.stimulus_order ===
                      'sequential' ||
                    !e.stimulus_order
                      ? 'selected'
                      : ''
                  }>
                  Sequential / uploaded order
                </option>

                <option
                  value="random"
                  ${
                    e.stimulus_order ===
                    'random'
                      ? 'selected'
                      : ''
                  }>
                  Random
                </option>

                <option
                  value="pseudorandom"
                  ${
                    e.stimulus_order ===
                    'pseudorandom'
                      ? 'selected'
                      : ''
                  }>
                  Pseudorandom / balanced
                </option>

              </select>

            </div>

          </div>


          <div class="inline">

            <div class="field">

              <label>
                Pair gap mm
              </label>

              <input
                type="number"
                step=".1"
                data-el="${i}"
                data-k="pair_gap_mm"
                value="${
                  e.pair_gap_mm ??
                  15
                }">

            </div>


            <div class="field">

              <label>
                Fixation
              </label>

              <select
                data-fix="${i}"
                data-fk="mode">

                <option
                  value="red_dot"
                  ${
                    e.fixation.mode ===
                    'red_dot'
                      ? 'selected'
                      : ''
                  }>
                  Red dot
                </option>

                <option
                  value="uploaded"
                  ${
                    e.fixation.mode ===
                    'uploaded'
                      ? 'selected'
                      : ''
                  }>
                  Uploaded image
                </option>

                <option
                  value="none"
                  ${
                    e.fixation.mode ===
                    'none'
                      ? 'selected'
                      : ''
                  }>
                  None
                </option>

              </select>

            </div>


            <div class="field">

              <label>
                Fixation size mm
              </label>

              <input
                type="number"
                step=".1"
                min="0"
                data-fix="${i}"
                data-fk="size_mm"
                value="${
                  e.fixation.size_mm ??
                  4
                }">

            </div>

          </div>


          <div class="fix-upload">

            <label class="btn small">

              Upload fixation image

              <input
                class="hidden"
                type="file"
                accept="image/*"
                data-fixupload="${i}">

            </label>

            ${
              e.fixation.asset
                ? `
                  <span class="muted">
                    ${esc(
                      e.fixation.asset
                        .name
                    )}
                  </span>

                  <button
                    class="btn small danger"
                    data-fixremove="${i}">
                    Remove
                  </button>
                `
                : `
                  <span class="muted">
                    No custom fixation uploaded.
                  </span>
                `
            }

          </div>


          <p class="muted">
            <b>ISI:</b>
            stimulus გაქრება; თუ fixation
            არჩეულია, ის უწყვეტად დარჩება.
            “Until next stimulus” რეჟიმში
            ISI-ში დაჭერილი პასუხი მიმდინარე
            trial-ს ეკუთვნის.
          </p>


          <div class="stim-section">

            <b>
              Adaptive Fixed-Set logic
              (optional)
            </b>


            <div class="inline">

              <div class="field">

                <label>
                  Role
                </label>

                <select
                  data-el="${i}"
                  data-k="adaptive_role">

                  <option
                    value="none"
                    ${
                      !e.adaptive_role ||
                      e.adaptive_role ===
                        'none'
                        ? 'selected'
                        : ''
                    }>
                    None
                  </option>

                  <option
                    value="control"
                    ${
                      e.adaptive_role ===
                      'control'
                        ? 'selected'
                        : ''
                    }>
                    Control
                  </option>

                  <option
                    value="set"
                    ${
                      e.adaptive_role ===
                      'set'
                        ? 'selected'
                        : ''
                    }>
                    Set / Induction
                  </option>

                  <option
                    value="critical"
                    ${
                      e.adaptive_role ===
                      'critical'
                        ? 'selected'
                        : ''
                    }>
                    Critical
                  </option>

                </select>

              </div>


              <div class="field">

                <label>
                  Direction A key
                </label>

                <input
                  data-el="${i}"
                  data-k="adaptive_direction_a_key"
                  value="${esc(
                    e.adaptive_direction_a_key ||
                    '1'
                  )}">

              </div>


              <div class="field">

                <label>
                  Equal key
                </label>

                <input
                  data-el="${i}"
                  data-k="adaptive_equal_key"
                  value="${esc(
                    e.adaptive_equal_key ||
                    '2'
                  )}">

              </div>


              <div class="field">

                <label>
                  Direction B key
                </label>

                <input
                  data-el="${i}"
                  data-k="adaptive_direction_b_key"
                  value="${esc(
                    e.adaptive_direction_b_key ||
                    '3'
                  )}">

              </div>


              <div class="field">

                <label>
                  Threshold
                </label>

                <input
                  type="number"
                  min="0"
                  max="1"
                  step=".01"
                  data-el="${i}"
                  data-k="adaptive_threshold"
                  value="${
                    e.adaptive_threshold ??
                    0.70
                  }">

              </div>

            </div>


            <p class="muted">
              Set role: upload exactly two
              variants. Variant A = first
              uploaded stimulus, Variant B =
              second. Control directional
              errors &gt; threshold choose
              the matching variant; otherwise
              participant-level counterbalancing
              chooses one variant and keeps
              it fixed for the full Set block.
            </p>

          </div>


          <div class="stim-section">

            <b>
              Stopping rule (optional)
            </b>


            <div class="inline">

              <div class="field">

                <label>
                  Rule
                </label>

                <select
                  data-stop="${i}"
                  data-sk="type">

                  <option
                    value="none"
                    ${
                      !e.stop_rule
                        ? 'selected'
                        : ''
                    }>
                    None
                  </option>

                  <option
                    value="consecutive_response"
                    ${
                      e.stop_rule?.type ===
                      'consecutive_response'
                        ? 'selected'
                        : ''
                    }>
                    Consecutive response
                  </option>

                </select>

              </div>


              <div class="field">

                <label>
                  Response key
                </label>

                <input
                  data-stop="${i}"
                  data-sk="key"
                  value="${esc(
                    e.stop_rule?.key ||
                    '2'
                  )}">

              </div>


              <div class="field">

                <label>
                  Count
                </label>

                <input
                  type="number"
                  min="1"
                  data-stop="${i}"
                  data-sk="count"
                  value="${
                    e.stop_rule?.count ||
                    10
                  }">

              </div>

            </div>

          </div>


          <label class="checkline">

            <input
              type="checkbox"
              data-el="${i}"
              data-k="show_instructions"
              ${
                e.show_instructions
                  ? 'checked'
                  : ''
              }>

            Show block instructions

          </label>


          <textarea
            data-el="${i}"
            data-k="instructions">${esc(
              e.instructions ||
              ''
            )}</textarea>


          <div class="stimulus-library">

            <div class="section-head">

              <div>

                <h4>
                  Stimuli
                </h4>

                <p class="muted">
                  Upload your own image/audio/video.
                  ვერტიკალური ხაზები ან სხვა ფორმები
                  კოდში წინასწარ ჩაშენებული არ არის.
                </p>

              </div>

              <label class="btn">

                + Upload

                <input
                  class="hidden"
                  type="file"
                  multiple
                  accept="image/*,audio/*,video/*"
                  data-upel="${i}">

              </label>

            </div>


            <div class="stim-grid">

              ${
                (e.stimuli || [])
                  .map(
                    (s, j) =>
                      stimHTML(
                        s,
                        i,
                        j
                      )
                  )
                  .join('') ||
                `
                  <p class="muted">
                    No stimuli uploaded.
                  </p>
                `
              }

            </div>

          </div>

        </section>
      `;
    }


    function renderElements() {
      elements.forEach(
        e => {
          if (
            e.type ===
            'block'
          ) {
            e.stimuli =
              e.stimuli || [];

            e.response_window =
              e.response_window ||
              'until_next_stimulus';

            e.presentation =
              e.presentation ||
              'single';

            e.stimulus_order =
              e.stimulus_order ||
              'sequential';

            e.fixation =
              e.fixation || {
                mode:
                  'red_dot',
                size_mm: 4,
                asset: null
              };

            e.adaptive_role =
              e.adaptive_role ||
              'none';

            e.adaptive_direction_a_key =
              e.adaptive_direction_a_key ||
              '1';

            e.adaptive_equal_key =
              e.adaptive_equal_key ||
              '2';

            e.adaptive_direction_b_key =
              e.adaptive_direction_b_key ||
              '3';

            e.adaptive_threshold =
              e.adaptive_threshold ??
              0.70;
          }
        }
      );


      document.getElementById(
        'elements'
      ).innerHTML =
        elements
          .map(elementHTML)
          .join('');


      document
        .querySelectorAll(
          '[data-el]'
        )
        .forEach(
          x => {
            x.onchange =
              x.oninput =
                () =>
                  updateEl(x);
          }
        );


      document
        .querySelectorAll(
          '[data-fixed-stage-field]'
        )
        .forEach(
          x => {
            x.onchange =
              x.oninput =
                () => {
                  const k =
                    x.dataset
                      .fixedStageField;

                  const isNumber =
                    x.dataset
                      .fixedStageType ===
                    'number';

                  cfg.fixed_set =
                    cfg.fixed_set || {};

                  cfg.fixed_set[k] =
                    isNumber
                      ? +x.value
                      : x.value;

                  const topMap = {
                    practice_trials:
                      'fs_practice',
                    control_trials:
                      'fs_control',
                    set_trials:
                      'fs_set',
                    critical_max_trials:
                      'fs_critical',
                    critical_stop_count:
                      'fs_stop',
                    critical_stop_key:
                      'fs_stop_key',
                    exposure_ms:
                      'fs_exposure',
                    isi_ms:
                      'fs_isi',
                    small_mm:
                      'fs_small',
                    equal_mm:
                      'fs_equal',
                    large_mm:
                      'fs_large',
                    fixation_mm:
                      'fs_fixation',
                    pair_gap_mm:
                      'fs_gap',
                    set_stimulus_order:
                      'fs_set_order'
                  };

                  const top =
                    document.getElementById(
                      topMap[k]
                    );

                  if (top) {
                    top.value =
                      x.value;
                  }

                  document
                    .querySelectorAll(
                      `[data-fixed-stage-field="${k}"]`
                    )
                    .forEach(
                      peer => {
                        if (
                          peer !== x
                        ) {
                          peer.value =
                            x.value;
                        }
                      }
                    );
                };
          }
        );


      document
        .querySelectorAll(
          '[data-upel]'
        )
        .forEach(
          x => {
            x.onchange =
              async () => {
                const i =
                  +x.dataset.upel;

                for (
                  const f of
                  x.files
                ) {
                  let a =
                    await CogDB
                      .uploadStimulus(
                        f
                      );

                  a =
                    await imageMeta(
                      a
                    );

                  a.lock_aspect =
                    true;

                  a.scale_mode =
                    'canvas';

                  a.reference_box = {
                    x_pct: 0,
                    y_pct: 0,
                    w_pct: 100,
                    h_pct: 100
                  };

                  elements[
                    i
                  ].stimuli.push(
                    a
                  );
                }

                renderElements();
              };
          }
        );


      document
        .querySelectorAll(
          '[data-stim]'
        )
        .forEach(
          x => {
            x.onchange =
              x.oninput =
                () => {
                  const [
                    i,
                    j
                  ] =
                    x.dataset.stim
                      .split(':')
                      .map(Number);

                  const s =
                    elements[i]
                      .stimuli[j];

                  const k =
                    x.dataset.sk;

                  s[k] =
                    x.type ===
                    'checkbox'
                      ? x.checked
                      : (
                          x.value ===
                          ''
                            ? null
                            : +x.value
                        );
                };
          }
        );


      document
        .querySelectorAll(
          '[data-stimstr]'
        )
        .forEach(
          x => {
            x.onchange =
              () => {
                const [
                  i,
                  j
                ] =
                  x.dataset.stimstr
                    .split(':')
                    .map(Number);

                elements[i]
                  .stimuli[j][
                    x.dataset.sk
                  ] =
                    x.value;

                renderElements();
              };
          }
        );


      document
        .querySelectorAll(
          '[data-box]'
        )
        .forEach(
          x => {
            x.onchange =
              x.oninput =
                () => {
                  const [
                    i,
                    j
                  ] =
                    x.dataset.box
                      .split(':')
                      .map(Number);

                  const s =
                    elements[i]
                      .stimuli[j];

                  s.reference_box =
                    s.reference_box ||
                    {};

                  s.reference_box[
                    x.dataset.bk
                  ] =
                    +x.value;
                };
          }
        );


      document
        .querySelectorAll(
          '[data-remstim]'
        )
        .forEach(
          x => {
            x.onclick =
              () => {
                const [
                  i,
                  j
                ] =
                  x.dataset.remstim
                    .split(':')
                    .map(Number);

                elements[i]
                  .stimuli.splice(
                    j,
                    1
                  );

                renderElements();
              };
          }
        );


      document
        .querySelectorAll(
          '[data-fix]'
        )
        .forEach(
          x => {
            x.onchange =
              x.oninput =
                () => {
                  const e =
                    elements[
                      +x.dataset.fix
                    ];

                  e.fixation =
                    e.fixation ||
                    {};

                  e.fixation[
                    x.dataset.fk
                  ] =
                    x.dataset.fk ===
                    'size_mm'
                      ? +x.value
                      : x.value;
                };
          }
        );


      document
        .querySelectorAll(
          '[data-fixupload]'
        )
        .forEach(
          x => {
            x.onchange =
              async () => {
                const i =
                  +x.dataset
                    .fixupload;

                const f =
                  x.files?.[0];

                if (!f) {
                  return;
                }


                elements[i]
                  .fixation =
                    elements[i]
                      .fixation ||
                    {};


                elements[i]
                  .fixation
                  .asset =
                    await imageMeta(
                      await CogDB
                        .uploadStimulus(
                          f
                        )
                    );


                elements[i]
                  .fixation
                  .mode =
                    'uploaded';


                renderElements();
              };
          }
        );


      document
        .querySelectorAll(
          '[data-fixremove]'
        )
        .forEach(
          x => {
            x.onclick =
              () => {
                const e =
                  elements[
                    +x.dataset
                      .fixremove
                  ];

                e.fixation.asset =
                  null;

                if (
                  e.fixation.mode ===
                  'uploaded'
                ) {
                  e.fixation.mode =
                    'red_dot';
                }

                renderElements();
              };
          }
        );


      document
        .querySelectorAll(
          '[data-stop]'
        )
        .forEach(
          x => {
            x.onchange =
              x.oninput =
                () => {
                  const e =
                    elements[
                      +x.dataset.stop
                    ];

                  const k =
                    x.dataset.sk;

                  if (
                    k === 'type'
                  ) {
                    e.stop_rule =
                      x.value ===
                      'none'
                        ? null
                        : {
                            type:
                              'consecutive_response',
                            key:
                              e.stop_rule
                                ?.key ||
                              '2',
                            count:
                              e.stop_rule
                                ?.count ||
                              10
                          };

                    renderElements();
                  }

                  else {
                    e.stop_rule =
                      e.stop_rule || {
                        type:
                          'consecutive_response',
                        key: '2',
                        count: 10
                      };

                    e.stop_rule[k] =
                      k === 'count'
                        ? +x.value
                        : x.value;
                  }
                };
          }
        );


      document
        .querySelectorAll(
          '[data-del]'
        )
        .forEach(
          x => {
            x.onclick =
              () => {
                elements.splice(
                  +x.dataset.del,
                  1
                );

                renderElements();
              };
          }
        );


      document
        .querySelectorAll(
          '[data-up]'
        )
        .forEach(
          x => {
            x.onclick =
              () => {
                const i =
                  +x.dataset.up;

                if (i) {
                  [
                    elements[
                      i - 1
                    ],
                    elements[i]
                  ] = [
                    elements[i],
                    elements[
                      i - 1
                    ]
                  ];

                  renderElements();
                }
              };
          }
        );


      document
        .querySelectorAll(
          '[data-down]'
        )
        .forEach(
          x => {
            x.onclick =
              () => {
                const i =
                  +x.dataset.down;

                if (
                  i <
                  elements.length -
                    1
                ) {
                  [
                    elements[
                      i + 1
                    ],
                    elements[i]
                  ] = [
                    elements[i],
                    elements[
                      i + 1
                    ]
                  ];

                  renderElements();
                }
              };
          }
        );
    }


    function updateEl(x) {
      const e =
        elements[
          +x.dataset.el
        ];

      const k =
        x.dataset.k;


      if (
        k ===
        'show_instructions'
      ) {
        e[k] =
          x.checked;
      }

      else if (
        [
          'trials',
          'exposure_ms',
          'isi_ms',
          'pair_gap_mm',
          'response_window_ms',
          'adaptive_threshold'
        ].includes(k)
      ) {
        e[k] =
          +x.value;
      }

      else if (
        k ===
        'duration_sec'
      ) {
        e.duration_ms =
          +x.value *
          1000;
      }

      else if (
        k === 'save'
      ) {
        e.save =
          x.value ===
          'true';
      }

      else {
        e[k] =
          x.value;
      }
    }


    function validateFixed() {
      const si =
        elements.findIndex(
          e =>
            e.type ===
              'fixedset_stage' &&
            e.stage ===
              'set'
        );


      const ci =
        elements.findIndex(
          e =>
            e.type ===
              'fixedset_stage' &&
            e.stage ===
              'critical'
        );


      if (
        si < 0 ||
        ci !== si + 1
      ) {
        throw Error(
          'Fixed Set: Set → Critical უნდა იყოს უშუალო.'
        );
      }


      const fs_practice =
        document.getElementById(
          'fs_practice'
        );


      const fs_control =
        document.getElementById(
          'fs_control'
        );


      const fs_critical =
        document.getElementById(
          'fs_critical'
        );


      const fs_break =
        document.getElementById(
          'fs_break'
        );


      const fs_exposure =
        document.getElementById(
          'fs_exposure'
        );


      if (
        +fs_practice.value >
          3 ||
        +fs_control.value <
          15 ||
        +fs_critical.value >
          40 ||
        +fs_break.value <
          300 ||
        +fs_exposure.value <
          500
      ) {
        throw Error(
          'Fixed Set scientific settings არ შეესაბამება მინიმალურ პროტოკოლურ საზღვრებს.'
        );
      }
    }


    const save =
      document.getElementById(
        'save'
      );


    save.onclick =
      async () => {
        try {
          if (
            !nm.value.trim() ||
            !sl.value.trim()
          ) {
            throw Error(
              'Name და slug აუცილებელია.'
            );
          }


          cfg.responses =
            responses.filter(
              r => r.key
            );


          cfg.elements =
            elements;


          cfg.completion_message =
            cm.value;


          cfg.calibration = {
            enabled:
              cal_enabled.checked,

            reference_width_mm:
              85.60,

            reference_label:
              'სტანდარტული საბანკო/ID ბარათი'
          };


          /*
            =================================================
            STUDY INFORMATION
            =================================================
          */


          cfg.study_info = {
            category:
              si_category
                .value
                .trim(),

            duration_minutes:
              si_duration
                .value ===
                ''
                  ? null
                  : +si_duration
                      .value,

            task:
              si_task
                .value
                .trim(),

            device:
              si_device
                .value
                .trim(),

            participation:
              si_participation
                .value
                .trim(),

            summary:
              si_summary
                .value
                .trim(),

            about:
              si_about
                .value
                .trim(),

            procedure:
              si_procedure
                .value
                .trim(),

            eligibility:
              si_eligibility
                .value
                .trim(),

            privacy:
              si_privacy
                .value
                .trim(),

            consent_text:
              si_consent_text
                .value
                .trim(),

            consent_version:
              Math.max(
                1,
                +si_consent_version
                  .value || 1
              ),

            consent_items: [
              si_consent_1
                .value
                .trim(),

              si_consent_2
                .value
                .trim(),

              si_consent_3
                .value
                .trim(),

              si_consent_4
                .value
                .trim()
            ]
          };


          /*
            =================================================
            PARTICIPANT INFORMATION
            =================================================
          */


          const cleanedParticipantQuestions =
            participantQuestions
              .map(
                q => ({
                  id:
                    q.id || uid(),

                  type:
                    q.type ||
                    'short_text',

                  label:
                    (
                      q.label ||
                      ''
                    ).trim(),

                  required:
                    q.required ===
                    true,

                  placeholder:
                    (
                      q.placeholder ||
                      ''
                    ).trim(),

                  options:
                    questionUsesOptions(
                      q.type
                    )
                      ? (
                          Array.isArray(
                            q.options
                          )
                            ? q.options
                            : []
                        )
                          .map(
                            x =>
                              String(x)
                                .trim()
                          )
                          .filter(Boolean)
                      : []
                })
              )
              .filter(
                q =>
                  q.label
              );


          if (
            pi_enabled.checked &&
            !cleanedParticipantQuestions
              .length
          ) {
            throw Error(
              'Participant Information ჩართულია, მაგრამ არცერთი კითხვა არ არის დამატებული.'
            );
          }


          for (
            const q of
            cleanedParticipantQuestions
          ) {
            if (
              questionUsesOptions(
                q.type
              ) &&
              q.options.length <
                2
            ) {
              throw Error(
                `კითხვას “${q.label}” მინიმუმ 2 პასუხის ვარიანტი სჭირდება.`
              );
            }
          }


          cfg.participant_info = {
            enabled:
              pi_enabled.checked,

            title:
              pi_title
                .value
                .trim() ||
              'მონაწილის ინფორმაცია',

            introduction:
              pi_intro
                .value
                .trim(),

            questions:
              cleanedParticipantQuestions
          };
                    if (
            cfg.template ===
            'uznadze_fixed_set'
          ) {
            validateFixed();


            const fs_practice =
              document.getElementById(
                'fs_practice'
              );


            const fs_control =
              document.getElementById(
                'fs_control'
              );


            const fs_set =
              document.getElementById(
                'fs_set'
              );


            const fs_critical =
              document.getElementById(
                'fs_critical'
              );


            const fs_stop =
              document.getElementById(
                'fs_stop'
              );


            const fs_threshold =
              document.getElementById(
                'fs_threshold'
              );


            const fs_exposure =
              document.getElementById(
                'fs_exposure'
              );


            const fs_isi =
              document.getElementById(
                'fs_isi'
              );


            const fs_break =
              document.getElementById(
                'fs_break'
              );


            const fs_set_order =
              document.getElementById(
                'fs_set_order'
              );


            const fs_stop_key =
              document.getElementById(
                'fs_stop_key'
              );


            const fs_fixation =
              document.getElementById(
                'fs_fixation'
              );


            const fs_gap =
              document.getElementById(
                'fs_gap'
              );


            const fs_small =
              document.getElementById(
                'fs_small'
              );


            const fs_equal =
              document.getElementById(
                'fs_equal'
              );


            const fs_large =
              document.getElementById(
                'fs_large'
              );


            cfg.fixed_set = {
              ...cfg.fixed_set,

              practice_trials:
                +fs_practice.value,

              control_trials:
                +fs_control.value,

              set_trials:
                +fs_set.value,

              critical_max_trials:
                +fs_critical.value,

              critical_stop_count:
                +fs_stop.value,

              critical_stop_key:
                fs_stop_key
                  .value
                  .trim() ||
                '2',

              natural_asymmetry_threshold:
                +fs_threshold.value,

              exposure_ms:
                +fs_exposure.value,

              isi_ms:
                +fs_isi.value,

              response_window:
                'until_next_stimulus',

              break_ms:
                +fs_break.value *
                1000,

              set_stimulus_order:
                fs_set_order.value ||
                'balanced_pseudorandom',

              fixation_mm:
                +fs_fixation.value,

              pair_gap_mm:
                +fs_gap.value,

              small_mm:
                +fs_small.value,

              equal_mm:
                +fs_equal.value,

              large_mm:
                +fs_large.value
            };


            const be =
              elements.find(
                e =>
                  e.role ===
                  'control_set_break'
              );


            if (be) {
              be.duration_ms =
                cfg.fixed_set
                  .break_ms;
            }
          }


          await CogDB
            .saveExperiment({
              id:
                old?.id ||
                uid(),

              name:
                nm.value.trim(),

              slug:
                sl.value.trim(),

              description:
                ds.value.trim(),

              status:
                st.value,

              version:
                (
                  old?.version ||
                  0
                ) + 1,

              config:
                cfg,

              created_at:
                old?.created_at ||
                new Date()
                  .toISOString()
            });


          await backToExperiments();
        }

        catch (e) {
          alert(
            e.message
          );
        }
      };


    renderResponses();
    renderParticipantQuestions();
    renderElements();
  }


  async function results() {
    const es =
      await CogDB.experiments(
        true
      );


    content.innerHTML = `
      <section class="card">

        <div class="row">

          <select id="rex">

            <option value="">
              All experiments
            </option>

            ${es
              .map(
                e => `
                  <option
                    value="${e.id}">
                    ${esc(e.name)}
                  </option>
                `
              )
              .join('')}

          </select>


          <button
            id="load"
            class="btn">
            Load
          </button>


          <button
            id="xlsx"
            class="btn primary">
            Export Excel
          </button>

        </div>


        <div id="rout">
        </div>

      </section>
    `;


    const rex =
      document.getElementById(
        'rex'
      );


    const load =
      document.getElementById(
        'load'
      );


    const xlsx =
      document.getElementById(
        'xlsx'
      );


    const rout =
      document.getElementById(
        'rout'
      );


    let data = {
      sessions: [],
      trials: []
    };


    async function refresh() {
      data =
        await CogDB.results(
          rex.value
        );


      rout.innerHTML = `
        <p>
          <b>
            ${
              data.sessions
                .length
            }
          </b>
          participants ·

          <b>
            ${
              data.trials
                .length
            }
          </b>
          saved trials
        </p>
      `;
    }


    load.onclick =
      refresh;


    xlsx.onclick =
      async () => {
        if (!rex.value) {
          return alert(
            'ექსელის ექსპორტისთვის აირჩიეთ კონკრეტული ექსპერიმენტი.'
          );
        }

        data =
          await CogDB.results(
            rex.value
          );

        exportExcel(
          data,
          es.find(
            e =>
              e.id ===
              rex.value
          )
        );
      };


    await refresh();
  }


  function exportExcel(
    data,
    exp
  ) {
    if (!window.XLSX) {
      return alert(
        'Excel unavailable'
      );
    }

    if (!exp) {
      return alert(
        'ექსელის ექსპორტისთვის აირჩიეთ კონკრეტული ექსპერიმენტი.'
      );
    }


    const tbilisiParts = value => {
      if (!value) {
        return {
          date: '',
          time: ''
        };
      }

      const d = new Date(value);

      if (Number.isNaN(d.getTime())) {
        return {
          date: '',
          time: ''
        };
      }

      const parts =
        new Intl.DateTimeFormat(
          'en-GB',
          {
            timeZone:
              'Asia/Tbilisi',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23'
          }
        ).formatToParts(d);

      const get = type =>
        parts.find(
          p => p.type === type
        )?.value || '';

      return {
        date:
          `${get('day')}/${get('month')}/${get('year')}`,
        time:
          `${get('hour')}:${get('minute')}:${get('second')}`
      };
    };


    const answerValue = value => {
      if (Array.isArray(value)) {
        return value.join('; ');
      }

      if (
        value &&
        typeof value === 'object'
      ) {
        return JSON.stringify(value);
      }

      return value ?? '';
    };


    const by = new Map();

    data.trials.forEach(
      t => {
        if (!by.has(t.session_id)) {
          by.set(t.session_id, []);
        }

        by.get(t.session_id).push(t);
      }
    );


    const sessionById =
      new Map(
        data.sessions.map(
          s => [s.id, s]
        )
      );


    const blocks = [
      ...new Set(
        data.trials.map(
          t => t.block_name
        )
      )
    ];


    const keys = [
      ...new Set([
        ...(exp.config?.responses || [])
          .map(r => r.key),
        ...data.trials
          .map(t => t.response_key)
          .filter(Boolean)
      ])
    ];


    const participantQuestions =
      (
        exp.config
          ?.participant_info
          ?.questions || []
      ).filter(
        q =>
          String(q.label || '')
            .trim()
      );


    const ps =
      data.sessions.map(
        s => {
          const ts =
            by.get(s.id) || [];

          const started =
            tbilisiParts(
              s.created_at
            );

          const completed =
            tbilisiParts(
              s.completed_at
            );

          const participantSubmitted =
            tbilisiParts(
              s.participant_data
                ?.submitted_at
            );

          const r = {
            Session_ID:
              s.id,

            Participant:
              s.participant_code,

            Experiment:
              exp.name,

            Experiment_Slug:
              exp.slug,

            Experiment_Version:
              s.experiment_version ??
              exp.version,

            Date:
              started.date,

            Start_Time:
              started.time,

            Completion_Date:
              completed.date,

            Completion_Time:
              completed.time,

            Participant_Info_Submitted_Date:
              participantSubmitted.date,

            Participant_Info_Submitted_Time:
              participantSubmitted.time,

            Completed:
              s.completed_at
                ? 'Yes'
                : 'No',

            Validity:
              s.validity_status || '',

            Device_Type:
              s.device_type || '',

            Viewport_Width:
              s.viewport_width ?? '',

            Viewport_Height:
              s.viewport_height ?? '',

            User_Agent:
              s.user_agent || ''
          };


          const storedAnswers =
            s.participant_data
              ?.answers || {};


          participantQuestions.forEach(
            (q, i) => {
              const stored =
                storedAnswers[q.id];

              const value =
                stored &&
                typeof stored ===
                  'object' &&
                Object.prototype
                  .hasOwnProperty.call(
                    stored,
                    'answer'
                  )
                  ? stored.answer
                  : stored;

              r[
                `Q${i + 1} — ${q.label}`
              ] = answerValue(value);
            }
          );


          Object.entries(
            storedAnswers
          ).forEach(
            ([id, stored]) => {
              if (
                participantQuestions
                  .some(q => q.id === id)
              ) {
                return;
              }

              const label =
                stored?.label || id;

              const value =
                stored &&
                typeof stored ===
                  'object' &&
                Object.prototype
                  .hasOwnProperty.call(
                    stored,
                    'answer'
                  )
                  ? stored.answer
                  : stored;

              r[
                `Participant — ${label}`
              ] = answerValue(value);
            }
          );


          for (const b of blocks) {
            const bt =
              ts
                .filter(
                  t =>
                    t.block_name === b
                )
                .sort(
                  (a, b) =>
                    Number(
                      a.block_trial || 0
                    ) -
                    Number(
                      b.block_trial || 0
                    )
                );

            bt.forEach(
              (t, i) => {
                const n =
                  i + 1;

                r[
                  `${b} Exposure ${n} — Stimulus`
                ] =
                  t.stimulus_name || '';

                r[
                  `${b} Exposure ${n} — Variant`
                ] =
                  t.metadata
                    ?.set_side ||
                  t.metadata
                    ?.adaptive_set_variant ||
                  '';

                r[
                  `${b} Exposure ${n} — Response`
                ] =
                  t.response_key ||
                  'MISSING';

                r[
                  `${b} Exposure ${n} — RT ms`
                ] =
                  t.rt_ms ?? '';
              }
            );
          }


          return r;
        }
      );


    const tr =
      data.trials.map(
        t => {
          const s =
            sessionById.get(
              t.session_id
            );

          const started =
            tbilisiParts(
              s?.created_at
            );

          return {
            Session_ID:
              t.session_id,

            Participant:
              t.participant_code,

            Experiment:
              exp.name,

            Experiment_Version:
              t.experiment_version ??
              s?.experiment_version ??
              exp.version,

            Date:
              started.date,

            Start_Time:
              started.time,

            Block:
              t.block_name,

            Global_Trial:
              t.global_trial,

            Block_Trial:
              t.block_trial,

            Stimulus:
              t.stimulus_name,

            Stimulus_Type:
              t.stimulus_type,

            Response_Key:
              t.response_key || '',

            Response_Label:
              t.response_label || '',

            RT_ms:
              t.rt_ms,

            Missing:
              t.missing
                ? 'TRUE'
                : 'FALSE',

            Response_During:
              t.metadata
                ?.response_during || '',

            Extra_Keypress_Count:
              t.metadata
                ?.extra_keypress_count ||
              t.metadata
                ?.extra_keypresses
                ?.length ||
              0,

            Extra_Keypresses:
              JSON.stringify(
                t.metadata
                  ?.extra_keypresses || []
              ),

            Stimulus_Order:
              t.metadata
                ?.stimulus_order || '',

            Adaptive_Role:
              t.metadata
                ?.adaptive_role || '',

            Adaptive_Asymmetry:
              t.metadata
                ?.adaptive_asymmetry || '',

            Adaptive_Set_Variant:
              t.metadata
                ?.adaptive_set_variant ?? '',

            Set_Side:
              t.metadata
                ?.set_side || '',

            Set_Stimulus_Order:
              t.metadata
                ?.set_stimulus_order || '',

            Set_Variant_Index:
              t.metadata
                ?.set_variant_index ?? '',

            Metadata:
              JSON.stringify(
                t.metadata || {}
              )
          };
        }
      );


    const settings = [];

    settings.push(
      {
        Setting: 'Name',
        Value: exp.name
      },
      {
        Setting: 'Slug',
        Value: exp.slug
      },
      {
        Setting: 'Version',
        Value: exp.version
      },
      {
        Setting: 'Template',
        Value: exp.config?.template
      },
      {
        Setting:
          'Calibration required',
        Value:
          exp.config
            ?.calibration
            ?.enabled
              ? 'Yes'
              : 'No'
      }
    );


    if (exp.config?.study_info) {
      settings.push(
        {
          Setting: 'Study category',
          Value:
            exp.config.study_info
              .category || ''
        },
        {
          Setting:
            'Study duration minutes',
          Value:
            exp.config.study_info
              .duration_minutes ?? ''
        },
        {
          Setting: 'Study task',
          Value:
            exp.config.study_info
              .task || ''
        },
        {
          Setting: 'Study device',
          Value:
            exp.config.study_info
              .device || ''
        },
        {
          Setting: 'Participation',
          Value:
            exp.config.study_info
              .participation || ''
        },
        {
          Setting: 'Consent version',
          Value:
            exp.config.study_info
              .consent_version ?? 1
        }
      );
    }


    const pi =
      exp.config
        ?.participant_info;

    if (pi) {
      settings.push(
        {
          Setting:
            'Participant information enabled',
          Value:
            pi.enabled
              ? 'Yes'
              : 'No'
        },
        {
          Setting:
            'Participant page title',
          Value:
            pi.title || ''
        },
        {
          Setting:
            'Participant page introduction',
          Value:
            pi.introduction || ''
        },
        {
          Setting:
            'Participant question count',
          Value:
            (pi.questions || []).length
        }
      );

      (pi.questions || [])
        .forEach(
          (q, i) => {
            settings.push(
              {
                Setting:
                  `Participant question ${i + 1} ID`,
                Value: q.id || ''
              },
              {
                Setting:
                  `Participant question ${i + 1}`,
                Value: q.label || ''
              },
              {
                Setting:
                  `Participant question ${i + 1} type`,
                Value: q.type || ''
              },
              {
                Setting:
                  `Participant question ${i + 1} required`,
                Value:
                  q.required
                    ? 'Yes'
                    : 'No'
              },
              {
                Setting:
                  `Participant question ${i + 1} options`,
                Value:
                  (q.options || [])
                    .join(' | ')
              }
            );
          }
        );
    }


    (exp.config?.responses || [])
      .forEach(
        (r, i) =>
          settings.push({
            Setting:
              `Response ${i + 1}`,
            Value:
              `${r.key} = ${r.label}`
          })
      );


    (exp.config?.elements || [])
      .forEach(
        (e, i) => {
          settings.push({
            Setting:
              `Timeline ${i + 1}`,
            Value:
              `${e.type}: ${
                e.title ||
                e.name ||
                e.stage || ''
              }`
          });

          if (e.type === 'block') {
            settings.push(
              {
                Setting:
                  `${e.name} trials`,
                Value: e.trials
              },
              {
                Setting:
                  `${e.name} exposure ms`,
                Value: e.exposure_ms
              },
              {
                Setting:
                  `${e.name} ISI ms`,
                Value: e.isi_ms
              },
              {
                Setting:
                  `${e.name} order`,
                Value:
                  e.stimulus_order
              },
              {
                Setting:
                  `${e.name} adaptive role`,
                Value:
                  e.adaptive_role ||
                  'none'
              },
              {
                Setting:
                  `${e.name} stop rule`,
                Value:
                  e.stop_rule
                    ? JSON.stringify(
                        e.stop_rule
                      )
                    : 'none'
              }
            );
          }
        }
      );


    const wb =
      XLSX.utils.book_new();

    const participantSheet =
      XLSX.utils.json_to_sheet(ps);

    const trialSheet =
      XLSX.utils.json_to_sheet(tr);

    const settingsSheet =
      XLSX.utils.json_to_sheet(
        settings
      );


    XLSX.utils.book_append_sheet(
      wb,
      participantSheet,
      'Participants'
    );

    XLSX.utils.book_append_sheet(
      wb,
      trialSheet,
      'Trial_Data'
    );

    XLSX.utils.book_append_sheet(
      wb,
      settingsSheet,
      'Experiment_Settings'
    );


    const now = new Date();

    const exportDate =
      new Intl.DateTimeFormat(
        'en-CA',
        {
          timeZone:
            'Asia/Tbilisi',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }
      )
        .format(now)
        .replace(/\//g, '-');


    XLSX.writeFile(
      wb,
      `${exp.slug}_results_${exportDate}.xlsx`
    );
  }


  function setup() {
    content.innerHTML = `
      <section class="card">

        <h3>
          ${
            CogDB.demo
              ? 'Demo Mode'
              : 'Supabase connected'
          }
        </h3>

        <p>
          Build:
          ${esc(
            COG_CONFIG.BUILD
          )}
        </p>

      </section>
    `;
  }


  boot().catch(
    e => {
      console.error(e);

      A.innerHTML = `
        <div class="alert danger">
          ${esc(
            e.message
          )}
        </div>
      `;
    }
  );

})();
