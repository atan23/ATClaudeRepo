#!/usr/bin/env python3
"""
LinkedIn Hiring Manager Search & Outreach Tool

Usage:
  python main.py search          — Show LinkedIn search URLs for finding hiring managers
  python main.py jobs            — Show LinkedIn job search URLs for open Staff/Principal PM roles
  python main.py google          — Show a Google boolean search string for finding hiring posts
  python main.py add             — Add a contact to the tracker
  python main.py list            — List tracked contacts
  python main.py status          — Show contact pipeline summary
  python main.py message         — Generate outreach message for a contact
  python main.py update          — Update a contact's status
"""

import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text
from rich import box

from config import TARGET_COMPANIES
from search import build_hiring_manager_search_urls, build_job_search_urls, build_boolean_search_string
from outreach import generate_connection_request, generate_followup_message, generate_inmail
from tracker import (
    add_contact,
    update_status,
    log_message,
    list_contacts,
    get_summary,
    get_contact,
    STATUS_OPTIONS,
)

console = Console()


@click.group()
def cli():
    """LinkedIn Hiring Manager Search & Outreach Tool."""
    pass


@cli.command()
@click.option("--companies", "-c", multiple=True, help="Filter to specific companies (can repeat)")
def search(companies):
    """Show LinkedIn people search URLs to find hiring managers."""
    target = list(companies) if companies else None
    urls = build_hiring_manager_search_urls(target)

    console.print(Panel.fit(
        "[bold cyan]LinkedIn Hiring Manager Search URLs[/bold cyan]\n"
        "[dim]Open these in your browser while logged into LinkedIn[/dim]",
        border_style="cyan"
    ))

    table = Table(box=box.ROUNDED, show_header=True, header_style="bold magenta")
    table.add_column("#", style="dim", width=4)
    table.add_column("Description", style="white", min_width=35)
    table.add_column("URL", style="blue", overflow="fold", min_width=60)

    for i, item in enumerate(urls, 1):
        table.add_row(str(i), item["description"], item["url"])

    console.print(table)
    console.print(f"\n[green]Total: {len(urls)} search URLs[/green]")


@cli.command()
@click.option("--companies", "-c", multiple=True, help="Filter to specific companies")
def jobs(companies):
    """Show LinkedIn job search URLs for open Staff/Principal PM roles."""
    target = list(companies) if companies else None
    urls = build_job_search_urls(target)

    console.print(Panel.fit(
        "[bold cyan]LinkedIn Jobs — Open Staff/Principal PM Roles[/bold cyan]\n"
        "[dim]Identify active hiring to find the right hiring managers[/dim]",
        border_style="cyan"
    ))

    table = Table(box=box.ROUNDED, show_header=True, header_style="bold magenta")
    table.add_column("#", style="dim", width=4)
    table.add_column("Description", style="white", min_width=40)
    table.add_column("URL", style="blue", overflow="fold", min_width=60)

    for i, item in enumerate(urls, 1):
        table.add_row(str(i), item["description"], item["url"])

    console.print(table)


@cli.command()
def google():
    """Show a Google boolean search string to find hiring manager posts on LinkedIn."""
    query = build_boolean_search_string()
    console.print(Panel.fit(
        "[bold cyan]Google Boolean Search[/bold cyan]\n"
        "[dim]Paste this into Google to find hiring managers posting about open PM roles[/dim]",
        border_style="cyan"
    ))
    console.print(f"\n[yellow]{query}[/yellow]\n")
    console.print("[dim]Tip: Also try searching on LinkedIn itself under 'Posts' filter[/dim]")


@cli.command()
@click.option("--name", prompt="Contact name", help="Hiring manager's full name")
@click.option("--title", prompt="Title", help="Their job title")
@click.option("--company", prompt="Company", help="Company name")
@click.option("--url", default="", help="LinkedIn profile URL")
@click.option("--role", default="", help="Open role they're hiring for")
@click.option("--notes", default="", help="Notes about this contact")
def add(name, title, company, url, role, notes):
    """Add a hiring manager contact to the tracker."""
    contact = add_contact(name, title, company, url, role, notes)
    console.print(f"\n[green]Added contact:[/green] {contact['name']} ({contact['title']}) at {contact['company']} — ID: {contact['id']}")


