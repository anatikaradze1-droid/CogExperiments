# CogExperiments v6.2 — Universal Calibrated Visual Builder

This build keeps the Uznadze circle Fixed Set preset, but **does not hard-code vertical-line stimuli**. New visual experiments can be assembled from uploaded files.

## New in v6.2

- Universal physical screen calibration using an 85.60 mm bank/ID card.
- Uploaded visual stimuli are visible in the Builder with preview cards.
- Two physical scaling modes for each image:
  1. **Whole image canvas** — set the full image Width/Height in mm.
  2. **Measured object / reference box** — define X/Y/W/H percentages for a known object inside the image, then give that object a real Width or Height in mm. The entire image is scaled from that reference while preserving geometry.
- Single/scene presentation or Pair presentation.
- Block-level fixation options:
  - generated red dot,
  - uploaded fixation image,
  - none.
- Fixation size can be calibrated in mm.
- During ISI the stimulus disappears but fixation remains.
- `Until next stimulus` response window: a response made during ISI is recorded for the previous trial; RT is measured from stimulus onset.
- Optional `Exposure only` and `Custom ms` response windows.
- Orientation/viewport changes invalidate calibration and force recalibration before the next trial.
- Participant page refreshes the latest published experiment definition at start.
- Generic Builder timeline remains fully editable: Instruction / Block / Break.
- Vertical lines are intentionally NOT included as a preset. Upload them to test that the generic calibrated workflow works.

## Recommended vertical-line test

Create a Blank experiment and make separate blocks as needed. Upload the line-pair PNG to the block as a **Single / complete scene image**. Choose `Measured object / reference box`, place the reference box around one known line, and set only that line's real height (for example 60 mm). The complete PNG will then be scaled from that measured line. The central fixation is overlaid separately and remains visible during ISI.

For images cropped tightly to the stimulus, `Whole image canvas` mode is simpler.

## Response timing example

If Exposure = 1000 ms and ISI = 1500 ms with `Until next stimulus`, the response window is 2500 ms total:

- 0–1000 ms: stimulus + fixation visible.
- 1000–2500 ms: stimulus hidden, fixation remains; responses still belong to the current/previously shown trial.
- At 2500 ms the next trial starts and the old response window closes.

## Demo vs Supabase

`assets/config.js` ships with `DEMO_MODE: true`. For live Supabase use, fill in the project URL and publishable key, then set `DEMO_MODE: false`.

Do not put a Supabase secret/service-role key in browser code.
