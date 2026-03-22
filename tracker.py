"""Contact tracker — stores and manages hiring manager contacts as JSON."""

import json
import os
from datetime import datetime, timezone
from typing import Optional

TRACKER_FILE = "contacts.json"

STATUS_OPTIONS = [
    "found",           # Identified but not yet contacted
    "connection_sent", # LinkedIn connection request sent
    "connected",       # Connection accepted
    "messaged",        # Follow-up message sent
    "replied",         # They replied
    "call_scheduled",  # Call booked
    "not_interested",  # They passed
    "applied",         # Applied through official channels
]


def _load() -> dict:
    if not os.path.exists(TRACKER_FILE):
        return {"contacts": [], "last_updated": None}
    with open(TRACKER_FILE) as f:
        return json.load(f)


def _save(data: dict) -> None:
    data["last_updated"] = datetime.now(timezone.utc).isoformat()
    with open(TRACKER_FILE, "w") as f:
        json.dump(data, f, indent=2)


def add_contact(
    name: str,
    title: str,
    company: str,
    linkedin_url: str = "",
    open_role: str = "",
    notes: str = "",
    status: str = "found",
) -> dict:
    """Add a new hiring manager contact."""
    data = _load()

    # Check for duplicate by LinkedIn URL or name+company
    for existing in data["contacts"]:
        if linkedin_url and existing.get("linkedin_url") == linkedin_url:
            print(f"Contact already exists: {existing['name']} at {existing['company']}")
            return existing
        if existing["name"].lower() == name.lower() and existing["company"].lower() == company.lower():
            print(f"Contact already exists: {name} at {company}")
            return existing

    contact = {
        "id": len(data["contacts"]) + 1,
        "name": name,
        "title": title,
        "company": company,
        "linkedin_url": linkedin_url,
        "open_role": open_role,
        "notes": notes,
        "status": status,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "messages": [],
    }

    data["contacts"].append(contact)
    _save(data)
    return contact


def update_status(contact_id: int, status: str, notes: str = "") -> Optional[dict]:
    """Update the status of a contact."""
    if status not in STATUS_OPTIONS:
        raise ValueError(f"Invalid status '{status}'. Choose from: {STATUS_OPTIONS}")

    data = _load()
    for contact in data["contacts"]:
        if contact["id"] == contact_id:
            contact["status"] = status
            contact["updated_at"] = datetime.now(timezone.utc).isoformat()
            if notes:
                contact["notes"] = (contact.get("notes", "") + f"\n[{datetime.now().strftime('%Y-%m-%d')}] {notes}").strip()
            _save(data)
            return contact

    return None


def log_message(contact_id: int, message_type: str, message_text: str) -> None:
    """Log a sent message for a contact."""
    data = _load()
    for contact in data["contacts"]:
        if contact["id"] == contact_id:
            contact.setdefault("messages", []).append(
                {
                    "type": message_type,
                    "text": message_text,
                    "sent_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            contact["updated_at"] = datetime.now(timezone.utc).isoformat()
            _save(data)
            return

    raise ValueError(f"Contact ID {contact_id} not found")


def list_contacts(
    status_filter: Optional[str] = None,
    company_filter: Optional[str] = None,
) -> list[dict]:
    """List contacts, optionally filtered by status or company."""
    data = _load()
    contacts = data["contacts"]

    if status_filter:
        contacts = [c for c in contacts if c["status"] == status_filter]
    if company_filter:
        contacts = [c for c in contacts if c["company"].lower() == company_filter.lower()]

    return contacts


def get_summary() -> dict:
    """Get a summary of contacts by status."""
    data = _load()
    summary: dict[str, int] = {}
    for contact in data["contacts"]:
        s = contact["status"]
        summary[s] = summary.get(s, 0) + 1
    return {
        "total": len(data["contacts"]),
        "by_status": summary,
        "last_updated": data.get("last_updated"),
    }


def get_contact(contact_id: int) -> Optional[dict]:
    """Retrieve a single contact by ID."""
    data = _load()
    for contact in data["contacts"]:
        if contact["id"] == contact_id:
            return contact
    return None
