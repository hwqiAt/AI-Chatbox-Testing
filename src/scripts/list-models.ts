import * as dotenv from "dotenv";

dotenv.config();

async function checkAvailableModels() {
  console.log("🔍 Đang dò tìm các model khả dụng cho API Key của bạn...");

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.models) {
      console.log("\n✅ DANH SÁCH MODEL DÙNG ĐỂ CHAT (generateContent):");
      data.models.forEach((m: any) => {
        // Chỉ lọc ra những model hỗ trợ tính năng chat/trả lời câu hỏi
        if (
          m.supportedGenerationMethods &&
          m.supportedGenerationMethods.includes("generateContent")
        ) {
          // Cắt bỏ chữ "models/" ở đầu cho dễ nhìn
          console.log(`👉 ${m.name.replace("models/", "")}`);
        }
      });
      console.log(
        "\n💡 Hướng dẫn: Hãy copy một cái tên bất kỳ ở trên (VD: gemini-2.0-flash, gemini-1.5-pro, v.v.) và dán vào file chat-retrieval.ts",
      );
    } else {
      console.log("❌ Lỗi trả về từ Google:", data);
    }
  } catch (error) {
    console.error("Lỗi khi gọi API:", error);
  }
}

checkAvailableModels();
