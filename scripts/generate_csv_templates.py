#!/usr/bin/env python3

import csv
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / "airtable" / "base-schema.json"
OUTPUT_DIR = ROOT / "templates"


def table_filename(name: str) -> str:
    return name.lower().replace(" ", "_") + ".csv"


def load_schema() -> dict:
    with SCHEMA_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def writable_field_names(table: dict) -> list[str]:
    fields = []
    for field in table["fields"]:
        if field.get("writable", True):
            fields.append(field["name"])
    return fields


def write_template(table: dict) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / table_filename(table["name"])
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(writable_field_names(table))


def main() -> None:
    schema = load_schema()
    for table in schema["tables"]:
        write_template(table)
    print(f"Wrote {len(schema['tables'])} CSV templates to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
