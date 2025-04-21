from flask import Flask, request, send_from_directory, jsonify
from backend.image_processing import process_file, create_quiz_from_text
from flask import Flask, request, send_from_directory, jsonify, render_template, session
from langchain_openai import AzureChatOpenAI
from langchain.schema import SystemMessage, HumanMessage
import os
import requests
from bs4 import BeautifulSoup
import time

QUIZ_LIMIT = 3
RESET_INTERVAL = 60 * 60 * 24  # 24 ore in secondi
USE_MOCK = False

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY")

@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")

@app.route("/process", methods=["POST"])
def process_files():
    now = time.time()
    last_time = session.get("last_quiz_time", 0)

    # Se è passato più di 24 ore, reset
    if now - last_time > RESET_INTERVAL:
        session["quiz_count"] = 0
        session["last_quiz_time"] = now

    # Inizializzazione se non esiste
    if "quiz_count" not in session:
        print("NON PRESENTE")
        session["quiz_count"] = 0
        session["last_quiz_time"] = now
    else:
        quiz_count = session["quiz_count"]
        print(f"quiz_count:{quiz_count}")

    # Check limite
    if session["quiz_count"] >= QUIZ_LIMIT:
        return jsonify({"error": "Hai raggiunto il limite di 3 quiz nelle ultime 24 ore."}), 403

    session["quiz_count"] += 1

    if USE_MOCK:
        quiz_data_mocked = [{'question': "Cos'è la programmazione ad oggetti?", 'type': 'multiple', 'options': ['Un paradigma di programmazione basato su oggetti che rappresentano entità reali o astratte', 'Un linguaggio di programmazione specifico', 'Un metodo per scrivere solo funzioni matematiche'], 'answer': 'Un paradigma di programmazione basato su oggetti che rappresentano entità reali o astratte'}, {'question': 'Quali sono i quattro pilastri fondamentali della programmazione ad oggetti?', 'type': 'multiple', 'options': ['Astrazione, Ereditarietà, Polimorfismo, Incapsulamento', 'Astrazione, Ereditarietà, Polimorfismo, Ricorsione', 'Astrazione, Ereditarietà, Polimorfismo, Iterazione'], 'answer': 'Astrazione, Ereditarietà, Polimorfismo, Incapsulamento'}, {'question': 'Cosa si intende per astrazione nella programmazione ad oggetti?', 'type': 'multiple', 'options': ['Nascondere dettagli non necessari e mostrare solo le caratteristiche essenziali', 'Creare nuove classi da classi esistenti', 'Permettere a una funzione di assumere diverse forme'], 'answer': 'Nascondere dettagli non necessari e mostrare solo le caratteristiche essenziali'}, {'question': "Cosa permette l'ereditarietà nella programmazione ad oggetti?", 'type': 'multiple', 'options': ['Creare classi derivate a partire da classi esistenti', 'Nascondere i dettagli di implementazione', 'Definire metodi con lo stesso nome ma parametri diversi'], 'answer': 'Creare classi derivate a partire da classi esistenti'}, {'question': "Qual è uno dei vantaggi principali dell'ereditarietà?", 'type': 'multiple', 'options': ['Promuove il riutilizzo del codice', 'Aumenta la complessità del codice', 'Riduce la sicurezza del programma'], 'answer': 'Promuove il riutilizzo del codice'}, {'question': 'Cosa significa polimorfismo nella programmazione ad oggetti?', 'type': 'multiple', 'options': ['La possibilità di una funzione di assumere diverse forme', 'La possibilità di nascondere i dati', 'La possibilità di creare nuove classi'], 'answer': 'La possibilità di una funzione di assumere diverse forme'}, {'question': 'Quali sono i due tipi di polimorfismo menzionati nel testo?', 'type': 'multiple', 'options': ['Compile-time (statico, overloading) e run-time (dinamico, override)', 'Statico e dinamico', 'Overloading e overloading'], 'answer': 'Compile-time (statico, overloading) e run-time (dinamico, override)'}, {'question': 'Cosa permette il polimorfismo a compile-time (overloading)?', 'type': 'multiple', 'options': ['Creare nella stessa classe lo stesso metodo con parametri diversi', 'Sovrascrivere un metodo in una sottoclasse', 'Nascondere i dettagli di implementazione'], 'answer': 'Creare nella stessa classe lo stesso metodo con parametri diversi'}, {'question': 'Come viene anche chiamato il polimorfismo a run-time?', 'type': 'multiple', 'options': ['Dinamico o override', 'Statico o overloading', 'Incapsulamento'], 'answer': 'Dinamico o override'}]
        return jsonify(quiz_data_mocked)

    full_text = ""

    # Se c'è un URL nel form, estrai il testo da quella pagina
    if "url" in request.form:
        url = request.form["url"]

        if url:
            print(f"url:{ url}")
            try:
                if "wikipedia" in url:
                    res = requests.get(url)
                    soup = BeautifulSoup(res.text, "html.parser")

                    # Seleziona il contenuto principale
                    main_content = soup.select_one("div.mw-parser-output")
                    full_text = main_content.get_text(separator="\n", strip=True)
                else:
                    res = requests.get(url)
                    soup = BeautifulSoup(res.text, "html.parser")

                    # Seleziona il contenuto principale
                    main_content = soup.select_one("div.mw-parser-output")
                    full_text = main_content.get_text(separator="\n", strip=True)
            except Exception as e:
                return jsonify({"error": f"Errore durante il recupero del sito: {str(e)}"}), 500
    
    print("urlText:", full_text)

    # Se ci sono file, processali
    if "files" in request.files:
        files = request.files.getlist("files")
        MAX_TOTAL_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

        total_size = sum(file.content_length or 0 for file in files)
        if total_size > MAX_TOTAL_FILE_SIZE:
            return jsonify({"error": "Uploaded files exceed the maximum allowed size of 5 MB."}), 413

        full_text += process_file(files, USE_MOCK) 

    if not full_text.strip():
        return jsonify({"error": "Nessun contenuto da processare."}), 400

    try:
        quiz_data = create_quiz_from_text(full_text)
        print(f"quiz_data: {quiz_data}")

        return jsonify(quiz_data)
    except Exception as e:
        return jsonify({"error": f"Errore durante la generazione del quiz: {str(e)}"}), 500

