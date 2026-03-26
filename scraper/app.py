from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import asyncio
import re
import sys
from urllib.parse import urlparse
from typing import List
from datetime import datetime

if sys.platform == "win32":
    # Playwright launches a driver subprocess; Proactor loop supports subprocess APIs on Windows.
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

app = FastAPI(title="HackTrack Scraper", version="3.0.0")

# Global Playwright runtime objects reused across requests.
playwright = None
browser = None

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


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


def detect_platform(url: str) -> str:
    domain = urlparse(url).netloc.lower()
    if "devfolio" in domain:
        return "Devfolio"
    elif "unstop" in domain:
        return "Unstop"
    elif "devpost" in domain:
        return "Devpost"
    elif "dorahacks" in domain:
        return "DoraHacks"
    return "Other"


# ============================================================
# DATE PARSING — robust multi-format
# ============================================================
MONTH_MAP = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6,
    "jul": 7, "july": 7, "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
}

DATE_FORMATS = [
    "%Y-%m-%d", "%Y/%m/%d",
    "%d %B %Y", "%d %b %Y", "%d %B, %Y", "%d %b, %Y",
    "%B %d, %Y", "%b %d, %Y", "%B %d %Y", "%b %d %Y",
    "%m/%d/%Y", "%d/%m/%Y",
    "%B %d", "%b %d",
]


def parse_any_date(text: str, fallback_year: int = None) -> str:
    """Parse many date formats to YYYY-MM-DD. Handles partial dates."""
    if not text:
        return ""
    text = text.strip()
    text = re.sub(r"(\d+)(st|nd|rd|th)", r"\1", text)
    text = re.sub(r"\s+", " ", text)

    if not fallback_year:
        fallback_year = datetime.now().year

    for fmt in DATE_FORMATS:
        try:
            dt = datetime.strptime(text, fmt)
            if dt.year == 1900:  # no year in format
                dt = dt.replace(year=fallback_year)
                if dt < datetime.now():
                    dt = dt.replace(year=fallback_year + 1)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    return ""


def find_dates_near(text: str, keywords: List[str], window: int = 400) -> str:
    """Find dates within `window` chars after any keyword."""
    lower = text.lower()
    all_date_patterns = [
        r"(\d{4}[-/]\d{1,2}[-/]\d{1,2})",
        r"(\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[,]?\s+\d{4})",
        r"((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?[,]?\s*\d{0,4})",
        r"(\d{1,2}/\d{1,2}/\d{4})",
    ]
    for kw in keywords:
        idx = lower.find(kw.lower())
        if idx == -1:
            continue
        chunk = text[idx:idx + window]
        for pat in all_date_patterns:
            match = re.search(pat, chunk, re.IGNORECASE)
            if match:
                parsed = parse_any_date(match.group(1))
                if parsed:
                    return parsed
    return ""


# ============================================================
# EXTRACT from full page innerText (the reliable approach)
# ============================================================

