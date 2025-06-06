import os
import base64
from io import BytesIO
from PIL import Image
from dotenv import load_dotenv
from langchain_openai import AzureChatOpenAI
from langchain.schema import HumanMessage, SystemMessage
from pdf2image import convert_from_bytes

load_dotenv()

def image_to_base64(image):
    if image.mode == "RGBA":
        image = image.convert("RGB")
    buffered = BytesIO()
    image.save(buffered, format="JPEG")
    return base64.b64encode(buffered.getvalue()).decode()

def create_vision_message(base64_img, prompt="Analizza l'immagine e estrai il testo che contiene."):
    return [
        SystemMessage(content="Sei un assistente che analizza immagini ed estra il testo che contengono."),
        HumanMessage(
            content=[
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_img}"}}
            ]
        )
    ]

def process_file(files, mock=False):
    if mock:
        print("Mocked response")
        return """PROGRAMMAZIONE AD OGGETTI E un paradigma di programmazione basato sulla concezzione di oggetti ene rappresentano entitá
                reali o astratte.
                Si basa su 4 pilastri fondamentali:
                • ASTRAZIONE: processo di semplificazione della complessità nascondendo dettagli non necessar e mostrando soo le caratteristiche essensioli.
                • EREDITARIETÀ: possibilitá di ereare elassi (derivate e sottoclassi) a partire da classi esistenti (classe base o derivate). Promuove il riutilizzo del codice.
                • POLIMORFISMO: Possibilitá di una funzione di assumere diverse forme. Esiste di due tipi diversi:
                • A COMPILE - TIME O STATICO
                O OVERLOADING: Possibilità di creare nella stessa classe lo stesso metodo con farametri diversi.
                • POLIMORFISMO A RUN-TIME O DINAMICO o OVERRIDE: una superclasse detinisce"""

    llm = AzureChatOpenAI(
                    azure_deployment="gpt-4.1",
                    openai_api_version="2024-12-01-preview",
                    temperature=0,
                    max_retries=2
                )
    
    results = []
    
    for file in files:
        filename = file.filename.lower()
        try:
            if filename.endswith(".pdf"):
                pdf_bytes = file.read()
                images = convert_from_bytes(pdf_bytes, dpi=300)
                for i, img in enumerate(images):
                    base64_img = image_to_base64(img)
                    messages = create_vision_message(base64_img)
                    response = llm.invoke(messages)
                    results.append(f"\n--- {filename} - Pagina {i+1} ---\n{response.content}")
            elif filename.endswith((".jpg", ".jpeg", ".png")):
                img = Image.open(file.stream)
                base64_img = image_to_base64(img)
                messages = create_vision_message(base64_img)
                
                response = llm.invoke(messages)
                results.append(f"\n--- {filename} ---\n{response.content}")
            else:
                results.append(f"\n--- {filename} ---\nFormato non supportato.")
        except Exception as e:
            results.append(f"\n--- {filename} ---\nErrore durante l'elaborazione: {str(e)}")

    return "\n".join(results)
