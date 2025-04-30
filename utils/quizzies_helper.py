from langchain_openai import AzureChatOpenAI
from langchain.schema import HumanMessage, SystemMessage
import json

def create_quiz_from_text(text):
    llm = AzureChatOpenAI(
        azure_deployment="gpt-4.1",
        openai_api_version="2024-12-01-preview",
        temperature=0,
        max_retries=2
    )
    
    prompt = """
        Ti verrà fornito un testo estrapolato da una pagina web o da documenti caricati dall'utente.UnicodeTranslateError

        Il tuo task è di analizzare il testo fornito e generare 8 quiz a risposta multipla su di esso.

        Importante:
        - Basati solo sulle informazioni fornite nel testo per creare le domande.
        - NON generare nessun quiz se il testo fornito non è chiaro o sufficiente per generare domande.
        - Non generare domande che non siano a risposta multipla.
        - Per ogni domanda a risposta multipla, includi anche il campo 'answer' con il testo della risposta corretta.

        Restituisci in output un JSON Array strutturato in questo modo:
        [
          {
            "question": "Testo della domanda",
            "type": "multiple",
            "options": ["opzione A", "opzione B", "opzione C"],
            "answer": "opzione corretta"
          },
          {
            "question": "Testo della domanda",
            "type": "multiple",
            "options": ["opzione A", "opzione B", "opzione C"],
            "answer": "opzione corretta"
          }
        ]

        Nota:
        Se non riesci a generare domande, restituisci un JSON Array vuoto.
        """

    messages = [
        SystemMessage(content=prompt),
        HumanMessage(content=f"Ecco il testo su cui generare il quiz:\n\n{text}")
    ]

    response = llm.invoke(messages).content

    try:
        quiz_data = json.loads(response)
        return quiz_data
    except json.JSONDecodeError:
        return [{"question": "An error occurred during the generation of the quizzies.", "type": "text"}]