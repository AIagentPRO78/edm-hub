"""Title cleaner for the 20-track harvest merge.

Transforms verbose harvest titles ("Armin van Buuren - Blah Blah Blah (Official
Lyric Video)") into the seed's clean short style ("Blah Blah Blah"), preserving
musically meaningful tags (feat./remix/mix/edit/years) and stripping promo tags.

Run with no args for a dry-run before/after dump. `--write` performs the merge.
"""
import argparse
import html
import json
import re
from pathlib import Path

# Seed lives at <repo>/src/data/artists.seed.json, relative to this script.
DEFAULT_SEED = Path(__file__).resolve().parent.parent / "src" / "data" / "artists.seed.json"

# Musically meaningful tokens — a bracket group containing these is never promo.
# (No year here: a bare "(1998)" is preserved naturally since PROMO won't match it,
#  but a long promo phrase that merely contains a year must NOT be protected.)
MUSICAL = re.compile(
    r"\b(remix|mix|edit|extended|club|acoustic|instrumental|version|vip|bootleg|"
    r"rework|flip|dub|radio|feat\.?|ft\.?|featuring|original|reprise|interlude|"
    r"intro|outro|live|unplugged|orchestral|symphony|pt\.?|part)\b",
    re.I,
)
# Promo / channel / label noise — strip groups or tails matching these unless MUSICAL.
PROMO = re.compile(
    r"official|lyric|visuali|music video|out now|free download|premiere|"
    r"\bhd\b|\b4k\b|a state of trance|asot|@|teaser|trailer|audio only|"
    r"full version|video ?clip|\bvideo\b|\baudio\b|download|\bstream\b|exclusive|"
    r"anthem|i am hardstyle|supremacy|uefa|"
    # festivals / radio shows that appear as live-set decoration
    r"tomorrowland|q-?dance|dediqated|defqon|mainstage|radio live|drumcode radio|"
    r"\bdcr\d+\b|live (at|from)|weekend \d|\bset\b|"
    # record labels that appear as [Label] / | Label decoration
    r"ultra music|drumcode|spinnin|monstercat|anjunabeats|anjunadeep|mau5trap|"
    r"stmpd|musical freedom|revealed|hexagon|owsla|hospital records|ram records|"
    r"q-?dance records|\bmv\b",
    re.I,
)
# Song-variant words — block the leading-credit strip (so "Song - Original Mix" survives)
# but, unlike MUSICAL, exclude feat/ft so "Artist feat. Guest - Song" still strips cleanly.
VARIANT = re.compile(
    r"\b(remix|mix|edit|extended|club|version|bootleg|vip|dub|rework|flip|"
    r"instrumental|acoustic|reprise|unplugged|orchestral|radio)\b",
    re.I,
)
# Label catalog code, e.g. "DC171", "DCR800".
CATALOG = re.compile(r"^[A-Z]{1,4}\d{2,4}$")

# A bracket group anywhere: ( ... ) or [ ... ].
GROUP = re.compile(r"[\(\[]([^\(\)\[\]]*)[\)\]]")
# SoundCloud oEmbed "Title by Uploader" suffix (uploader capitalised, no brackets).
BY_SUFFIX = re.compile(r"\s+by\s+[A-Z0-9][^\[\]()]*$")


# Trailing standalone promo words with no enclosing bracket (e.g. "… - OFFICIAL VIDEO HD").
TRAIL_WORDS = re.compile(
    r"\s*[-|]?\s*(official\s+)?(music\s+)?"
    r"(video ?clip|videoclip|video|audio|mv|visuali\w*|hd|4k)\s*$",
    re.I,
)


def is_promo(text: str) -> bool:
    return bool(PROMO.search(text)) and not bool(MUSICAL.search(text))


