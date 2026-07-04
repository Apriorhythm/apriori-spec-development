#!/usr/bin/env python3
"""Doc consistency checker for the apriori handbook (acceptance: `python3 scripts/check_docs.py`).

Checks per EN/CN file pair (pairs enabled by existence — bootstrap mode):
  1. every ](#anchor) link resolves per GitHub's slugger
  2. every ](./relative) file link exists
  3. EN/CN heading sequences align: same length, same levels; where both sides
     carry a parsable numeric prefix (e.g. "4.10" / "4.10"), prefixes must match;
     mismatches are printed side by side
  4. the §5.5 example KB block contains the fixed dual-section names
     (Contract/Decisions ↔ 契约/决策) — hardcoded mapping
Exit code != 0 on any failure.
"""
import re, sys, os, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PAIRS = [("README.md", "README_cn.md"),
         ("RUNBOOK.md", "RUNBOOK_cn.md"),
         ("VISION.md", "VISION_cn.md")]

KB_SECTIONS = {  # EN marker : CN marker (hardcoded — do not translate freely)
    "## Contract (code-is-truth)": "## 契约(code-is-truth)",
    "## Decisions (doc-is-truth)": "## 决策(doc-is-truth)",
}
KB_CHECK_FILES = ("README.md", "README_cn.md")  # §5.5 example lives here

# checker 5 — artifact-interface assertions (DEV-1: "降级" forbidden only in OpenSpec context)
INTERFACE_DOCS = ("README.md", "README_cn.md", "RUNBOOK.md", "RUNBOOK_cn.md")
ADAPTER_WORDS = ("adapter", "适配器", "接口动作", "interface action")
FORBIDDEN_PHRASES = ("Without OpenSpec", "无 OpenSpec")
ADAPTER_HEADER_FILES = ("templates/config.yaml",)  # /opsx hits pass if header carries the marker


def gh_slug(heading):
    s = heading.strip().lower().replace("`", "").replace("*", "")
    out = []
    for ch in s:
        if ch == " ":
            out.append("-")
        elif ch in "-_":
            out.append(ch)
        elif unicodedata.category(ch)[0] in ("L", "N", "M"):
            out.append(ch)
    return "".join(out)


def parse(path):
    text = open(path, encoding="utf-8").read()
    stripped = re.sub(r"```.*?```", "", text, flags=re.S)
    heads = [(len(h), t) for h, t in re.findall(r"^(#{1,6})\s+(.+)$", stripped, flags=re.M)]
    anchors = re.findall(r"\]\(#([^)]+)\)", stripped)
    files = re.findall(r"\]\((\./[^)#]+)(?:#[^)]*)?\)", stripped)
    return text, heads, anchors, files


def num_prefix(title):
    m = re.match(r"^(\d+(?:\.\d+)*)\b", title.strip())
    return m.group(1) if m else None


