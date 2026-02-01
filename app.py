# Talk_to_myDB using GROQ (LLaMA3)
from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
from sqlalchemy import create_engine, text
from tabulate import tabulate
from dotenv import load_dotenv
import os


# 1️⃣ LOAD ENV VARIABLES

load_dotenv()

#allow React to call the backend
app = Flask(__name__)
CORS(app)



# 2️⃣ GROQ CLIENT

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# 3️⃣ DATABASE CONFIG

DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")

engine = create_engine(
    f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)


# 4️⃣ FETCH DATABASE SCHEMA

def fetch_db_schema():
    schema = {}
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT 
                table_name AS table_name,
                column_name AS column_name,
                data_type AS data_type
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
            ORDER BY table_name, ordinal_position;
        """))

        for row in result.mappings():  # ✅ THIS IS IMPORTANT
            table = row.get("table_name")
            column = row.get("column_name")
            dtype = row.get("data_type")

            if table not in schema:
                schema[table] = []

            schema[table].append(f"{column} ({dtype})")

    return schema


def schema_to_prompt(schema):
    prompt = ""
    for table, columns in schema.items():
        prompt += f"Table: {table}\nColumns: {', '.join(columns)}\n\n"
    return prompt.strip()


# 5️⃣ NATURAL LANGUAGE → SQL

def nl_to_sql(schema_str, user_query):
    prompt = f"""
You are an expert MySQL assistant.

Rules:
- Generate ONLY a valid SELECT query
- Allowed clauses: WHERE, GROUP BY, HAVING, ORDER BY, LIMIT
- Allowed functions: COUNT, SUM, AVG, MIN, MAX
- DO NOT use INSERT, UPDATE, DELETE, DROP, ALTER
- Use ONLY the schema below
- Output ONLY the SQL query, no explanation

Schema:
{schema_str}

User Question:
{user_query}
"""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )

    sql = response.choices[0].message.content.strip()
    sql = sql.replace("```sql", "").replace("```", "").strip()
    return sql



# 6️⃣ SQL VALIDATION

def validate_sql(sql):
    sql_lower = sql.lower()

    if not sql_lower.startswith("select"):
        raise ValueError("❌ Only SELECT queries are allowed")

    forbidden = ["insert", "update", "delete", "drop", "alter", "truncate"]
    if any(word in sql_lower for word in forbidden):
        raise ValueError("❌ Forbidden SQL operation detected")

    return True


# 7️⃣ EXECUTE SQL

def execute_sql(sql):
    with engine.connect() as conn:
        result = conn.execute(text(sql))
        rows = result.mappings().all()  # ✅ FIX
    return rows



# 8️⃣ API ROUTE FOR REACT

# Cache schema at startup
_schema_str = None


def get_schema_str():
    global _schema_str
    if _schema_str is None:
        schema = fetch_db_schema()
        _schema_str = schema_to_prompt(schema)
    return _schema_str


@app.route("/talktomydb", methods=["POST"])
def talk_to_db():
    """Accept natural language query from React, return SQL and results."""
    data = request.get_json() or {}
    need = data.get("need", "").strip()

    if not need:
        return jsonify({"error": "Missing 'need' field", "sql": "", "result": []}), 400

    try:
        schema_str = get_schema_str()
        sql_query = nl_to_sql(schema_str, need)
        validate_sql(sql_query)
        rows = execute_sql(sql_query)
        # Convert RowMapping to plain dict for JSON
        result = [dict(row) for row in rows]
        return jsonify({"sql": sql_query, "result": result})
    except Exception as e:
        return jsonify({
            "sql": "",
            "result": str(e),
            "error": str(e)
        }), 200  # Return 200 so React can display the error message


@app.route("/health", methods=["GET"])
def health():
    """Health check for React/dev tools."""
    return jsonify({"status": "ok"})


# 9️⃣ RUN FLASK SERVER

if __name__ == "__main__":
    print("\n🔍 Loading database schema...")
    get_schema_str()
    print("\n📂 Schema loaded. Starting Flask server on http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=True)
