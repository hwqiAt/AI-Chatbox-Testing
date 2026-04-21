import {
  Pinecone,
  RecordMetadata,
  PineconeRecord,
} from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai"; // Import SDK of Gemini
import * as dotenv from "dotenv";

dotenv.config();

// --- 1. TYPE DEFINITIONS ---
declare const brand: unique symbol;
export type Brand<T, TBrand extends string> = T & { [brand]: TBrand };
export type QA_ID = Brand<string, "QA_ID">;
export type Vector_ID = Brand<string, "Vector_ID">;

interface QAPair {
  id: QA_ID;
  question: string;
  expectedAnswer: string;
}

// --- 2. MAIN FUNCTION ---
async function ingestData() {
  console.log("🚀 Khởi động quá trình Ingest Data (Powered by Gemini)...");

  if (
    !process.env.PINECONE_API_KEY ||
    !process.env.GEMINI_API_KEY ||
    !process.env.PINECONE_INDEX_NAME
  ) {
    throw new Error("❌ THIẾU API KEY! Kiểm tra lại file .env");
  }

  // Initalize Pinecone client
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pinecone.index({ name: process.env.PINECONE_INDEX_NAME });

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  // Use the latest embedding model from Google Gemini
  // Update model name if Google releases a newer embedding model in the future
  const embedModel = genAI.getGenerativeModel({
    model: "gemini-embedding-001",
  });

  const mockDataset: QAPair[] = [
    {
      id: "qa_001" as QA_ID,
      question: "Hệ thống hỗ trợ những phương thức đăng nhập nào?",
      expectedAnswer:
        "Hệ thống hỗ trợ đăng nhập qua Email/Password và Google OAuth.",
    },
    {
      id: "qa_002" as QA_ID,
      question: "Làm sao để reset mật khẩu?",
      expectedAnswer:
        'Bạn có thể nhấn vào nút "Quên mật khẩu" ở màn hình login, hệ thống sẽ gửi link qua email.',
    },
  ];

  const records: PineconeRecord<RecordMetadata>[] = [];

  for (const item of mockDataset) {
    console.log(`Đang tạo embedding cho: ${item.id}...`);

    const textToEmbed = `Câu hỏi: ${item.question}\nTrả lời: ${item.expectedAnswer}`;

    // Dimension 3072
    const result = await embedModel.embedContent(textToEmbed);
    const vectorValues = result.embedding.values;

    const vectorId = `vec_${item.id}` as Vector_ID;

    records.push({
      id: vectorId as string,
      values: vectorValues, // Vector embedding from Google Gemini
      metadata: {
        qaId: item.id,
        text: textToEmbed,
      },
    });
  }

  console.log(`Đang đẩy ${records.length} records lên Pinecone...`);
  await index.upsert({ records: records });
  console.log("✅ Hoàn tất Data Ingestion với Google Gemini!");
}

ingestData().catch(console.error);