def main():
    fail = False
    for en_name, cn_name in PAIRS:
        en_p, cn_p = os.path.join(ROOT, en_name), os.path.join(ROOT, cn_name)
        if not (os.path.exists(en_p) and os.path.exists(cn_p)):
            print(f"-- pair {en_name}/{cn_name}: skipped (bootstrap — pair incomplete)")
            continue
        for name, path in ((en_name, en_p), (cn_name, cn_p)):
            _, heads, anchors, files = parse(path)
            slugs = {gh_slug(t) for _, t in heads}
            bad_a = [a for a in anchors if a not in slugs]
            bad_f = [f for f in files if not os.path.exists(os.path.join(ROOT, f))]
            print(f"== {name}: headings={len(heads)} anchors={len(anchors)} "
                  f"broken-anchors={len(bad_a)} broken-file-links={len(bad_f)}")
            for a in bad_a: print(f"   BROKEN ANCHOR: #{a}")
            for f in bad_f: print(f"   BROKEN FILE LINK: {f}")
            if bad_a or bad_f: fail = True
        _, eh, _, _ = parse(en_p)
        _, ch, _, _ = parse(cn_p)
        if len(eh) != len(ch):
            fail = True
            print(f"   HEADING COUNT MISMATCH: {en_name}={len(eh)} vs {cn_name}={len(ch)}")
        n = min(len(eh), len(ch))
        for i in range(n):
            (el, et), (cl, ct) = eh[i], ch[i]
            lvl_ok = el == cl
            ep, cp = num_prefix(et), num_prefix(ct)
            num_ok = (ep == cp) if (ep and cp) else True
            if not (lvl_ok and num_ok):
                fail = True
                print(f"   HEADING MISALIGNED @#{i + 1}: "
                      f"[h{el}] {et[:50]!r}  <->  [h{cl}] {ct[:50]!r}")
        if len(eh) != len(ch):
            for i in range(n, max(len(eh), len(ch))):
                side = eh[i] if i < len(eh) else ch[i]
                print(f"   EXTRA HEADING @#{i + 1}: [h{side[0]}] {side[1][:60]!r}")

    for name in KB_CHECK_FILES:
        p = os.path.join(ROOT, name)
        if not os.path.exists(p):
            continue
        text = open(p, encoding="utf-8").read()
        want = list(KB_SECTIONS.keys()) if name.endswith("README.md") and "_cn" not in name \
            else list(KB_SECTIONS.values())
        missing = [w for w in want if w not in text]
        if missing:
            fail = True
            print(f"== {name}: KB example missing fixed section(s): {missing} "
                  f"(expected RED until §5.5 rewrite lands — bootstrap note)")
        else:
            print(f"== {name}: KB dual-section names present")

    # --- checker 5: artifact-interface assertions -------------------------
    TEMPLATE_FILES = ("templates/config.yaml", "templates/claude-command-apriori.md", "templates/process-config.md")
    for name in INTERFACE_DOCS + TEMPLATE_FILES:
        p = os.path.join(ROOT, name)
        if not os.path.exists(p):
            continue
        raw = open(p, encoding="utf-8").read()
        for phrase in FORBIDDEN_PHRASES:
            if phrase in raw:
                fail = True
                print(f"== {name}: FORBIDDEN phrase present: {phrase!r}")
        for i, line in enumerate(raw.splitlines()):
            if "降级" in line and "OpenSpec" in line:
                fail = True
                print(f"== {name}:{i + 1}: '降级' used in OpenSpec context (DEV-1 rule)")
    for name in INTERFACE_DOCS:
        p = os.path.join(ROOT, name)
        if not os.path.exists(p):
            continue
        raw = open(p, encoding="utf-8").read()
        # paragraph rule: any blank-line-delimited block mentioning /opsx: must carry adapter
        # wording (case-insensitive). Fenced blocks are atomic; a lone heading merges with
        # the paragraph that follows it.
        fenced_atomic = re.sub(r"```.*?```", lambda m: m.group(0).replace("\n\n", "\n"), raw, flags=re.S)
        blocks = re.split(r"\n\s*\n", fenced_atomic)
        merged = []
        i = 0
        while i < len(blocks):
            b = blocks[i]
            if b.strip().startswith("#") and "\n" not in b.strip() and i + 1 < len(blocks):
                b = b + "\n" + blocks[i + 1]
                i += 1
            merged.append(b)
            i += 1
        for block in merged:
            low = block.lower()
            if "/opsx:" in low and not any(w.lower() in low for w in ADAPTER_WORDS):
                first = block.strip().splitlines()[0][:60]
                fail = True
                print(f"== {name}: /opsx: block without adapter wording: {first!r}")
    for name in ADAPTER_HEADER_FILES:
        p = os.path.join(ROOT, name)
        if os.path.exists(p):
            head = "\n".join(open(p, encoding="utf-8").read().splitlines()[:5])
            if "OpenSpec adapter" not in head:
                fail = True
                print(f"== {name}: missing 'OpenSpec adapter' marker in first 5 lines")

    print("RESULT:", "FAIL" if fail else "PASS")
    sys.exit(1 if fail else 0)


if __name__ == "__main__":
    main()
