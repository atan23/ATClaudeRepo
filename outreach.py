"""Claude-powered outreach message generator for LinkedIn connection requests."""

import anthropic
from config import TARGET_ROLE_LEVELS

_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic()
    return _client


# Candidate profile for personalization
CANDIDATE_PROFILE = {
    "name": "Akshay",
    "background": (
        "Senior product leader with extensive experience building consumer and enterprise products. "
        "Looking for Staff/Principal/Group PM opportunities where I can drive 0-to-1 product development "
        "and lead high-impact product strategy."
    ),
    "strengths": [
        "0-to-1 product development",
        "cross-functional leadership",
        "data-driven product strategy",
        "scaling products from prototype to millions of users",
    ],
    "target_levels": ["Staff PM", "Principal PM", "Group PM"],
}


def generate_connection_request(
    manager_name: str,
    manager_title: str,
    company: str,
    extra_context: str = "",
    style: str = "warm",
) -> str:
    """
    Generate a personalized LinkedIn connection request (300 char limit).

    Args:
        manager_name: First name of the hiring manager
        manager_title: Their title (e.g., "Director of Product")
        company: Company name
        extra_context: Any extra info (e.g., mutual connection, shared interest, recent post)
        style: "warm" (friendly), "direct" (business-focused), or "curious" (question-led)
    """
    style_instructions = {
        "warm": "friendly and genuine, focusing on shared interest in great products",
        "direct": "concise and business-focused, clearly stating intent without being pushy",
        "curious": "lead with a genuine question about their work or team to spark conversation",
    }

    prompt = f"""Write a LinkedIn connection request message from {CANDIDATE_PROFILE['name']} to {manager_name},
who is a {manager_title} at {company}.

Candidate background: {CANDIDATE_PROFILE['background']}

Style: {style_instructions.get(style, style_instructions['warm'])}

Additional context about this person: {extra_context if extra_context else 'None provided'}

Requirements:
- MUST be under 300 characters (LinkedIn's limit for connection requests)
- Do NOT use phrases like "I came across your profile" or "I hope this message finds you well"
- Do NOT be sycophantic or overly formal
- Feel human, not templated
- Mention the company or their work naturally if it helps
- The goal is to get them to accept the connection so a follow-up message can be sent

Return ONLY the message text, no quotes, no explanation."""

    response = _get_client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}],
    )

    return response.content[0].text.strip()


def generate_followup_message(
    manager_name: str,
    manager_title: str,
    company: str,
    open_role: str = "",
    extra_context: str = "",
) -> str:
    """
    Generate a follow-up LinkedIn message after connection is accepted.
    This can be longer (up to ~1000 chars for InMail or message).
    """
    role_context = (
        f"I see {company} is hiring for {open_role}." if open_role else f"I'm interested in Staff/Principal PM opportunities at {company}."
    )

    prompt = f"""Write a LinkedIn follow-up message from {CANDIDATE_PROFILE['name']} to {manager_name} ({manager_title} at {company})
after they accepted a connection request.

Candidate: {CANDIDATE_PROFILE['background']}
Key strengths: {', '.join(CANDIDATE_PROFILE['strengths'])}
Target roles: {', '.join(CANDIDATE_PROFILE['target_levels'])}

Role context: {role_context}
Additional context: {extra_context if extra_context else 'None provided'}

Requirements:
- 150-300 words
- Open with a genuine compliment or observation about their company/work (NOT generic flattery)
- Briefly explain who the candidate is and what makes them distinctive
- Express interest in the opportunity or team clearly but without desperation
- End with a clear, low-friction ask (e.g., a 20-minute call, sharing resume, referral to recruiter)
- Sound like a human, not a template
- No bullet points — conversational prose

Return ONLY the message text."""

    response = _get_client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}],
    )

    return response.content[0].text.strip()


def generate_inmail(
    manager_name: str,
    manager_title: str,
    company: str,
    open_role: str = "",
    extra_context: str = "",
) -> dict[str, str]:
    """
    Generate a LinkedIn InMail (subject + body) for cold outreach.
    """
    role_context = f"open {open_role} role" if open_role else "Staff/Principal PM opportunities"

    prompt = f"""Write a LinkedIn InMail from {CANDIDATE_PROFILE['name']} to {manager_name} ({manager_title} at {company}).

Context: Reaching out about {role_context} at {company}.
Candidate: {CANDIDATE_PROFILE['background']}
Strengths: {', '.join(CANDIDATE_PROFILE['strengths'])}
Target levels: {', '.join(CANDIDATE_PROFILE['target_levels'])}
Extra context: {extra_context if extra_context else 'None'}

Requirements:
- Subject line: under 50 characters, compelling, specific to {company}
- Body: 100-200 words, conversational, specific to {company}'s product challenges or mission
- No generic opener like "I hope you're doing well"
- End with a clear, easy ask
- Sound human and direct

Return as JSON with keys "subject" and "body". Return ONLY the JSON, no markdown fences."""

    response = _get_client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}],
    )

    import json
    text = response.content[0].text.strip()
    # Strip markdown fences if model includes them
    if text.startswith("```"):
        text = "\n".join(text.split("\n")[1:-1])
    return json.loads(text)


def generate_outreach_batch(contacts: list[dict], message_type: str = "connection") -> list[dict]:
    """
    Generate outreach messages for a batch of contacts.

    Args:
        contacts: List of dicts with keys: name, title, company, open_role (optional), context (optional)
        message_type: "connection", "followup", or "inmail"
    """
    results = []
    for contact in contacts:
        name = contact.get("name", "")
        title = contact.get("title", "")
        company = contact.get("company", "")
        open_role = contact.get("open_role", "")
        context = contact.get("context", "")

        if message_type == "connection":
            message = generate_connection_request(name, title, company, context)
            results.append({**contact, "message": message, "type": "connection_request"})
        elif message_type == "followup":
            message = generate_followup_message(name, title, company, open_role, context)
            results.append({**contact, "message": message, "type": "followup"})
        elif message_type == "inmail":
            inmail = generate_inmail(name, title, company, open_role, context)
            results.append({**contact, **inmail, "type": "inmail"})

    return results