def clean(title: str) -> str:
    raw = html.unescape(title).strip()
    t = raw

    # 1. Drop SoundCloud "… by Uploader" suffix.
    t = BY_SUFFIX.sub("", t).strip()

    # 2. Remove promo bracket groups anywhere; keep musical/neutral ones.
    def drop_group(m: "re.Match[str]") -> str:
        return " " if is_promo(m.group(1)) else m.group(0)

    t = GROUP.sub(drop_group, t)

    # 3. Pipe decoration ("TRACK | ARTISTS | EVENT"): keep the first segment when the
    #    remainder is promo, or when there are multiple pipes (festival/show format).
    if "|" in t:
        head = t.split("|", 1)[0].strip()
        rest = t[len(head):]
        if head and (is_promo(rest) or t.count("|") >= 2):
            t = head

    # 4. Split on " - "; drop promo/catalog segments, then the leading artist credit.
    #    Harvest titles are formatted "ARTIST - SONG (tags)", so parts[0] is the credit
    #    unless it carries a song-variant tag (guards a rare "Song - Original Mix" shape).
    parts = [p.strip() for p in re.split(r"\s+-\s+", t) if p.strip()]
    if len(parts) > 1:
        # drop trailing promo/catalog segments
        while len(parts) > 1 and (is_promo(parts[-1]) or CATALOG.match(parts[-1])):
            parts.pop()
        # drop interior promo/catalog segments (e.g. "… - Drumcode - DC171")
        if len(parts) > 2:
            kept = [parts[0]] + [
                p for p in parts[1:] if not is_promo(p) and not CATALOG.match(p)
            ]
            parts = kept
        if len(parts) > 1 and not VARIANT.search(parts[0]):
            parts = parts[1:]
        t = " - ".join(parts)

    # 5. Tidy: trailing bare promo words, collapse spaces, trim separators, dangling feat.
    t = TRAIL_WORDS.sub("", t).strip()
    t = re.sub(r"\s{2,}", " ", t).strip(" -|")
    t = re.sub(r"[\s,]+(ft\.?|feat\.?|featuring)\s*$", "", t, flags=re.I).strip()
    t = t.strip(" -|·").strip()
    # Strip matched wrapping quotes ('…' or "…") while leaving internal quotes intact.
    if len(t) >= 2 and t[0] in "\"'" and t[-1] == t[0]:
        t = t[1:-1].strip()

    # safety: only fall back to the unescaped raw if cleaning emptied the title
    # (a single-letter title like "U" is valid and must survive).
    if not re.search(r"[A-Za-z0-9]", t):
        t = raw
    return t


def load_harvest(path):
    with open(path, encoding="utf-8") as f:
        h = json.load(f)
    return {a["id"]: a["tracks"] for a in h["result"]["artists"]}


def build_merged(harvest_path, seed_path):
    harvest = load_harvest(harvest_path)
    with open(seed_path, encoding="utf-8") as f:
        seed = json.load(f)
    merged = []
    for art in seed:
        new = dict(art)
        if art["id"] in harvest:
            tracks = []
            for t in harvest[art["id"]][:20]:
                # Preserve the full seed-track schema (the build-time slim plugin
                # filters on `verified` and drops sourceUrl/notes); only the title
                # is cleaned here.
                tracks.append(
                    {
                        "title": clean(t["title"]),
                        "platform": t["platform"],
                        "ref": t["ref"],
                        "sourceUrl": t.get("sourceUrl", t["ref"]),
                        "kind": t.get("kind", "track"),
                        "verified": bool(t.get("verified", False)),
                    }
                )
            new["tracks"] = tracks
        merged.append(new)
    return seed, merged


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Clean harvest track titles and (optionally) merge them into the seed."
    )
    parser.add_argument("harvest", help="path to the harvest JSON (result.artists[].tracks[])")
    parser.add_argument("--seed", default=str(DEFAULT_SEED), help="path to artists.seed.json")
    parser.add_argument("--write", action="store_true", help="write the merged result back to the seed")
    args = parser.parse_args()
    if args.write:
        _, merged = build_merged(args.harvest, args.seed)
        with open(args.seed, "w", encoding="utf-8") as f:
            json.dump(merged, f, ensure_ascii=False, indent=2)
        total = sum(len(a["tracks"]) for a in merged)
        print(f"WROTE {args.seed}: {len(merged)} artists, {total} tracks")
    else:
        harvest = load_harvest(args.harvest)
        for aid, tracks in harvest.items():
            print(f"\n# {aid}")
            for t in tracks:
                c = clean(t["title"])
                mark = "" if c != t["title"] else "  (unchanged)"
                print(f"   {t['platform'][:2]} | {c}{mark}")
