#!/usr/bin/env python3
"""Renders terms.md / privacy-policy.md into the two Astro legal pages.

The markdown at the repo root is the source of truth. This exists so the pages
are a build of it rather than a hand-copy that drifts — run it again after the
next edit to the markdown.

The INTERNAL NOTE block at the top of each source file is stripped: it says
"delete this block before it goes live", and it names unresolved legal questions
that are for the owner, not for users.
"""
import html
import re
import sys
from pathlib import Path

ROOT = Path("/Users/tommy/Project/products/buzbo")
OUT = Path("/Users/tommy/Project/products/buzbo-landing-v2/src/pages/app")
UPDATED = "26 August 2026"

CRIMSON_LINK = 'class="font-medium text-primary-crimson underline underline-offset-2"'


def inline(text: str) -> str:
    """Markdown emphasis and links -> HTML, escaping everything else."""
    # Protect links before escaping, so their URLs survive intact.
    links: list[tuple[str, str]] = []

    def stash(m: re.Match) -> str:
        links.append((m.group(1), m.group(2)))
        return f"\x00{len(links) - 1}\x00"

    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", stash, text)
    text = html.escape(text, quote=False)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", text)

    def restore(m: re.Match) -> str:
        label, href = links[int(m.group(1))]
        return f'<a href="{html.escape(href, quote=True)}" {CRIMSON_LINK}>{html.escape(label, quote=False)}</a>'

    return re.sub(r"\x00(\d+)\x00", restore, text)


def strip_internal_note(md: str) -> str:
    """Everything before the first `---` fence that precedes the H1."""
    parts = md.split("\n---\n", 1)
    if len(parts) == 2 and "INTERNAL NOTE" in parts[0]:
        return parts[1]
    return md


def blocks(body: str) -> str:
    """Paragraphs and bullet lists inside one section."""
    out: list[str] = []
    bullets: list[str] = []

    def flush() -> None:
        if bullets:
            items = "\n".join(f"\t\t\t\t\t\t<li>{b}</li>" for b in bullets)
            out.append(
                '\t\t\t\t\t<ul class="mt-3 list-disc space-y-2 pl-5">\n' + items + "\n\t\t\t\t\t</ul>"
            )
            bullets.clear()

    for raw in body.split("\n"):
        line = raw.strip()
        if not line:
            continue
        if line.startswith("- "):
            bullets.append(inline(line[2:].strip()))
        else:
            flush()
            out.append(f'\t\t\t\t\t<p class="mt-3">{inline(line)}</p>')
    flush()
    return "\n".join(out)


def render(md_path: Path, title: str, other_href: str, other_label: str) -> str:
    md = strip_internal_note(md_path.read_text())

    h1 = re.search(r"^# (.+)$", md, re.M)
    assert h1, f"no H1 in {md_path}"
    after_h1 = md[h1.end():]

    # The "Last updated" line is regenerated, never carried over.
    after_h1 = re.sub(r"^\s*\*\*Last updated:.*$", "", after_h1, count=1, flags=re.M)

    chunks = re.split(r"^## (.+)$", after_h1, flags=re.M)
    intro, sections = chunks[0], chunks[1:]

    parts = [blocks(intro)] if intro.strip() else []
    for i in range(0, len(sections), 2):
        heading, body = sections[i], sections[i + 1]
        parts.append(
            "\t\t\t\t<section>\n"
            f'\t\t\t\t\t<h2 class="text-xl leading-snug text-primary-crimson">{inline(heading)}</h2>\n'
            f"{blocks(body)}\n"
            "\t\t\t\t</section>"
        )

    return f"""---
import FaviconLinks from '../../components/FaviconLinks.astro';
import '../../styles/global.css';
---

<html lang="en">
\t<head>
\t\t<meta charset="utf-8" />
\t\t<FaviconLinks />
\t\t<meta name="viewport" content="width=device-width, initial-scale=1" />
\t\t<meta name="robots" content="noindex" />
\t\t<title>{html.escape(title)} — Buzbo</title>
\t</head>
\t<body class="font-sans antialiased text-gray-900">
\t\t<main class="mx-auto max-w-xl px-5 py-8 sm:px-6 sm:py-10">
\t\t\t<p class="mb-6 rounded-md border border-primary-mauve/30 bg-primary-mauve/10 px-3 py-2 text-sm leading-relaxed text-primary-mauve">
\t\t\t\tPending review by NL/EU legal counsel before public launch.
\t\t\t</p>

\t\t\t<h1 class="text-3xl leading-tight text-primary-crimson sm:text-4xl">{html.escape(h1.group(1))}</h1>
\t\t\t<p class="mt-3 text-sm leading-relaxed text-gray-600">Last updated: {UPDATED}</p>
\t\t\t<p class="mt-2 text-sm leading-relaxed text-gray-600">
\t\t\t\tOperated by AH Limited B.V., registered in the Netherlands, KVK 92705987.
\t\t\t\tContact: <a href="mailto:hello@buzbo.com" {CRIMSON_LINK}>hello@buzbo.com</a>.
\t\t\t</p>

\t\t\t<article class="legal mt-8 space-y-8 text-base leading-relaxed text-gray-800">
{chr(10).join(parts)}

\t\t\t\t<p class="border-t border-primary-mauve/20 pt-6 text-sm text-gray-600">
\t\t\t\t\tSee also our <a href="{other_href}" {CRIMSON_LINK}>{other_label}</a>.
\t\t\t\t</p>
\t\t\t</article>
\t\t</main>
\t</body>
</html>
"""


def main() -> None:
    jobs = [
        (ROOT / "terms.md", "Terms & Conditions", "tnc.astro", "/app/pp", "Privacy Policy"),
        (ROOT / "privacy-policy.md", "Privacy Policy", "pp.astro", "/app/tnc", "Terms & Conditions"),
    ]
    for src, title, out_name, other_href, other_label in jobs:
        page = render(src, title, other_href, other_label)
        leftovers = re.findall(r"\[(?:DATE|Effective date|Legal entity name|Registered address)[^\]]*\]", page)
        if leftovers:
            sys.exit(f"{out_name}: unfilled placeholder(s) {sorted(set(leftovers))}")
        if "INTERNAL NOTE" in page:
            sys.exit(f"{out_name}: internal note leaked into the published page")
        (OUT / out_name).write_text(page)
        print(f"{out_name}: {len(page.splitlines())} lines, {page.count('<section>')} sections")


main()
