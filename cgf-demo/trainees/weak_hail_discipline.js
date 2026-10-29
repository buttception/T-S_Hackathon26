// Scripted trainee: weak at hail discipline, otherwise the same as strong.js. They leave most of their first
// hails unanswered; after four hails they start answering, which lets the demo show the live signal easing
// the pressure (PLAN G1). Only the hail behaviour differs, so the comparison isolates that competency.
// The path "trainees/weak_hail_discipline.js" is the contract (fixtures/profiles/roster.js agentProfiles).
CGF.registerTraineeAgent('trainees/weak_hail_discipline.js', {
  id: 'weak_hail_discipline',
  label: 'Weak hail discipline (scripted)',
  hail: { ack: [{ after_hails: 0, p: 0.1 }, { after_hails: 4, p: 0.9 }], delay_s: [20, 60] },
  nav: {
    speed: 24,
    routes: { 'strait-transit': [[-4, -44], [0, -28], [8, -8], [16, 12], [20, 64]] },
    cpa_margin: 1.5,
    respect_zones: true
  },
  weapons: { fc_misuse_p: 0 },
  piracy: { speed_up_p: 0.95, sprint: 26 }
});
