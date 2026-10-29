param([string]$Out, [string]$Shots, [string]$Png)
$ErrorActionPreference = 'Stop'
$wasRunning = [bool](Get-Process POWERPNT -ErrorAction SilentlyContinue)

# characters kept as escapes so the script survives any file encoding
$ap = [char]0x2019; $up = [char]0x25B2; $dn = [char]0x25BC; $dot = [char]0x00B7; $dsh = [char]0x2013; $chk = [char]0x2713; $mul = [char]0x00D7; $ell = [char]0x2026

function C([string]$h) { [Convert]::ToInt32($h.Substring(0,2),16) + 256*[Convert]::ToInt32($h.Substring(2,2),16) + 65536*[Convert]::ToInt32($h.Substring(4,2),16) }
$SANS = 'Segoe UI'; $MONO = 'Consolas'
# Eevee's tokens (css/tokens.css)
$BG='081421'; $PANEL='0D1C30'; $RAISED='12243C'; $BORDER='1E3653'; $BORDER2='4A78A8'; $TEXT='E1EAF4'; $STRONG='F7FAFD'; $MUTED='93ABC6'
$ACCENT='2F9DFF'; $VIOL='B98FFF'; $AIBG='24183F'; $AITEXT='EBDFFF'; $AIDEEP='160F2B'; $AILINE='6B4FB5'; $CAUTION='FFE4C7'; $SUNK='1A2D47'

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
function Eyebrow($s, [string]$text, [string]$col) { [void](T $s 48 36 470 20 $text.ToUpper() 14 $col $false $MONO) }
function Tag($s, [string]$text) { [void](T $s 520 36 392 20 $text.ToUpper() 12 $MUTED $false $MONO 3) }
function PicAt($s, [string]$name, [double]$x, [double]$y, [double]$w, [double]$h, [string]$alt) {
  $p = $s.Shapes.AddPicture((Join-Path $Shots $name), 0, -1, $x, $y, $w, $h)
  $p.Line.Visible = -1; $p.Line.ForeColor.RGB = (C $BORDER2); $p.Line.Weight = 0.75; $p.AlternativeText = $alt
  return $p
}
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

# ---------------------------------------------------------------- criteria
$s = NewSlide $PANEL 'How the deck answers the five judging criteria' 36 62 864 60 $STRONG
Eyebrow $s 'Judging criteria' $ACCENT
$rows = @(
  @('Criterion', 'What we show', 'Slides'),
  @("Demonstrated potential  ${dot}  30%", "The key challenge is met in the prototype: the enemy targets each trainee${ap}s weak spot, adapts to how they perform, and says why.", '4, 9'),
  @("Readiness  ${dot}  30%", 'The core loop runs end to end from a file. What is left is listed plainly.', '15'),
  @("Uniqueness  ${dot}  20%", 'It targets the weakness, not the overall difficulty, with the instructor in command.', '14'),
  @("Adoption of AI  ${dot}  20%", 'A learned trainee model, an adaptive policy, and an optional local language model.', '13'),
  @("Market potential  ${dot}  20%", 'Fewer simulator sessions and instructor hours, estimated in S$ with stated assumptions.', '16'))
$ts = $s.Shapes.AddTable($rows.Count, 3, 48, 140, 864, 330)
$tbl = $ts.Table; $tbl.Columns.Item(1).Width = 270; $tbl.Columns.Item(2).Width = 514; $tbl.Columns.Item(3).Width = 80
StyleTable $tbl @($RAISED, $PANEL) $SUNK
for ($r = 1; $r -le $rows.Count; $r++) {
  $tbl.Rows.Item($r).Height = $(if ($r -eq 1) { 34 } else { 62 })
  for ($c = 1; $c -le 3; $c++) { CellText $tbl $r $c $rows[$r - 1][$c - 1] $(if ($c -eq 1 -and $r -gt 1) { 16 } else { 15 }) $(if ($r -eq 1 -or $c -eq 1) { $STRONG } else { $TEXT }) ($r -eq 1 -or $c -eq 1) }
}
$ts.Name = 'Criteria table'; $ts.AlternativeText = 'The five judging criteria, what the deck shows for each, and the slides'
Footer $s 'ADAPTIVE CGF TRAINER' $MUTED
Notes $s "Use this as the map. Each criterion has a slide that answers its guiding question: does the prototype solve the key challenge, what else needs doing, how novel is it, how is AI used, and what is the value in S dollars. Slide numbers are in the right-hand column."

