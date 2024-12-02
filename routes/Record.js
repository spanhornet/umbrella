// Import modules
const express = require("express");
require("dotenv").config();
const { v4: uuidv4 } = require("uuid");
const session = require("express-session");
const {
  MONGO_DB_NAME,
  MONGO_DB_COLLECTIONS,
  getMongoClient,
} = require("../client");

// Initialize Express.js
const router = express.Router();

const fetchCompletion = async (emotion, content) => {
  const url = "https://api.openai.com/v1/chat/completions";
  const apiKey = process.env.OPEN_AI_API_KEY;

  const prompt = `
    You are a therapist. I am your patient. I am going to give you a journal entry and an emotion that I am feeling.

    You are supposed to respond with:
    1. Acknowledging and validating my emotion in a non-judgmental way.
    2. Helping me feel understood by reflecting on what I might be experiencing.
    3. Asking thoughtful, open-ended questions to help me explore my feelings and thoughts further.
    4. Providing a calming, reassuring perspective if appropriate, or normalizing my experience.
    5. Suggesting simple, actionable steps or self-care strategies I can try to cope with or address the emotion.
    6. Ending your response with an encouraging note to remind me of my strengths and capabilities.

    DO NOT ANSWER WITH ANY QUESTION! RESPOND IN 2-3 SENTENCES ONLY!

    Your responses should always prioritize empathy, validation, and gentle guidance, making sure I feel heard and supported.

    Emotion: ${emotion}
    Journal entry: ${content}
  `;

  const requestBody = {
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
    const data = await response.json();

    return data.choices[0].message.content;
  } catch (error) {
    console.error("[OPEN AI]: Error fetching completion:", error);
  }
};

router.get("/", (req, res) => {
  if (!req.session.user) {
    return res.status(401).redirect("/sign-in");
  }
  return res.status(200).render("record.ejs");
});

router.post("/", async (req, res) => {
  // Read parameters
  const { emotion, content } = req.body;

  // Connect database
  const client = await getMongoClient();
  const db = client.db(MONGO_DB_NAME);
  const collection = db.collection(MONGO_DB_COLLECTIONS.RECORDS);

  const response = await fetchCompletion(emotion, content);

  // Create record
  const record = {
    recordId: uuidv4(),
    userId: req.session.user.userId,
    createdDate: new Date(),
    emotion: emotion,
    content: content,
    response: response,
  };

  // Update database
  await collection.insertOne(record);

  // Close connection
  await client.close();

  // Redirect to sign in page
  return res.status(200).redirect("/");
});

module.exports = router;
