const keys = require('./keys');

// Express App Setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Postgres Client Setup
const { Pool } = require('pg');
console.log("using keys.pgUser", keys.pgUser);
console.log("using keys.pgHost", keys.pgHost);
console.log("using keys.pgDatabase", keys.pgDatabase);
console.log("using keys.pgPassword", keys.pgPassword);
console.log("using keys.pgPort", keys.pgPort);
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort
});
pgClient.on('error', () => console.log('Lost PG connection'));

pgClient
  .query('CREATE TABLE IF NOT EXISTS values (number INT)')
  .catch(err => console.log(err));

// Redis Client Setup
const redis = require('redis');
console.log("using keys.redisHost", keys.redisHost);
console.log("using keys.redisPort", keys.redisPort);
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000
});
const redisPublisher = redisClient.duplicate();

// Express route handlers

app.get('/', (req, res) => {
  res.send('Hi');
});

app.get('/values/all', async (req, res) => {
  console.log("/values/all");

  const values = await pgClient.query('SELECT * from values');

  console.log("values.rows", values.rows);
  res.send(values.rows);
});

app.get('/values/current', async (req, res) => {
  console.log("/values/current");

  redisClient.hgetall('values', (err, values) => {
    console.log("values current", values);
    res.send(values);
  });
});

app.post('/values', async (req, res) => {
  const index = req.body.index;

  console.log("/values is processing", index);

  if (parseInt(index) > 400) {
    return res.status(422).send('Index too high');
  }

  redisClient.hset('values', index, 'Nothing yet!');
  redisPublisher.publish('insert', index);
  pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);

  console.log("working: true");
  res.send({ working: true });
});

app.listen(5000, err => {
  console.log('Listening on 5000x');
});

console.log('Server will come soon!');
