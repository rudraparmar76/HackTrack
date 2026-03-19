"""
HackTrack Scraper v4.0
- Groq LLM (llama-3.3-70b-versatile) for intelligent extraction
- Platforms: Devfolio, Unstop, Devpost, DoraHacks, MLH
- Deployed on Railway/Render/Fly.io
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import asyncio
import re
import sys
import os
import json
from urllib.parse import urlparse
from typing import List
from datetime import datetime

# Groq client — free tier, llama-3.3-70b
from groq import Groq

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

app = FastAPI(title="HackTrack Scraper", version="4.0.0")

# ── Groq setup ────────────────────────────────────────────────────────────────
_groq_client: Groq | None = None

def get_groq() -> Groq | None:
    global _groq_client
    if _groq_client is None:
        key = os.environ.get("GROQ_API_KEY", "")
        if key:
            _groq_client = Groq(api_key=key)
    return _groq_client

GROQ_MODEL = "llama-3.3-70b-versatile"

# ── Global Playwright runtime ─────────────────────────────────────────────────
playwright = None
browser = None

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ══════════════════════════════════════════════════════════════════════════════
# MODELS
# ══════════════════════════════════════════════════════════════════════════════

class ScrapeRequest(BaseModel):
    url: str


class ScrapeResponse(BaseModel):
    name: str = ""
    platform: str = ""
    banner_url: str = ""
    description: str = ""
    registration_deadline: str = ""
    submission_deadline: str = ""
    result_date: str = ""
    start_date: str = ""
    end_date: str = ""
    prize_pool: str = ""
    team_size: dict = Field(default_factory=lambda: {"min": 1, "max": 4})
    problem_statements: List[dict] = Field(default_factory=list)
    resource_links: List[dict] = Field(default_factory=list)
    scrape_success: bool = False
    url: str = ""
    llm_used: bool = False   # tells frontend whether Groq enriched this


# ══════════════════════════════════════════════════════════════════════════════
# PLATFORM DETECTION
# ══════════════════════════════════════════════════════════════════════════════

def detect_platform(url: str) -> str:
    domain = urlparse(url).netloc.lower()
    if "devfolio" in domain:   return "Devfolio"
    if "unstop"   in domain:   return "Unstop"
    if "devpost"  in domain:   return "Devpost"
    if "dorahacks" in domain:  return "DoraHacks"
    if "mlh.io"   in domain:   return "MLH"
    if "hackerearth" in domain: return "HackerEarth"
    if "hackerrank"  in domain: return "HackerRank"
    return "Other"


# ══════════════════════════════════════════════════════════════════════════════
# DATE PARSING
# ══════════════════════════════════════════════════════════════════════════════

DATE_FORMATS = [
    "%Y-%m-%d", "%Y/%m/%d",
    "%d %B %Y", "%d %b %Y", "%d %B, %Y", "%d %b, %Y",
    "%B %d, %Y", "%b %d, %Y", "%B %d %Y", "%b %d %Y",
    "%m/%d/%Y",  "%d/%m/%Y",
    "%B %d",     "%b %d",
]


def parse_any_date(text: str, fallback_year: int = None) -> str:
    if not text:
        return ""
    text = text.strip()
    text = re.sub(r"(\d+)(st|nd|rd|th)", r"\1", text)
    text = re.sub(r"\s+", " ", text)
    fallback_year = fallback_year or datetime.now().year

    for fmt in DATE_FORMATS:
        try:
            dt = datetime.strptime(text, fmt)
            if dt.year == 1900:
                dt = dt.replace(year=fallback_year)
                if dt < datetime.now():
                    dt = dt.replace(year=fallback_year + 1)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    return ""


def find_dates_near(text: str, keywords: List[str], window: int = 400) -> str:
    lower = text.lower()
    patterns = [
        r"(\d{4}[-/]\d{1,2}[-/]\d{1,2})",
        r"(\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[,]?\s+\d{4})",
        r"((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?[,]?\s*\d{0,4})",
        r"(\d{1,2}/\d{1,2}/\d{4})",
    ]
    for kw in keywords:
        idx = lower.find(kw.lower())
        if idx == -1:
            continue
        chunk = text[idx: idx + window]
        for pat in patterns:
            m = re.search(pat, chunk, re.IGNORECASE)
            if m:
                parsed = parse_any_date(m.group(1))
                if parsed:
                    return parsed
    return ""


# ══════════════════════════════════════════════════════════════════════════════
# GROQ LLM EXTRACTION  (single call, returns full structured dict)
# ══════════════════════════════════════════════════════════════════════════════

def groq_extract(body_text: str, platform: str) -> dict | None:
    """
    One Groq call extracts ALL fields at once.
    Returns None if Groq is unavailable or call fails.
    """
    client = get_groq()
    if not client:
        return None

    # Trim to ~5000 chars to stay within token limits comfortably
    excerpt = body_text[:5000]

    prompt = f"""You are extracting structured data from a hackathon page ({platform}).

