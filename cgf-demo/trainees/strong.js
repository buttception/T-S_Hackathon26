// Scripted trainee: strong all round. Answers nearly every hail promptly, keeps a wide berth, respects claimed
// zones, never locks fire-control on an escalating unit, and sprints when raiders close in.
// The path "trainees/strong.js" is the contract (fixtures/profiles/roster.js agentProfiles).
CGF.registerTraineeAgent('trainees/strong.js', {
  id: 'strong',
  label: 'Strong (scripted)',
  hail: { ack: [{ p: 0.95 }], delay_s: [8, 30] },
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
