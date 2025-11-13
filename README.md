# Local Financial Assistant using LLM with RAG
A **local AI agent** implemented with **llama.rn** and **React Native**, designed for **financial reasoning** on mobile.

The Large Language Model (LLM) can **explain financial terms and concepts** in simple language to help users **improve users’ financial literacy**.

The system also integrates Retrieval-Augmented Generation (RAG) to **enhance context understanding of financial transactions** while maintaining **full offline operation and data privacy**.

---

## Project Features

1. **Financial Reasoning on Device** – Runs locally using **llama.rn**, optimized for mobile performance.
2. **RAG-based Understanding** – Integrates document retrieval to enhance context comprehension of financial data.
3. **Offline Operation** – No internet required for reasoning or retrieval.
4. **Data Privacy** – All processing happens locally; user data never leaves the device.
5. **Financial Literacy Support** – Explains transactions, terms, and financial topics in clear and simple language.
6. **Interactive UI** – Built with **React Native** for a smooth and intuitive mobile experience.

---

## Project Structure
```
app/
├── components/
│   ├── button.tsx
│   ├── card.tsx
│   ├── DonutChart.tsx
│   ├── InputBar.tsx
│   ├── MessageBubble.tsx
│   ├── progress.tsx
│   ├── select.tsx
│   ├── tabs.tsx
│
├── _layout.tsx
├── App.tsx                    # Root application entry
├── chat.tsx                   # Chat screen for user interaction
├── MainScreen.tsx             # Dashboard displaying charts & summaries
├── chunkDetail.tsx            # Transaction chunk visualization
├── upload.tsx                 # Handles local data upload

assets/                        
├── data/
│   ├── kaesi.json             # Initial data for testing app's feature
├── images/                    # Icons and static assets

services/
├── dataIngestionService.ts    # Reads and structures local financial data
├── dbService.ts               # Handles local storage operations
├── embeddingService.ts        # Generates embeddings for RAG retrieval
├── idGenerator.ts             # Generates unique document IDs
├── llamaService.ts            # Interface for llama.rn LLM
└── ragService.ts              # Retrieval-Augmented Generation logic

```

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
