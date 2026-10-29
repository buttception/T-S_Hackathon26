"""Savings and development-effort arithmetic for the pitch deck (owner: JL).

Run:  python savings-calc.py [git-ref]      (default ref: dc0e438, the commit the deck figures were taken from)

Every input marked ASSUMPTION or PLACEHOLDER is illustrative until the division
supplies real figures. Edit the INPUTS block and rerun; the deck script
(deck/build-pptx.ps1) repeats the same arithmetic and must be updated to match.
"""
import subprocess, sys
from collections import defaultdict

REF = sys.argv[1] if len(sys.argv) > 1 else "dc0e438"
REPO = __file__.rsplit("cgf-demo", 1)[0] or "."

# ---------------------------------------------------------------- INPUTS (all placeholders)
N = 200                  # PLACEHOLDER trainees a year on the system
S0 = 30                  # PLACEHOLDER simulator sessions to proficiency today
R = (0.05, 0.10, 0.15)   # ASSUMPTION share of sessions avoided; never measured
C_SESSION = 1500         # PLACEHOLDER S$ running cost per simulator session
H = 2                    # PLACEHOLDER instructor hours per session
C_INSTR = 250            # PLACEHOLDER S$ per instructor hour
VALUE_LOW, VALUE_HIGH = 1000, 3000   # PLACEHOLDER S$ value of an avoided session, sensitivity ends
DAY_RATE = 800           # PLACEHOLDER S$ loaded cost of one person-day
HOURS_PER_DAY = 8        # ASSUMPTION
CONV_LINES_PER_DAY = (50, 20)  # ASSUMPTION delivered code+test lines per person-day, conventional (fast, slow)

def git(*a):
    return subprocess.run(["git", "-C", REPO, *a], capture_output=True, text=True, check=True).stdout

# ---------------------------------------------------------------- development effort, from git
log = git("log", REF, "--no-merges", "--format=%an|%ae|%ct").strip().splitlines()
person = lambda n, e: "Eevee" if "evimaris" in e else ("Glenda (via Claude)" if n in ("Claude",) or n.startswith("Glenda") else n)
times = defaultdict(list)
for l in log:
    n, e, t = l.split("|"); times[person(n, e)].append(int(t))
all_t = [int(x) for x in git("log", REF, "--format=%ct").split()]
commits_all = len(all_t)
merges = len(git("log", REF, "--merges", "--format=%h").split())
span_h = (max(all_t) - min(all_t)) / 3600
days = {git("log", REF, "--format=%cd", "--date=short").split()[i] for i in range(commits_all)}
rows = []
for p, ts in sorted(times.items()):
    rows.append((p, len(ts), (max(ts) - min(ts)) / 3600))
person_hours = sum(r[2] for r in rows)
contributors = len(rows)

TEXT_EXCL = (".png", ".jpg", ".pptx")
add = dele = 0
for l in git("log", REF, "--no-merges", "--numstat", "--format=").splitlines():
    a, d, f = l.split("\t")
    if a == "-" or f.endswith(TEXT_EXCL): continue
    add += int(a); dele += int(d)
net = add - dele
def lines(pred):
    t = 0
    for f in git("ls-tree", "-r", "--name-only", REF).splitlines():
        if f.endswith(TEXT_EXCL) or not pred(f): continue
        t += len(git("show", f"{REF}:{f}").splitlines())
    return t
code_lines = lines(lambda f: "/docs/" not in f and "/design/" not in f and not f.endswith(".md"))

pd_upper = len(days) * contributors            # active days x contributors
pd_lower = person_hours / HOURS_PER_DAY        # sum of each person's first-to-last-commit span
conv = [code_lines / r for r in CONV_LINES_PER_DAY]   # person-days if built conventionally (ASSUMPTION)

print(f"REF {REF}: commits {commits_all} ({commits_all - merges} non-merge, {merges} merge); window {span_h:.2f} h, active calendar days {len(days)}")
for p, c, h in rows: print(f"  {p:22s} commits {c:3d}  first-to-last {h:4.1f} h")
print(f"contributors {contributors}; lines added {add}, deleted {dele}, net {net} (text files, no images/pptx); code+test lines at ref {code_lines}")
print(f"person-days: upper {pd_upper} (days x contributors), lower {pd_lower:.1f} (commit spans / {HOURS_PER_DAY} h)")
print(f"conventional-equivalent (ASSUMPTION {CONV_LINES_PER_DAY[0]}-{CONV_LINES_PER_DAY[1]} lines/day): {conv[0]:.0f} to {conv[1]:.0f} person-days")

# ---------------------------------------------------------------- savings
value_mid = C_SESSION + H * C_INSTR
print(f"\nvalue per avoided session (mid) = {C_SESSION} + {H} x {C_INSTR} = S${value_mid}")
pool = N * S0
print(f"session pool = {N} x {S0} = {pool} a year")
grid = {}
for r in R:
    avoided = pool * r
    row = [avoided * v for v in (VALUE_LOW, value_mid, VALUE_HIGH)]
    grid[r] = row
    print(f"  r={r:.0%}: avoided {avoided:.0f} sessions -> S$ {row[0]:,.0f} / {row[1]:,.0f} / {row[2]:,.0f}  (value {VALUE_LOW}/{value_mid}/{VALUE_HIGH})")
    print(f"        time to proficiency {S0} -> {S0*(1-r):.1f} sessions; simulator running {avoided*C_SESSION:,.0f}; instructor {avoided*H*C_INSTR:,.0f} ({avoided*H:.0f} h)")

print("\ndevelopment cost and payback (mid value per session)")
for label, pdays in (("prototype, upper", pd_upper), ("conventional, fast", conv[0]), ("conventional, slow", conv[1])):
    cost = pdays * DAY_RATE
    s = "; ".join(f"r={r:.0%}: {12*cost/grid[r][1]:.1f} months" for r in R)
    print(f"  {label:20s} {pdays:7.1f} pd x S${DAY_RATE} = S${cost:,.0f}  payback {s}")
