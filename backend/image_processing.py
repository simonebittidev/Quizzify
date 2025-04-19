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

def create_vision_message(base64_img, prompt="Leggi l'immagine e scrivi il testo che contiene."):
    return [
        SystemMessage(content="Sei un assistente che legge immagini e ne estrae il testo."),
        HumanMessage(
            content=[
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_img}"}}
            ]
        )
    ]

def process_file(files):
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

def create_quiz_from_text(text):
    llm = AzureChatOpenAI(
                    azure_deployment="gpt-4.1",
                    openai_api_version="2024-12-01-preview",
                    temperature=0,
                    max_retries=2
                )
    
    messages = [
        SystemMessage(content="Sei un assistente che crea quiz a scelta multipla da testi."),
        HumanMessage(content=f"Genera un quiz con 5 domande a scelta multipla basato su questo testo:\n\n{text}")
    ]

    return llm.invoke(messages).content