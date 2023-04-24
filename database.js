const mongoose = require("mongoose");

class Database {
  constructor() {
    this.connect();
  }

  connect = () => {
    mongoose
      .connect(
        "mongodb+srv://s21:qwert@cluster0.pxxf5.mongodb.net/TwitterCloneDB?retryWrites=true&w=majority",
        { useNewUrlParser: true },
        { useUnifiedTopology: true },
        { useFindAndModify: false },
        { useUnifiedTopology: true }
      )
      .then(() => {
        console.log("database connection successful");
      })
      .catch((err) => {
        console.log("database connection error " + err);
      });
  };
}

module.exports = new Database();
