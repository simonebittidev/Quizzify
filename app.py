from flask import Flask, request, send_from_directory, jsonify
from backend.image_processing import process_file, create_quiz_from_text
from flask import render_template
from langchain_openai import AzureChatOpenAI
from langchain.schema import SystemMessage, HumanMessage
import os

app = Flask(__name__)

@app.route("/", methods=["GET"])
def index():
    print("ciao")
    return render_template("index.html")

@app.route("/process", methods=["POST"])
def process_files():
    mock = True

    if "files" not in request.files:
        return jsonify({"error": "Nessun file inviato."}), 400

    files = request.files.getlist("files")
    full_text = process_file(files, mock)

    try:
        quiz_data = create_quiz_from_text(full_text)
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

def validate_answers(questions, answers):
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