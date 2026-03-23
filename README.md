AI Resume Analyzer

This project is a full‑stack web application that analyzes a resume against a job description using a locally‑run AI model. It evaluates how well a candidate’s experience, skills, and background match the requirements of a role, then generates a match score along with a written summary, strengths, weaknesses, and recommendations for improvement. All processing is done locally through a self‑hosted LLM, ensuring privacy and full control over the analysis.

Setup

This project requires a few tools to be installed before it can run. Follow the steps below to install all dependencies and run the application locally.

1. Install Node.js

Download Node.js from:

https://nodejs.org/

Verify the installation:

node --version
npm --version


2. Install Git

Download Git from:

https://git-scm.com/downloads

Verify the installation:

git --version


3. Install Ollama

This project uses a local LLM, so Ollama must be installed.

Download Ollama from:

https://ollama.com/download

Verify the installation:

ollama --version


4. Download the required AI model

This project uses a model such as Llama 3.
Download it through Ollama:

ollama pull llama3

If your server code specifies a different model name, pull that one instead.


5. Clone the repository

git clone https://github.com/ConnorTyrell/ai-resume-analyzer.git


6. Install project dependencies

cd ai-resume-analyzer
npm install


7. Start the server

node server.js


8. Open the application in a browser

http://localhost:3000
The application will now be running locally and ready to analyze resumes.