// BudgetAssistant/services/dataIngestionService.ts
import RNFS from 'react-native-fs';
import { getFlag, setFlag, addDocument } from './dbService';
import { embedText } from './embeddingService';
import { Platform } from 'react-native';

const INITIAL_DATA_FLAG = 'initial_data_ingested_v1';
// ⬇️ 1. File path is already updated
const JSON_FILE_PATH = 'data/kaesi.json'; // Path within native 'assets'

/**
 * Reads a file from the app's native asset folder.
 */
async function readAssetFile(filePath: string): Promise<string> {
  try {
    if (Platform.OS === 'android') {
      console.log('Reading asset from (Android):', filePath);
      return await RNFS.readFileAssets(filePath, 'utf8');
    } else {
      const path = RNFS.MainBundlePath + '/' + filePath;
      console.log('Reading asset from (iOS):', path);
      return await RNFS.readFile(path, 'utf8');
    }
  } catch (e: any) {
    console.error(`Failed to read asset ${filePath}`, e);
    throw new Error(`Failed to read asset ${filePath}. Make sure the file is in the correct native assets folder (e.g., android/app/src/main/assets/data/...) and that you have rebuilt the app.`);
  }
}

/**
 * Loads the JSON and processes it into smart, logical text chunks.
 *
 * ⬇️ THIS FUNCTION IS MODIFIED ⬇️
 *
 * This version is adapted for `kaesi.json` and creates *only* one chunk per month
 * of transactions, as you requested.
 */
async function getChunksFromProfile(): Promise<string[]> {
  const fileContent = await readAssetFile(JSON_FILE_PATH);
  const data = JSON.parse(fileContent);
  const chunks: string[] = [];

  // Safety check for user_profile
  if (data.user_profile) {
    chunks.push(
      `User Profile: Full Name: ${data.user_profile.full_name}, Member Since: ${data.user_profile.created_at}`
    );
  }

  // Safety check for the single 'accounts' object
  if (data.accounts) {
    const account = data.accounts;

    const monthlyTransactions: { [key: string]: any[] } = {};

    // Safety check for transactions array
    if (Array.isArray(account.transactions)) {
      for (const trans of account.transactions) {
        // Use 'date_transacted'
        const month = new Date(trans.date_transacted + 'T12:00:00').toLocaleString('default', {
          month: 'long',
          year: 'numeric',
        });
        if (!monthlyTransactions[month]) {
          monthlyTransactions[month] = [];
        }
        monthlyTransactions[month].push(trans);
      }
    }

    // Create a chunk for each month of transactions
    for (const [month, transactions] of Object.entries(monthlyTransactions)) {
      
      // ✅ NEW: Reformat dates inside the chunk
      const transactionStrings = transactions
        .map(
          (t) => {
            // 1. Safe parsing of YYYY-MM-DD
            const date = new Date(t.date_transacted + 'T12:00:00');
            // 2. Format to "October 3, 2025"
            const formattedDate = date.toLocaleString('default', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            });
            // 3. Use fields from kaesi.json
            return `On ${formattedDate}: ${t.description}, Amount: $${t.amount.toFixed(2)}, Updated Balance: $${t.balance.toFixed(2)}`;
          }
        )
        .join('\n');
      
      // ✅ FIXED: Title is also month-first
      chunks.push(
        `${month} Transaction History for ${account.account_name}:\n${transactionStrings}`
      );
    }
  } else {
    throw new Error("JSON file is missing the required 'accounts' object.");
  }

  return chunks;
}

/**
 * Main service function to check if data is loaded, and if not, load it.
 * (This function remains unchanged)
 */
export async function ingestInitialDataIfNeeded(
  onProgress: (status: string) => void,
) {
  try {
    // 1. Check if we've already done this
    const isIngested = await getFlag(INITIAL_DATA_FLAG);
    if (isIngested === 'true') {
      onProgress('Profile data already loaded.');
      return;
    }

    onProgress('Loading bank profile...');
    
    // 2. Get the logical text chunks
    const chunks = await getChunksFromProfile();
    if (!chunks || chunks.length === 0) {
      throw new Error('No chunks generated from profile. Is the JSON file correct?');
    }

    onProgress(`Profile loaded. Processing ${chunks.length} data chunks...`);

    // 3. Embed and store each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      onProgress(`Embedding chunk ${i + 1} of ${chunks.length}...`);
      
      const embedding = await embedText(chunk);
      await addDocument(chunk, embedding);
    }

    // 4. Set the flag so we never do this again
    await setFlag(INITIAL_DATA_FLAG, 'true');
    onProgress('Bank profile successfully embedded.');
  } catch (error) {
    console.error('Error during initial data ingestion:', error);
    
    let errorMessage = 'An unknown error occurred during data ingestion.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
   onProgress(`Error: ${errorMessage}`);
  }
}