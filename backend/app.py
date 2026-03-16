from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import base64
import tempfile
import os
from transformers import pipeline
import whisper
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Meeting Insights API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global models - load once at startup
whisper_model = None
summarizer = None

@app.on_event("startup")
async def startup_event():
    global whisper_model, summarizer
    try:
        logger.info("Loading Whisper model...")
        whisper_model = whisper.load_model("base")
        logger.info("Loading summarization model...")
        summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
        logger.info("Models loaded successfully!")
    except Exception as e:
        logger.error(f"Error loading models: {e}")

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Receive audio data
            data = await websocket.receive_text()
            audio_data = json.loads(data)
            
            if audio_data.get("type") == "audio":
                # Process audio
                result = await process_audio_chunk(audio_data["data"])
                await manager.send_personal_message(json.dumps(result), websocket)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)

async def process_audio_chunk(audio_base64: str):
    try:
        # Decode base64 audio
        audio_bytes = base64.b64decode(audio_base64)
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as temp_file:
            temp_file.write(audio_bytes)
            temp_file_path = temp_file.name
        
        try:
            # Transcribe with Whisper
            result = whisper_model.transcribe(temp_file_path)
            transcript = result["text"].strip()
            
            if transcript:
                # Summarize with BART
                if len(transcript) > 10:  # Only summarize if text is substantial
                    summary_result = summarizer(transcript, max_length=50, min_length=10, do_sample=False)
                    summary = summary_result[0]["summary_text"]
                else:
                    summary = transcript
                
                return {
                    "type": "result",
                    "transcript": transcript,
                    "summary": summary,
                    "success": True
                }
            else:
                return {
                    "type": "result",
                    "transcript": "",
                    "summary": "",
                    "success": True
                }
                
        finally:
            # Clean up temp file
            os.unlink(temp_file_path)
            
    except Exception as e:
        logger.error(f"Error processing audio: {e}")
        return {
            "type": "error",
            "message": str(e),
            "success": False
        }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "models_loaded": whisper_model is not None and summarizer is not None}

@app.get("/")
async def root():
    return {"message": "AI Meeting Insights Backend", "status": "running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
