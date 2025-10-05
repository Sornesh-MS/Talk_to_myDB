# server.py (Python Backend API)

from flask import Flask, request, jsonify
from flask_cors import CORS
from sqlalchemy import create_engine, text
from tabulate import tabulate
from openai import OpenAI
import os
import re

# 🔑 OpenAI client (lazy init to surface clearer error if missing)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# 🔑 MySQL Connection (use env with safe defaults)
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "123")
DB_NAME = os.getenv("DB_NAME", "cab")

engine = create_engine(f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}")

# Flask setup
app = Flask(__name__)
CORS(app)  # allow frontend (React) to call backend

# --- DB Schema ---
def fetch_db_schema():
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT table_name, column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
            ORDER BY table_name, ordinal_position;
        """))
        schema = {}
        for row in result.mappings():
            schema.setdefault(row["table_name"], []).append(
                f"{row['column_name']} ({row['data_type']})"
            )
    return schema

def schema_to_prompt(schema):
    schema_str = ""
    for table, cols in schema.items():
        schema_str += f"Table: {table}\nColumns: {', '.join(cols)}\n\n"
    return schema_str.strip()

# --- Natural language → SQL ---
def _extract_sql_from_text(text):
    """Extract a single SQL SELECT statement from model output.

    Prioritizes fenced code blocks, falls back to the first SELECT...; snippet.
    """
    if not text:
        return ""
    # Try fenced ```sql ... ``` first
    code_block = re.search(r"```(?:sql)?\s*([^`]+)```", text, flags=re.IGNORECASE | re.DOTALL)
    candidate = code_block.group(1).strip() if code_block else text.strip()
    # Find first SELECT ... up to the last semicolon or end of string
    select_match = re.search(r"select[\s\S]*?;", candidate, flags=re.IGNORECASE)
    sql_stmt = select_match.group(0).strip() if select_match else candidate
    # Normalize whitespace
    sql_stmt = re.sub(r"\s+", " ", sql_stmt).strip()
    return sql_stmt

def nl_to_sql(schema_str, user_query):
    prompt = f"""
You are an SQL expert. Convert the following request into a MySQL query.
Only use SELECT statements and aggregates (COUNT, SUM, AVG, MIN, MAX).
Do NOT allow UPDATE, DELETE, INSERT, DROP, ALTER.
Use only the schema provided.

Schema:
{schema_str}

User request:
{user_query}
"""

    if client is None:
        raise RuntimeError("OPENAI_API_KEY is not set in environment.")

    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )

    content = resp.choices[0].message.content.strip()
    return _extract_sql_from_text(content)

# --- Validate SQL ---
def validate_sql(sql):
    sql_lower = sql.lower()
    if not sql_lower.startswith("select"):
        raise ValueError("Only SELECT queries allowed.")
    forbidden = ["drop", "delete", "update", "insert", "alter"]
    if any(word in sql_lower for word in forbidden):
        raise ValueError("Query contains forbidden operation.")
    return True

# --- Execute SQL ---
def execute_sql(sql):
    with engine.connect() as conn:
        result = conn.execute(text(sql))
        rows = [dict(r) for r in result.mappings()]
    return rows

# --- API Endpoint ---
@app.route("/query", methods=["POST"])
def handle_query():
    data = request.json
    question = data.get("question", "")

    try:
        if not question.strip():
            return jsonify({"error": "Question must not be empty."}), 400
        schema = fetch_db_schema()
        schema_str = schema_to_prompt(schema)
        sql_query = nl_to_sql(schema_str, question)
        validate_sql(sql_query)
        results = execute_sql(sql_query)

        return jsonify({"sql": sql_query, "results": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    app.run(port=5000, debug=True)
