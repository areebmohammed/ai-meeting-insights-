class AIMeetingInsights {
    constructor() {
        this.socket = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.recordBtn = document.getElementById('recordBtn');
        this.status = document.getElementById('status');
        this.transcript = document.getElementById('transcript');
        this.summary = document.getElementById('summary');
        
        this.init();
    }

    init() {
        this.recordBtn.addEventListener('click', this.toggleRecording.bind(this));
        this.connectWebSocket();
    }

    connectWebSocket() {
        try {
            this.socket = new WebSocket('ws://localhost:8000/ws');
            
            this.socket.onopen = () => {
                console.log('WebSocket connected');
                this.updateStatus('Connected - Ready to record');
            };

            this.socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            };

            this.socket.onclose = () => {
                console.log('WebSocket disconnected');
                this.updateStatus('Disconnected - Check backend server');
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateStatus('Connection error - Is backend running?');
            };
        } catch (error) {
            console.error('Failed to connect to WebSocket:', error);
            this.updateStatus('Failed to connect - Start backend server');
        }
    }

    async toggleRecording() {
        if (!this.isRecording) {
            await this.startRecording();
        } else {
            this.stopRecording();
        }
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });

            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                this.sendAudioToBackend(audioBlob);
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            this.updateUI();
            this.updateStatus('Recording... Speak clearly into your microphone');

            // Record in chunks every 3 seconds for real-time processing
            this.recordingInterval = setInterval(() => {
                if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                    this.mediaRecorder.stop();
                    setTimeout(() => {
                        if (this.isRecording) {
                            this.mediaRecorder.start();
                        }
                    }, 100);
                }
            }, 3000);

        } catch (error) {
            console.error('Error accessing microphone:', error);
            this.updateStatus('Microphone access denied - Please allow microphone permissions');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        }
        
        if (this.recordingInterval) {
            clearInterval(this.recordingInterval);
        }

        this.isRecording = false;
        this.updateUI();
        this.updateStatus('Processing... Please wait for results');

        // Stop all tracks
        if (this.mediaRecorder && this.mediaRecorder.stream) {
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    }

    async sendAudioToBackend(audioBlob) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.error('WebSocket not connected');
            this.updateStatus('Not connected to server');
            return;
        }

        try {
            // Convert blob to base64
            const arrayBuffer = await audioBlob.arrayBuffer();
            const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

            // Send to backend
            this.socket.send(JSON.stringify({
                type: 'audio',
                data: base64Audio
            }));

        } catch (error) {
            console.error('Error sending audio:', error);
            this.updateStatus('Error sending audio data');
        }
    }

    handleWebSocketMessage(data) {
        if (data.type === 'result' && data.success) {
            if (data.transcript) {
                this.updateTranscript(data.transcript);
            }
            if (data.summary) {
                this.updateSummary(data.summary);
            }
            this.updateStatus('Ready for next recording');
        } else if (data.type === 'error') {
            console.error('Backend error:', data.message);
            this.updateStatus(`Error: ${data.message}`);
        }
    }

    updateTranscript(text) {
        this.transcript.textContent = text;
        this.transcript.classList.add('has-content');
    }

    updateSummary(text) {
        this.summary.textContent = text;
        this.summary.classList.add('has-content');
    }

    updateStatus(message) {
        this.status.textContent = message;
    }

    updateUI() {
        const btnText = this.recordBtn.querySelector('.btn-text');
        const btnIcon = this.recordBtn.querySelector('.btn-icon');
        
        if (this.isRecording) {
            btnText.textContent = 'Stop Recording';
            btnIcon.textContent = '⏹️';
            this.recordBtn.classList.add('recording');
        } else {
            btnText.textContent = 'Start Recording';
            btnIcon.textContent = '🎤';
            this.recordBtn.classList.remove('recording');
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AIMeetingInsights();
});
