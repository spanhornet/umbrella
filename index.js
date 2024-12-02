// Import modules
const express = require("express");
const path = require("path");
require("dotenv").config();
const session = require("express-session");

// Import utilities
const {
  MONGO_DB_NAME,
  MONGO_DB_COLLECTIONS,
  getMongoClient,
} = require("./client");

// Initialize Express.js
const app = express();
const port = process.env.PORT;

if (port === undefined) {
  process.stdout.write(`[ERROR]: Port number is undefined.\n`);
  process.exit(1);
}

// Initialize middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET_KEY, // Use your secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }, // Session lasts for 1 day
  }),
);

// Initialize "User" middleware
const userRoute = require("./routes/User");
app.use("/user", userRoute);

// Initialize "Record" middleware
const recordRoute = require("./routes/Record");
app.use("/record", recordRoute);

// Initialize directory
app.set("views", path.resolve(__dirname, "pages"));
app.set("view engine", "ejs");

app.get("/", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).redirect("/sign-in");
  }

  // Connect to the database
  const client = await getMongoClient();
  const db = client.db(MONGO_DB_NAME);
  const collection = db.collection(MONGO_DB_COLLECTIONS.RECORDS);

  // Create filter for the user's records
  const filter = {
    userId: req.session.user.userId,
  };

  // Search and sort the records by 'createdDate' in descending order (newest first)
  const records = await collection
    .find(filter)
    .sort({ createdDate: -1 }) // Sort by createdDate, -1 for descending order
    .toArray();

  let cards = "";

  records.forEach((record) => {
    const recordDate = new Date(record.createdDate);

    const formattedDate = recordDate.toLocaleString("en-US", {
      month: "short", // Three-letter month
      day: "2-digit", // Day with leading zero if needed
      year: "numeric", // Full year
      hour: "2-digit", // Hour in 12-hour format
      minute: "2-digit", // Minute with leading zero if needed
      hour12: true, // AM/PM format
    });

    cards += `
    <div class="card">
      <h3>${formattedDate}</h3>
      <br />
      <b>${req.session.user.firstName}</b>
      <p>
        ${record.content}
      </p>
      <b>Your Therapist</b>
      <p>
        ${record.response}
      </p>
    </div>
    `;
  });

  // Close connection
  await client.close();

  // Render the page with sorted records
  return res.status(200).render("index.ejs", {
    firstName: req.session.user.firstName.trim(),
    cards: cards,
  });
});

app.get("/sign-up", (req, res) => {
  if (req.session.user) {
    return res.redirect("/");
  }
  return res.render("sign-up.ejs");
});

app.get("/sign-in", (req, res) => {
  if (req.session.user) {
    return res.redirect("/");
  }
  return res.render("sign-in.ejs");
});

// Start the server
app.listen(port, (error) => {
  if (error) {
    process.stdout.write(`[ERROR]: Starting server failed: ${error}\n`);
    process.exit(1);
  } else {
    process.stdout.write(
      `[EXPRESS]: Server started and running: http://localhost:${port}\n`,
    );

    // Prompt user for input
    const prompt = `[CLI]: Type "stop" to shutdown the server: `;
    process.stdout.write(prompt);

    process.stdin.on("readable", () => {
      // Read user input
      const input = process.stdin.read();

      if (input !== null) {
        const command = input.toString().trim();
        if (command === "stop") {
          // Handle "stop" command
          process.stdout.write("[CLI]: The server has been shutdown.\n");
          process.exit(1); // Shut down the server
        } else {
          // Handle invalid commands
          process.stdout.write(`[CLI]: "${command}" is an invalid command.\n`);
        }
      }

      // Prompt user
      process.stdout.write(prompt);
      process.stdin.resume();
    });
  }
});