def extract_all_from_text(body_text: str, platform: str) -> dict:
    """Extract hackathon details from page innerText using text patterns."""
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

    # ---- DATES ----
    # Registration deadline
    result["registration_deadline"] = find_dates_near(body_text, [
        "registration close", "registrations close", "register by",
        "last date to register", "registration deadline", "applications close",
        "apply by", "registration ends", "sign up deadline",
    ])

    # Submission deadline
    result["submission_deadline"] = find_dates_near(body_text, [
        "submission deadline", "submission closes", "submissions close",
        "submit by", "last date to submit", "submission end",
        "final submission", "project submission",
        "deadline",  # generic fallback last
    ])

    # Start date — Devfolio uses "Runs from Mar 25 - 26, 2026"
    runs_from = re.search(
        r"(?:runs?\s+from|starts?\s+(?:on|from)?|begins?\s+(?:on)?|commences?\s+(?:on)?)\s*[:\-]?\s*"
        r"((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2})"
        r"(?:\s*[-–]\s*(\d{1,2}))?"
        r"(?:[,\s]+(\d{4}))?",
        body_text, re.IGNORECASE
    )
    if runs_from:
        start_text = runs_from.group(1)
        year = runs_from.group(3) or str(datetime.now().year)
        result["start_date"] = parse_any_date(f"{start_text} {year}")
        if runs_from.group(2) and runs_from.group(1):
            month = runs_from.group(1).split()[0]
            result["end_date"] = parse_any_date(f"{month} {runs_from.group(2)} {year}")

    if not result["start_date"]:
        result["start_date"] = find_dates_near(body_text, [
            "start date", "starts on", "begins on", "hackathon starts",
            "event starts", "event date", "dates:",
        ])

    if not result["end_date"]:
        result["end_date"] = find_dates_near(body_text, [
            "end date", "ends on", "hackathon ends", "event ends",
        ])

    # Result date
    result["result_date"] = find_dates_near(body_text, [
        "result", "winners announced", "announcement", "winner announcement",
        "results declared", "shortlist",
    ])

    # ---- PRIZE POOL ----
    prize_patterns = [
        r"(₹\s*[\d,]+(?:\.\d+)?(?:\s*(?:Lakhs?|Lacs?|Crores?|Cr|K|k|L))?)",
        r"(\$\s*[\d,]+(?:\.\d+)?(?:\s*(?:K|k|M|million|thousand))?)",
        r"(€\s*[\d,]+(?:\.\d+)?)",
        r"(£\s*[\d,]+(?:\.\d+)?)",
        r"(INR\s*[\d,]+(?:\.\d+)?(?:\s*(?:Lakhs?|Lacs?|Crores?|Cr|K|k|L))?)",
        r"(Rs\.?\s*[\d,]+(?:\.\d+)?(?:\s*(?:Lakhs?|Lacs?|Crores?|Cr|K|k|L))?)",
    ]

    # Find prize amounts near keywords like "prize", "reward", "worth", "win"
    prize_lower = body_text.lower()
    for kw in ["prize", "reward", "worth", "winning", "bounty", "in cash", "in prizes"]:
        idx = prize_lower.find(kw)
        if idx == -1:
            continue
        # Search ±200 chars around keyword
        start = max(0, idx - 200)
        chunk = body_text[start:idx + 200]
        for pat in prize_patterns:
            match = re.search(pat, chunk, re.IGNORECASE)
            if match:
                result["prize_pool"] = match.group(1).strip()
                break
        if result["prize_pool"]:
            break

    # Fallback: any large currency amount
    if not result["prize_pool"]:
        for pat in prize_patterns:
            match = re.search(pat, body_text)
            if match:
                result["prize_pool"] = match.group(1).strip()
                break

    # ---- TEAM SIZE ----
    team_patterns = [
        r"team\s*size[:\s]*(\d+)\s*[-–to]+\s*(\d+)",
        r"(\d+)\s*[-–to]+\s*(\d+)\s*(?:members?|people|participants?|per team)",
        r"teams?\s+of\s+(?:up\s+to\s+)?(\d+)",
        r"max(?:imum)?\s*(?:team)?\s*(?:size)?\s*[:\s]*(\d+)",
        r"(\d+)\s*[-–]\s*(\d+)\s*$",  # in FAQ: "2 - 4"
    ]
    for pat in team_patterns:
        match = re.search(pat, body_text, re.IGNORECASE)
        if match:
            groups = [g for g in match.groups() if g]
            if len(groups) == 2:
                result["team_size"] = {"min": int(groups[0]), "max": int(groups[1])}
            elif len(groups) == 1:
                result["team_size"] = {"min": 1, "max": int(groups[0])}
            break

    # ---- PROBLEM STATEMENTS / TRACKS / DOMAINS ----
    ps = []
    seen_ps = set()

    # Pattern 1: "Domains: AI, ML, Web App" (Devfolio style)
    domain_match = re.search(
        r"(?:domains?|themes?|tracks?|categories|verticals|areas?)[:\s]+([^\n💡🏆🎁🎟️📍📅⏳📞🌮]+)",
        body_text, re.IGNORECASE
    )
    if domain_match:
        items = re.split(r"[,•|/]", domain_match.group(1))
        for item in items:
            item = item.strip().rstrip(".")
            if 3 < len(item) < 150 and item.lower() not in seen_ps:
                seen_ps.add(item.lower())
                ps.append({"track": "", "title": item})

    # Pattern 2: Numbered problem statements: "PS1: ...", "Problem Statement 1 - ..."
    for match in re.finditer(
        r"(?:PS|Problem\s*Statement|Theme|Track|Challenge)\s*#?(\d+)\s*[:\-–]\s*(.{5,200})",
        body_text, re.IGNORECASE
    ):
        num = match.group(1)
        title = match.group(2).strip().split("\n")[0]
        if title.lower() not in seen_ps and len(title) > 4:
            seen_ps.add(title.lower())
            ps.append({"track": f"Track {num}", "title": title})

    # Pattern 3: Devpost-style theme tags (already in themes list from JS)
    # Pattern 4: Bulleted lists after "Themes" or "Tracks" heading
    for match in re.finditer(
        r"(?:themes?|tracks?|problem\s*statements?|challenges?|domains?)\s*[:\n]"
        r"((?:\s*[-•●▸]\s*.{5,200}\n?)+)",
        body_text, re.IGNORECASE
    ):
        items = re.findall(r"[-•●▸]\s*(.{5,200})", match.group(1))
        for item in items:
            item = item.strip().split("\n")[0]
            if item.lower() not in seen_ps and 4 < len(item) < 200:
                seen_ps.add(item.lower())
                ps.append({"track": "", "title": item})

    result["problem_statements"] = ps[:20]
    return result


