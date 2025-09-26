import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.post('/api/inbound', (req, res) => {
  console.log('Received inbound data:', req.body);
  res.status(200).json({ message: 'Inbound data received successfully' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});