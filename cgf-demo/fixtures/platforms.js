// Player platforms for the allocation page: three types, two real models each, and the trainee seats of each.
//
// A seat is a TRAINEE STATION, not the vehicle's whole crew. The seat counts per type are set by the exercise
// design (fighter 2, warship 3, tank 2); crew members nobody fills are simulated. Real crews are larger for
// the tanks (4) and the warships (70 or more), as noted on each model.
//
// "focus" lists the competencies (docs/INTERFACES.md §1) a seat mostly influences. It is a proposed mapping,
// provisional like the competency list itself. The page only uses it to highlight roster columns.
//
// Facts come from the sources linked on each model. Where a source did not say, the seat text says
// "defined for this exercise" instead of presenting it as a real billet.
(function () {
  'use strict';
  const F = window.CGF_FIXTURES = window.CGF_FIXTURES || {};

  F.platformTypes = {
    fighter: {
      label: 'Fighter (2 seats)', domain: 'air', seats: ['pilot', 'weapon'],
      seatFocus: {
        pilot:  ['collision_avoidance', 'territorial_awareness', 'hail_discipline'],
        weapon: ['weapons_discipline', 'piracy_response']
      }
    },
    warship: {
      label: 'Warship (3 seats)', domain: 'sea', seats: ['weapons', 'sensors', 'navigation'],
      seatFocus: {
        weapons:    ['weapons_discipline'],
        sensors:    ['piracy_response'],
        navigation: ['collision_avoidance', 'territorial_awareness', 'hail_discipline']
      }
    },
    tank: {
      label: 'Tank (2 seats)', domain: 'land', seats: ['commander', 'driver'],
      seatFocus: {
        commander: ['hail_discipline', 'weapons_discipline', 'piracy_response'],
        driver:    ['collision_avoidance', 'territorial_awareness']
      }
    }
  };

  F.platformModels = [
    {
      id: 'f15e', type: 'fighter', name: 'F-15E Strike Eagle', operator: 'US Air Force',
      realCrew: '2 (pilot and weapon systems officer)',
      source: 'https://www.af.mil/News/Article-Display/Article/104499/f-15e-strike-eagle/',
      seats: {
        pilot:  { label: 'Pilot (front seat)', text: 'Flies the aircraft, manages the air-to-air radar and engages enemy aircraft.' },
        weapon: { label: 'Weapon systems officer (rear seat)', text: 'Runs the radar, electronic warfare and infrared sensors, watches weapon status and threats, selects targets and navigates on the moving map.' }
      }
    },
    {
      id: 'fa18f', type: 'fighter', name: 'F/A-18F Super Hornet', operator: 'US Navy and Royal Australian Air Force',
      realCrew: '2 (pilot and weapon systems officer)',
      source: 'https://www.defence.gov.au/news-events/news/2024-12-13/experts-take-flight-townsville',
      seats: {
        pilot:  { label: 'Pilot', text: 'Flies the aircraft; the mission system is shared with the rear seat.' },
        weapon: { label: 'Weapon systems officer (rear seat)', text: 'Operates the targeting infrared pod and programs the munitions; both seats can aim weapons and sensors with the helmet-mounted cueing system.' }
      }
    },
    {
      id: 'formidable', type: 'warship', name: 'Formidable-class frigate', operator: 'Republic of Singapore Navy',
      realCrew: '70 or more',
      source: 'https://www.mindef.gov.sg/news-and-events/latest-releases/21jul18_fs/',
      note: 'No public Formidable-class watch bill was found, so the three seats are generic navy watch roles (US Navy practice: https://man.fas.org/dod-101/navy/docs/swos/stu2/STU01.html, https://en.wikipedia.org/wiki/Officer_of_the_deck), shown with the ship systems the MINDEF fact sheet lists. Real RSN billet titles may differ.',
      seats: {
        weapons:    { label: 'Tactical Action Officer (weapons)', text: 'The commanding officer\'s representative for weapons employment and ship defence; does the primary threat evaluation in the combat information centre. Weapons: Aster missiles on the Sylver launcher, Harpoon and the 76 mm gun.' },
        sensors:    { label: 'Operations specialist (air and surface picture)', text: 'Combat information centre watchstander who owns a section of the tactical picture, here the air and surface picture, from the Herakles multi-function radar and the combat management system.' },
        navigation: { label: 'Officer of the Deck (bridge)', text: 'In charge of navigation and safety of the ship on the bridge: orders courses and speed, and watches the navigation radar (Scanter 2001). The helmsman who steers is simulated.' }
      }
    },
    {
      id: 'lcs-independence', type: 'warship', name: 'Independence-class LCS', operator: 'US Navy (littoral combat ship; not the RSN littoral mission vessel)',
      realCrew: 'A lean crew, far smaller than a traditional ship',
      source: 'https://en.wikipedia.org/wiki/Independence-class_littoral_combat_ship',
      note: 'This is a US Navy class, so the seats use US Navy watch roles (https://man.fas.org/dod-101/navy/docs/swos/stu2/STU01.html, https://en.wikipedia.org/wiki/Officer_of_the_deck). The LCS manning concept differs from a traditional ship, so treat the split as a simplification for the exercise.',
      seats: {
        weapons:    { label: 'Tactical Action Officer (weapons)', text: 'The commanding officer\'s representative for weapons employment and ship defence; does the primary threat evaluation. Weapons employment runs through the ICMS combat management system.' },
        sensors:    { label: 'Operations specialist (air and surface picture)', text: 'Combat space watchstander who owns a section of the tactical picture, here the air and surface picture, from the SPS-77 Sea GIRAFFE radar.' },
        navigation: { label: 'Officer of the Deck (bridge)', text: 'In charge of navigation and safety of the ship on the bridge: orders courses and speed, with the Sperry BridgeMaster E navigation radar. The helmsman who steers is simulated.' }
      }
    },
    {
      id: 'leopard2sg', type: 'tank', name: 'Leopard 2SG', operator: 'Singapore Army',
      realCrew: '4 (commander, driver, gunner, loader)',
      source: 'https://www.defencepioneer.sg/pioneer-articles/UNLEASHING-THE-LEOPARD',
      note: 'Two of the four crew are trainee seats. The gunner and loader are simulated.',
      seats: {
        commander: { label: 'Commander', text: 'Sees friendly and enemy positions on the in-tank battle management display and gives the orders.' },
        driver:    { label: 'Driver', text: 'Drives the tank: heading and speed.' }
      }
    },
    {
      id: 'm1a2sepv3', type: 'tank', name: 'M1A2 SEPv3 Abrams', operator: 'US Army; also fielded by the Australian Army',
      realCrew: '4 (commander, gunner, loader, driver)',
      source: 'https://army.gov.au/equipment/vehicles-and-surveillance/m1a2-abrams-tank',
      note: 'Two of the four crew are trainee seats. The gunner and loader are simulated.',
      seats: {
        commander: { label: 'Commander', text: 'Commands the tank and its crew.' },
        driver:    { label: 'Driver', text: 'Drives the tank: heading and speed.' }
      }
    }
  ];
})();
