# ATClaudeRepo — LinkedIn Hiring Manager Search & Outreach

A CLI tool to find hiring managers at top tech companies (FAANG, Anthropic, OpenAI, etc.) and generate personalized outreach messages for Staff/Principal/Group PM roles.

## Setup

```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY=your_key_here
```

## Commands

### Find hiring managers
```bash
# Get LinkedIn people search URLs for hiring managers at all target companies
python main.py search

# Filter to specific companies
python main.py search -c Anthropic -c OpenAI -c Google

# Get LinkedIn Jobs URLs for open Staff/Principal PM roles
python main.py jobs

# Get a Google boolean search string to find hiring manager posts
python main.py google
```

### Track contacts
```bash
# Add a hiring manager you found
python main.py add

# List all tracked contacts
python main.py list

# Filter by status or company
python main.py list --status connected
python main.py list --company Anthropic

# View pipeline summary
python main.py status
```

### Generate outreach messages
```bash
# Generate a connection request (≤300 chars, Claude-written)
python main.py message --id 1 --type connection

# Choose style: warm (default), direct, or curious
python main.py message --id 1 --type connection --style direct

# Generate a follow-up message after they connect
python main.py message --id 1 --type followup

# Generate an InMail (subject + body)
python main.py message --id 1 --type inmail
```

### Update pipeline status
```bash
python main.py update --id 1 --status connected
python main.py update --id 1 --status replied --notes "Interested, asked for resume"
```

## Pipeline Statuses
- `found` → `connection_sent` → `connected` → `messaged` → `replied` → `call_scheduled`
- `not_interested` / `applied` (terminal states)

## Target Companies
Meta, Amazon, Apple, Netflix, Google, Alphabet, Anthropic, OpenAI, Microsoft, Salesforce, Stripe, Airbnb, Uber, LinkedIn, Spotify

## How It Works
1. **Search** — Generates LinkedIn search URLs using company IDs and keyword filters. Open in browser while logged in.
2. **Track** — Add contacts you find to `contacts.json` (gitignored).
3. **Outreach** — Claude generates personalized connection requests, follow-ups, and InMails based on the contact's profile.