# ---------------------------------------------------------------- 2 problem
$s = NewSlide $PANEL 'One instructor, many trainees, one scripted enemy' 40 62 864 100 $STRONG
Eyebrow $s "The problem" $ACCENT
$cw = 272
Card $s 48 190 $cw 250 '01' 'Same scenario for all' "Fixed scenarios train the average trainee."
Card $s (48 + $cw + 24) 190 $cw 250 '02' 'Weak spots by chance' "Each person${ap}s focus area is practised only if the script happens to reach it."
Card $s (48 + 2 * ($cw + 24)) 190 $cw 250 '03' 'No time to retune' "The instructor cannot adjust the enemy for every seat while running the exercise."
Footer $s 'ADAPTIVE CGF TRAINER' $MUTED
Notes $s "One instructor runs many trainees. A fixed scenario trains the average, so a trainee${ap}s weak spot is practised by chance. The instructor has no spare hands to retune the enemy per seat. Do not quote figures here; we have none."

# ---------------------------------------------------------------- challenge
$s = NewSlide $BG "The key challenge: train each person${ap}s weak spot, without losing control" 36 62 864 100 $STRONG
Eyebrow $s "The key challenge" $ACCENT
Tag $s "Demonstrated potential  ${dot}  30%"
$cw = 272
$cols = @(
  @('THE CHALLENGE', "A scripted enemy cannot target one trainee${ap}s weak spot, ease off when they struggle or push when they excel. An instructor cannot retune it by hand for every seat.", $false),
  @('THE APPROACH', "History picks the competency to exercise. The last 10 events set how hard to push. Every change stays inside the instructor${ap}s limits and is explained.", $true),
  @('WHAT THE PROTOTYPE SHOWS', "Pressure lands on the weak competency first.`rIt eases when the trainee struggles and rises when they do well.`rNo setting leaves the limits.`rThe report updates the profile.", $false))
for ($i = 0; $i -lt 3; $i++) {
  $x = 48 + $i * ($cw + 24); $c = $cols[$i]
  [void](Box $s $x 176 $cw 290 $(if ($c[2]) { $AIDEEP } else { $RAISED }) $(if ($c[2]) { $AILINE } else { $BORDER }))
  [void](T $s ($x + 20) 194 ($cw - 40) 20 $c[0] 12 $(if ($c[2]) { $VIOL } else { $ACCENT }) $false $MONO)
  $t = T $s ($x + 20) 224 ($cw - 40) 230 $c[1] 16 $(if ($c[2]) { $AITEXT } else { $TEXT })
  if ($i -eq 2) { $t.TextFrame.TextRange.ParagraphFormat.Bullet.Visible = -1; $t.TextFrame.TextRange.ParagraphFormat.Bullet.Character = 8226; $t.TextFrame.TextRange.ParagraphFormat.SpaceAfter = 8; $t.TextFrame.Ruler.Levels(1).FirstMargin = 0; $t.TextFrame.Ruler.Levels(1).LeftMargin = 16 }
}
Footer $s "THE PROTOTYPE SHOWS THE MECHANISM  ${dot}  TRAINING TRANSFER NEEDS A TRIAL" $MUTED
Notes $s "Name the key design challenge in one breath: make the enemy train each person's weak spot and adapt to how they perform, while the instructor stays in command and can see why. Then say what the demo proves. Be honest about the limit: it shows the mechanism works end to end. Proving training transfer needs a trial with real cohorts."

# ---------------------------------------------------------------- 3 idea
$s = NewSlide $AIBG 'History picks what to exercise. Live behaviour sets how hard.' 36 62 864 100 'F3ECFF'
Eyebrow $s "The idea" $VIOL
Card $s 48 180 420 220 ('EXPERIENCE  ·  WHAT'.Replace('  ·  ', "  $dot  ")) 'The trainee profile' "Kept across sessions. The weakest competency with enough evidence becomes the target." $true
Card $s 492 180 420 220 ('CURRENT BEHAVIOUR  ·  HOW HARD'.Replace('  ·  ', "  $dot  ")) 'The last 10 events' "Doing well on the target: raise the pressure. Struggling: ease off." $true
[void](T $s 48 424 864 50 "Adjustments change CGF settings only. They never change the trainee${ap}s score or the outcome." 20 $AITEXT)
Footer $s 'ADAPTIVE CGF TRAINER' $VIOL
Notes $s "The core idea in one sentence. The profile decides which competency to exercise. This run${ap}s behaviour decides how hard to push it. Today${ap}s evidence also updates the profile, so a trainee who improves stops being the target."

