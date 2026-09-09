# CogExperiments — Final Universal Builder v7.0

Static GitHub Pages + Supabase experiment platform.

## Included final capabilities

- Universal free-form timeline: Instruction / Block / Break.
- Upload image, audio, and video stimuli.
- Visual physical-size calibration using a standard 85.60 mm bank/ID card.
- Image scaling by whole-canvas physical size or measured reference box.
- Response windows: exposure only, until next stimulus, or custom milliseconds.
- Responses during ISI can belong to the current/previous stimulus trial when `Until next stimulus` is selected.
- `Sequential / uploaded order`, `Random`, and participant-stable `Pseudorandom / balanced` stimulus order.
- Pseudorandom order balances stimulus counts as closely as possible and avoids runs longer than 2 when feasible.
- Only the first valid response is the trial response. Any additional valid keypresses on the same trial are recorded as extra keypress metadata and excluded from the main response.
- Explicit missing-response recording when no valid response is made before the response window closes.
- Fixation options: red dot, uploaded image, or none. If fixation is enabled, it remains visible during ISI; `None` stays blank during ISI.
- Optional generic Adaptive Fixed-Set roles: Control / Set / Critical.
  - Control directional responses determine natural asymmetry using configurable keys and threshold.
  - Set uses exactly one of the first two uploaded variants for the entire block.
  - If Control directional errors exceed the threshold, the matching Set variant is chosen.
  - Otherwise participant-level deterministic counterbalancing chooses A or B.
- Optional generic stopping rule: stop after N consecutive occurrences of a response key.
- Research-friendly Excel export with Participants, Trial_Data, and Experiment_Settings sheets.
- Trial export includes missing status, response timing, extra-keypress count/details, stimulus order, and adaptive Fixed-Set metadata.
- Participant data are not readable by participants under the supplied Supabase RLS schema.
- Admin interface is login-only; no public registration button.

## Included Uznadze circle preset

`Create experiment → Uznadze Fixed Set` creates the built-in calibrated circle task. Circles are generated programmatically, not uploaded images.

Defaults:

- Practice: 3 equal-circle trials, not saved.
- Control: 15 equal-circle trials.
- Control → Set break: 300 seconds.
- Set: 15 trials, 80 mm vs 40 mm.
- Control/Critical equal circles: 60 mm.
- Exposure: 1000 ms.
- ISI: 1500 ms.
- Fixation: red dot, 3 mm.
- Pair gap: 15 mm.
- Natural-asymmetry threshold: >70% of directional errors.
- If asymmetry is present, Set large side matches that directional tendency; otherwise participant-level counterbalancing is used.
- Critical starts immediately after Set.
- Critical stops after 10 consecutive `2 = equal` responses or at 40 trials.
- Control/Critical missing rate >20% marks the session invalid.
- Summary includes set side, natural asymmetry, missing rates, contrast count, extinction status, and critical trial count.

## Generic uploaded Fixed-Set tasks (lines, auditory, etc.)

For a custom uploaded task, build it as a normal Blank Experiment. To use adaptive orientation:

1. Mark the equal baseline block as `Adaptive role = Control`.
2. Mark the induction block as `Adaptive role = Set` and upload exactly two variants in this order:
   - Variant A: matches Direction A response (for example large-left or first-louder).
   - Variant B: matches Direction B response (for example large-right or second-louder).
3. Set the Direction A, Equal, and Direction B keys (default 1 / 2 / 3) and threshold (default .70).
4. Mark the final equal block as `Adaptive role = Critical` if you want generic Fixed-Set missing-rate validity in the session summary.
5. For extinction, choose `Stopping rule = Consecutive response`, response key `2`, count `10`, and set the block maximum trials to `40`.

Do not put an Instruction or Break between Set and Critical if your protocol requires immediate transition.

## Supabase setup

Edit `assets/config.js`:

```js
window.COG_CONFIG = {
  SUPABASE_URL: "YOUR_PROJECT_URL",
  SUPABASE_PUBLISHABLE_KEY: "YOUR_PUBLISHABLE_KEY",
  DEMO_MODE: false,
  BUILD: "7.0.0-final-universal-builder"
};
```

Never place a secret/service-role key in browser code.

Run `supabase/schema.sql` in the Supabase SQL editor, create an Auth user manually, then add that user's UUID to `public.admin_users`.

The `stimuli` Storage bucket is public-read and admin-write under the supplied schema.

## Deployment

Upload the contents of this folder to the root of the `CogExperiments` GitHub repository and publish with GitHub Pages. v7.0 query-string cache busting is already included in the HTML files.

## Test checklist before collecting real data

- Confirm screen calibration with a physical card on each visual device class.
- Confirm calibrated 40/60/80 mm circles with a ruler on screen.
- Confirm fixation stays visible during visual ISI and disappears entirely when Fixation = None.
- Confirm Sequential order is A → B → A → B.
- Confirm Random works.
- Confirm Pseudorandom is balanced and contains no run longer than 2 when feasible.
- Confirm a second/third keypress on one trial does not replace the first response and appears only in extra-keypress metadata.
- Confirm a no-response trial exports `Missing = TRUE` with blank response and RT.
- Confirm `Until next stimulus` accepts a response during ISI and labels `Response_During = isi`.
- Confirm generic adaptive Set selects one variant and keeps it fixed for all Set trials.
- Confirm Critical stopping rule stops at 10 consecutive equal responses.
- Confirm built-in circle Set → Critical has no transition screen.
- Confirm Excel has Participants, Trial_Data, and Experiment_Settings.
- Repeat tests in Demo Mode and again after Supabase is connected.
