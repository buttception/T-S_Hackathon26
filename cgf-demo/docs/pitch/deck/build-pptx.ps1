param([string]$Out, [string]$Shots, [string]$Png)
$ErrorActionPreference = 'Stop'
$wasRunning = [bool](Get-Process POWERPNT -ErrorAction SilentlyContinue)

# characters kept as escapes so the script survives any file encoding
$ap = [char]0x2019; $up = [char]0x25B2; $dn = [char]0x25BC; $dot = [char]0x00B7; $dsh = [char]0x2013; $chk = [char]0x2713; $mul = [char]0x00D7; $ell = [char]0x2026

function C([string]$h) { [Convert]::ToInt32($h.Substring(0,2),16) + 256*[Convert]::ToInt32($h.Substring(2,2),16) + 65536*[Convert]::ToInt32($h.Substring(4,2),16) }
$SANS = 'Segoe UI'; $MONO = 'Consolas'
# Eevee's tokens (css/tokens.css)
$BG='0B1420'; $PANEL='111C2B'; $RAISED='16243A'; $BORDER='24364D'; $BORDER2='3A5577'; $TEXT='D6E2F0'; $STRONG='E6EDF5'; $MUTED='8AA0B8'
$ACCENT='4DA6FF'; $VIOL='B58CFF'; $AIBG='251A3D'; $AITEXT='E6D9FF'; $AIDEEP='1A1230'; $AILINE='6A4FB0'; $CAUTION='FFE1C2'; $SUNK='1C2B40'

$ppt = New-Object -ComObject PowerPoint.Application
$pres = $ppt.Presentations.Add(0)
$pres.PageSetup.SlideWidth = 960; $pres.PageSetup.SlideHeight = 540

# theme: Eevee's palette into the deck's theme colours and fonts, so new slides follow it
$cs = $pres.SlideMaster.Theme.ThemeColorScheme
$map = @{1=$BG; 2=$STRONG; 3=$PANEL; 4=$TEXT; 5=$ACCENT; 6=$VIOL; 7='FFA94D'; 8='00A8DC'; 9=$MUTED; 10=$RAISED; 11=$ACCENT; 12=$VIOL}
foreach ($k in $map.Keys) { $cs.Colors($k).RGB = (C $map[$k]) }
$pres.SlideMaster.Theme.ThemeFontScheme.MajorFont.Item(1).Name = $SANS
$pres.SlideMaster.Theme.ThemeFontScheme.MinorFont.Item(1).Name = $SANS
$pres.SlideMaster.Background.Fill.ForeColor.RGB = (C $BG)