# ---------------------------------------------------------------- 4 loop
$s = NewSlide $BG 'Allocate, run, report, update' 40 62 864 60 $STRONG
Eyebrow $s "The loop" $ACCENT
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
Eyebrow $s "Allocate" $ACCENT
Tag $s "Readiness  ${dot}  30%"
Block $s 48 176 250 'Six platforms' 'Fighter, warship and tank, two models each, with their own seats.'
Block $s 48 282 250 'Know the trainee' 'Competency bars and focus areas per seat, plus a private note.'
Block $s 48 388 250 'Practice or assess' 'The mode badge, run length and the envelope are set before start.'
[void](Pic $s 'allocate.png' 322 176 590 'The trainee allocation page: warship crew seats on the left, trainee pool with competency bars on the right')
Footer $s "ADAPTIVE CGF TRAINER  $dot  SYNTHETIC TRAINEES" $MUTED
Notes $s "Live beat if the demo runs: pick the warship, press Suggest demo crew, point at the competency bars and the likely first target, then the Adaptive practice badge. Fallback: this screenshot. All names are synthetic."

# ---------------------------------------------------------------- 6 run
$s = NewSlide $BG 'The enemy reacts to this crew, not a script' 36 62 864 100 $STRONG
Eyebrow $s "Run" $ACCENT
Tag $s "Demonstrated potential  ${dot}  30%"
[void](Pic $s 'runtime.png' 48 176 590 'The runtime: a strait transit map with red, black, pirate and neutral contacts, and the contact list beside it')
Block $s 662 176 250 'Targets the focus area' 'The first pressure lands on the competency the profile says needs it.'
Block $s 662 282 250 'Forces cooperate' 'A unit that meets a response shares it, and nearby units join in.'
Block $s 662 388 250 'Invisible to the trainee' 'The trainee sees an exercise. The reasoning shows to the instructor.'
Footer $s "ADAPTIVE CGF TRAINER  $dot  STRAIT TRANSIT SCENARIO" $MUTED
Notes $s "Warship crew on the strait transit scenario, the one scenario with a competency signal today. Start the run. The CGFs press hails at the navigation seat because that is the history-based target. Fallback: the recorded clip."

# ---------------------------------------------------------------- reasoning
$s = NewSlide $PANEL 'Every adjustment shows what, why and on what evidence' 36 62 864 100 $STRONG
Eyebrow $s "Explained" $ACCENT
Tag $s "Demonstrated potential  ${dot}  30%"
[void](PicAt $s 'reasoning.png' 48 176 400 330 'The reasoning panel during a run: a live raise of the ignored-warning weight from 2.2 to 2.5, with the evidence events and the reason')
[void](T $s 472 176 440 24 'Success rate over the last 10 events on the target' 16 $STRONG $true)
$zones = @(@(472, 168, 'below 40%', "$dn Ease off", $SUNK, $BORDER2, $MUTED, $STRONG), @(650, 126, "40${dsh}70%", 'Hold', $RAISED, $BORDER, $MUTED, $STRONG), @(786, 126, 'above 70%', "$up Raise", $AIBG, $VIOL, $AITEXT, 'F3ECFF'))
foreach ($z in $zones) {
  [void](Box $s $z[0] 208 $z[1] 72 $z[4] $z[5] 5 0.1)
  [void](T $s ($z[0] + 12) 218 ($z[1] - 20) 18 $z[2] 12 $z[6] $false $MONO)
  [void](T $s ($z[0] + 12) 240 ($z[1] - 20) 28 $z[3] 18 $z[7] $true)
}
$b = T $s 472 304 440 170 "Each entry names its cause: history, live, team or the instructor.`rFewer than 3 events: no rate yet, so exposure stays up.`rEasing stops at the instructor${ap}s base setting.`rEvery step stays inside the envelope." 16 $TEXT
$b.TextFrame.TextRange.ParagraphFormat.Bullet.Visible = -1; $b.TextFrame.TextRange.ParagraphFormat.Bullet.Character = 8226
$b.TextFrame.TextRange.ParagraphFormat.SpaceAfter = 8; $b.TextFrame.Ruler.Levels(1).FirstMargin = 0; $b.TextFrame.Ruler.Levels(1).LeftMargin = 16
Footer $s "REAL ENTRY FROM THE DEMO RUN  ${dot}  REASONING TAB" $MUTED
Notes $s "The screenshot is a real entry from the demo run: trainee_b handled 4 of the last 5 hail discipline events, so the weight on ignored warnings went from 2.2 to 2.5 to raise the pressure. Each entry shows direction, setting change, the evidence events and a one-line reason, tagged history, live, team or instructor. The rule on the right: above 70 percent the CGFs get harder, below 40 percent they ease off, never below the instructor's base."

