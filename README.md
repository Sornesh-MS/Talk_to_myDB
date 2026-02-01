# Talk_to_myDB 

##AUTHOR NOTES

This project is intentionally kept simple and modular.
It is designed to work locally first and can be scaled
to a SaaS or cloud product later without rewriting the core logic.

Talk_to_myDB is an AI-powered command-line application that allows users to query a MySQL database using plain English.  
It converts natural language questions into safe SQL `SELECT` queries using **Groq LLMs** and executes them securely.

---

## Features

- 🔍Natural Language → SQL conversion
- 🔐 Only SELECT queries allowed (safe by design)
- ⚡ Powered by Groq (LLaMA 3.1)
- 🗄️ Automatic database schema detection
- 📊 Clean tabular output
- 🔑 Environment-based configuration (.env)


## HOW THE PROJECT WORKS

1. User opens the web application in the browser
2. User enters a natural language question
3. React frontend sends the question to the backend API
4. Flask backend:
   - Reads database schema
   - Sends schema + question to GROQ AI
   - Receives SQL query
   - Validates SQL (only SELECT allowed)
   - Executes query on MySQL database
5. Backend sends SQL and results back to frontend
6. Frontend displays:
   - Generated SQL
   - Query output in readable format

## HOW TO RUN THE PROJECT LOCALLY

1. Download and Insatll all the PREREQUISITES
2. python app.py(for backend)(http://localhost:5000)
3. for forntend
   3.1 npm install
   3.2 npm run dev(vite)(http://localhost:5173 (or similar))
4.Open frontend URL in browser
5. Enter a question like:
   "Show average cost per ride"
6. Click Submit
7. View:
   - Generated SQL query
   - Database result

## CURRENT LIMITATIONS

- Runs locally only
- No user authentication
- No usage limits
- No cloud deployment yet
- Single database connection





