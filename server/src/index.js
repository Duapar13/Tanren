import express from 'express';
import cors from 'cors';
import 'express-async-errors';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import exercisesRoutes from './routes/exercises.js';
import sessionsRoutes from './routes/sessions.js';
import setsRoutes from './routes/sets.js';
import bodyWeightRoutes from './routes/bodyWeight.js';
import nutritionRoutes from './routes/nutrition.js';

const app = express();

// Behind nginx on the same host — trust its X-Forwarded-For so req.ip (and
// express-rate-limit's IP-based keying) reflects the real client, not nginx.
app.set('trust proxy', 1);

app.use(cors({ origin: config.corsOrigins.includes('*') ? true : config.corsOrigins }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/exercises', exercisesRoutes);
app.use('/sessions', sessionsRoutes);
app.use('/sets', setsRoutes);
app.use('/body-weight', bodyWeightRoutes);
app.use('/nutrition/entries', nutritionRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'not_found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal_error' });
});

app.listen(config.port, () => {
  console.log(`tanren-api listening on :${config.port}`);
});