# ============================================================
# PLAYWRIGHT SCRAPER — gets innerText + meta from rendered page
# ============================================================

EXTRACT_SCRIPT = """() => {
    const getMeta = (name) => {
        const el = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
        return el ? el.getAttribute('content') || '' : '';
    };

    // Name: try multiple selectors
    const nameSelectors = [
        'h1',
        '.hackathon-name', '.event-name', '.challenge-title',
        '#challenge-title', '.opp-title',
    ];
    let name = '';
    for (const sel of nameSelectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim().length > 2) {
            name = el.textContent.trim();
            break;
        }
    }
    name = name || getMeta('og:title') || document.title.split('|')[0].trim();

    // Banner
    const banner = getMeta('og:image') || '';

    // Description
    let description = getMeta('og:description') || getMeta('description') || '';

    // Full page text for parsing
    const bodyText = document.body.innerText;

    // For Devpost: extract themes from tag links
    const themes = [];
    document.querySelectorAll('a[href*="themes"]').forEach(a => {
        const t = a.textContent.trim();
        if (t && t.length > 2 && t.length < 100) themes.push(t);
    });

    // Devpost sidebar prize text
    let sidebarPrize = '';
    document.querySelectorAll('a[href*="prizes"], .prize, [class*="prize"]').forEach(el => {
        const t = el.textContent.trim();
        if (t && t.length > 2) sidebarPrize += t + ' ';
    });

    // Resource links: PDFs, Google Drive, problem statements, rules, guidelines
    const resourceLinks = [];
    const seenHrefs = new Set();
    const linkKeywords = ['problem', 'statement', 'pdf', 'rule', 'guideline', 'brochure', 'document', 'brief', 'challenge', 'track', 'theme', 'schedule', 'timeline'];
    document.querySelectorAll('a[href]').forEach(a => {
        const href = a.href || '';
        const text = a.textContent.trim();
        const hrefLower = href.toLowerCase();
        const textLower = text.toLowerCase();
        if (seenHrefs.has(href) || !href || href === '#') return;

        const isPdf = hrefLower.endsWith('.pdf') || hrefLower.includes('/pdf');
        const isDrive = hrefLower.includes('drive.google.com') || hrefLower.includes('docs.google.com');
        const isDropbox = hrefLower.includes('dropbox.com');
        const isRelevant = linkKeywords.some(kw => textLower.includes(kw) || hrefLower.includes(kw));

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
        themes: themes,
        sidebarPrize: sidebarPrize.trim(),
        resourceLinks: resourceLinks.slice(0, 30),
    };
}"""


@app.on_event("startup")
async def startup() -> None:
    global playwright, browser
    from playwright.async_api import async_playwright

    playwright = await async_playwright().start()
    browser = await playwright.chromium.launch(
        headless=True,
        args=["--no-sandbox", "--disable-setuid-sandbox"],
    )
    print("[Scraper] Playwright browser initialized")


