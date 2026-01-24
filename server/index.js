import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'Swim Meet Timer API Ready' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