@app.route("/validate", methods=["POST"])
def validate_quiz():
    data = request.get_json()

    if not data or "questions" not in data or "answers" not in data:
        return jsonify({"error": "Richiesta non valida. Serve 'questions' e 'answers'."}), 400

    try:
        result = validate_answers(data["questions"], data["answers"])
        return jsonify({"feedback": result})
    except Exception as e:
        return jsonify({"error": f"Errore durante la valutazione: {str(e)}"}), 500

def validate_answers(questions, answers, validateWithLLM=False):
    if not validateWithLLM:
        feedback = []
        for i, q in enumerate(questions):
            correct_answer = q.get("answer", "").strip().lower()
            user_answer = answers[i].strip().lower()
            is_correct = user_answer == correct_answer
            feedback.append({
                "question": q.get("question", ""),
                "user_answer": answers[i],
                "correct_answer": q.get("answer", ""),
                "correct": is_correct,
                "feedback": "Corretto!" if is_correct else "Risposta errata."
            })
        return feedback

    llm = AzureChatOpenAI(
        azure_deployment="gpt-4.1",
        openai_api_version="2024-12-01-preview",
        temperature=0,
        max_retries=2
    )

    prompt = (
        "Sei un assistente che valuta le risposte degli utenti. "
        "Per ogni domanda, confronta la risposta dell'utente con quella corretta se disponibile, "
        "e fornisci un feedback sotto forma di lista JSON nel formato:\n\n"
        "[\n"
        "  {\n"
        "    \"question\": \"...\",\n"
        "    \"user_answer\": \"...\",\n"
        "    \"correct_answer\": \"...\", // se disponibile\n"
        "    \"correct\": true/false,\n"
        "    \"feedback\": \"Commento breve.\"\n"
        "  },\n"
        "]"
    )

    user_payload = {
        "questions": questions,
        "answers": answers
    }

    messages = [
        SystemMessage(content=prompt),
        HumanMessage(content=f"{user_payload}")
    ]

    result = llm.invoke(messages).content
    return result

if __name__ == "__main__":
    app.run(debug=True) 