@app.on_event("shutdown")
async def shutdown() -> None:
    global playwright, browser

    try:
        if browser is not None:
            await browser.close()
            print("[Scraper] Browser closed")
    finally:
        browser = None

    try:
        if playwright is not None:
            await playwright.stop()
            print("[Scraper] Playwright stopped")
    finally:
        playwright = None

async def scrape_with_playwright(url: str, platform: str) -> dict:
    """Scrape using Playwright — renders JS, grabs full innerText for parsing."""
    global browser
    try:
        if browser is None:
            return {
                "scrape_success": False,
                "error": "Browser is not initialized. Service startup failed.",
            }

        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080},
        )

        try:
            page = await context.new_page()

            print(f"[Scraper] Navigating to {url} (platform: {platform})")
            await page.goto(url, wait_until="domcontentloaded", timeout=20000)

            # Wait for JS rendering — longer for SPAs
            wait_time = 8 if platform in ("Unstop",) else 5
            print(f"[Scraper] Waiting {wait_time}s for JS rendering...")
            await page.wait_for_timeout(wait_time * 1000)

            # Scroll to trigger lazy content
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight / 3)")
            await asyncio.sleep(1)
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight * 2 / 3)")
            await asyncio.sleep(1)
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await asyncio.sleep(1)
            await page.evaluate("window.scrollTo(0, 0)")
            await asyncio.sleep(0.5)

            # Extract structured + raw text data
            data = await page.evaluate(EXTRACT_SCRIPT)

            body_text = data.get("bodyText", "")
            name = data.get("name", "")
            description = data.get("description", "")

            print(f"[Scraper] Extracted name: '{name}', bodyText length: {len(body_text)}")

            # Parse all fields from full innerText
            extracted = extract_all_from_text(body_text, platform)

            # Devpost themes from sidebar tags
            themes = data.get("themes", [])
            if themes and not extracted["problem_statements"]:
                seen = set()
                for t in themes:
                    if t.lower() not in seen:
                        seen.add(t.lower())
                        extracted["problem_statements"].append({"track": "Theme", "title": t})

            # Sidebar prize fallback (Devpost)
            if not extracted["prize_pool"] and data.get("sidebarPrize"):
                prize_text = data["sidebarPrize"]
                for pat in [r"(\$[\d,]+(?:\.\d+)?(?:\s*(?:K|k|M))?)", r"(₹[\d,]+)"]:
                    m = re.search(pat, prize_text)
                    if m:
                        extracted["prize_pool"] = m.group(1)
                        break
                if not extracted["prize_pool"]:
                    extracted["prize_pool"] = prize_text[:100]

            return {
                "name": name,
                "description": description,
                "banner_url": data.get("banner_url", ""),
                "scrape_success": bool(name and len(name) > 2),
                "resource_links": data.get("resourceLinks", []),
                **extracted,
            }
        finally:
            await context.close()

    except Exception as e:
        print(f"[Scraper] Error: {e}")
        import traceback
        traceback.print_exc()
        return {"scrape_success": False, "error": str(e)}


# ============================================================
# API ROUTES
# ============================================================

@app.get("/")
async def root():
    return {"status": "ok", "service": "HackTrack Scraper v3"}


@app.post("/scrape", response_model=ScrapeResponse)
async def scrape(request: ScrapeRequest):
    url = request.url.strip()
    platform = detect_platform(url)
    print(f"\n[Scraper] === New scrape request: {url} (platform={platform}) ===")

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
        )

        print(f"[Scraper] Result: name='{response.name}', dates=({response.start_date}, {response.end_date}, reg={response.registration_deadline}, sub={response.submission_deadline}), prize='{response.prize_pool}', team={response.team_size}, ps={len(response.problem_statements)}")
        return response

    except Exception as e:
        print(f"[Scraper] Endpoint error: {e}")
        return ScrapeResponse(platform=platform, url=url, scrape_success=False)


# ============================================================
# LISTING PAGE CRAWLERS — for discovery / public_hackathons
# ============================================================