# ---------------------------------------------------------------- 8 control
$s = NewSlide $BG "The instructor stays in command" 40 62 864 60 $STRONG
Eyebrow $s "Control" $ACCENT
Tag $s "Adoption of AI  ${dot}  20%"
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
Eyebrow $s "Debrief" $ACCENT
Tag $s "Readiness  ${dot}  30%"
Block $s 48 176 250 'One debrief per trainee' 'Events handled, focus area, and why the CGFs acted.'
Block $s 48 282 250 'Pressure over time' "A chart of CGF pressure against the trainee${ap}s success rate."
Block $s 48 388 250 'Then the update' 'The profile and history change, and the next target is predicted.'
[void](Pic $s 'report.png' 322 176 590 'The end-of-training report: a table of trainees, a debrief with focus area, and a chart of CGF pressure')
Footer $s "ADAPTIVE CGF TRAINER  $dot  SEEDED SESSION" $MUTED
Notes $s "Code computes every figure in the report; the narrative is a template. The order is fixed: report, then competency update, then the history entry. The screenshot is a seeded session, not a live run."

# ---------------------------------------------------------------- 10 cohort
$s = NewSlide $BG 'Where the whole intake is developing' 36 62 864 100 $STRONG
Eyebrow $s "Cohort" $ACCENT
Tag $s "Readiness  ${dot}  30%"
[void](Pic $s 'cohort.png' 48 176 590 'The cohort overview: competency means across 22 trainees and a heatmap by trainee')
Block $s 662 176 250 '22 synthetic trainees' 'A heatmap of competencies, with the evidence behind each cell.'
Block $s 662 282 250 '5 of 9 measured' "The other four read $([char]0x201C)no evidence$([char]0x201D) until the simulator emits events for them."
Block $s 662 388 250 'For the curriculum' 'Not for ranking people.'
Footer $s "ADAPTIVE CGF TRAINER  $dot  SYNTHETIC COHORT" $MUTED
Notes $s "The cohort view is for improving the curriculum, never for judging individuals, and its own banner says so. Adaptive runs give different exercises, so these figures are not qualification results."

# ---------------------------------------------------------------- ai
$s = NewSlide $BG 'Where AI is used, and where it is not' 40 62 864 60 $STRONG
Eyebrow $s "How the solution uses AI" $ACCENT
Tag $s "Adoption of AI  ${dot}  20%"
$items = @(
  @('1', 'Learns who the trainee is', "A Beta estimate for each competency, updated from every session${ap}s events. It is the trainee model, and it persists.", $true),
  @('2', 'Decides how to push', "A rule-based policy picks the target and the step size every 30 s. A bandit policy is planned, not built.", $true),
  @('3', 'Understands plain language', "An optional local model turns a typed request into a validated directive and rephrases explanations. Both fall back to templates.", $true),
  @('4', 'Plays AI partners', "Empty seats can be played from parameters derived from past runs, so a crew can train with a realistic teammate.", $true))
for ($i = 0; $i -lt 4; $i++) {
  $x = 48 + ($i % 2) * 444; $y = 144 + [math]::Floor($i / 2) * 150; $it = $items[$i]
  [void](Box $s $x $y 420 136 $RAISED $BORDER)
  $ci = Box $s ($x + 20) ($y + 18) 36 36 $AIBG $VIOL 9
  $ct = $ci.TextFrame; $ct.MarginLeft = 0; $ct.MarginRight = 0; $ct.MarginTop = 0; $ct.MarginBottom = 0
  $cr = $ct.TextRange; $cr.Text = $it[0]; $cr.Font.Name = $MONO; $cr.Font.Size = 16; $cr.Font.Bold = -1; $cr.Font.Color.RGB = (C $AITEXT); $cr.ParagraphFormat.Alignment = 2
  [void](T $s ($x + 70) ($y + 22) 336 28 $it[1] 19 $STRONG $true)
  [void](T $s ($x + 20) ($y + 66) 384 66 $it[2] 14 $TEXT)
}
[void](T $s 48 452 864 40 "Human in command: every AI action is bounded, explained and reversible. The model never produces a figure; code does." 16 $AITEXT)
Footer $s 'ADAPTIVE CGF TRAINER' $MUTED
Notes $s "Be precise about which parts are AI. The trainee model is statistical and learned from events. The policy that adjusts the enemy is rule-based today; a bandit version is planned. The language model is optional and local, used for steering and for rephrasing reasons, and every feature has a template fallback so the demo runs with it off. AI partners are played from parameters derived from earlier runs. The model never invents a number."

