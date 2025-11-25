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
│   └── tabs.tsx
│
├── _layout.tsx
├── App.tsx                    # Root application entry
├── chat.tsx                   # Chat screen for user interaction
├── MainScreen.tsx             # Dashboard displaying charts & summaries
├── chunkDetail.tsx            # Transaction chunk visualization
└── upload.tsx                 # Handles local data upload

assets/                        
├── data/
│   ├── kaesi.json             # Initial data for testing app's feature
└── images/                    # Icons and static assets

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
| granite-4.0-1b          | Reasoning              |
| embeddinggemma-300m       | Embedding              |

  
- **granite-4.0-h-1b**:
  Download the model from [Hugging Face](https://huggingface.co/ibm-granite/granite-4.0-1b)

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
1. Go into project directory
    ```bash
   cd .\BudgetAssistant\
   ```
2. Install dependencies
   ```bash
   npm install
   ```
3. Build the android environment
   ```bash
   npx expo prebuild
   ```
4. Create the app
   ```bash
   npx react-native run-android
   ```
5. Start the app
   ```bash
   npx expo run
   ```

---

## User Interface
<p align="center">
  <img src="demo/MainScreen.png" height="500" style="border-radius:12px; border:1px solid #ddd;" />
   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <img src="demo/Detail.png" height="500" style="border-radius:12px; border:1px solid #ddd;" />
   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <img src="demo/Upload.png" height="500" style="border-radius:12px; border:1px solid #ddd;" />
</p>

<p align="center"><i>App Screens</i></p>

---

## Demo
<p align="center">
  <img src="demo/Demo-FinLiteracy.gif" height="700" style="margin-right: 80px;" />
   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <img src="demo/Demo-RAG.gif" height="700" />
</p>

<p align="center"><i>On-Device AI Assistant Demonstration</i></p>
