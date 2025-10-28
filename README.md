# Local Budget Assistant using SLM with RAG
An offline AI-powered financial assistant designed to analyze users’ spending patterns, budgets, and reports to provide personalized guidance built with **Llama.rn** and **React Native** — entirely on-device, **without the need for an internet connection**.

The project integrates **quantized Gemma 3 model** to enable efficient deep learning inference on mobile devices. The chatbot functions as a **local AI agent** enhanced with **Retrieval-Augmented Generation (RAG)**, allowing it to deliver accurate, context-aware financial insights by referencing the user’s financial statements and past expenses.

BudgetAssistant-RAG-ReactNative

---

## FUTURE IMPROVE FOR CHATBOT
- Add data from 4 catagories to the promp and use it to give advice. 
- Print welcome message
- Bring embedding model to assert to save time

--- 

## COMPARE MODEL PERFORMANCE:
- **unsloth/gemma-3-1b-it-Q4_K_M.gguf** (806 MB)
- **google/gemma-3-1b-it-qat-q4_0-gguf** (1 GB)
- **unsloth/gemma-3-270m-it-F16.gguf** (543 MB) (temperature = 1.0, top_k = 64, top_p = 0.95, min_p = 0.0)

SELECT THE BEST

---

## EXTRA: 
- May parse response to update the catagories and pie chart??
- Add sample financial document in assert as guide for RAG (*)
- Add sugessions

---

## SAMPLE UX/UI FOR REFERENCE
<p align="center">
  <img src="demo/overall.png"><br/>
  <i>Overall Screen</i>
</p>

<p align="center">
  <img src="demo/catagories.png"><br/>
  <i>Catagories Screen</i>
</p>

<p align="center">
  <img src="demo/chatbot screen.png"><br/>
  <i>ChatBot Screen</i>
</p>
