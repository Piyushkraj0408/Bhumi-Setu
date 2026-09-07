"""Helper script to securely set your MongoDB Atlas password without manual editing."""

import re
import urllib.parse
from pathlib import Path

ENV_PATH = Path(__file__).resolve().parent.parent / ".env"


def main():
    print("==================================================")
    print("    MongoDB Atlas Password Setup for SIH Project   ")
    print("==================================================")
    
    if not ENV_PATH.exists():
        print(f"Error: {ENV_PATH} not found.")
        return

    content = ENV_PATH.read_text(encoding="utf-8")
    
    password = input("\nEnter your MongoDB user password (for 'piyushobroy87_db_user'): ").strip()
    if not password:
        print("Password cannot be empty!")
        return

    # URL-encode password in case it contains special characters (@, #, $, etc.)
    encoded_password = urllib.parse.quote_plus(password)

    # Replace <db_password> or existing password in MONGODB_URI
    new_uri = f"mongodb+srv://piyushobroy87_db_user:{encoded_password}@cluster0.agdd7lg.mongodb.net/sih?retryWrites=true&w=majority&appName=cluster0"
    
    new_content = re.sub(
        r"MONGODB_URI=.*",
        f"MONGODB_URI={new_uri}",
        content
    )
    
    ENV_PATH.write_text(new_content, encoding="utf-8")
    print("\n[SUCCESS] Password saved and encoded into .env!")
    print("Now running seed script to populate database...\n")

    # Run seed
    from scripts.seed_roles import seed
    seed()


if __name__ == "__main__":
    main()