$script:n = 0
function NewSlide([string]$bg, [string]$title, [double]$tsize, [double]$ty, [double]$tw, [double]$th, [string]$tcol) {
  $script:n++
  $s = $pres.Slides.Add($script:n, 11)   # title only
  $s.FollowMasterBackground = 0
  $s.Background.Fill.Solid(); $s.Background.Fill.ForeColor.RGB = (C $bg)
  $t = $s.Shapes.Title
  $t.Left = 48; $t.Top = $ty; $t.Width = $tw; $t.Height = $th
  $tf = $t.TextFrame; $tf.WordWrap = -1; $tf.AutoSize = 0; $tf.VerticalAnchor = 1
  $tf.MarginLeft = 0; $tf.MarginRight = 0; $tf.MarginTop = 0; $tf.MarginBottom = 0
  $r = $tf.TextRange; $r.Text = $title; $r.ParagraphFormat.Alignment = 1
  $r.Font.Name = $SANS; $r.Font.Size = $tsize; $r.Font.Bold = -1; $r.Font.Color.RGB = (C $tcol)
  return $s
}
function T($s, [double]$x, [double]$y, [double]$w, [double]$h, [string]$text, [double]$size, [string]$col, [bool]$bold = $false, [string]$font = $SANS, [int]$align = 1) {
  $sh = $s.Shapes.AddTextbox(1, $x, $y, $w, $h)
  $tf = $sh.TextFrame; $tf.WordWrap = -1; $tf.AutoSize = 0
  $tf.MarginLeft = 0; $tf.MarginRight = 0; $tf.MarginTop = 0; $tf.MarginBottom = 0
  $sh.Height = $h
  $r = $tf.TextRange; $r.Text = $text; $r.ParagraphFormat.Alignment = $align
  $r.Font.Name = $font; $r.Font.Size = $size; $r.Font.Bold = $(if ($bold) { -1 } else { 0 }); $r.Font.Color.RGB = (C $col)
  return $sh
}
function Box($s, [double]$x, [double]$y, [double]$w, [double]$h, [string]$fill, [string]$line, [int]$kind = 5, [double]$radius = 0.06) {
  $sh = $s.Shapes.AddShape($kind, $x, $y, $w, $h)
  if ($kind -eq 5) { $sh.Adjustments.Item(1) = $radius }
  $sh.Fill.Solid(); $sh.Fill.ForeColor.RGB = (C $fill)
  if ($line) { $sh.Line.ForeColor.RGB = (C $line); $sh.Line.Weight = 0.75 } else { $sh.Line.Visible = 0 }
  $sh.Shadow.Visible = 0
  return $sh
}
function Eyebrow($s, [string]$text, [string]$col) { [void](T $s 48 36 700 20 $text.ToUpper() 14 $col $false $MONO) }
function Footer($s, [string]$left, [string]$col) {
  [void](T $s 48 504 700 18 $left 12 $col $false $MONO)
  [void](T $s 812 504 100 18 ('{0:00}' -f $script:n) 12 $col $false $MONO 3)
}
function Notes($s, [string]$text) { $s.NotesPage.Shapes.Placeholders(2).TextFrame.TextRange.Text = $text }
function Pic($s, [string]$name, [double]$x, [double]$y, [double]$w, [string]$alt) {
  $p = $s.Shapes.AddPicture((Join-Path $Shots $name), 0, -1, $x, $y, $w, ($w * 808 / 1576))
  $p.Line.Visible = -1; $p.Line.ForeColor.RGB = (C $BORDER2); $p.Line.Weight = 0.75
  $p.AlternativeText = $alt
  return $p
}
function Block($s, [double]$x, [double]$y, [double]$w, [string]$head, [string]$body, [string]$hc = $STRONG, [string]$bc = $TEXT) {
  [void](T $s $x $y $w 26 $head 18 $hc $true)
  [void](T $s $x ($y + 28) $w 64 $body 14 $bc)
}
function Card($s, [double]$x, [double]$y, [double]$w, [double]$h, [string]$label, [string]$head, [string]$body, [bool]$ai = $false) {
  $fill = $(if ($ai) { $AIDEEP } else { $RAISED }); $line = $(if ($ai) { $AILINE } else { $BORDER })
  [void](Box $s $x $y $w $h $fill $line)
  [void](T $s ($x + 20) ($y + 18) ($w - 40) 20 $label 14 $(if ($ai) { $VIOL } else { $MUTED }) $false $MONO)
  [void](T $s ($x + 20) ($y + 44) ($w - 40) 60 $head 22 $(if ($ai) { 'F3ECFF' } else { $STRONG }) $true)
  [void](T $s ($x + 20) ($y + 104) ($w - 40) ($h - 116) $body 16 $(if ($ai) { $AITEXT } else { $TEXT }))
}
function StyleTable($tbl, [string[]]$rowFills, [string]$headFill) {
  $tbl.ApplyStyle('{2D5ABB26-0587-4C30-8999-92F81FD0307C}', $false)
  for ($r = 1; $r -le $tbl.Rows.Count; $r++) {
    for ($c = 1; $c -le $tbl.Columns.Count; $c++) {
      $cell = $tbl.Cell($r, $c); $sh = $cell.Shape
      $sh.Fill.Solid(); $sh.Fill.ForeColor.RGB = (C $(if ($r -eq 1) { $headFill } else { $rowFills[($r - 2) % 2] }))
      $sh.TextFrame.MarginLeft = 14; $sh.TextFrame.MarginRight = 10; $sh.TextFrame.VerticalAnchor = 3
    }
  }
}
function CellText($tbl, [int]$r, [int]$c, [string]$text, [double]$size, [string]$col, [bool]$bold = $false) {
  $tr = $tbl.Cell($r, $c).Shape.TextFrame.TextRange
  $tr.Text = $text; $tr.Font.Name = $SANS; $tr.Font.Size = $size; $tr.Font.Bold = $(if ($bold) { -1 } else { 0 }); $tr.Font.Color.RGB = (C $col)
}