# ---------------------------------------------------------------- unique
$s = NewSlide $PANEL 'Why this is different' 40 62 864 60 $STRONG
Eyebrow $s "Novelty" $ACCENT
Tag $s "Uniqueness  ${dot}  20%"
$rows = @(
  @('', 'Typical training simulator', 'This trainer'),
  @('What adapts', 'A fixed script, or overall difficulty', "The specific weak competency of each trainee"),
  @('What it reads', "The score of this run", "History across sessions plus the last 10 events"),
  @('The instructor', 'Sets a scenario in advance', 'Sets limits, steers in plain language, sees every reason'),
  @('The enemy', 'Independent units', 'Units share what they know and respond together'))
$ts = $s.Shapes.AddTable($rows.Count, 3, 48, 150, 864, 300)
$tbl = $ts.Table; $tbl.Columns.Item(1).Width = 180; $tbl.Columns.Item(2).Width = 300; $tbl.Columns.Item(3).Width = 384
StyleTable $tbl @($RAISED, $PANEL) $SUNK
for ($r = 1; $r -le $rows.Count; $r++) {
  $tbl.Rows.Item($r).Height = $(if ($r -eq 1) { 36 } else { 66 })
  for ($c = 1; $c -le 3; $c++) { CellText $tbl $r $c $rows[$r - 1][$c - 1] 17 $(if ($r -eq 1 -or $c -eq 1) { $STRONG } elseif ($c -eq 3) { $AITEXT } else { $TEXT }) ($r -eq 1 -or $c -eq 1 -or $c -eq 3) }
}
$ts.Name = 'Comparison table'; $ts.AlternativeText = 'Comparison of a typical training simulator with this trainer'
Footer $s "OUR READING OF COMMON PRACTICE  ${dot}  NOT A SURVEY OF PRODUCTS" $MUTED
Notes $s "The novelty is what the enemy adapts to. Most adaptive training raises or lowers overall difficulty from this run's score. Here the target is a specific competency chosen from the trainee's history, and the pressure is set by what they are doing now. The instructor stays in command and can see every reason. Do not claim that nobody else has done this; this is our reading of common practice, not a product survey."

# ---------------------------------------------------------------- ready
$s = NewSlide $BG 'Readiness: what works today, and what is left' 36 62 864 100 $STRONG
Eyebrow $s "Beyond the key challenge" $ACCENT
Tag $s "Readiness  ${dot}  30%"
$L = @("The loop runs end to end: allocate, run, report, update", "Offline from a file: no server, no install", "Six platforms (air, sea, land) in allocation", "Adaptation on the sea scenario, five competencies", "Fixed assessment mode and instructor limits", "Report, cohort view and baseline comparison pages")
$R = @("Competency events for air and land scenarios", "Crew and team competencies, crew report", "Adapter to a real simulator over HLA or DIS", "Trial with real cohorts", "Local model approved on the event laptops", "Division figures for the business case")
[void](Box $s 48 176 420 290 $RAISED $BORDER)
[void](T $s 68 192 380 22 "$chk  WORKING TODAY" 14 $STRONG $true $MONO)
$b = T $s 68 226 380 232 ($L -join "`r") 17 $TEXT
$b.TextFrame.TextRange.ParagraphFormat.Bullet.Visible = -1; $b.TextFrame.TextRange.ParagraphFormat.Bullet.Character = 8226; $b.TextFrame.TextRange.ParagraphFormat.SpaceAfter = 9; $b.TextFrame.Ruler.Levels(1).FirstMargin = 0; $b.TextFrame.Ruler.Levels(1).LeftMargin = 16
[void](Box $s 492 176 420 290 $AIDEEP $AILINE)
[void](T $s 512 192 380 22 "STILL TO DO  ${dot}  NOT BUILT" 14 $CAUTION $true $MONO)
$b = T $s 512 226 380 232 ($R -join "`r") 17 $AITEXT
$b.TextFrame.TextRange.ParagraphFormat.Bullet.Visible = -1; $b.TextFrame.TextRange.ParagraphFormat.Bullet.Character = 8226; $b.TextFrame.TextRange.ParagraphFormat.SpaceAfter = 9; $b.TextFrame.Ruler.Levels(1).FirstMargin = 0; $b.TextFrame.Ruler.Levels(1).LeftMargin = 16
Footer $s "NO COMPATIBILITY CLAIMED WITH ANY NAMED SIMULATOR OR STANDARD" $MUTED
Notes $s "Readiness is the question: other than the key challenge, what else needs to be done? Left column is what runs today and was tested. Right column is the honest list of what is not built: competency signals for air and land, crew-level adaptation, an adapter to a real simulator over HLA or DIS, a trial with real cohorts, approval for a local model on the event laptops, and the division's figures. The engine changes a small explicit set of CGF settings, which is what makes the adapter feasible."

