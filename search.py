"""LinkedIn search URL generator for finding hiring managers."""

from urllib.parse import urlencode, quote
from typing import Optional
from config import (
    TARGET_COMPANIES,
    COMPANY_IDS,
    HIRING_MANAGER_TITLES,
    LINKEDIN_SENIORITY_CODES,
)


def build_people_search_url(
    titles: Optional[list[str]] = None,
    companies: Optional[list[str]] = None,
    keywords: Optional[str] = None,
) -> str:
    """
    Build a LinkedIn People search URL.

    Opens in LinkedIn's people search with title and company filters.
    The user must be logged in to LinkedIn for this to work.
    """
    base = "https://www.linkedin.com/search/results/people/"

    params: dict[str, str] = {}

    if keywords:
        params["keywords"] = keywords

    # LinkedIn uses facet filters encoded as lists
    facet_parts = []

    if titles:
        # Each title as a separate title filter
        title_values = ",".join(f'"{t}"' for t in titles)
        facet_parts.append(f"titleFreeText%3A{quote(title_values)}")

    if companies:
        # Use company IDs where available, fall back to names
        ids = [COMPANY_IDS[c] for c in companies if c in COMPANY_IDS]
        if ids:
            facet_parts.append(f"currentCompany%3A[{','.join(ids)}]")

    if facet_parts:
        params["facetNetwork"] = '["F","S"]'  # 1st and 2nd degree

    url = base
    if params:
        url += "?" + "&".join(f"{k}={quote(str(v))}" for k, v in params.items())

    return url


def build_hiring_manager_search_urls(
    companies: Optional[list[str]] = None,
) -> list[dict]:
    """
    Generate ready-to-use LinkedIn search URLs to find hiring managers
    at the given companies (defaults to all target companies).

    Returns a list of dicts with 'description' and 'url'.
    """
    if companies is None:
        companies = TARGET_COMPANIES

    results = []

    # 1. People search: senior product leaders at each company cluster
    #    LinkedIn limits keyword length, so we batch companies
    batch_size = 5
    for i in range(0, len(companies), batch_size):
        batch = companies[i : i + batch_size]
        company_ids = [COMPANY_IDS[c] for c in batch if c in COMPANY_IDS]

        if not company_ids:
            continue

        # Build URL using LinkedIn's facet format
        company_filter = "%5B" + "%2C".join(company_ids) + "%5D"
        url = (
            "https://www.linkedin.com/search/results/people/"
            f"?facetCurrentCompany={company_filter}"
            "&facetNetwork=%5B%22F%22%2C%22S%22%2C%22O%22%5D"
            "&keywords=director%20OR%20VP%20product%20manager"
            "&origin=FACETED_SEARCH"
        )
        results.append(
            {
                "description": f"Senior product leaders at: {', '.join(batch)}",
                "url": url,
                "companies": batch,
            }
        )

    # 2. Individual company deep searches with specific title keywords
    title_keywords = [
        ("Director Product", "director+product"),
        ("VP Product", "VP+product+management"),
        ("Head of Product", "head+of+product"),
        ("Group PM", "group+product+manager"),
    ]

    for company in companies:
        company_id = COMPANY_IDS.get(company)
        if not company_id:
            continue

        for title_label, keyword in title_keywords:
            url = (
                "https://www.linkedin.com/search/results/people/"
                f"?facetCurrentCompany=%5B{company_id}%5D"
                f"&keywords={keyword}"
                "&facetNetwork=%5B%22F%22%2C%22S%22%2C%22O%22%5D"
                "&origin=FACETED_SEARCH"
            )
            results.append(
                {
                    "description": f"{title_label} at {company}",
                    "url": url,
                    "companies": [company],
                }
            )

    return results


def build_job_search_urls(companies: Optional[list[str]] = None) -> list[dict]:
    """
    Generate LinkedIn Jobs search URLs for Staff/Principal PM roles.
    These help identify which teams are actively hiring (and thus who the hiring managers are).
    """
    if companies is None:
        companies = TARGET_COMPANIES

    results = []

    job_keywords = [
        "Staff Product Manager",
        "Principal Product Manager",
        "Group Product Manager",
    ]

    for keyword in job_keywords:
        # All target companies combined
        company_ids = [COMPANY_IDS[c] for c in companies if c in COMPANY_IDS]
        f_company = "%2C".join(company_ids)

        url = (
            "https://www.linkedin.com/jobs/search/"
            f"?keywords={quote(keyword)}"
            f"&f_C={f_company}"
            "&f_E=5%2C6"  # Director and VP seniority
            "&sortBy=DD"  # Most recent first
        )
        results.append(
            {
                "description": f"Open {keyword} roles at target companies",
                "url": url,
                "keyword": keyword,
            }
        )

    return results


def build_boolean_search_string(companies: Optional[list[str]] = None) -> str:
    """
    Build a Google/LinkedIn boolean search string to find hiring managers
    via public posts about hiring.
    """
    if companies is None:
        companies = TARGET_COMPANIES

    company_clause = " OR ".join(f'"{c}"' for c in companies)
    title_clause = (
        '"Director of Product" OR "VP of Product" OR "Head of Product" '
        'OR "Group Product Manager" OR "Principal PM"'
    )
    hiring_clause = (
        '"hiring" OR "looking for" OR "open role" OR "we\'re hiring" OR "join my team"'
    )

    return (
        f'site:linkedin.com ({title_clause}) ({company_clause}) ({hiring_clause}) '
        f'"Staff PM" OR "Principal PM" OR "Group PM" OR "Staff Product Manager"'
    )