# ---------------------------------------------------------------- 1 cover
$s = NewSlide $BG 'Adaptive CGF Trainer' 60 168 520 140 $STRONG
$cx = 790; $cy = 270
foreach ($r in 70, 140, 205, 255) { $o = $s.Shapes.AddShape(9, $cx - $r, $cy - $r, 2 * $r, 2 * $r); $o.Fill.Visible = 0; $o.Line.ForeColor.RGB = (C $BORDER); $o.Line.Weight = 1.5; $o.ZOrder(1) }
foreach ($d in @(@($cx, ($cy - 255), $cx, ($cy + 255)), @(($cx - 255), $cy, ($cx + 255), $cy))) { $l = $s.Shapes.AddLine($d[0], $d[1], $d[2], $d[3]); $l.Line.ForeColor.RGB = (C $BORDER); $l.Line.Weight = 1; $l.ZOrder(1) }
$sw = $s.Shapes.AddLine($cx, $cy, $cx + 175, $cy - 175); $sw.Line.ForeColor.RGB = (C $VIOL); $sw.Line.Weight = 2
$own = Box $s ($cx - 8) ($cy - 8) 16 16 '00A8DC' $null 9
$ring = $s.Shapes.AddShape(9, $cx - 17, $cy - 17, 34, 34); $ring.Fill.Visible = 0; $ring.Line.ForeColor.RGB = (C '80E0FF'); $ring.Line.Weight = 2
foreach ($d in @(@(88, -118), @(-120, -150), @(-100, 105))) { $dm = $s.Shapes.AddShape(4, $cx + $d[0] - 12, $cy + $d[1] - 12, 24, 24); $dm.Fill.Visible = 0; $dm.Line.ForeColor.RGB = (C 'FF8080'); $dm.Line.Weight = 2.25 }
$nq = $s.Shapes.AddShape(1, $cx + 118, $cy + 92, 18, 18); $nq.Fill.Visible = 0; $nq.Line.ForeColor.RGB = (C 'AAFFAA'); $nq.Line.Weight = 2.25
$s.Shapes.Title.AlternativeText = 'Adaptive CGF Trainer'
[void](T $s 48 136 520 20 ('HACKATHON PROTOTYPE  ·  SYNTHETIC DATA'.Replace('  ·  ', "  $dot  ")) 14 $ACCENT $false $MONO)
[void](T $s 48 318 470 100 "Computer-generated forces that find each trainee${ap}s focus area, work inside limits the instructor sets, and explain every move." 20 $TEXT)
[void](T $s 48 436 470 24 'Air, sea and land platforms. Runs offline from a file.' 16 $MUTED)
Notes $s "Open by naming the gap: one instructor, many trainees, one scripted enemy. We built a trainer where the enemy adapts to each trainee and the instructor stays in command. Everything shown uses synthetic data."

# ---------------------------------------------------------------- 2 problem
$s = NewSlide $PANEL 'One instructor, many trainees, one scripted enemy' 40 62 864 100 $STRONG
Eyebrow $s "01 $dot The problem" $ACCENT
$cw = 272
Card $s 48 190 $cw 250 '01' 'Same scenario for all' "Fixed scenarios train the average trainee."
Card $s (48 + $cw + 24) 190 $cw 250 '02' 'Weak spots by chance' "Each person${ap}s focus area is practised only if the script happens to reach it."
Card $s (48 + 2 * ($cw + 24)) 190 $cw 250 '03' 'No time to retune' "The instructor cannot adjust the enemy for every seat while running the exercise."
Footer $s 'ADAPTIVE CGF TRAINER' $MUTED
Notes $s "One instructor runs many trainees. A fixed scenario trains the average, so a trainee${ap}s weak spot is practised by chance. The instructor has no spare hands to retune the enemy per seat. Do not quote figures here; we have none."

# ---------------------------------------------------------------- 3 idea
$s = NewSlide $AIBG 'History picks what to exercise. Live behaviour sets how hard.' 36 62 864 100 'F3ECFF'
Eyebrow $s "02 $dot The idea" $VIOL
Card $s 48 180 420 220 ('EXPERIENCE  ·  WHAT'.Replace('  ·  ', "  $dot  ")) 'The trainee profile' "Kept across sessions. The weakest competency with enough evidence becomes the target." $true
Card $s 492 180 420 220 ('CURRENT BEHAVIOUR  ·  HOW HARD'.Replace('  ·  ', "  $dot  ")) 'The last 10 events' "Doing well on the target: raise the pressure. Struggling: ease off." $true
[void](T $s 48 424 864 50 "Adjustments change CGF settings only. They never change the trainee${ap}s score or the outcome." 20 $AITEXT)
Footer $s 'ADAPTIVE CGF TRAINER' $VIOL
Notes $s "The core idea in one sentence. The profile decides which competency to exercise. This run${ap}s behaviour decides how hard to push it. Today${ap}s evidence also updates the profile, so a trainee who improves stops being the target."