class CrawledHackathon(BaseModel):
    name: str = ""
    platform: str = ""
    banner_url: str = ""
    description: str = ""
    start_date: str = ""
    end_date: str = ""
    registration_deadline: str = ""
    prize_pool: str = ""
    tags: List[str] = Field(default_factory=list)
    source_url: str = ""
    status: str = "open"


class CrawlResponse(BaseModel):
    platform: str
    count: int = 0
    hackathons: List[CrawledHackathon] = Field(default_factory=list)
    error: str = ""


DEVFOLIO_EXTRACT = """() => {
    // Devfolio uses subdomain links like https://code-recet-3.devfolio.co/
    const allLinks = document.querySelectorAll('a[href*=".devfolio.co"]');
    const results = [];
    const seen = new Set();

    // Also grab any links that contain h3 tags (hackathon card pattern)
    const h3Links = document.querySelectorAll('a:has(h3)');
    const combined = new Set([...allLinks, ...h3Links]);

    combined.forEach(card => {
        try {
            const href = card.href || '';
            if (!href || seen.has(href)) return;

            // Skip non-hackathon links
            const hostname = new URL(href).hostname;
            if (hostname === 'devfolio.co' || hostname === 'www.devfolio.co') return;
            if (!hostname.endsWith('.devfolio.co')) return;
            // Skip common non-hackathon subdomains
            if (['api', 'docs', 'blog', 'app'].some(s => hostname.startsWith(s + '.'))) return;

            seen.add(href);

            const nameEl = card.querySelector('h3, h2, [class*="name"], [class*="title"]');
            const name = nameEl ? nameEl.textContent.trim() : '';
            if (!name || name.length < 3) return;

            // Walk up to the card container to find banner and other data
            const container = card.closest('div') || card.parentElement?.closest('div') || card;

            const imgEl = container.querySelector('img') || card.querySelector('img');
            const banner = imgEl ? (imgEl.src || imgEl.getAttribute('data-src') || '') : '';

            const descEl = container.querySelector('p') || card.querySelector('p');
            const description = descEl ? descEl.textContent.trim().substring(0, 500) : '';

            const allText = (container.textContent || card.textContent || '');

            // Extract prize
            let prize = '';
            const prizeMatch = allText.match(/[\u20B9$\u20AC\u00A3]\s*[\d,]+(?:\.\d+)?(?:\s*(?:Lakhs?|Lacs?|Crores?|K|k|L|M))?/);
            if (prizeMatch) prize = prizeMatch[0].trim();

            // Extract dates like "Mar 25 - 27, 2026" or "Runs from ..."
            let startDate = '';
            let endDate = '';
            const dateMatch = allText.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2})(?:\s*[-\u2013]\s*(\d{1,2}))?(?:[,\s]+(\d{4}))?/i);
            if (dateMatch) {
                const year = dateMatch[3] || new Date().getFullYear().toString();
                startDate = dateMatch[1] + ' ' + year;
                if (dateMatch[2]) {
                    const month = dateMatch[1].split(/\s+/)[0];
                    endDate = month + ' ' + dateMatch[2] + ' ' + year;
                }
            }

            // Extract tags from spans/badges
            const tags = [];
            const tagEls = container.querySelectorAll('span, [class*="tag"], [class*="badge"], [class*="chip"], [class*="Pill"]');
            tagEls.forEach(el => {
                const t = el.textContent.trim();
                if (t && t.length > 1 && t.length < 50 && !t.includes('\u20B9') && !t.includes('$') && t !== name) {
                    tags.push(t);
                }
            });

            results.push({
                name,
                source_url: href,
                banner_url: banner,
                description,
                prize_pool: prize,
                start_date: startDate,
                end_date: endDate,
                tags: [...new Set(tags)].slice(0, 10),
            });
        } catch(e) {}
    });

    return results;
}"""


