const express = require('express');
const fs = require('fs');
const path = require('path');
const jsonfile = require('jsonfile');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());

app.get('/data', (req, res) => {
  const filePath = path.join(__dirname, 'data.json');
  try {
    const data = jsonfile.readFileSync(filePath);
    res.json(data);
  } catch (error) {
    res.status(500).send(error.toString());
  }
});

app.post('/data', (req, res) => {
  const filePath = path.join(__dirname, 'data.json');
  const newData = req.body;
  try {
    const data = jsonfile.readFileSync(filePath);
    data.push(newData);
    jsonfile.writeFileSync(filePath, data);
    res.status(200).send('Data saved');
  } catch (error) {
    res.status(500).send(error.toString());
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});