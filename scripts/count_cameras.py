import re
from collections import Counter
from pathlib import Path

text = Path(__file__).resolve().parents[1].joinpath("js/camera-data.js").read_text(encoding="utf-8")
regs = re.findall(r'region:\s*"([^"]+)"', text)
print("Named points by region:", dict(Counter(regs)))
print("Total named region tags:", len(regs))
ns = re.findall(r"n:\s*(\d+)", text)
print("Corridor samples:", sum(int(n) for n in ns))
print("Approx total KNOWN:", len(regs) + sum(int(n) for n in ns))
