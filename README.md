# CogExperiments — BUILDER + FIXED SET v5

This build adds a free-form experiment timeline and the first scientific preset: **Uznadze Fixed Set**.

## New in v5
- Independent **Instruction Screen** elements can be inserted anywhere in the timeline.
- Optional block-specific instructions.
- Independent timed **Break** elements with custom messages.
- Editable completion message.
- Create menu: **Blank experiment** or **Uznadze Fixed Set** preset.
- Uznadze preset includes:
  - physical screen calibration using an 85.60 mm bank/ID card;
  - Practice (equal figures, max/default 3, excluded from analysis);
  - Control (default 15 equal-pair trials);
  - 5-minute Control→Set break;
  - Set / Induction (default 15 trials, 80:40 mm);
  - natural-asymmetry calculation and set-side selection;
  - Critical (60:60 mm, max 40, stop after 10 consecutive `2` responses);
  - 1000 ms exposure and 1500 ms ISI defaults;
  - calibrated black circles and central red fixation point.
- Generic Builder still supports arbitrary image/audio/video uploads, timings, response mappings, stopping rules, and free block names.
- Research-friendly Excel export remains available.

## Important
`DEMO_MODE` is still `true` until Supabase is connected. Demo data are stored only in this browser's localStorage.

## Production setup
1. Create a fresh Supabase project.
2. Run `supabase/schema.sql`.
3. Create admin users manually in Supabase Authentication.
4. Add each admin UUID to `public.admin_users`.
5. Put the Supabase Project URL + publishable key in `assets/config.js`.
6. Set `DEMO_MODE: false`.
7. Commit the files to the `CogExperiments` GitHub repository.
