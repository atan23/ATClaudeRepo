"""
Google Sheets integration using the Google Sheets API v4.

Supports two authentication methods:
  1. Service Account (recommended for server/automation use)
     - Set GOOGLE_SERVICE_ACCOUNT_FILE=/path/to/service_account.json
  2. OAuth2 (for user-delegated access)
     - Set GOOGLE_CREDENTIALS_FILE=/path/to/credentials.json
     - A token.json will be saved after the first browser-based login

Usage:
    from google_sheets import GoogleSheetsClient

    client = GoogleSheetsClient()  # auto-detects auth from env vars
    data = client.read("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms", "Sheet1!A1:D5")
"""

import os
from typing import Any

from dotenv import load_dotenv
from google.oauth2 import service_account
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

load_dotenv()

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]


def _get_service_account_creds(path: str) -> service_account.Credentials:
    return service_account.Credentials.from_service_account_file(path, scopes=SCOPES)


def _get_oauth_creds(credentials_file: str, token_file: str = "token.json") -> Credentials:
    creds = None
    if os.path.exists(token_file):
        creds = Credentials.from_authorized_user_file(token_file, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(credentials_file, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(token_file, "w") as f:
            f.write(creds.to_json())
    return creds


class GoogleSheetsClient:
    """
    Client for interacting with Google Sheets.

    Auth is resolved in this order:
      1. Explicit `service_account_file` constructor arg
      2. GOOGLE_SERVICE_ACCOUNT_FILE env var
      3. Explicit `credentials_file` constructor arg
      4. GOOGLE_CREDENTIALS_FILE env var (OAuth2 flow)
    """

    def __init__(
        self,
        service_account_file: str | None = None,
        credentials_file: str | None = None,
        token_file: str = "token.json",
    ):
        sa_file = service_account_file or os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE")
        oauth_file = credentials_file or os.getenv("GOOGLE_CREDENTIALS_FILE")

        if sa_file:
            creds = _get_service_account_creds(sa_file)
        elif oauth_file:
            creds = _get_oauth_creds(oauth_file, token_file)
        else:
            raise ValueError(
                "No credentials found. Set GOOGLE_SERVICE_ACCOUNT_FILE or "
                "GOOGLE_CREDENTIALS_FILE in your environment or .env file."
            )

        self._service = build("sheets", "v4", credentials=creds)
        self._sheets = self._service.spreadsheets()

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    def read(self, spreadsheet_id: str, range_: str) -> list[list[Any]]:
        """
        Read values from a spreadsheet range.

        Args:
            spreadsheet_id: The ID from the spreadsheet URL.
            range_: A1 notation range, e.g. "Sheet1!A1:D10" or "A1:D10".

        Returns:
            2-D list of cell values. Empty cells are omitted from trailing
            positions in each row.
        """
        try:
            result = (
                self._sheets.values()
                .get(spreadsheetId=spreadsheet_id, range=range_)
                .execute()
            )
            return result.get("values", [])
        except HttpError as e:
            raise RuntimeError(f"Failed to read from '{range_}': {e}") from e

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    def write(
        self,
        spreadsheet_id: str,
        range_: str,
        values: list[list[Any]],
        value_input_option: str = "USER_ENTERED",
    ) -> dict:
        """
        Write values to a spreadsheet range (overwrites existing content).

        Args:
            spreadsheet_id: The spreadsheet ID.
            range_: A1 notation range where writing starts.
            values: 2-D list of values to write.
            value_input_option: "RAW" or "USER_ENTERED" (default).

        Returns:
            API response dict with updatedCells, updatedRows, etc.
        """
        body = {"values": values}
        try:
            result = (
                self._sheets.values()
                .update(
                    spreadsheetId=spreadsheet_id,
                    range=range_,
                    valueInputOption=value_input_option,
                    body=body,
                )
                .execute()
            )
            return result
        except HttpError as e:
            raise RuntimeError(f"Failed to write to '{range_}': {e}") from e

    # ------------------------------------------------------------------
    # Append
    # ------------------------------------------------------------------

    def append(
        self,
        spreadsheet_id: str,
        range_: str,
        values: list[list[Any]],
        value_input_option: str = "USER_ENTERED",
    ) -> dict:
        """
        Append rows after the last row with data in the given range.

        Args:
            spreadsheet_id: The spreadsheet ID.
            range_: A1 notation range used to find the table to append to.
            values: 2-D list of rows to append.
            value_input_option: "RAW" or "USER_ENTERED" (default).

        Returns:
            API response dict with updates info.
        """
        body = {"values": values}
        try:
            result = (
                self._sheets.values()
                .append(
                    spreadsheetId=spreadsheet_id,
                    range=range_,
                    valueInputOption=value_input_option,
                    insertDataOption="INSERT_ROWS",
                    body=body,
                )
                .execute()
            )
            return result
        except HttpError as e:
            raise RuntimeError(f"Failed to append to '{range_}': {e}") from e

    # ------------------------------------------------------------------
    # Create spreadsheet
    # ------------------------------------------------------------------

    def create_spreadsheet(self, title: str, sheet_titles: list[str] | None = None) -> str:
        """
        Create a new Google Spreadsheet.

        Args:
            title: Title of the new spreadsheet.
            sheet_titles: Optional list of sheet tab names. Defaults to ["Sheet1"].

        Returns:
            The new spreadsheet ID.
        """
        sheets = [
            {"properties": {"title": t}} for t in (sheet_titles or ["Sheet1"])
        ]
        body = {
            "properties": {"title": title},
            "sheets": sheets,
        }
        try:
            result = self._sheets.create(body=body, fields="spreadsheetId").execute()
            return result["spreadsheetId"]
        except HttpError as e:
            raise RuntimeError(f"Failed to create spreadsheet '{title}': {e}") from e

    # ------------------------------------------------------------------
    # Add sheet tab
    # ------------------------------------------------------------------

    def add_sheet(self, spreadsheet_id: str, title: str) -> int:
        """
        Add a new sheet (tab) to an existing spreadsheet.

        Args:
            spreadsheet_id: The spreadsheet ID.
            title: Name for the new sheet tab.

        Returns:
            The new sheet's sheetId (integer).
        """
        body = {
            "requests": [
                {"addSheet": {"properties": {"title": title}}}
            ]
        }
        try:
            result = self._sheets.batchUpdate(
                spreadsheetId=spreadsheet_id, body=body
            ).execute()
            return result["replies"][0]["addSheet"]["properties"]["sheetId"]
        except HttpError as e:
            raise RuntimeError(f"Failed to add sheet '{title}': {e}") from e
