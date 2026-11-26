// The only file that talks to the LLM provider.
// The provider, the model and the key come from .env:
//   process.env.LLM_BASE_URL, process.env.LLM_MODEL, process.env.LLM_API_KEY

const SYSTEM = `항상 존댓말(해요체)로 답해주세요.
줄바꿈 없이 한 문단으로, 세 문장 이내로 답해주세요.
목록, 제목, 굵은 글씨 등 마크다운 문법을 사용하지 말고 일반 텍스트로 답해주세요.`;

const SYSTEM_JSON = `사용자가 입력한 후기를 분석하고 JSON 객체로만 답해주세요.
JSON 객체의 키는 정확히 sentiment, score, summary 세 개만 사용해주세요.
sentiment는 "positive", "negative", "neutral" 중 하나여야 합니다.
score는 1 이상 5 이하의 정수여야 합니다.
summary는 후기 내용을 요약한 짧은 한 문장의 문자열이어야 합니다.
마크다운, 코드 블록, 추가 설명은 사용하지 마세요.`;

// ask("a question")  ->  the model's answer, as a string
export async function ask(question) {
  const res = await fetch(
    `${process.env.LLM_BASE_URL}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.LLM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: question },
        ],
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`LLM: HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.choices[0].message.content.trim();
}

// chat([{ role: "user", content: "..." }, { role: "assistant", content: "..." }, ...])
//   ->  the model's next answer, as a string
export async function chat(history) {
  const res = await fetch(
    `${process.env.LLM_BASE_URL}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.LLM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL,
        messages: [
          { role: "system", content: SYSTEM },
          ...history,
        ],
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`LLM: HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.choices[0].message.content.trim();
}

// analyze("a review")  ->  an object, not a sentence:
//   { sentiment: "positive" | "negative" | "neutral", score: 1..5, summary: "one short sentence" }
export async function analyze(text) {
  const res = await fetch(
    `${process.env.LLM_BASE_URL}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.LLM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL,
        messages: [
          { role: "system", content: SYSTEM_JSON },
          { role: "user", content: text },
        ],
        response_format: { type: "json_object" },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`LLM: HTTP ${res.status}`);
  }

  const data = await res.json();
  const { sentiment, score, summary } = JSON.parse(
    data.choices[0].message.content.trim()
  );

  if (
    !["positive", "negative", "neutral"].includes(sentiment) ||
    !Number.isInteger(score) ||
    score < 1 ||
    score > 5 ||
    typeof summary !== "string"
  ) {
    throw new Error("LLM: the answer has the wrong shape");
  }

  return { sentiment, score, summary };
}