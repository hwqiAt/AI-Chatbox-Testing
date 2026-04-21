import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai"; // Import SDK of Gemini
import * as dotenv from "dotenv";

dotenv.config();

const SIMILARITY_THRESHOLD = 0.7; //Threhhold is 0.7

async function askQuestion(userQuery: string) {
  if (
    !process.env.PINECONE_API_KEY ||
    !process.env.GEMINI_API_KEY ||
    !process.env.PINECONE_INDEX_NAME
  ) {
    throw new Error("❌ THIẾU API KEY! Kiểm tra lại file .env");
  }

  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pinecone.index({ name: process.env.PINECONE_INDEX_NAME });

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const embedModel = genAI.getGenerativeModel({
    model: "gemini-embedding-001",
  });
  const chatModel = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
  });

  try {
    console.log("Transforming question into vector embedding...");
    const embeddingResult = await embedModel.embedContent(userQuery);
    const questionVector = embeddingResult.embedding.values;

    console.log("Searching for similar Q&A pairs in Pinecone...");
    const searchResponse = await index.query({
      vector: questionVector,
      topK: 2,
      includeMetadata: true,
    });

    const bestMatch = searchResponse.matches[0];

    if (
      !bestMatch ||
      bestMatch.score === undefined ||
      bestMatch.score < SIMILARITY_THRESHOLD
    ) {
      console.log("No relevant Q&A pair found. Returning default response.");
      console.log(
        "Xin lỗi, tôi không tìm thấy câu trả lời phù hợp cho câu hỏi của bạn.",
      );
      return;
    }

    console.log(
      `Best match found with similarity score: ${bestMatch.score.toFixed(4)}`,
    );
    const retrievedContext = bestMatch.metadata?.text || "";

    console.log("Generating answer using Gemini...");
    const prompt = `
      Bạn là nhân viên hỗ trợ khách hàng. Hãy trả lời câu hỏi của người dùng dựa TRÊN THÔNG TIN (Context) ĐƯỢC CUNG CẤP DƯỚI ĐÂY.
      Nếu thông tin không liên quan hoặc không đủ, hãy từ chối trả lời. Đừng tự bịa ra thông tin.

      THÔNG TIN CUNG CẤP (Context):
      ${retrievedContext}

      CÂU HỎI CỦA NGƯỜI DÙNG:
      ${userQuery}
    `;

    const chatResponse = await chatModel.generateContent(prompt);
    const finalAnswer = chatResponse.response.text();

    console.log("Final answer from Gemini:");
    console.log(`${finalAnswer.trim()}`);
  } catch (error) {
    console.error("Error during retrieval or generation:", error);
  }
}

async function runTest() {
  await askQuestion("Làm sao để reset mật khẩu?");

  await askQuestion("Bao giờ thì tôi bảo vệ luận văn?");
}

runTest();
