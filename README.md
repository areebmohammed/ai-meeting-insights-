# AI Meeting Insights

Real-time speech transcription and summarization tool for meetings. Records audio from your microphone, transcribes it using OpenAI Whisper, and generates concise summaries using a BART language model — all running locally with no external API calls.

## Demo

Speak into your microphone during a meeting and get a live transcript alongside an AI-generated summary in real time.

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (WebSocket API, MediaRecorder API)
- **Backend:** FastAPI, Python
- **Transcription:** OpenAI Whisper (runs locally)
- **Summarization:** HuggingFace Transformers — `facebook/bart-large-cnn`
- **Communication:** WebSockets for real-time audio streaming

## How It Works

1. Frontend captures microphone audio in 3-second chunks via the MediaRecorder API
2. Each chunk is base64-encoded and sent to the backend over a WebSocket connection
3. Backend transcribes the audio using Whisper
4. Transcript is summarized using BART and both results are sent back to the frontend

## Getting Started

### Prerequisites

- Python 3.8+
- pip

### Installation

```bash
# Clone the repo
git clone https://github.com/areebmohammed/ai-meeting-insights-.git
cd ai-meeting-insights-

# Install dependencies
pip install -r requirements.txt
```

### Running the App

**Start the backend:**
```bash
python app.py
```
The server will start at `http://localhost:8000`. Model loading may take a minute on first run.

**Open the frontend:**

Open `index.html` directly in your browser. Allow microphone permissions when prompted.

### Usage

1. Click **Start Recording** and speak into your microphone
2. The app processes audio every 3 seconds
3. Live transcript and AI summary appear in real time
4. Click **Stop Recording** when done

## Project Structure

```
├── backend/
│   ├── app.py              # FastAPI server, WebSocket handler, model inference
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── index.html          # Main UI
│   ├── style.css           # Styling
│   └── script.js           # WebSocket client, audio recording logic
```

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Health check |
| `/health` | GET | Model load status |
| `/ws` | WebSocket | Audio streaming endpoint |
