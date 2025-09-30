#Talk_to_myDB code


import openai
from openai import OpenAI
from sqlalchemy import create_engine
from sqlalchemy import text
from tabulate import tabulate
import os

# 🔑 Set your OpenAI API Key (make sure environment variable is set)
#openai.api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


DB_HOST = "localhost"
DB_USER = "root"
DB_PASSWORD = "123"
DB_NAME = "cab"

engine = create_engine(f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}")


# 3️⃣ Fetch database schema
def fetch_db_schema():
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
        schema = {}
        for row in result.mappings():  # ✅ ensures dict-like access
            schema.setdefault(row["table_name"], []).append(
                f"{row['column_name']} ({row['data_type']})"
            )
    return schema


def schema_to_prompt(schema):
    schema_str = ""
    for table, cols in schema.items():
        schema_str += f"Table: {table}\nColumns: {', '.join(cols)}\n\n"
    return schema_str.strip()

# 4️⃣ Convert natural language to SQL
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
    '''resp = openai.ChatCompletion.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )
    return resp.choices[0].message["content"].strip()'''
    
    resp = client.chat.completions.create(
    model="gpt-4o-mini",  # or "gpt-4o"
    messages=[{"role": "user", "content": "Hello!"}]
)

    print(resp.choices[0].message.content)

# 5️⃣ Validate SQL
def validate_sql(sql):
    sql_lower = sql.lower()
    if not sql_lower.startswith("select"):
        raise ValueError("Only SELECT queries allowed.")
    forbidden = ["drop", "delete", "update", "insert", "alter"]
    if any(word in sql_lower for word in forbidden):
        raise ValueError("Query contains forbidden operation.")
    return True

# 6️⃣ Execute SQL
def execute_sql(sql):
    with engine.connect() as conn:
        result = conn.execute(text(sql))
        rows = [dict(row) for row in result]
    return rows

# 7️⃣ Main program
if __name__ == "__main__":
    # Fetch schema and prepare prompt
    schema = fetch_db_schema()
    schema_str = schema_to_prompt(schema)

    print("Available Tables:")
    for t in schema.keys():
        print(f"- {t}")

    while True:
        user_query = input("\nEnter your request in plain English (or type 'exit' to quit): ").strip()
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