DEVPOST_EXTRACT = """() => {
    const cards = document.querySelectorAll('.hackathon-tile, a[data-hackathon-slug], [class*="hackathon"]');
    const results = [];
    const seen = new Set();

    // Fallback: also try generic link approach
    const allLinks = document.querySelectorAll('a[href*="devpost.com/hackathons/"]');
    const combined = [...cards, ...allLinks];

    combined.forEach(card => {
        try {
            let href = card.href || card.querySelector('a')?.href || '';
            if (!href.startsWith('http')) {
                const aEl = card.closest('a') || card.querySelector('a');
                if (aEl) href = aEl.href;
            }
            if (!href || seen.has(href)) return;
            if (href.endsWith('/hackathons') || href.endsWith('/hackathons/')) return;
            seen.add(href);

            const nameEl = card.querySelector('h2, h3, .title, [class*="title"], [class*="name"]');
            const name = nameEl ? nameEl.textContent.trim() : (card.textContent || '').split('\\n')[0].trim().substring(0, 100);
            if (!name || name.length < 3) return;

            const imgEl = card.querySelector('img');
            const banner = imgEl ? (imgEl.src || '') : '';

            const descEl = card.querySelector('.tagline, .description, p');
            const description = descEl ? descEl.textContent.trim().substring(0, 500) : '';

            const allText = card.textContent || '';
            let prize = '';
            const prizeMatch = allText.match(/\\$\\s*[\\d,]+(?:\\.\\d+)?(?:\\s*(?:K|k|M|million))?/);
            if (prizeMatch) prize = prizeMatch[0].trim();

            // Dates
            let deadline = '';
            const dateMatch = allText.match(/(?:Submission|Deadline|Ends?)[:\\s]+([A-Za-z]+ \\d{1,2},?\\s*\\d{4})/i);
            if (dateMatch) deadline = dateMatch[1];

            const tags = [];
            card.querySelectorAll('.themes a, [class*="tag"], [class*="theme"]').forEach(el => {
                const t = el.textContent.trim();
                if (t && t.length > 1 && t.length < 50) tags.push(t);
            });

            results.push({
                name,
                source_url: href,
                banner_url: banner,
                description,
                prize_pool: prize,
                registration_deadline: deadline,
                tags: tags.slice(0, 10),
            });
        } catch(e) {}
    });

    return results;
}"""


UNSTOP_EXTRACT = """() => {
    const cards = document.querySelectorAll('[class*="card"], [class*="listing"], a[href*="/hackathons/"], a[href*="/competition/"]');
    const results = [];
    const seen = new Set();

    cards.forEach(card => {
        try {
            let href = card.href || '';
            if (!href.startsWith('http')) {
                const aEl = card.querySelector('a[href*="hackathon"], a[href*="competition"]');
                if (aEl) href = aEl.href;
            }
            if (!href || seen.has(href)) return;
            if (!href.includes('hackathon') && !href.includes('competition')) return;
            seen.add(href);

            const nameEl = card.querySelector('h3, h2, .title, [class*="title"], [class*="name"], p.semi-bold');
            const name = nameEl ? nameEl.textContent.trim() : '';
            if (!name || name.length < 3) return;

            const imgEl = card.querySelector('img');
            const banner = imgEl ? (imgEl.src || '') : '';

            const allText = card.textContent || '';

            let prize = '';
            const prizeMatch = allText.match(/(?:₹|INR|Rs\\.?)\\s*[\\d,]+(?:\\.\\d+)?(?:\\s*(?:Lakhs?|Lacs?|Crores?|K|k|L))?/i);
            if (prizeMatch) prize = prizeMatch[0].trim();

            const tags = [];
            card.querySelectorAll('[class*="chip"], [class*="tag"], [class*="badge"]').forEach(el => {
                const t = el.textContent.trim();
                if (t && t.length > 1 && t.length < 50 && !t.includes('₹')) tags.push(t);
            });

            const descEl = card.querySelector('p:not(.semi-bold)');
            const description = descEl ? descEl.textContent.trim().substring(0, 500) : '';

            results.push({
                name,
                source_url: href,
                banner_url: banner,
                description,
                prize_pool: prize,
                tags: tags.slice(0, 10),
            });
        } catch(e) {}
    });

    return results;
}"""