# ---------------------------------------------------------------- 4 loop
$s = NewSlide $BG 'Allocate, run, report, update' 40 62 864 60 $STRONG
Eyebrow $s "03 $dot The loop" $ACCENT
$w = 186; $g = 40; $y = 190
$steps = @(@('allocate.html', 'Allocate', 'Platform, crew, limits.', $false), @('runtime.html', 'Run', 'The CGFs adapt and say why.', $false), @('report.html', 'Report', 'A debrief for each trainee.', $false), @('profile + history', 'Update', 'The next session starts from it.', $true))
for ($i = 0; $i -lt 4; $i++) {
  $x = 48 + $i * ($w + $g); $st = $steps[$i]; $ai = $st[3]
  [void](Box $s $x $y $w 190 $(if ($ai) { $AIBG } else { $RAISED }) $(if ($ai) { $AILINE } else { $BORDER }))
  [void](T $s ($x + 16) ($y + 18) ($w - 32) 20 $st[0] 12 $(if ($ai) { $VIOL } else { $ACCENT }) $false $MONO)
  [void](T $s ($x + 16) ($y + 48) ($w - 32) 34 $st[1] 24 $(if ($ai) { 'F3ECFF' } else { $STRONG }) $true)
  [void](T $s ($x + 16) ($y + 94) ($w - 32) 80 $st[2] 16 $(if ($ai) { $AITEXT } else { $TEXT }))
  if ($i -lt 3) { $a = Box $s ($x + $w + 8) ($y + 87) 24 16 $BORDER2 $null 33 }
}
[void](T $s 48 420 864 30 'Every page opens from a file. No server, no install.' 18 $MUTED)
Footer $s 'ADAPTIVE CGF TRAINER' $MUTED
Notes $s "Four steps, each a page that opens from a file. The report feeds the competency update, which writes the trainee${ap}s history, so the loop closes. Next slides walk through the steps."

# ---------------------------------------------------------------- 5 allocate
$s = NewSlide $PANEL 'Choose the platform, seat the crew, set the limits' 36 62 864 100 $STRONG
Eyebrow $s "04 $dot Allocate" $ACCENT
Block $s 48 176 250 'Six platforms' 'Fighter, warship and tank, two models each, with their own seats.'
Block $s 48 282 250 'Know the trainee' 'Competency bars and focus areas per seat, plus a private note.'
Block $s 48 388 250 'Practice or assess' 'The mode badge, run length and the envelope are set before start.'
[void](Pic $s 'allocate_c.png' 322 176 590 'The trainee allocation page: warship crew seats on the left, trainee pool with competency bars on the right')
Footer $s "ADAPTIVE CGF TRAINER  $dot  SYNTHETIC TRAINEES" $MUTED
Notes $s "Live beat if the demo runs: pick the warship, press Suggest demo crew, point at the competency bars and the likely first target, then the Adaptive practice badge. Fallback: this screenshot. All names are synthetic."

# ---------------------------------------------------------------- 6 run
$s = NewSlide $BG 'The enemy reacts to this crew, not a script' 36 62 864 100 $STRONG
Eyebrow $s "05 $dot Run" $ACCENT
[void](Pic $s 'runtime_c.png' 48 176 590 'The runtime: a strait transit map with red, black, pirate and neutral contacts, and the contact list beside it')
Block $s 662 176 250 'Targets the focus area' 'The first pressure lands on the competency the profile says needs it.'
Block $s 662 282 250 'Forces cooperate' 'A unit that meets a response shares it, and nearby units join in.'
Block $s 662 388 250 'Invisible to the trainee' 'The trainee sees an exercise. The reasoning shows to the instructor.'
Footer $s "ADAPTIVE CGF TRAINER  $dot  STRAIT TRANSIT SCENARIO" $MUTED
Notes $s "Warship crew on the strait transit scenario, the one scenario with a competency signal today. Start the run. The CGFs press hails at the navigation seat because that is the history-based target. Fallback: the recorded clip."

