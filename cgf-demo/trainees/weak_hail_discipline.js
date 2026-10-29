// Scripted trainee: weak at hail discipline, otherwise the same as strong.js. They leave most of their first
// hails unanswered; after two hails they start answering, which lets the demo show the live signal easing
// the pressure (PLAN G1). Only the hail behaviour differs, so the comparison isolates that competency.
// The path "trainees/weak_hail_discipline.js" is the contract (fixtures/profiles/roster.js agentProfiles).
CGF.registerTraineeAgent('trainees/weak_hail_discipline.js', {
  id: 'weak_hail_discipline',
  label: 'Weak hail discipline (scripted)',
  hail: { ack: [{ after_hails: 0, p: 0.1 }, { after_hails: 2, p: 0.9 }], delay_s: [20, 60] },
  nav: {
    speed: 24,
    // Starts near Red's patrol boats and probes past them, so even a short run meets hails early
    start: { 'strait-transit': [-6, -38, 280] },
    routes: { 'strait-transit': [[-15, -34], [-14, -22], [-8, -12], [4, -2], [16, 8], [20, 64]] },
    cpa_margin: 1.5,
    respect_zones: true
  },
  weapons: { fc_misuse_p: 0 },
  piracy: { speed_up_p: 0.95, sprint: 26 }
});
