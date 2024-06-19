import express from 'express';
import filesRouter from './transform';

const app = express();
const port = process.env.PORT || 3000;

app.use('/api/files', filesRouter);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
