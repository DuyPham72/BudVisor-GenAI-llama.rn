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

## LLM Models

| Models                    | Functions              |
|---------------------------|:----------------------:|
| granite-4.0-h-350m        | Query Rewriter         |
| granite-4.0-h-1b          | Reasoning              |
| embeddinggemma-300m       | Embedding              |

- **granite-4.0-h-350m**:
  Download the model from [Hugging Face](https://huggingface.co/ibm-granite/granite-4.0-h-350m)
  
- **granite-4.0-h-1b**:
  Download the model from [Hugging Face](https://huggingface.co/ibm-granite/granite-4.0-h-1b)

- **embeddinggemma-300m**:
  Download the model from [Hugging Face](https://huggingface.co/google/embeddinggemma-300m)
    
---

## System Architecture
- **React Native** – Mobile UI framework
- **TypeScript** – Strongly typed code for better maintainability
- **llama.rn** – On-device LLM inference
- **SQLite** – Local database for storing transactions and embeddings
- **LLM models** - Reason over financial data, answer user questions, and summarize spending behavior
- **RAG** – Enhances reasoning accuracy
- **SVG** – Data visualization for spending insights

---

## Usage
1. Install dependencies
   ```bash
   npm install
   ```
2. Build the android environment
   ```bash
   npx expo prebuild
   ```
3. Create the app
   ```bash
   npx react-native run-android
   ```
4. Start the app
   ```bash
   npx expo run
   ```

---

## User Interface
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