# ---------------------------------------------------------------- 7 reasoning
$s = NewSlide $PANEL 'Every adjustment shows what, why and on what evidence' 36 62 864 100 $STRONG
Eyebrow $s "06 $dot Explained" $ACCENT
$cards = @(
  @('HISTORY', "$up raise", 'hail discipline', "No recent hail discipline events, and it is the weakest of this seat${ap}s focus areas, so the hail-warning weight went from 1 to 1.25 to create exposure."),
  @('LIVE', "$dn ease off", 'hail discipline', "trainee_b handled only 1 of the last 5 hail discipline events, so the hail-warning weight went from 1.25 to 1.1 to ease the pressure."))
for ($i = 0; $i -lt 2; $i++) {
  $y = 176 + $i * 156; $c = $cards[$i]
  [void](Box $s 48 $y 420 140 $RAISED $BORDER)
  $pill = Box $s 66 ($y + 16) 78 24 $AIBG $VIOL 5 0.3
  $pt = $pill.TextFrame; $pt.MarginLeft = 0; $pt.MarginRight = 0; $pt.MarginTop = 0; $pt.MarginBottom = 0
  $pr = $pt.TextRange; $pr.Text = $c[0]; $pr.Font.Name = $MONO; $pr.Font.Size = 12; $pr.Font.Bold = -1; $pr.Font.Color.RGB = (C $AITEXT); $pr.ParagraphFormat.Alignment = 2
  [void](T $s 156 ($y + 17) 110 22 $c[1] 16 $STRONG $true)
  [void](T $s 270 ($y + 20) 180 20 $c[2] 12 $MUTED $false $MONO)
  [void](T $s 66 ($y + 52) 384 80 $c[3] 14 $TEXT)
}
[void](T $s 492 176 420 24 'Success rate over the last 10 events on the target' 16 $STRONG $true)
$zones = @(@(492, 160, 'below 40%', "$dn Ease off", $SUNK, $BORDER2, $MUTED, $STRONG), @(662, 120, "40${dsh}70%", 'Hold', $RAISED, $BORDER, $MUTED, $STRONG), @(792, 120, 'above 70%', "$up Raise", $AIBG, $VIOL, $AITEXT, 'F3ECFF'))
foreach ($z in $zones) {
  [void](Box $s $z[0] 208 $z[1] 72 $z[4] $z[5] 5 0.1)
  [void](T $s ($z[0] + 12) 218 ($z[1] - 20) 18 $z[2] 12 $z[6] $false $MONO)
  [void](T $s ($z[0] + 12) 240 ($z[1] - 20) 28 $z[3] 18 $z[7] $true)
}
$b = T $s 492 308 420 150 "Fewer than 3 events: no rate yet, so exposure stays up.`rEasing stops at the instructor${ap}s base setting.`rEvery step stays inside the envelope." 16 $TEXT
$b.TextFrame.TextRange.ParagraphFormat.Bullet.Visible = -1; $b.TextFrame.TextRange.ParagraphFormat.Bullet.Character = 8226
$b.TextFrame.TextRange.ParagraphFormat.SpaceAfter = 8; $b.TextFrame.Ruler.Levels(1).FirstMargin = 0; $b.TextFrame.Ruler.Levels(1).LeftMargin = 16
Footer $s "ILLUSTRATIVE VALUES  $dot  WORDING AS THE PANEL WRITES IT" $MUTED
Notes $s "Open the Reasoning tab during the run. Each entry shows direction, setting change, the evidence events and a one-line reason, tagged history, live, team or instructor. The rule: when the trainee does well on the target the CGFs get harder, when they struggle they ease off, never below the instructor${ap}s base. The two cards show the panel${ap}s wording with illustrative values."

# ---------------------------------------------------------------- 8 control
$s = NewSlide $BG "The instructor stays in command" 40 62 864 60 $STRONG
Eyebrow $s "07 $dot Control" $ACCENT
$items = @(
  @('1', 'Limits the AI cannot leave', 'Min, base and max for each setting. A clamped value is marked.', $false),
  @('2', 'Fixed mode for assessment', 'Zero adjustments, a different badge. Practice and assessment stay apart.', $false),
  @('3', 'Steer in plain language', 'The typed request becomes a directive, shown before it applies.', $true),
  @('4', 'Figures come from code', 'The optional local LLM only rephrases. It never adds a number.', $true))
