import 'dotenv/config';
import express from 'express';
import mobeClassify from './server/mobe-classify.js';

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

app.use('/api/mobe', mobeClassify);

app.listen(PORT, () => console.log(`Fisheye 360 → http://localhost:${PORT}`));