@cli.command("list")
@click.option("--status", "-s", default=None, help=f"Filter by status: {', '.join(STATUS_OPTIONS)}")
@click.option("--company", "-c", default=None, help="Filter by company")
def list_cmd(status, company):
    """List tracked hiring manager contacts."""
    contacts = list_contacts(status_filter=status, company_filter=company)

    if not contacts:
        console.print("[yellow]No contacts found.[/yellow]")
        return

    table = Table(box=box.ROUNDED, show_header=True, header_style="bold magenta")
    table.add_column("ID", style="dim", width=4)
    table.add_column("Name", style="white", min_width=20)
    table.add_column("Title", style="cyan", min_width=25)
    table.add_column("Company", style="green", min_width=12)
    table.add_column("Status", style="yellow", min_width=18)
    table.add_column("Open Role", style="blue", min_width=20)
    table.add_column("Notes", style="dim", min_width=20, overflow="fold")

    status_colors = {
        "found": "white",
        "connection_sent": "yellow",
        "connected": "cyan",
        "messaged": "blue",
        "replied": "green",
        "call_scheduled": "bold green",
        "not_interested": "red",
        "applied": "magenta",
    }

    for c in contacts:
        color = status_colors.get(c["status"], "white")
        table.add_row(
            str(c["id"]),
            c["name"],
            c["title"],
            c["company"],
            f"[{color}]{c['status']}[/{color}]",
            c.get("open_role", ""),
            (c.get("notes", "") or "")[:50],
        )

    console.print(table)
    console.print(f"\n[dim]Total: {len(contacts)} contacts[/dim]")


@cli.command()
def status():
    """Show a summary of the contact pipeline."""
    summary = get_summary()

    console.print(Panel.fit(
        f"[bold cyan]Contact Pipeline Summary[/bold cyan]",
        border_style="cyan"
    ))

    console.print(f"[bold]Total contacts:[/bold] {summary['total']}\n")

    if summary["by_status"]:
        table = Table(box=box.SIMPLE, show_header=True, header_style="bold")
        table.add_column("Status", style="yellow")
        table.add_column("Count", style="white", justify="right")

        for s, count in sorted(summary["by_status"].items(), key=lambda x: -x[1]):
            table.add_row(s, str(count))

        console.print(table)

    if summary["last_updated"]:
        console.print(f"\n[dim]Last updated: {summary['last_updated']}[/dim]")


@cli.command()
@click.option("--id", "contact_id", type=int, prompt="Contact ID", help="Contact ID from the tracker")
@click.option(
    "--type", "msg_type",
    type=click.Choice(["connection", "followup", "inmail"]),
    default="connection",
    show_default=True,
    help="Type of message to generate",
)
@click.option("--style", default="warm", type=click.Choice(["warm", "direct", "curious"]), help="Message style (for connection requests)")
@click.option("--save/--no-save", default=True, help="Log the message in the tracker")
def message(contact_id, msg_type, style, save):
    """Generate an outreach message for a contact using Claude."""
    contact = get_contact(contact_id)
    if not contact:
        console.print(f"[red]Contact ID {contact_id} not found.[/red]")
        return

    console.print(f"\n[cyan]Generating {msg_type} message for {contact['name']} at {contact['company']}...[/cyan]\n")

    name = contact["name"].split()[0]  # First name
    title = contact["title"]
    company = contact["company"]
    open_role = contact.get("open_role", "")
    notes = contact.get("notes", "")

    if msg_type == "connection":
        text = generate_connection_request(name, title, company, notes, style)
        char_count = len(text)
        color = "green" if char_count <= 300 else "red"
        console.print(Panel(
            f"[white]{text}[/white]\n\n[{color}]{char_count}/300 characters[/{color}]",
            title=f"[bold]Connection Request — {contact['name']}[/bold]",
            border_style="cyan",
        ))
        if save:
            log_message(contact_id, "connection_request", text)
            update_status(contact_id, "connection_sent")
            console.print("[dim]Logged and status updated to 'connection_sent'[/dim]")

    elif msg_type == "followup":
        text = generate_followup_message(name, title, company, open_role, notes)
        console.print(Panel(
            f"[white]{text}[/white]",
            title=f"[bold]Follow-up Message — {contact['name']}[/bold]",
            border_style="cyan",
        ))
        if save:
            log_message(contact_id, "followup", text)
            update_status(contact_id, "messaged")
            console.print("[dim]Logged and status updated to 'messaged'[/dim]")

    elif msg_type == "inmail":
        inmail = generate_inmail(name, title, company, open_role, notes)
        console.print(Panel(
            f"[bold yellow]Subject:[/bold yellow] {inmail['subject']}\n\n[white]{inmail['body']}[/white]",
            title=f"[bold]InMail — {contact['name']}[/bold]",
            border_style="cyan",
        ))
        if save:
            log_message(contact_id, "inmail", f"SUBJECT: {inmail['subject']}\n\n{inmail['body']}")
            update_status(contact_id, "messaged")
            console.print("[dim]Logged and status updated to 'messaged'[/dim]")


@cli.command()
@click.option("--id", "contact_id", type=int, prompt="Contact ID")
@click.option(
    "--status", "new_status",
    type=click.Choice(STATUS_OPTIONS),
    prompt="New status",
)
@click.option("--notes", default="", help="Optional notes to append")
def update(contact_id, new_status, notes):
    """Update a contact's pipeline status."""
    contact = update_status(contact_id, new_status, notes)
    if contact:
        console.print(f"[green]Updated {contact['name']} → {new_status}[/green]")
    else:
        console.print(f"[red]Contact ID {contact_id} not found.[/red]")


if __name__ == "__main__":
    cli()