# ---------------------------------------------------------------- business
$s = NewSlide $PANEL 'Business case: value in S$ from fewer sessions' 36 62 864 60 $STRONG
Eyebrow $s "Market potential and savings" $ACCENT
Tag $s "Market potential  ${dot}  20%"
[void](Box $s 48 140 330 330 $RAISED $BORDER)
[void](T $s 66 156 296 20 "ASSUMED ${dot} REPLACE WITH DIVISION FIGURES" 12 $CAUTION $true $MONO)
$a = T $s 66 184 296 270 "200 trainees a year`r30 sessions to proficiency`r= 6,000 sessions a year`r`rValue of an avoided session = simulator running cost + instructor time`r`rr = share of sessions avoided by targeted practice, never yet measured" 15 $TEXT
$a.TextFrame.TextRange.ParagraphFormat.SpaceAfter = 4
$rows = @(@('Avoided sessions', 'S$1,000 each', 'S$2,000 each', 'S$3,000 each'), @("r = 5%  (300)", 'S$0.3M', 'S$0.6M', 'S$0.9M'), @("r = 10%  (600)", 'S$0.6M', 'S$1.2M', 'S$1.8M'), @("r = 15%  (900)", 'S$0.9M', 'S$1.8M', 'S$2.7M'))
$ts = $s.Shapes.AddTable($rows.Count, 4, 402, 140, 510, 240)
$tbl = $ts.Table; $tbl.Columns.Item(1).Width = 168; for ($c = 2; $c -le 4; $c++) { $tbl.Columns.Item($c).Width = 114 }
StyleTable $tbl @($RAISED, $PANEL) $SUNK
for ($r = 1; $r -le $rows.Count; $r++) {
  $tbl.Rows.Item($r).Height = $(if ($r -eq 1) { 44 } else { 62 })
  for ($c = 1; $c -le 4; $c++) { CellText $tbl $r $c $rows[$r - 1][$c - 1] $(if ($r -eq 1) { 13 } elseif ($c -eq 1) { 15 } else { 20 }) $(if ($r -eq 1 -or $c -eq 1) { $STRONG } else { $AITEXT }) ($r -eq 1 -or $c -eq 1 -or $c -gt 1) }
}
$ts.Name = 'Savings sensitivity table'; $ts.AlternativeText = 'Annual saving in Singapore dollars for three avoided-session shares and three session values'
[void](T $s 402 400 510 70 "Read as: if targeted practice avoids 10% of sessions and each avoided session is worth S`$2,000, the saving is S`$1.2M a year. Saving = sessions a year $mul r $mul value per session." 15 $MUTED)
Footer $s "ILLUSTRATIVE ESTIMATE  ${dot}  r IS A HYPOTHESIS, NOT A RESULT" $MUTED
Notes $s "The criterion asks for an estimate of value in Singapore dollars. This is a sensitivity grid built on stated assumptions, not a claim. The pool of 6,000 sessions a year (200 trainees times 30 sessions) and the value of S1,000 to S3,000 per avoided session are placeholders until the division supplies its own numbers; replace them and the grid follows from saving equals sessions times r times value. r, the share of sessions avoided, has never been measured: it is the hypothesis a trial would test. Say that out loud."

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
