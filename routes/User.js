// Import modules
const express = require("express");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const session = require("express-session");

// Import utilities
const {
  MONGO_DB_NAME,
  MONGO_DB_COLLECTIONS,
  getMongoClient,
} = require("../client");

// Initialize Express.js
const router = express.Router();

const createHashedPassword = (password) => {
  const salt = bcrypt.genSaltSync();
  return bcrypt.hashSync(password, salt);
};

const verifyPassword = (password, hash) => {
  return bcrypt.compareSync(password, hash);
};

router.post("/sign-up", async (req, res) => {
  // Read parameters
  const { firstName, lastName, email, password } = req.body;

  // Connect database
  const client = await getMongoClient();
  const db = client.db(MONGO_DB_NAME);
  const collection = db.collection(MONGO_DB_COLLECTIONS.USERS);

  // Create user
  const user = {
    userId: uuidv4(),
    firstName: firstName,
    lastName: lastName,
    email: email,
    password: createHashedPassword(password),
  };

  // Update database
  await collection.insertOne(user);

  // Close connection
  await client.close();

  // Redirect to sign in page
  return res.status(200).redirect("/sign-in");
});

router.post("/sign-in", async (req, res) => {
  // Read parameters
  const { email, password } = req.body;

  // Connect database
  const client = await getMongoClient();
  const db = client.db(MONGO_DB_NAME);
  const collection = db.collection(MONGO_DB_COLLECTIONS.USERS);

  // Create filter
  const filter = { email: email };

  // Search database
  const user = await collection.findOne(filter);

  if (user && verifyPassword(password, user.password)) {
    // Set the user data in the session
    req.session.user = {
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    };

    return res.status(200).redirect("/");
  } else {
    return res
      .status(401)
      .json({ status: "error", message: "Invalid credentials" });
  }
});

router.post("/sign-out", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return res
        .status(500)
        .json({ status: "error", message: "Logout failed" });
    }
    return res.status(200).redirect("/sign-in");
  });
});

module.exports = router;
