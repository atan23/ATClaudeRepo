"""Configuration: target companies and role definitions."""

# Companies to target — FAANG + top AI/tech companies
TARGET_COMPANIES = [
    "Meta",
    "Amazon",
    "Apple",
    "Netflix",
    "Google",
    "Alphabet",
    "Anthropic",
    "OpenAI",
    "Microsoft",
    "Salesforce",
    "Stripe",
    "Airbnb",
    "Uber",
    "LinkedIn",
    "Spotify",
]

# LinkedIn company IDs for precise filtering (most reliable approach)
# These are the numeric IDs used in LinkedIn's search API
COMPANY_IDS = {
    "Meta": "10667",
    "Amazon": "1586",
    "Apple": "162479",
    "Netflix": "2583",
    "Google": "1441",
    "Alphabet": "15169",
    "Anthropic": "74966747",
    "OpenAI": "79003078",
    "Microsoft": "1035",
    "Salesforce": "2792",
    "Stripe": "13752819",
    "Airbnb": "4209929",
    "Uber": "2906552",
    "LinkedIn": "1337",
    "Spotify": "1440501",
}

# Hiring manager titles — people who hire Staff/Principal/Group PMs
HIRING_MANAGER_TITLES = [
    "Director of Product Management",
    "VP of Product",
    "VP of Product Management",
    "Head of Product",
    "Senior Director of Product",
    "Senior Director Product Management",
    "Group Product Manager",
    "Principal Product Manager",
    "Chief Product Officer",
    "SVP Product",
    "SVP of Product Management",
]

# Seniority levels the user is targeting (for job searches)
TARGET_ROLE_LEVELS = [
    "Staff Product Manager",
    "Principal Product Manager",
    "Group Product Manager",
    "Senior Staff Product Manager",
    "Distinguished Product Manager",
]

# LinkedIn seniority filter codes (used in job search URLs)
# 5=Director, 6=VP, 7=C-Suite, 4=Senior
LINKEDIN_SENIORITY_CODES = ["4", "5", "6", "7"]