async def crawl_listing_page(url: str, platform: str, extract_script: str, scroll_count: int = 5, wait_secs: int = 5) -> List[dict]:
    """Generic listing page crawler: navigate, scroll to load lazy cards, extract."""
    global browser
    if browser is None:
        return []

    context = await browser.new_context(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        viewport={"width": 1920, "height": 1080},
    )

    try:
        page = await context.new_page()
        print(f"[Crawler] Navigating to {url} ({platform})")
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(wait_secs * 1000)

        # Scroll multiple times to trigger lazy loading
        for i in range(scroll_count):
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await asyncio.sleep(2)
            # Try clicking "Load More" / "Show More" buttons
            for selector in ['button:has-text("Load More")', 'button:has-text("Show More")', 'button:has-text("View More")', '[class*="load-more"]', '[class*="show-more"]']:
                try:
                    btn = page.locator(selector).first
                    if await btn.is_visible(timeout=500):
                        await btn.click()
                        await asyncio.sleep(2)
                except:
                    pass

        await page.evaluate("window.scrollTo(0, 0)")
        await asyncio.sleep(1)

        raw = await page.evaluate(extract_script)
        print(f"[Crawler] {platform}: extracted {len(raw)} entries")

        hackathons = []
        for item in raw:
            name = item.get("name", "").strip()
            source_url = item.get("source_url", "").strip()
            if not name or not source_url:
                continue

            # Parse dates if present
            reg_deadline = ""
            if item.get("registration_deadline"):
                reg_deadline = parse_any_date(item["registration_deadline"])

            hackathons.append({
                "name": name,
                "platform": platform,
                "banner_url": item.get("banner_url", ""),
                "description": item.get("description", ""),
                "start_date": parse_any_date(item.get("start_date", "")),
                "end_date": parse_any_date(item.get("end_date", "")),
                "registration_deadline": reg_deadline,
                "prize_pool": item.get("prize_pool", ""),
                "tags": item.get("tags", []),
                "source_url": source_url,
                "status": "open",
            })

        return hackathons
    except Exception as e:
        print(f"[Crawler] {platform} error: {e}")
        import traceback
        traceback.print_exc()
        return []
    finally:
        await context.close()


@app.post("/crawl/devfolio", response_model=CrawlResponse)
async def crawl_devfolio():
    results = await crawl_listing_page(
        url="https://devfolio.co/hackathons/open",
        platform="Devfolio",
        extract_script=DEVFOLIO_EXTRACT,
        scroll_count=5,
        wait_secs=6,
    )
    return CrawlResponse(platform="Devfolio", count=len(results), hackathons=[CrawledHackathon(**h) for h in results])


@app.post("/crawl/devpost", response_model=CrawlResponse)
async def crawl_devpost():
    results = await crawl_listing_page(
        url="https://devpost.com/hackathons?open_to[]=public&status[]=open",
        platform="DevPost",
        extract_script=DEVPOST_EXTRACT,
        scroll_count=4,
        wait_secs=5,
    )
    return CrawlResponse(platform="DevPost", count=len(results), hackathons=[CrawledHackathon(**h) for h in results])


@app.post("/crawl/unstop", response_model=CrawlResponse)
async def crawl_unstop():
    results = await crawl_listing_page(
        url="https://unstop.com/hackathons",
        platform="Unstop",
        extract_script=UNSTOP_EXTRACT,
        scroll_count=5,
        wait_secs=8,
    )
    return CrawlResponse(platform="Unstop", count=len(results), hackathons=[CrawledHackathon(**h) for h in results])


@app.post("/crawl/all")
async def crawl_all():
    """Crawl all platforms and return combined results."""
    print("\n[Crawler] === Starting full crawl ===")
    devfolio, devpost, unstop = await asyncio.gather(
        crawl_listing_page("https://devfolio.co/hackathons/open", "Devfolio", DEVFOLIO_EXTRACT, 5, 6),
        crawl_listing_page("https://devpost.com/hackathons?open_to[]=public&status[]=open", "DevPost", DEVPOST_EXTRACT, 4, 5),
        crawl_listing_page("https://unstop.com/hackathons", "Unstop", UNSTOP_EXTRACT, 5, 8),
    )
    all_results = devfolio + devpost + unstop
    print(f"[Crawler] === Full crawl complete: {len(all_results)} hackathons ===")
    return {
        "total": len(all_results),
        "by_platform": {
            "devfolio": len(devfolio),
            "devpost": len(devpost),
            "unstop": len(unstop),
        },
        "hackathons": all_results,
    }