Return ONLY valid JSON — no markdown, no explanation.

Schema:
{{
  "registration_deadline": "YYYY-MM-DD or empty string",
  "submission_deadline":   "YYYY-MM-DD or empty string",
  "result_date":           "YYYY-MM-DD or empty string",
  "start_date":            "YYYY-MM-DD or empty string",
  "end_date":              "YYYY-MM-DD or empty string",
  "prize_pool":            "raw string like ₹5,00,000 or $10,000 or empty string",
  "team_size":             {{"min": 1, "max": 4}},
  "problem_statements":    [
    {{"track": "optional track label", "title": "PS or theme title"}}
  ]
}}

Rules:
- Dates: assume year {datetime.now().year} if missing; use YYYY-MM-DD format.
- prize_pool: keep original currency symbol and denomination text (₹2 Lakh, $10K, etc.).
- team_size: extract min/max members. Default {{"min":1,"max":4}} if not found.
- problem_statements: list every unique track/theme/PS. Max 20 items.
- If a field is not found, use "" or [] or the default value shown.

Page text:
{excerpt}"""

    try:
        resp = client.chat.completions.create(
            model=GROQ_MODEL,
            max_tokens=1200,
            temperature=0.05,
            messages=[
                {
                    "role": "system",
                    "content": "You extract structured hackathon data. Respond with valid JSON only.",
                },
                {"role": "user", "content": prompt},
            ],
        )
        raw = resp.choices[0].message.content.strip()
        # Strip markdown fences if model wraps output
        raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
        return json.loads(raw)
    except Exception as e:
        print(f"[Groq] extraction failed: {e}")
        return None


# ══════════════════════════════════════════════════════════════════════════════
# REGEX FALLBACK EXTRACTION  (same logic as v3, kept as safety net)
# ══════════════════════════════════════════════════════════════════════════════

def regex_extract(body_text: str, platform: str) -> dict:
    result = {
        "registration_deadline": "",
        "submission_deadline": "",
        "result_date": "",
        "start_date": "",
        "end_date": "",
        "prize_pool": "",
        "team_size": {"min": 1, "max": 4},
        "problem_statements": [],
    }

    # Dates
    result["registration_deadline"] = find_dates_near(body_text, [
        "registration close", "registrations close", "register by",
        "last date to register", "registration deadline", "applications close",
        "apply by", "registration ends", "sign up deadline",
    ])
    result["submission_deadline"] = find_dates_near(body_text, [
        "submission deadline", "submission closes", "submissions close",
        "submit by", "last date to submit", "submission end",
        "final submission", "project submission", "deadline",
    ])

    # "Runs from Mar 25 - 26, 2026"
    runs_from = re.search(
        r"(?:runs?\s+from|starts?\s+(?:on|from)?|begins?\s+(?:on)?|commences?\s+(?:on)?)\s*[:\-]?\s*"
        r"((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|"
        r"Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2})"
        r"(?:\s*[-–]\s*(\d{1,2}))?(?:[,\s]+(\d{4}))?",
        body_text, re.IGNORECASE,
    )
    if runs_from:
        year = runs_from.group(3) or str(datetime.now().year)
        result["start_date"] = parse_any_date(f"{runs_from.group(1)} {year}")
        if runs_from.group(2):
            month = runs_from.group(1).split()[0]
            result["end_date"] = parse_any_date(f"{month} {runs_from.group(2)} {year}")

    if not result["start_date"]:
        result["start_date"] = find_dates_near(body_text, [
            "start date", "starts on", "begins on", "hackathon starts", "event starts",
        ])
    if not result["end_date"]:
        result["end_date"] = find_dates_near(body_text, [
            "end date", "ends on", "hackathon ends", "event ends",
        ])
    result["result_date"] = find_dates_near(body_text, [
        "result", "winners announced", "announcement", "results declared",
    ])

    # Prize
    prize_patterns = [
        r"(₹\s*[\d,]+(?:\.\d+)?(?:\s*(?:Lakhs?|Lacs?|Crores?|Cr|K|k|L))?)",
        r"(\$\s*[\d,]+(?:\.\d+)?(?:\s*(?:K|k|M|million|thousand))?)",
        r"(€\s*[\d,]+(?:\.\d+)?)",
        r"(£\s*[\d,]+(?:\.\d+)?)",
        r"(INR\s*[\d,]+(?:\.\d+)?(?:\s*(?:Lakhs?|Lacs?|Crores?|Cr|K|k|L))?)",
        r"(Rs\.?\s*[\d,]+(?:\.\d+)?(?:\s*(?:Lakhs?|Lacs?|Crores?|Cr|K|k|L))?)",
    ]
    prize_lower = body_text.lower()
    for kw in ["prize", "reward", "worth", "winning", "bounty", "in cash", "in prizes"]:
        idx = prize_lower.find(kw)
        if idx == -1:
            continue
        chunk = body_text[max(0, idx - 200): idx + 200]
        for pat in prize_patterns:
            m = re.search(pat, chunk, re.IGNORECASE)
            if m:
                result["prize_pool"] = m.group(1).strip()
                break
        if result["prize_pool"]:
            break
    if not result["prize_pool"]:
        for pat in prize_patterns:
            m = re.search(pat, body_text)
            if m:
                result["prize_pool"] = m.group(1).strip()
                break

    # Team size
    for pat in [
        r"team\s*size[:\s]*(\d+)\s*[-–to]+\s*(\d+)",
        r"(\d+)\s*[-–to]+\s*(\d+)\s*(?:members?|people|participants?|per team)",
        r"teams?\s+of\s+(?:up\s+to\s+)?(\d+)",
        r"max(?:imum)?\s*(?:team)?\s*(?:size)?\s*[:\s]*(\d+)",
    ]:
        m = re.search(pat, body_text, re.IGNORECASE)
        if m:
            groups = [g for g in m.groups() if g]
            result["team_size"] = (
                {"min": int(groups[0]), "max": int(groups[1])} if len(groups) == 2
                else {"min": 1, "max": int(groups[0])}
            )
            break

    # Problem statements
    ps, seen = [], set()

    domain_m = re.search(
        r"(?:domains?|themes?|tracks?|categories|verticals|areas?)[:\s]+([^\n💡🏆🎁🎟️📍📅⏳📞🌮]+)",
        body_text, re.IGNORECASE,
    )
    if domain_m:
        for item in re.split(r"[,•|/]", domain_m.group(1)):
            item = item.strip().rstrip(".")
            if 3 < len(item) < 150 and item.lower() not in seen:
                seen.add(item.lower())
                ps.append({"track": "", "title": item})

    for m in re.finditer(
        r"(?:PS|Problem\s*Statement|Theme|Track|Challenge)\s*#?(\d+)\s*[:\-–]\s*(.{5,200})",
        body_text, re.IGNORECASE,
    ):
        title = m.group(2).strip().split("\n")[0]
        if title.lower() not in seen and len(title) > 4:
            seen.add(title.lower())
            ps.append({"track": f"Track {m.group(1)}", "title": title})

    for m in re.finditer(
        r"(?:themes?|tracks?|problem\s*statements?|challenges?|domains?)\s*[:\n]"
        r"((?:\s*[-•●▸]\s*.{5,200}\n?)+)",
        body_text, re.IGNORECASE,
    ):
        for item in re.findall(r"[-•●▸]\s*(.{5,200})", m.group(1)):
            item = item.strip().split("\n")[0]
            if item.lower() not in seen and 4 < len(item) < 200:
                seen.add(item.lower())
                ps.append({"track": "", "title": item})

    result["problem_statements"] = ps[:20]
    return result


# ══════════════════════════════════════════════════════════════════════════════
# MERGE: LLM results take precedence, regex fills gaps
# ══════════════════════════════════════════════════════════════════════════════

def merge_results(llm: dict | None, regex: dict) -> tuple[dict, bool]:
    """
    Prefer LLM values; fall back to regex for any blank field.
    Returns (merged_dict, llm_was_used).
    """
    if llm is None:
        return regex, False

    merged = {}
    date_fields = [
        "registration_deadline", "submission_deadline",
        "result_date", "start_date", "end_date",
    ]
    for f in date_fields:
        merged[f] = llm.get(f) or regex.get(f, "")

    merged["prize_pool"] = llm.get("prize_pool") or regex.get("prize_pool", "")

    # team_size: use LLM unless it's the bare default and regex found something
    llm_ts  = llm.get("team_size",  {"min": 1, "max": 4})
    regex_ts = regex.get("team_size", {"min": 1, "max": 4})
    if llm_ts == {"min": 1, "max": 4} and regex_ts != {"min": 1, "max": 4}:
        merged["team_size"] = regex_ts
    else:
        merged["team_size"] = llm_ts

    # problem_statements: prefer LLM list; fall back to regex
    llm_ps   = llm.get("problem_statements",  [])
    regex_ps = regex.get("problem_statements", [])
    merged["problem_statements"] = llm_ps if llm_ps else regex_ps

    return merged, True


# ══════════════════════════════════════════════════════════════════════════════
# PLATFORM-SPECIFIC JS EXTRACTION SCRIPTS
# ══════════════════════════════════════════════════════════════════════════════

# Generic script — works for Devpost, Unstop, DoraHacks, Other
GENERIC_EXTRACT_SCRIPT = """() => {
    const getMeta = (name) => {
        const el = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
        return el ? el.getAttribute('content') || '' : '';
    };
    const nameSelectors = [
        'h1', '.hackathon-name', '.event-name', '.challenge-title',
        '#challenge-title', '.opp-title', '[class*="hackathon-title"]',
        '[class*="event-title"]', '[class*="challenge-name"]',
    ];
    let name = '';
    for (const sel of nameSelectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim().length > 2) {
            name = el.textContent.trim(); break;
        }
    }
    name = name || getMeta('og:title') || document.title.split('|')[0].trim();

    const banner = getMeta('og:image') || '';
    let description = getMeta('og:description') || getMeta('description') || '';
    const bodyText = document.body.innerText;

    // Devpost themes
    const themes = [];
    document.querySelectorAll('a[href*="themes"]').forEach(a => {
        const t = a.textContent.trim();
        if (t && t.length > 2 && t.length < 100) themes.push(t);
    });

    // Prize sidebar (Devpost)
    let sidebarPrize = '';
    document.querySelectorAll('a[href*="prizes"], .prize, [class*="prize"]').forEach(el => {
        const t = el.textContent.trim();
        if (t && t.length > 2) sidebarPrize += t + ' ';
    });

    // Resource links
    const resourceLinks = [];
    const seenHrefs = new Set();
    const kws = ['problem','statement','pdf','rule','guideline','brochure',
                 'document','brief','challenge','track','theme','schedule','timeline'];
    document.querySelectorAll('a[href]').forEach(a => {
        const href = a.href || '';
        const text = a.textContent.trim();
        const hl = href.toLowerCase(), tl = text.toLowerCase();
        if (seenHrefs.has(href) || !href || href === '#') return;
        const isPdf      = hl.endsWith('.pdf') || hl.includes('/pdf');
        const isDrive    = hl.includes('drive.google.com') || hl.includes('docs.google.com');
        const isDropbox  = hl.includes('dropbox.com');
        const isRelevant = kws.some(kw => tl.includes(kw) || hl.includes(kw));
        if (isPdf || isDrive || isDropbox || isRelevant) {
            seenHrefs.add(href);
            resourceLinks.push({
                text: text.substring(0, 150) || 'Document',
                url: href,
                type: isPdf ? 'pdf' : isDrive ? 'google_drive' : isDropbox ? 'dropbox' : 'link',
            });
        }
    });

    return {
        name: name.substring(0, 200),
        description: description.substring(0, 2000),
        banner_url: banner,
        bodyText: bodyText.substring(0, 30000),
        themes,
        sidebarPrize: sidebarPrize.trim(),
        resourceLinks: resourceLinks.slice(0, 30),
    };
}"""


# Devfolio-specific: clicks "About" tab to expose full description + dates
DEVFOLIO_EXTRACT_SCRIPT = """async () => {
    // Try clicking the About/Overview tab if present
    const tabSelectors = ['a[href*="about"]', 'button[aria-label*="about" i]',
                          '[role="tab"]', 'nav a'];
    for (const sel of tabSelectors) {
        const tabs = document.querySelectorAll(sel);
        for (const tab of tabs) {
            if (/about|overview/i.test(tab.textContent)) {
                tab.click();
                await new Promise(r => setTimeout(r, 1000));
                break;
            }
        }
    }

    const getMeta = (name) => {
        const el = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
        return el ? el.getAttribute('content') || '' : '';
    };

    let name = '';
    for (const sel of ['h1', '.sc-hackathon-title', '[class*="title"]']) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim().length > 2) { name = el.textContent.trim(); break; }
    }
    name = name || getMeta('og:title') || document.title.split('|')[0].trim();

    const bodyText = document.body.innerText;
    const banner = getMeta('og:image') || '';
    const description = getMeta('og:description') || getMeta('description') || '';

    // Resource links
    const resourceLinks = [];
    const seenHrefs = new Set();
    const kws = ['problem','statement','pdf','rule','guideline','brochure',
                 'document','brief','challenge','track','theme','schedule','timeline'];
    document.querySelectorAll('a[href]').forEach(a => {
        const href = a.href || '';
        const text = a.textContent.trim();
        const hl = href.toLowerCase(), tl = text.toLowerCase();
        if (seenHrefs.has(href) || !href || href === '#') return;
        const isPdf      = hl.endsWith('.pdf') || hl.includes('/pdf');
        const isDrive    = hl.includes('drive.google.com') || hl.includes('docs.google.com');
        const isDropbox  = hl.includes('dropbox.com');
        const isRelevant = kws.some(kw => tl.includes(kw) || hl.includes(kw));
        if (isPdf || isDrive || isDropbox || isRelevant) {
            seenHrefs.add(href);
            resourceLinks.push({
                text: text.substring(0, 150) || 'Document',
                url: href,
                type: isPdf ? 'pdf' : isDrive ? 'google_drive' : isDropbox ? 'dropbox' : 'link',
            });
        }
    });

    return {
        name: name.substring(0, 200),
        description: description.substring(0, 2000),
        banner_url: banner,
        bodyText: bodyText.substring(0, 30000),
        themes: [],
        sidebarPrize: '',
        resourceLinks: resourceLinks.slice(0, 30),
    };
}"""


# MLH: static listing — we grab individual event pages
MLH_EXTRACT_SCRIPT = """() => {
    const getMeta = (name) => {
        const el = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
        return el ? el.getAttribute('content') || '' : '';
    };
    let name = getMeta('og:title') || document.title.split('|')[0].trim();
    const banner = getMeta('og:image') || '';
    const description = getMeta('og:description') || '';
    const bodyText = document.body.innerText;

    const resourceLinks = [];
    const seenHrefs = new Set();
    document.querySelectorAll('a[href]').forEach(a => {
        const href = a.href || '';
        const text = a.textContent.trim();
        const hl = href.toLowerCase();
        if (seenHrefs.has(href) || !href || href === '#') return;
        if (hl.endsWith('.pdf') || hl.includes('drive.google.com')) {
            seenHrefs.add(href);
            resourceLinks.push({ text: text.substring(0, 150) || 'Document', url: href, type: 'pdf' });
        }
    });

    return {
        name: name.substring(0, 200),
        description: description.substring(0, 2000),
        banner_url: banner,
        bodyText: bodyText.substring(0, 30000),
        themes: [],
        sidebarPrize: '',
        resourceLinks: resourceLinks.slice(0, 20),
    };
}"""


def get_extract_script(platform: str) -> str:
    if platform == "Devfolio":
        return DEVFOLIO_EXTRACT_SCRIPT
    if platform == "MLH":
        return MLH_EXTRACT_SCRIPT
    return GENERIC_EXTRACT_SCRIPT


# ══════════════════════════════════════════════════════════════════════════════
# PLAYWRIGHT SCRAPER
# ══════════════════════════════════════════════════════════════════════════════

async def scrape_with_playwright(url: str, platform: str) -> dict:
    global browser
    if browser is None:
        return {"scrape_success": False, "error": "Browser not initialized"}

    context = await browser.new_context(
        user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/125.0.0.0 Safari/537.36"
        ),
        viewport={"width": 1920, "height": 1080},
    )

    try:
        page = await context.new_page()
        print(f"[Scraper] → {url}  (platform={platform})")

        await page.goto(url, wait_until="domcontentloaded", timeout=25000)

        # Platform-specific wait times
        wait_map = {"Unstop": 9, "DoraHacks": 8, "Devfolio": 7, "MLH": 4}
        wait_sec = wait_map.get(platform, 5)
        print(f"[Scraper] Waiting {wait_sec}s for JS...")
        await page.wait_for_timeout(wait_sec * 1000)

        # Scroll to trigger lazy-loaded content
        for frac in [0.33, 0.66, 1.0, 0.0]:
            await page.evaluate(f"window.scrollTo(0, document.body.scrollHeight * {frac})")
            await asyncio.sleep(0.8)

        # Run platform-specific extraction script
        script = get_extract_script(platform)
        # Devfolio script is async — evaluate handles both sync and async
        try:
            data = await page.evaluate(script)
        except Exception:
            # Fallback to generic if platform script errors
            data = await page.evaluate(GENERIC_EXTRACT_SCRIPT)

        body_text = data.get("bodyText", "")
        print(f"[Scraper] bodyText={len(body_text)} chars, name='{data.get('name','')}'")

        # ── Extraction pipeline ───────────────────────────────────────────────
        # 1. Regex extraction (fast, always runs)
        regex_result = regex_extract(body_text, platform)

        # 2. Groq LLM extraction (slower, enriches results)
        llm_result = groq_extract(body_text, platform)

        # 3. Merge: LLM wins, regex fills gaps
        merged, llm_used = merge_results(llm_result, regex_result)

        # 4. Platform-specific post-processing
        # Devpost: inject sidebar themes if PS list is empty
        themes = data.get("themes", [])
        if themes and not merged["problem_statements"]:
            seen = set()
            for t in themes:
                if t.lower() not in seen:
                    seen.add(t.lower())
                    merged["problem_statements"].append({"track": "Theme", "title": t})

        # Devpost: sidebar prize fallback
        sidebar_prize = data.get("sidebarPrize", "")
        if not merged["prize_pool"] and sidebar_prize:
            for pat in [r"(\$[\d,]+(?:\.\d+)?(?:\s*(?:K|k|M))?)", r"(₹[\d,]+)"]:
                m = re.search(pat, sidebar_prize)
                if m:
                    merged["prize_pool"] = m.group(1)
                    break
            if not merged["prize_pool"]:
                merged["prize_pool"] = sidebar_prize[:100]

        return {
            "name":         data.get("name", ""),
            "description":  data.get("description", ""),
            "banner_url":   data.get("banner_url", ""),
            "resource_links": data.get("resourceLinks", []),
            "scrape_success": bool(data.get("name") and len(data.get("name", "")) > 2),
            "llm_used":     llm_used,
            **merged,
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"scrape_success": False, "error": str(e)}
    finally:
        await context.close()


# ══════════════════════════════════════════════════════════════════════════════
# APP LIFECYCLE
# ══════════════════════════════════════════════════════════════════════════════

@app.on_event("startup")
async def startup() -> None:
    global playwright, browser
    from playwright.async_api import async_playwright
    playwright = await async_playwright().start()
    browser = await playwright.chromium.launch(
        headless=True,
        args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    )
    groq_ready = "✓" if get_groq() else "✗ (set GROQ_API_KEY for LLM enrichment)"
    print(f"[Scraper] Playwright ready. Groq={groq_ready}")


@app.on_event("shutdown")
async def shutdown() -> None:
    global playwright, browser
    try:
        if browser:  await browser.close()
    finally:
        browser = None
    try:
        if playwright: await playwright.stop()
    finally:
        playwright = None


# ══════════════════════════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    return {
        "status": "ok",
        "service": "HackTrack Scraper v4",
        "groq_enabled": get_groq() is not None,
        "platforms": ["Devfolio", "Devpost", "Unstop", "DoraHacks", "MLH", "HackerEarth", "HackerRank"],
    }


@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.post("/scrape", response_model=ScrapeResponse)
async def scrape(request: ScrapeRequest):
    url = request.url.strip()
    platform = detect_platform(url)
    print(f"\n[Scraper] === {url}  platform={platform} ===")

    try:
        data = await scrape_with_playwright(url, platform)
        response = ScrapeResponse(
            name=data.get("name", ""),
            platform=platform,
            banner_url=data.get("banner_url", ""),
            description=data.get("description", ""),
            registration_deadline=data.get("registration_deadline", ""),
            submission_deadline=data.get("submission_deadline", ""),
            result_date=data.get("result_date", ""),
            start_date=data.get("start_date", ""),
            end_date=data.get("end_date", ""),
            prize_pool=data.get("prize_pool", ""),
            team_size=data.get("team_size", {"min": 1, "max": 4}),
            problem_statements=data.get("problem_statements", []),
            resource_links=data.get("resource_links", []),
            scrape_success=data.get("scrape_success", False),
            url=url,
            llm_used=data.get("llm_used", False),
        )
        print(
            f"[Scraper] Done: name='{response.name}' "
            f"reg={response.registration_deadline} sub={response.submission_deadline} "
            f"prize='{response.prize_pool}' ps={len(response.problem_statements)} "
            f"llm={response.llm_used}"
        )
        return response
    except Exception as e:
        print(f"[Scraper] Endpoint error: {e}")
        return ScrapeResponse(platform=platform, url=url, scrape_success=False)
