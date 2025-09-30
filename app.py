#Talk_to_myDB code
# Talk_to_myDB (Simplified: Direct DB connection, only SELECT & Aggregates)

import openai
from sqlalchemy import create_engine, text
from tabulate import tabulate
import os

# 🔑 Set your OpenAI API Key (must be in environment variable)
openai.api_key = os.getenv("OPENAI_API_KEY")

# 1️⃣ Database Configuration (hardcoded instead of asking user)
DB_HOST = "localhost"        # Change if your DB is on another server
DB_USER = "root"             # Your MySQL username
DB_PASSWORD = "your_password" # Your MySQL password
DB_NAME = "your_database"     # The DB you want users to query

# Create SQLAlchemy engine
engine = create_engine(f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}")

# 2️⃣ Fetch Schema for LLM
def fetch_db_schema():
    with engine.connect() as conn:
        result = conn.execute("""
            SELECT table_name, column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
            ORDER BY table_name, ordinal_position;
        """)
        schema = {}
        for row in result:
            schema.setdefault(row.table_name, []).append(f"{row.column_name} ({row.data_type})")
    return schema

def schema_to_prompt(schema):
    schema_str = ""
    for table, cols in schema.items():
        schema_str += f"Table: {table}\nColumns: {', '.join(cols)}\n\n"
    return schema_str.strip()

# 3️⃣ Natural Language → SQL
def nl_to_sql(schema_str, user_query):
    prompt = f"""
You are an SQL expert. Convert the following request into a MySQL query.
Only use SELECT statements and aggregates (COUNT, SUM, AVG, MIN, MAX).
Do not allow UPDATE, DELETE, INSERT, DROP, ALTER.
Use only the schema provided.

Schema:
{schema_str}

User request:
{user_query}
"""
    resp = openai.ChatCompletion.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )
    return resp.choices[0].message["content"].strip()

# 4️⃣ Validate SQL (Only SELECT & aggregates allowed)
def validate_sql(sql):
    sql_lower = sql.lower()
    if not sql_lower.startswith("select"):
        raise ValueError("❌ Only SELECT queries are allowed.")
    forbidden = ["drop", "delete", "update", "insert", "alter"]
    if any(word in sql_lower for word in forbidden):
        raise ValueError("❌ Forbidden operation detected in query.")
    return True

# 5️⃣ Execute SQL
def execute_sql(sql):
    with engine.connect() as conn:
        result = conn.execute(text(sql))
        rows = [dict(row) for row in result]
    return rows

# 6️⃣ Main Program
if __name__ == "__main__":
    schema = fetch_db_schema()
    schema_str = schema_to_prompt(schema)

    print("\n📂 Available Tables:")
    for t in schema.keys():
        print(f"- {t}")

    while True:
        user_query = input("\nAsk in plain English (or type 'exit' to quit): ").strip()
        if user_query.lower() == "exit":
            break

        try:
            sql_query = nl_to_sql(schema_str, user_query)
            validate_sql(sql_query)

            results = execute_sql(sql_query)

            print("\n📝 Generated SQL Query:")
            print(sql_query)
            print("\n📊 Query Results:")
            if results:
                print(tabulate(results, headers="keys", tablefmt="grid"))
            else:
                print("(No results found)")

        except Exception as e:
            print("❌ Error:", e)