for ($i = 0; $i -lt 4; $i++) {
  $x = 48 + ($i % 2) * 444; $y = 150 + [math]::Floor($i / 2) * 170; $it = $items[$i]
  [void](Box $s $x $y 420 154 $RAISED $BORDER)
  $ci = Box $s ($x + 22) ($y + 22) 40 40 $(if ($it[3]) { $AIBG } else { $SUNK }) $(if ($it[3]) { $VIOL } else { $BORDER2 }) 9
  $ct = $ci.TextFrame; $ct.MarginLeft = 0; $ct.MarginRight = 0; $ct.MarginTop = 0; $ct.MarginBottom = 0
  $cr = $ct.TextRange; $cr.Text = $it[0]; $cr.Font.Name = $MONO; $cr.Font.Size = 18; $cr.Font.Bold = -1; $cr.Font.Color.RGB = (C $(if ($it[3]) { $AITEXT } else { $STRONG })); $cr.ParagraphFormat.Alignment = 2
  [void](T $s ($x + 78) ($y + 26) 326 32 $it[1] 20 $STRONG $true)
  [void](T $s ($x + 22) ($y + 78) 376 66 $it[2] 16 $TEXT)
}
Footer $s 'ADAPTIVE CGF TRAINER' $MUTED
Notes $s "Answer the standing worry: does adaptation break standardised assessment? Practice runs adapt, fixed mode is for qualification, and the badge differs. The demo runs with the local LLM off; every LLM feature has a template fallback. Steering: type a request, show the parsed directive, then apply."

# ---------------------------------------------------------------- 9 debrief
$s = NewSlide $PANEL 'The report feeds the profile for next time' 36 62 864 100 $STRONG
Eyebrow $s "08 $dot Debrief" $ACCENT
Block $s 48 176 250 'One debrief per trainee' 'Events handled, focus area, and why the CGFs acted.'
Block $s 48 282 250 'Pressure over time' "A chart of CGF pressure against the trainee${ap}s success rate."
Block $s 48 388 250 'Then the update' 'The profile and history change, and the next target is predicted.'
[void](Pic $s 'report_c.png' 322 176 590 'The end-of-training report: a table of trainees, a debrief with focus area, and a chart of CGF pressure')
Footer $s "ADAPTIVE CGF TRAINER  $dot  SEEDED SESSION" $MUTED
Notes $s "Code computes every figure in the report; the narrative is a template. The order is fixed: report, then competency update, then the history entry. The screenshot is a seeded session, not a live run."

# ---------------------------------------------------------------- 10 cohort
$s = NewSlide $BG 'Where the whole intake is developing' 36 62 864 100 $STRONG
Eyebrow $s "09 $dot Cohort" $ACCENT
[void](Pic $s 'cohort_c.png' 48 176 590 'The cohort overview: competency means across 22 trainees and a heatmap by trainee')
Block $s 662 176 250 '22 synthetic trainees' 'A heatmap of competencies, with the evidence behind each cell.'
Block $s 662 282 250 '5 of 9 measured' "The other four read $([char]0x201C)no evidence$([char]0x201D) until the simulator emits events for them."
Block $s 662 388 250 'For the curriculum' 'Not for ranking people.'
Footer $s "ADAPTIVE CGF TRAINER  $dot  SYNTHETIC COHORT" $MUTED
Notes $s "The cohort view is for improving the curriculum, never for judging individuals, and its own banner says so. Adaptive runs give different exercises, so these figures are not qualification results."

