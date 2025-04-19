from flask import Flask, request, send_from_directory
from backend.image_processing import process_file
from flask import render_template

app = Flask(__name__)

@app.route("/", methods=["GET"])
def index():
    print("ciao")
    return render_template("index.html")

@app.route("/generate-quiz", methods=["POST"])
def generate_quiz():
    if "files" not in request.files:
        return "Nessun file inviato.", 400

    files = request.files.getlist("files")
    full_text = ""

    for file in files:
        full_text += extract_text_from_file(file) + "\n"

    if not full_text.strip():
        return "Nessun testo trovato nei file.", 400



@app.route("/process", methods=["POST"])
def process_files():
    if "files" not in request.files:
        return "Nessun file inviato.", 400

    files = request.files.getlist("files")
    result = process_file(files)

    try:
        quiz = create_quiz_from_text(full_text)
        return quiz
    except Exception as e:
        return f"Errore durante la generazione del quiz: {str(e)}", 500
    
    return result

if __name__ == "__main__":
    app.run(debug=True)