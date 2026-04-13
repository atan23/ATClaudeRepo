"""
Example usage of GoogleSheetsClient.

Before running:
  1. cp .env.example .env
  2. Fill in your credential path in .env
  3. pip install -r requirements.txt
  4. Replace SPREADSHEET_ID with your actual spreadsheet ID
     (find it in the URL: docs.google.com/spreadsheets/d/<ID>/edit)
"""

from google_sheets import GoogleSheetsClient

SPREADSHEET_ID = "YOUR_SPREADSHEET_ID_HERE"

client = GoogleSheetsClient()

# --- Create a new spreadsheet ---
new_id = client.create_spreadsheet("My New Sheet", sheet_titles=["Data", "Summary"])
print(f"Created spreadsheet: {new_id}")

# --- Write data ---
client.write(
    SPREADSHEET_ID,
    "Sheet1!A1",
    [
        ["Name", "Age", "City"],
        ["Alice", 30, "New York"],
        ["Bob", 25, "London"],
    ],
)
print("Wrote header + 2 rows")

# --- Append rows ---
client.append(
    SPREADSHEET_ID,
    "Sheet1!A1",
    [["Charlie", 35, "Tokyo"]],
)
print("Appended 1 row")

# --- Read data ---
rows = client.read(SPREADSHEET_ID, "Sheet1!A1:C10")
for row in rows:
    print(row)

# --- Add a new sheet tab ---
sheet_id = client.add_sheet(SPREADSHEET_ID, "Archive")
print(f"Added sheet tab with id: {sheet_id}")