# ---------------------------------------------------------------- 11 roadmap
$s = NewSlide $PANEL 'Built today, and what is still roadmap' 40 62 864 60 $STRONG
Eyebrow $s "10 $dot What comes next" $ACCENT
$rows = @(@('Item', 'Status'), @('Settings and events as contracts', "$chk Built"), @('Adaptation on the sea scenario, five competencies', "$chk Built"), @('Air and land scenarios emit competency events', 'Not built'), @('Crew and team competencies, crew report', 'Not built'), @('Adapter to a real simulator over HLA or DIS', 'Not built'), @('Trial with real cohorts', 'Not started'))
$ts = $s.Shapes.AddTable($rows.Count, 2, 48, 150, 864, 44 * $rows.Count)
$tbl = $ts.Table; $tbl.Columns.Item(1).Width = 600; $tbl.Columns.Item(2).Width = 264
StyleTable $tbl @($RAISED, $PANEL) $SUNK
for ($r = 1; $r -le $rows.Count; $r++) {
  $tbl.Rows.Item($r).Height = 44
  CellText $tbl $r 1 $rows[$r - 1][0] 18 $(if ($r -eq 1) { $STRONG } else { $TEXT }) ($r -eq 1)
  CellText $tbl $r 2 $rows[$r - 1][1] 18 $(if ($r -eq 1) { $STRONG } elseif ($rows[$r - 1][1] -like "$chk*") { $STRONG } else { $CAUTION }) ($r -eq 1)
}
$ts.Name = 'Roadmap table'; $ts.AlternativeText = 'Table of built and not-built items'
Footer $s "NO COMPATIBILITY CLAIMED WITH ANY NAMED SIMULATOR OR STANDARD" $MUTED
Notes $s "Be plain about what is not built. The engine changes a small, explicit set of CGF settings, so it can map onto an existing simulator${ap}s controls instead of replacing it. That adapter needs the target simulator${ap}s object model. Proving training transfer needs a trial with real cohorts, which is the proposed next step."

# ---------------------------------------------------------------- 12 business
$s = NewSlide $BG 'Fewer sessions to proficiency, less instructor time' 36 62 864 100 $STRONG
Eyebrow $s "11 $dot Business case" $ACCENT
$fb = Box $s 48 160 660 52 $RAISED $BORDER
$fr = T $s 66 172 630 30 "Saving = N $mul S0 $mul r $mul (C_session + h $mul C_instr)" 22 $STRONG $false $MONO
$rows = @(@('Symbol', 'Meaning', 'Value'), @('N', 'Trainees per year', '[division figure]'), @('S0', 'Sessions to proficiency today', '[division figure]'), @('r', 'Fractional reduction in sessions', 'assumed range, no trial yet'), @('C_session', 'Cost per simulator session', '[division figure]'), @('h, C_instr', 'Instructor hours, cost per hour', '[division figure]'))
$ts = $s.Shapes.AddTable($rows.Count, 3, 48, 230, 864, 40 * $rows.Count)
$tbl = $ts.Table; $tbl.Columns.Item(1).Width = 150; $tbl.Columns.Item(2).Width = 400; $tbl.Columns.Item(3).Width = 314
StyleTable $tbl @($RAISED, $PANEL) $SUNK
for ($r = 1; $r -le $rows.Count; $r++) {
  $tbl.Rows.Item($r).Height = 40
  for ($c = 1; $c -le 3; $c++) {
    $col = $(if ($r -eq 1) { $STRONG } elseif ($c -eq 3) { if ($rows[$r - 1][2] -like '*range*') { $AITEXT } else { $CAUTION } } else { $TEXT })
    CellText $tbl $r $c $rows[$r - 1][$c - 1] 16 $col ($r -eq 1)
  }
}
$ts.Name = 'Savings model table'; $ts.AlternativeText = 'Savings model symbols and the figures still needed'
Footer $s "NO INVENTED FIGURES  $dot  r IS SHOWN AS A RANGE" $MUTED
Notes $s "Fill the bracketed figures from the division before presenting; until then say they are blanks. Show r as a low, mid and high range and say assumed next to each. Do not present a saving as a result: the demo shows the mechanism, not training transfer."

# ---------------------------------------------------------------- 13 close
$s = NewSlide $AIBG "Exercises each trainee${ap}s weak spot, inside limits the instructor sets, and explains every step." 40 150 800 190 'F3ECFF'
[void](T $s 48 110 600 24 'ADAPTIVE CGF TRAINER' 16 $VIOL $false $MONO)
[void](T $s 48 380 700 26 'github.com/buttception/T-S_Hackathon26' 18 $AITEXT $false $MONO)
Notes $s "One sentence to close. Then questions: practice runs adapt and fixed mode assesses; the AI acts only inside the instructor${ap}s limits; the demo shows the mechanism, and proving training transfer needs a trial with real cohorts."

$pres.SaveAs($Out)
if ($Png) { New-Item -ItemType Directory -Force $Png | Out-Null; $pres.Export($Png, 'PNG', 1600, 900) }
$pres.Close()
if (-not $wasRunning) { $ppt.Quit() }
"saved $Out ($script:n slides)"
