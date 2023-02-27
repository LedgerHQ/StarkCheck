import dotenv from 'dotenv';
dotenv.config();

import app from './app';

/** Server */
const PORT = process.env.PORT || '6060';
app.listen(PORT, () => {
  console.log(`The server is running on port ${PORT}`);
});
